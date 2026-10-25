/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Lógica del Lector Administrativo Privado
 * ============================================================================
 * Descifra paquetes .zrn en el navegador con la clave privada del taller.
 * Soporta Acceso Directo Total:
 * - Recuerda la clave privada en almacenamiento local seguro de este navegador.
 * - Soporta entrega directa desde Cloudflare si FRASE_SECRETA está configurada.
 * - Muestra resúmenes, WhatsApp directo, mockups sin marca de agua y reapertura en editor.
 */

import { motorCifradoZRN } from '../js/cifrado.js';

let rsaPrivateKeyDesbloqueada = null;
let ultimoZipDescifradoArrayBuffer = null;
let ultimoProyectoJSON = null;

const STORAGE_KEY_UNLOCKED = 'zairen_unlocked_privkey';

document.addEventListener('DOMContentLoaded', async () => {
  const keyStatusBadge = document.getElementById('keyStatusBadge');
  const lockKeyBtn = document.getElementById('lockKeyBtn');
  const passphraseModal = document.getElementById('passphraseModal');
  const closePassphraseModalBtn = document.getElementById('closePassphraseModalBtn');
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

  // Elementos para Cambiar Frase Secreta
  const openChangePassphraseBtn = document.getElementById('openChangePassphraseBtn');
  const changePassphraseModal = document.getElementById('changePassphraseModal');
  const closeChangeModalBtn = document.getElementById('closeChangeModalBtn');
  const currentPassphraseInput = document.getElementById('currentPassphraseInput');
  const newPassphraseInput = document.getElementById('newPassphraseInput');
  const changeMeterBarFill = document.getElementById('changeMeterBarFill');
  const changeMeterFeedback = document.getElementById('changeMeterFeedback');
  const executeChangePassphraseBtn = document.getElementById('executeChangePassphraseBtn');
  const changePassphraseError = document.getElementById('changePassphraseError');
  const changeResultBox = document.getElementById('changeResultBox');
  const newPrivKeyDisplay = document.getElementById('newPrivKeyDisplay');
  const copyNewPrivKeyBtn = document.getElementById('copyNewPrivKeyBtn');

  function actualizarEstadoClave(desbloqueada) {
    if (!keyStatusBadge) return;
    if (desbloqueada) {
      keyStatusBadge.style.background = '#1b3820';
      keyStatusBadge.style.color = '#81c784';
      keyStatusBadge.textContent = '🟢 CLAVE LISTA';
      keyStatusBadge.title = 'Clave privada activa. Arrastra archivos .zrn directamente.';
    } else {
      keyStatusBadge.style.background = '#2e1f20';
      keyStatusBadge.style.color = '#ff897d';
      keyStatusBadge.textContent = '🔒 CLAVE BLOQUEADA';
      keyStatusBadge.title = 'Haz clic para introducir la frase secreta.';
    }
  }

  // Importar PKCS#8 Base64 en CryptoKey de RSA-OAEP
  async function importarClavePrivada(pkcs8Base64) {
    const cleanB64 = pkcs8Base64.trim();
    const binaryStr = atob(cleanB64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    rsaPrivateKeyDesbloqueada = await crypto.subtle.importKey(
      'pkcs8',
      bytes.buffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      true, // exportable para permitir re-cifrado al cambiar de frase
      ['decrypt']
    );

    actualizarEstadoClave(true);
    passphraseModal.style.display = 'none';
    return rsaPrivateKeyDesbloqueada;
  }

  // Función auxiliar para descifrar PKCS#8 de clave privada con frase
  async function descifrarClavePrivadaConFrase(rawJsonStr, frase) {
    const encObj = typeof rawJsonStr === 'string' ? JSON.parse(rawJsonStr) : rawJsonStr;
    const salt = new Uint8Array(atob(encObj.salt).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(encObj.iv).split('').map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array(atob(encObj.ciphertext).split('').map(c => c.charCodeAt(0)));

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

    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      ciphertext
    );
  }

  function mostrarAvisoClavesFaltantes(msg) {
    const texto = msg || 'Configura primero tus claves en /lector/configurar y añádelas a Cloudflare Pages.';
    passphraseError.innerHTML = `⚠️ <strong>Atención:</strong> ${texto} <br><br><a href="/lector/configurar" class="btn btn-micro btn-crimson" style="display:inline-block; margin-top:6px; text-decoration:none;">Ir a Generar Claves</a>`;
    passphraseError.style.display = 'block';
    secretPassphraseInput.disabled = true;
    unlockBtn.disabled = true;
    passphraseModal.style.display = 'flex';
  }

  let encryptedPrivateKeyJSON = null;
  let claveYaCargada = false;

  // 1. Intentar restaurar clave previamente recordada en este navegador
  const claveGuardada = localStorage.getItem(STORAGE_KEY_UNLOCKED);
  if (claveGuardada) {
    try {
      await importarClavePrivada(claveGuardada);
      claveYaCargada = true;
    } catch (e) {
      console.warn('Clave en localStorage no válida o expirada:', e);
      localStorage.removeItem(STORAGE_KEY_UNLOCKED);
      actualizarEstadoClave(false);
    }
  } else {
    actualizarEstadoClave(false);
  }

  // 2. Obtener clave desde /api/clave
  try {
    const res = await fetch('/api/clave');
    if (res.status === 401) {
      window.location.href = '/acceso?redirect=/lector';
      return;
    }
    const data = await res.json();

    if (res.ok && data.rawPrivateKey) {
      // Clave entregada lista desde Cloudflare
      await importarClavePrivada(data.rawPrivateKey);
      localStorage.setItem(STORAGE_KEY_UNLOCKED, data.rawPrivateKey);
      claveYaCargada = true;
    } else if (res.ok && data.encryptedPrivateKey) {
      let rawKey = data.encryptedPrivateKey.trim();
      if (rawKey.startsWith('ZRNK1:')) {
        rawKey = rawKey.slice(6).trim();
      }
      encryptedPrivateKeyJSON = rawKey;

      // Si no estaba desbloqueada desde localStorage ni por servidor, solicitarla
      if (!claveYaCargada) {
        passphraseModal.style.display = 'flex';
        secretPassphraseInput.focus();
      }
    } else {
      if (!claveYaCargada) {
        mostrarAvisoClavesFaltantes(data.error);
      }
    }
  } catch (err) {
    console.error('Error al obtener la clave privada de /api/clave:', err);
    if (!claveYaCargada) {
      mostrarAvisoClavesFaltantes();
    }
  }

  // 3. Desbloquear la clave privada con la Frase Secreta y recordarla
  unlockBtn.addEventListener('click', async () => {
    const frase = secretPassphraseInput.value.trim();
    if (!frase) return;

    unlockBtn.disabled = true;
    unlockBtn.textContent = 'DESCIFRANDO...';
    passphraseError.style.display = 'none';

    try {
      if (!encryptedPrivateKeyJSON) {
        throw new Error('No hay secreto PRIVATE_KEY_ENC configurado en Cloudflare. Genéralo en /lector/configurar');
      }

      const pkcs8Buffer = await descifrarClavePrivadaConFrase(encryptedPrivateKeyJSON, frase);

      // Convertir ArrayBuffer a Base64 para almacenamiento local persistente
      const decBytes = new Uint8Array(pkcs8Buffer);
      let binaryStr = '';
      const chunk = 8192;
      for (let i = 0; i < decBytes.length; i += chunk) {
        binaryStr += String.fromCharCode.apply(null, decBytes.subarray(i, i + chunk));
      }
      const rawPrivateKeyB64 = btoa(binaryStr);

      await importarClavePrivada(rawPrivateKeyB64);
      localStorage.setItem(STORAGE_KEY_UNLOCKED, rawPrivateKeyB64);
      secretPassphraseInput.value = '';

    } catch (err) {
      passphraseError.textContent = 'Frase secreta incorrecta o clave corrupta: ' + err.message;
      passphraseError.style.display = 'block';
      secretPassphraseInput.focus();
    } finally {
      unlockBtn.disabled = false;
      unlockBtn.textContent = 'DESBLOQUEAR Y RECORDAR';
    }
  });

  // Permitir desbloquear con tecla Enter
  secretPassphraseInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      unlockBtn.click();
    }
  });

  // Cerrar modal de frase
  closePassphraseModalBtn?.addEventListener('click', () => {
    passphraseModal.style.display = 'none';
  });

  // Bloquear / Olvidar clave en este navegador
  lockKeyBtn?.addEventListener('click', () => {
    const confirmar = confirm('¿Deseas bloquear la clave en este navegador? Se solicitará la frase secreta para volver a descifrar pedidos.');
    if (!confirmar) return;

    localStorage.removeItem(STORAGE_KEY_UNLOCKED);
    rsaPrivateKeyDesbloqueada = null;
    actualizarEstadoClave(false);
    passphraseModal.style.display = 'flex';
    secretPassphraseInput.value = '';
    secretPassphraseInput.focus();
  });

  // Clic en badge de estado abre modal si está bloqueada
  keyStatusBadge?.addEventListener('click', () => {
    if (!rsaPrivateKeyDesbloqueada) {
      passphraseModal.style.display = 'flex';
      secretPassphraseInput.focus();
    }
  });

  // 4. Carga y Descifrado de archivos .zrn
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
      alert(err.message);
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

  // 5. Gestión del Modal "Cambiar Frase Secreta"
  openChangePassphraseBtn?.addEventListener('click', () => {
    changePassphraseModal.style.display = 'flex';
    changePassphraseError.style.display = 'none';
    changeResultBox.style.display = 'none';
    currentPassphraseInput.value = '';
    newPassphraseInput.value = '';
    currentPassphraseInput.focus();
  });

  closeChangeModalBtn?.addEventListener('click', () => {
    changePassphraseModal.style.display = 'none';
  });

  function evaluarFuerzaNuevaFrase(frase) {
    const f = frase.trim();
    if (!f) return { score: 0, texto: 'Mínimo 16 caracteres o 5 palabras.', valida: false };

    const comunes = ['zairen2026', 'zairen', 'admin', '123456', 'password', 'qwerty', 'taller2026'];
    const fLower = f.toLowerCase();
    for (const c of comunes) {
      if (fLower === c || (fLower.includes(c) && f.length < 18)) {
        return { score: 15, texto: '⚠️ Frase predecible o contiene términos prohibidos.', valida: false };
      }
    }

    const palabras = f.split(/[\s\-_.,;:]+/).filter(p => p.length >= 2);
    const cumple = f.length >= 16 || palabras.length >= 5;
    let score = Math.min(100, f.length * 4 + palabras.length * 5);

    if (!cumple) {
      return { score: Math.min(score, 35), texto: `Débil (${f.length} car., ${palabras.length} pal.). Mínimo 16 car. o 5 pal.`, valida: false };
    }

    return { score, texto: `Fuerte (${f.length} car., ${palabras.length} pal.). Nivel adecuado.`, valida: true };
  }

  newPassphraseInput?.addEventListener('input', () => {
    const ev = evaluarFuerzaNuevaFrase(newPassphraseInput.value);
    changeMeterBarFill.style.width = `${ev.score}%`;
    changeMeterBarFill.style.backgroundColor = ev.score < 40 ? '#df2842' : (ev.score < 70 ? '#e0a800' : '#2e7d32');
    changeMeterFeedback.textContent = ev.texto;
    changeMeterFeedback.style.color = ev.valida ? '#a5d6a7' : '#ff897d';
    executeChangePassphraseBtn.disabled = !ev.valida;
  });

  executeChangePassphraseBtn?.addEventListener('click', async () => {
    const fraseActual = currentPassphraseInput.value.trim();
    const fraseNueva = newPassphraseInput.value.trim();

    changePassphraseError.style.display = 'none';
    changeResultBox.style.display = 'none';

    if (!fraseActual) {
      changePassphraseError.textContent = 'Por favor introduce la frase secreta actual.';
      changePassphraseError.style.display = 'block';
      return;
    }

    const ev = evaluarFuerzaNuevaFrase(fraseNueva);
    if (!ev.valida) {
      changePassphraseError.textContent = ev.texto;
      changePassphraseError.style.display = 'block';
      return;
    }

    executeChangePassphraseBtn.disabled = true;
    executeChangePassphraseBtn.textContent = 'RE-CIFRANDO...';

    try {
      if (!encryptedPrivateKeyJSON) {
        throw new Error('No hay clave privada cargada desde Cloudflare Pages.');
      }

      // 1. Descifrar clave con la frase actual
      let pkcs8Buffer;
      try {
        pkcs8Buffer = await descifrarClavePrivadaConFrase(encryptedPrivateKeyJSON, fraseActual);
      } catch (e) {
        throw new Error('La frase secreta actual no es correcta.');
      }

      // 2. Derivar nueva clave AES con la nueva frase
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltB64 = btoa(String.fromCharCode(...salt));

      const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(fraseNueva),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const aesKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 600000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // 3. Cifrar con AES-GCM
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ivB64 = btoa(String.fromCharCode(...iv));

      const encryptedPkcs8Buffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        pkcs8Buffer
      );

      const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedPkcs8Buffer)));

      const newEncJSON = JSON.stringify({
        salt: saltB64,
        iv: ivB64,
        ciphertext: ciphertextB64,
        iterations: 600000,
        hash: 'SHA-256'
      });

      const newPrivKeyPrefixed = `ZRNK1:${newEncJSON}`;

      // 4. Actualizar estado local en memoria y en localStorage
      encryptedPrivateKeyJSON = newEncJSON;
      const decBytes = new Uint8Array(pkcs8Buffer);
      let binaryStr = '';
      const chunk = 8192;
      for (let i = 0; i < decBytes.length; i += chunk) {
        binaryStr += String.fromCharCode.apply(null, decBytes.subarray(i, i + chunk));
      }
      const rawPrivateKeyB64 = btoa(binaryStr);

      await importarClavePrivada(rawPrivateKeyB64);
      localStorage.setItem(STORAGE_KEY_UNLOCKED, rawPrivateKeyB64);

      // 5. Mostrar resultado para copiar a Cloudflare
      newPrivKeyDisplay.textContent = newPrivKeyPrefixed;
      changeResultBox.style.display = 'flex';
      executeChangePassphraseBtn.textContent = 'RE-CIFRADO COMPLETADO';

    } catch (err) {
      changePassphraseError.textContent = err.message;
      changePassphraseError.style.display = 'block';
      executeChangePassphraseBtn.disabled = false;
      executeChangePassphraseBtn.textContent = 'RE-CIFRAR CLAVE PRIVADA';
    }
  });

  copyNewPrivKeyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(newPrivKeyDisplay.textContent.trim());
      copyNewPrivKeyBtn.textContent = '¡COPIADO!';
      setTimeout(() => copyNewPrivKeyBtn.textContent = 'COPIAR NUEVO VALOR', 2000);
    } catch (e) {
      alert('Copia el texto manualmente del recuadro.');
    }
  });
});
