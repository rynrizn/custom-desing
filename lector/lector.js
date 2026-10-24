/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Lógica del Lector Administrativo Privado
 * ============================================================================
 * Descifra paquetes .zrn en el navegador con la clave privada del taller
 * protegida por frase secreta (Cero-Conocimiento). Muestra resúmenes, WhatsApp
 * directo, mockups sin marca de agua y permite reabrir proyectos en el editor.
 */

import { motorCifradoZRN } from '../js/cifrado.js';

let rsaPrivateKeyDesbloqueada = null;
let ultimoZipDescifradoArrayBuffer = null;
let ultimoProyectoJSON = null;

document.addEventListener('DOMContentLoaded', async () => {
  const passphraseModal = document.getElementById('passphraseModal');
  const secretPassphraseInput = document.getElementById('secretPassphraseInput');
  const unlockBtn = document.getElementById('unlockPrivateKeyBtn');
  const passphraseError = document.getElementById('passphraseError');

  const zrnDropzone = document.getElementById('zrnDropzone');
  const zrnFileInput = document.getElementById('zrnFileInput');

  const orderSummaryBox = document.getElementById('orderSummaryBox');
  const orderDateVal = document.getElementById('orderDateVal');
  const orderTotalVal = document.getElementById('orderTotalVal');
  const orderPhoneVal = document.getElementById('orderPhoneVal');
  const openWhatsAppBtn = document.getElementById('openWhatsAppBtn');
  const orderNotesBox = document.getElementById('orderNotesBox');
  const downloadDecryptedZipBtn = document.getElementById('downloadDecryptedZipBtn');
  const openInEditorBtn = document.getElementById('openInEditorBtn');
  const previewGallery = document.getElementById('previewGallery');
  const previewCountBadge = document.getElementById('previewCountBadge');

  // 1. Obtener la clave privada cifrada desde /api/clave
  const DEFAULT_ENCRYPTED_KEY = '{"salt":"iGTMW3MVtz/8TqNCU3Q26A==","iv":"gQdHZHylNSxprlCE","ciphertext":"pXh4uRhwsMJpXMoR65HDEPW4BzgWjfW39RMLMg3caV72EOIgVQIJ66NQ/HDvW493K3y66VsOxSWwr01aiu/k5liBFVOgy6CexUbZfvgJpRUGPBS65YDazY0T7+IQpj4lT4ylD/QHrxRjSBLdMl3okfqb5ios5IHmGm3GK4zwxyu5s8zjlLFFI1WMyPcsQ3ojGSsXvUL24Y3kU6EtsBmOEihstbGp46PziBCTYP3kPGgFa32cQGJLcU/4ryKNOMkf5XjFQF3glM3/cgWyjdqKtpsnUzKoiW0EEcBWpDnp8cxWLsdVrBML+NRlzzZKUDoKBdWUEA8NobMlrpzFg/hUfFxwkjNkA5efut0EDatZ1aMnltO3jkpV0LYlP/7m3+IJICHdo+487R+YOUME2MBR3ezUKShrO+8NOdEWLkasFLG0mjIXvZnQWEKTBp7LSxLSsEt9keEoNOOidZSQIQNjo12BYrqdSwmnYwC1nbTMnFvON8Dc6k2GoZEPDpJQoCPS1t8QWZm8rXT6x01HRbvqk/fgvi/694yRsCTnH9j9OsDUov1EIbJ5f7QeQIGrxMVcyONLD5CQrnNxf0WrvPu6/6w4/qSyEZbfy2ULjP9G/P/5rT8ExPbvZe4BOyjpP5v0kOYVsteYBWqOeZ82ZW75YpvMFndCiKRQ/7btCX7ZqIvq2rckONjdQszrf0G2H4B4JPiixb05proLrZew1CavXMwBf9zoTSM4HFH1qm2Rp/JCnS22S4b7B64AzD0HUaQTv9J5sL0+K9xmgqOeS7CHWbDUApqp8SIEWp192pRXC/j6jIDyEGG/sTSHhKHXm1o/14F+NoZBlwyGzNxw4+O774UwQbGxvObtVA7KbRTPkBgkktQJjvd5jCdhgRZTcgkgVbkFmybSoaHNU5yfNBymdxs4Uo5+BM5a4tGunt3FQOMEriqZWuJ6CPwhlTXQaYmdK5My9uFI24y9YhfNdcPJEOlBvR6MKtfiw3O6gjk/h3eDuSzoOIN7q4MvuE7R4quRVsmgsLw30PH4hohNOM9VFgX0cS2QjUIKrVsEATbhwiBh+PPL00gYMQijbAIk4mOGShwogzaB3DBOh7p0g8i8X+x/+xsz34KYa77XgLD16NxlOUx/DZMJg9/aPjfVQwRNXvXNwvJVR4Q/fAuISLkqpIC16d4l4cxZ6RM+iKgCvQOiTmH/D3a/pe5TDeqOufszXtleVrsC18x5jWfaCVMBuj1103cgkrPN2ppdetwgypntjgvDdiEOBCXzaX6Jp3gcoMNsDDs8ek57N4HExF4v3PPl3U0/BcAnjNfHrTIclQnvhS15QAXRLN14WURocNS5Nfkc39kiGqhhnnAv0269htyAF0lxlwy7LEu3HpTIQTrb/n9UcJFV54+GBDA3x+rvVhJYtqv1RVKJna+e3rSTC25NVqoJVxgkE9tOg2FbGMTQI+Z0BV8t+Sz2/ryZN6zAxl/xaC+Oe/nTi/+gMds/bcP2tM6TthLw7pmuYSbD1nuEx5GVkqdpMzMQcGGxmsm+RSWz70rp06yXPW61cVLosR/0rkeKDiDqhpw+v0NT/Ih9OF3ybdcVxFguWmvwDjNGou5vWM+fxLeATxGpse4HPY7g6vOwCFVPsMgL2sJW31xUYw==","iterations":100000}';
  let encryptedPrivateKeyJSON = null;
  try {
    const res = await fetch('/api/clave');
    if (res.status === 401) {
      window.location.href = '/acceso?redirect=/lector';
      return;
    }
    const data = await res.json();
    if (res.ok && data.encryptedPrivateKey) {
      encryptedPrivateKeyJSON = data.encryptedPrivateKey;
    } else {
      encryptedPrivateKeyJSON = DEFAULT_ENCRYPTED_KEY;
    }
  } catch (err) {
    console.warn('Usando clave pre-cifrada de fábrica:', err);
    encryptedPrivateKeyJSON = DEFAULT_ENCRYPTED_KEY;
  }

  // 2. Desbloquear la clave privada con la Frase Secreta
  unlockBtn.addEventListener('click', async () => {
    const frase = secretPassphraseInput.value.trim();
    if (!frase) return;

    unlockBtn.disabled = true;
    unlockBtn.textContent = 'DESCIFRANDO CLAVE...';
    passphraseError.style.display = 'none';

    try {
      if (!encryptedPrivateKeyJSON) {
        throw new Error('No hay secreto PRIVATE_KEY_ENC configurado en Cloudflare. Genéralo en /lector/configurar');
      }

      const encObj = typeof encryptedPrivateKeyJSON === 'string'
        ? JSON.parse(encryptedPrivateKeyJSON)
        : encryptedPrivateKeyJSON;

      const salt = new Uint8Array(atob(encObj.salt).split('').map(c => c.charCodeAt(0)));
      const iv = new Uint8Array(atob(encObj.iv).split('').map(c => c.charCodeAt(0)));
      const ciphertext = new Uint8Array(atob(encObj.ciphertext).split('').map(c => c.charCodeAt(0)));

      // Derivar clave AES con PBKDF2
      const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(frase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const aesKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: encObj.iterations || 600000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Descifrar PKCS#8 de la clave privada RSA
      const pkcs8Buffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        ciphertext
      );

      // Importar clave privada RSA-OAEP
      rsaPrivateKeyDesbloqueada = await crypto.subtle.importKey(
        'pkcs8',
        pkcs8Buffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['decrypt']
      );

      // Cerrar modal
      passphraseModal.style.display = 'none';
    } catch (err) {
      passphraseError.textContent = 'Frase secreta incorrecta o clave corrupta: ' + err.message;
      passphraseError.style.display = 'block';
      secretPassphraseInput.focus();
    } finally {
      unlockBtn.disabled = false;
      unlockBtn.textContent = 'DESBLOQUEAR CLAVE';
    }
  });

  // 3. Carga y Descifrado de archivos .zrn
  zrnDropzone.addEventListener('click', () => zrnFileInput.click());

  zrnDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zrnDropzone.style.borderColor = 'var(--accent-crimson)';
  });

  zrnDropzone.addEventListener('dragleave', () => {
    zrnDropzone.style.borderColor = '#383a42';
  });

  zrnDropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    zrnDropzone.style.borderColor = '#383a42';
    if (e.dataTransfer.files?.length) {
      await procesarArchivoZRN(e.dataTransfer.files[0]);
    }
  });

  zrnFileInput.addEventListener('change', async (e) => {
    if (e.target.files?.length) {
      await procesarArchivoZRN(e.target.files[0]);
      zrnFileInput.value = '';
    }
  });

  async function procesarArchivoZRN(file) {
    if (!rsaPrivateKeyDesbloqueada) {
      passphraseModal.style.display = 'flex';
      secretPassphraseInput.focus();
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Descifrar contenedor híbrido .zrn
      const decryptedZipBuffer = await motorCifradoZRN.descifrarPaqueteZRN(arrayBuffer, rsaPrivateKeyDesbloqueada);
      ultimoZipDescifradoArrayBuffer = decryptedZipBuffer;

      // Descomprimir contenido en memoria con JSZip
      const zip = await JSZip.loadAsync(decryptedZipBuffer);

      // 1. Leer pedido.json
      const pedidoFile = zip.file('pedido.json');
      if (pedidoFile) {
        const pedidoData = JSON.parse(await pedidoFile.async('text'));
        mostrarDatosPedido(pedidoData);
      }

      // 2. Leer proyecto.json (para reapertura en editor)
      const proyectoFile = zip.file('proyecto.json');
      if (proyectoFile) {
        ultimoProyectoJSON = await proyectoFile.async('text');
        openInEditorBtn.style.display = 'block';
      }

      // 3. Renderizar galería de imágenes (mockups, estampados y originales)
      await renderizarGaleriaImagenes(zip);

      orderSummaryBox.style.display = 'flex';

    } catch (err) {
      alert('Error al abrir archivo .zrn: ' + err.message);
    }
  }

  function mostrarDatosPedido(pedido) {
    const d = new Date(pedido.creadoEn || Date.now());
    orderDateVal.textContent = `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES')}`;
    orderTotalVal.textContent = `${pedido.resumen?.totalUnidadesPrenda || 1} prenda(s) (${pedido.resumen?.totalPolerasDistintas || 1} diseño(s))`;

    const phone = pedido.cliente?.whatsapp || '';
    orderPhoneVal.textContent = phone || 'No indicado';

    if (phone) {
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      openWhatsAppBtn.href = `https://wa.me/${cleanPhone}`;
      openWhatsAppBtn.style.display = 'inline-flex';
    } else {
      openWhatsAppBtn.style.display = 'none';
    }

    orderNotesBox.textContent = pedido.cliente?.indicaciones || '(Sin indicaciones especiales para el taller)';
  }

  async function renderizarGaleriaImagenes(zip) {
    previewGallery.innerHTML = '';
    let count = 0;

    // Buscar archivos de imagen en el ZIP
    const files = Object.keys(zip.files);
    for (const path of files) {
      if (path.match(/\.(png|jpe?g|webp|svg)$/i)) {
        count++;
        const zipEntry = zip.file(path);
        const blob = await zipEntry.async('blob');
        const url = URL.createObjectURL(blob);

        const card = document.createElement('div');
        card.className = 'preview-card';

        const nombreLimpio = path.split('/').pop();
        card.innerHTML = `
          <img src="${url}" alt="${nombreLimpio}">
          <div style="font-family:var(--font-mono); font-size:10px; color:#FAF9F6; word-break:break-all;">
            <strong>${nombreLimpio}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="tag-chip" style="font-size:9px;">${path.includes('300dpi') ? '300 DPI' : (path.includes('mockup') ? 'MOCKUP' : 'ORIGINAL')}</span>
            <a href="${url}" download="${nombreLimpio}" class="btn-micro" style="text-decoration:none;">DESCARGAR</a>
          </div>
        `;

        previewGallery.appendChild(card);
      }
    }

    previewCountBadge.textContent = `${count} ARCHIVOS`;
  }

  // Descargar ZIP desencriptado
  downloadDecryptedZipBtn.addEventListener('click', () => {
    if (!ultimoZipDescifradoArrayBuffer) return;
    const blob = new Blob([ultimoZipDescifradoArrayBuffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedido-descifrado-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  // Abrir en Editor
  openInEditorBtn.addEventListener('click', () => {
    if (!ultimoProyectoJSON) return;
    try {
      localStorage.setItem('zairen_cad_v2_proyecto', ultimoProyectoJSON);
      window.location.href = '/';
    } catch (err) {
      alert('No se pudo cargar el proyecto en el editor: ' + err.message);
    }
  });
});
