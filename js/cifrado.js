/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Motor Criptográfico Web Crypto y Formato .zrn
 * ============================================================================
 * Implementa cifrado híbrido seguro sin librerías externas:
 * 1. Generación de clave simétrica efímera AES-256-GCM por cada pedido.
 * 2. Cifrado del ZIP técnico usando "ZRN1" como datos autenticados asociados (AAD).
 * 3. Envoltura de la clave AES mediante RSA-OAEP (SHA-256) con la Clave Pública de 3072 bits.
 * 4. Empaquetado binario estricto: Magic "ZRN1" | Longitud clave (uint16) | Clave envuelta | IV (12B) | Ciphertext.
 * 5. Desempaquetado y descifrado seguro en el navegador del lector administrativo.
 */

import { CONFIG } from './config.js';
import { gestorAlmacenamiento } from './almacenamiento.js';

const MAGIC_ZRN1 = new Uint8Array([0x5A, 0x52, 0x4E, 0x31]); // ASCII: "ZRN1"

export class MotorCifradoZRN {
  constructor() {}

  /**
   * Obtiene la clave pública RSA en runtime consultando el endpoint /api/publica,
   * con fallback a CONFIG.RSA_PUBLIC_KEY en desarrollo local.
   */
  async obtenerClavePublica() {
    let rawClave = '';
    try {
      const res = await fetch('/api/publica', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.clavePublica) {
          rawClave = data.clavePublica.trim();
        }
      }
    } catch (err) {
      console.warn('No se pudo obtener /api/publica, comprobando fallback de configuración local:', err);
    }

    if (!rawClave && CONFIG.RSA_PUBLIC_KEY) {
      rawClave = CONFIG.RSA_PUBLIC_KEY.trim();
    }

    if (!rawClave) {
      console.error('Error crítico de cifrado: No se encontró CLAVE_PUBLICA en /api/publica ni CONFIG.RSA_PUBLIC_KEY.');
      throw new Error('El envío no está disponible en este momento. Por favor, avisa a ZAIRENLAB.');
    }

    if (rawClave.startsWith('ZRNP1:')) {
      rawClave = rawClave.slice(6).trim();
    }

    return rawClave;
  }

  /**
   * Importa una clave pública RSA-OAEP desde Base64 (formato SPKI).
   * Tolera prefijo ZRNP1: y encabezados PEM.
   */
  async importarClavePublica(base64Spki) {
    if (!base64Spki || typeof base64Spki !== 'string') {
      throw new Error('El envío no está disponible en este momento. Por favor, avisa a ZAIRENLAB.');
    }
    let cleanB64 = base64Spki.trim();
    if (cleanB64.startsWith('ZRNP1:')) {
      cleanB64 = cleanB64.slice(6).trim();
    }
    cleanB64 = cleanB64.replace(/-----[^\n]+-----|\s+/g, '');
    const binaryStr = atob(cleanB64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    return await crypto.subtle.importKey(
      'spki',
      bytes.buffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      false,
      ['encrypt']
    );
  }

  /**
   * Cifra un buffer ZIP en el formato binario protegido .zrn.
   */
  async cifrarPaqueteZRN(zipArrayBuffer, rsaPublicKeyBase64 = null) {
    let claveBase64 = rsaPublicKeyBase64;
    if (!claveBase64) {
      claveBase64 = await this.obtenerClavePublica();
    }

    // 1. Cargar la clave pública RSA del taller
    const rsaPublicKey = await this.importarClavePublica(claveBase64);

    // 2. Generar clave simétrica aleatoria AES-256-GCM
    const aesKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // Exportable para poder envolverla con RSA
      ['encrypt', 'decrypt']
    );

    // 3. Generar vector de inicialización (IV) de 12 bytes
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 4. Cifrar el contenido del ZIP con AES-GCM usando "ZRN1" como AAD
    const aad = new TextEncoder().encode('ZRN1');
    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aad
      },
      aesKey,
      zipArrayBuffer
    );

    // 5. Exportar la clave AES y envolverla con RSA-OAEP
    const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
    const wrappedKeyBuffer = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      rsaPublicKey,
      rawAesKey
    );

    // 6. Ensamblar la estructura binaria .zrn
    // [4B Magic "ZRN1"] + [2B Longitud Clave (uint16 big-endian)] + [Clave envuelta] + [12B IV] + [Datos cifrados]
    const wrappedKeyLength = wrappedKeyBuffer.byteLength;
    const totalBytes = 4 + 2 + wrappedKeyLength + 12 + ciphertextBuffer.byteLength;
    const zrnBuffer = new ArrayBuffer(totalBytes);
    const zrnView = new DataView(zrnBuffer);
    const zrnBytes = new Uint8Array(zrnBuffer);

    // Escribir Magic "ZRN1"
    zrnBytes.set(MAGIC_ZRN1, 0);

    // Escribir longitud de la clave envuelta (uint16 big-endian)
    zrnView.setUint16(4, wrappedKeyLength, false);

    // Escribir clave envuelta
    zrnBytes.set(new Uint8Array(wrappedKeyBuffer), 6);

    // Escribir IV de 12 bytes
    const ivOffset = 6 + wrappedKeyLength;
    zrnBytes.set(iv, ivOffset);

    // Escribir datos cifrados (incluye el tag GCM al final)
    const dataOffset = ivOffset + 12;
    zrnBytes.set(new Uint8Array(ciphertextBuffer), dataOffset);

    return new Blob([zrnBuffer], { type: 'application/octet-stream' });
  }

  /**
   * Descifra un archivo .zrn usando la clave privada RSA-OAEP del administrador.
   * Utilizado en la página privada /lector (completamente en el cliente).
   */
  async descifrarPaqueteZRN(zrnArrayBuffer, rsaPrivateKey) {
    if (zrnArrayBuffer.byteLength < 24) {
      throw new Error('El archivo .zrn está incompleto o dañado (tamaño menor a cabecera)');
    }

    const zrnView = new DataView(zrnArrayBuffer);
    const zrnBytes = new Uint8Array(zrnArrayBuffer);

    // 1. Verificar Magic "ZRN1"
    const magic = String.fromCharCode(zrnBytes[0], zrnBytes[1], zrnBytes[2], zrnBytes[3]);
    if (magic !== 'ZRN1') {
      throw new Error('Formato inválido. El archivo no tiene la cabecera mágica ZRN1');
    }

    // 2. Leer longitud de clave envuelta
    const wrappedKeyLength = zrnView.getUint16(4, false);
    if (zrnArrayBuffer.byteLength < 6 + wrappedKeyLength + 12) {
      throw new Error('Estructura de archivo .zrn corrupta');
    }

    // 3. Extraer componentes
    const wrappedKey = zrnArrayBuffer.slice(6, 6 + wrappedKeyLength);
    const ivOffset = 6 + wrappedKeyLength;
    const iv = zrnBytes.slice(ivOffset, ivOffset + 12);
    const dataOffset = ivOffset + 12;
    const ciphertext = zrnArrayBuffer.slice(dataOffset);

    // 4. Desenvolver clave AES mediante RSA-OAEP
    let rawAesKey;
    try {
      rawAesKey = await crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        rsaPrivateKey,
        wrappedKey
      );
    } catch (err) {
      throw new Error('Este pedido fue cifrado con una clave pública distinta a la configurada en este lector. Verifica que las claves en Cloudflare coincidan.');
    }

    // 5. Importar clave AES
    const aesKey = await crypto.subtle.importKey(
      'raw',
      rawAesKey,
      {
        name: 'AES-GCM'
      },
      false,
      ['decrypt']
    );

    // 6. Descifrar el ZIP usando AES-GCM con AAD "ZRN1"
    const aad = new TextEncoder().encode('ZRN1');
    let zipBuffer;
    try {
      zipBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          additionalData: aad
        },
        aesKey,
        ciphertext
      );
    } catch (err) {
      throw new Error('Error al verificar autenticidad o integridad de los datos cifrados (AAD/Tag inválido)');
    }

    return zipBuffer;
  }

  /**
   * Gestiona el envío del archivo cifrado a ZAIRENLAB vía Web Share API o WhatsApp.
   */
  async enviarPedidoAZairenLab(zrnBlob, metadataPedido, codigoPedido = null, opciones = {}) {
    const codigo = codigoPedido || metadataPedido?.codigoPedido || gestorAlmacenamiento.generarCodigoPedido();
    const nombreArchivo = `pedido-${codigo}.zrn`;
    const { descargarLocal = false } = opciones;
    const archivoZrn = new File([zrnBlob], nombreArchivo, { type: 'application/octet-stream' });

    // Intento 1: Web Share API con archivo adjunto (móviles modernos)
    if (navigator.canShare && navigator.canShare({ files: [archivoZrn] })) {
      try {
        await navigator.share({
          files: [archivoZrn],
          title: `Pedido ZAIRENLAB (${codigo})`,
          text: `Pedido personalizado ZAIREN con código ${codigo} (${metadataPedido?.resumen?.totalUnidadesPrenda || 1} prenda(s)). Archivo adjunto: ${nombreArchivo}`
        });
        return { metodo: 'webshare', exito: true };
      } catch (err) {
        if (err.name === 'AbortError') return { metodo: 'cancelado', exito: false };
        console.warn('Web Share API falló, recurriendo a descarga y WhatsApp:', err);
      }
    }

    // Intento 2: Descargar .zrn localmente si se solicita y abrir WhatsApp con mensaje pre-rellenado
    if (descargarLocal) {
    const url = URL.createObjectURL(zrnBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    const telefonoLimpio = (CONFIG.WHATSAPP_NEGOCIO || '').replace(/[^\d+]/g, '');
    const contactoWA = metadataPedido?.cliente?.whatsapp || 'Mismo número';
    const mensajeWA = `¡Hola ZAIRENLAB! Acabo de generar mi pedido con código ${codigo} desde el editor. Les adjunto el archivo ${nombreArchivo} a continuación para confección. WhatsApp de contacto: ${contactoWA}.`;
    const urlWA = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensajeWA)}`;

    window.open(urlWA, '_blank');
    return { metodo: 'descarga_wa', exito: true };
  }
}

export const motorCifradoZRN = new MotorCifradoZRN();
