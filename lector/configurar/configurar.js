document.addEventListener('DOMContentLoaded', () => {
  const passphraseInput = document.getElementById('passphraseInput');
  const meterBarFill = document.getElementById('meterBarFill');
  const meterFeedback = document.getElementById('meterFeedback');
  const generateBtn = document.getElementById('generateKeysBtn');

  const resultsContainer = document.getElementById('resultsContainer');
  const pubKeyDisplay = document.getElementById('pubKeyDisplay');
  const privKeyDisplay = document.getElementById('privKeyDisplay');
  const pubKeyLenBadge = document.getElementById('pubKeyLenBadge');
  const privKeyLenBadge = document.getElementById('privKeyLenBadge');
  const copyPubKeyBtn = document.getElementById('copyPubKeyBtn');
  const copyPrivKeyBtn = document.getElementById('copyPrivKeyBtn');
  const downloadBackupBtn = document.getElementById('downloadBackupBtn');

  const verifyPubKeyInput = document.getElementById('verifyPubKeyInput');
  const verifyPrivKeyInput = document.getElementById('verifyPrivKeyInput');
  const verifyPassphraseInput = document.getElementById('verifyPassphraseInput');
  const verifyPairBtn = document.getElementById('verifyPairBtn');
  const verifyResultAlert = document.getElementById('verifyResultAlert');

  let ultimoRespaldo = null;

  // 1. Evaluación de Fuerza de la Frase Secreta
  function evaluarFuerzaFrase(frase) {
    const f = frase.trim();
    if (!f) {
      return { score: 0, nivel: 'vacio', texto: 'Introduce al menos 16 caracteres o 5 palabras.', valida: false };
    }

    // Lista de palabras débiles o predecibles
    const comunes = [
      'zairen2026', 'zairen', 'admin', 'administrator', '123456', '12345678',
      '123456789', 'password', 'qwerty', 'contraseña', 'taller2026', 'secreto',
      'customytee', 'cadtextil', 'root', 'login'
    ];
    const fLower = f.toLowerCase();
    for (const c of comunes) {
      if (fLower === c || (fLower.includes(c) && f.length < 18)) {
        return {
          score: 15,
          nivel: 'insegura',
          texto: '⚠️ Frase predecible o contiene términos comunes prohibidos. Elige algo más original.',
          valida: false
        };
      }
    }

    // Análisis de longitud y conteo de palabras
    const palabras = f.split(/[\s\-_.,;:]+/).filter(p => p.length >= 2);
    const numPalabras = palabras.length;
    const longitud = f.length;

    // Regla estricta: mínimo 16 caracteres o 5 palabras
    const cumpleMinimo = longitud >= 16 || numPalabras >= 5;

    let score = 0;
    if (longitud >= 8) score += 15;
    if (longitud >= 14) score += 20;
    if (longitud >= 20) score += 25;
    if (numPalabras >= 3) score += 15;
    if (numPalabras >= 5) score += 25;
    if (/[0-9]/.test(f)) score += 10;
    if (/[^a-zA-Z0-9\s]/.test(f)) score += 10;
    if (score > 100) score = 100;

    if (!cumpleMinimo) {
      return {
        score: Math.min(score, 35),
        nivel: 'debil',
        texto: `Frase débil (${longitud} caracteres, ${numPalabras} palabras). Requiere al menos 16 caracteres o 5 palabras.`,
        valida: false
      };
    }

    if (score < 60) {
      return {
        score: score,
        nivel: 'aceptable',
        texto: `Aceptable (${longitud} caracteres, ${numPalabras} palabras). Recomendada para el taller.`,
        valida: true
      };
    }

    return {
      score: score,
      nivel: 'fuerte',
      texto: `Óptima (${longitud} caracteres, ${numPalabras} palabras). Excelente entropía criptográfica.`,
      valida: true
    };
  }

  passphraseInput?.addEventListener('input', () => {
    const evaluacion = evaluarFuerzaFrase(passphraseInput.value);

    meterBarFill.style.width = `${evaluacion.score}%`;
    if (evaluacion.score < 40) {
      meterBarFill.style.backgroundColor = '#df2842';
      meterFeedback.style.color = '#ff897d';
    } else if (evaluacion.score < 70) {
      meterBarFill.style.backgroundColor = '#e0a800';
      meterFeedback.style.color = '#ffd166';
    } else {
      meterBarFill.style.backgroundColor = '#2e7d32';
      meterFeedback.style.color = '#a5d6a7';
    }

    meterFeedback.textContent = evaluacion.texto;
    generateBtn.disabled = !evaluacion.valida;
  });

  // 2. Generación de Claves RSA-OAEP 3072 bits + PBKDF2 600K + AES-GCM
  generateBtn?.addEventListener('click', async () => {
    const frase = passphraseInput.value.trim();
    const evaluacion = evaluarFuerzaFrase(frase);
    if (!evaluacion.valida) {
      alert(evaluacion.texto);
      passphraseInput.focus();
      return;
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>GENERANDO CLAVES 3072 BITS (ESPERE)...</span>';

    try {
      // 1. Generar par de claves RSA-OAEP 3072 bits
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 3072,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      );

      // 2. Exportar Clave Pública SPKI a Base64 con prefijo ZRNP1:
      const spkiBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const spkiB64 = btoa(String.fromCharCode(...new Uint8Array(spkiBuffer)));
      const pubKeyWithPrefix = `ZRNP1:${spkiB64}`;

      // 3. Exportar Clave Privada PKCS#8
      const pkcs8Buffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      // 4. Derivar clave simétrica desde la Frase Secreta usando PBKDF2 (600,000 iteraciones)
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltB64 = btoa(String.fromCharCode(...salt));

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
          iterations: 600000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // 5. Cifrar la clave privada PKCS#8 con AES-GCM
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ivB64 = btoa(String.fromCharCode(...iv));

      const encryptedPkcs8Buffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        pkcs8Buffer
      );

      const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedPkcs8Buffer)));

      // Formato JSON con prefijo ZRNK1:
      const privKeyEncJSON = JSON.stringify({
        salt: saltB64,
        iv: ivB64,
        ciphertext: ciphertextB64,
        iterations: 600000,
        hash: 'SHA-256'
      });
      const privKeyWithPrefix = `ZRNK1:${privKeyEncJSON}`;

      // Mostrar en pantalla con contador de caracteres
      pubKeyDisplay.textContent = pubKeyWithPrefix;
      pubKeyLenBadge.textContent = `${pubKeyWithPrefix.length} caracteres`;

      privKeyDisplay.textContent = privKeyWithPrefix;
      privKeyLenBadge.textContent = `${privKeyWithPrefix.length} caracteres`;

      resultsContainer.style.display = 'flex';

      // Pre-cargar en la caja de comprobación para conveniencia
      verifyPubKeyInput.value = pubKeyWithPrefix;
      verifyPrivKeyInput.value = privKeyWithPrefix;
      verifyPassphraseInput.value = frase;

      ultimoRespaldo = {
        app: 'ZAIREN CAD Textil v2',
        fechaGeneracion: new Date().toISOString(),
        CLAVE_PUBLICA: pubKeyWithPrefix,
        PRIVATE_KEY_ENC: privKeyWithPrefix,
        algoritmo: 'RSA-OAEP-3072 / PBKDF2-600K / AES-GCM-256',
        aviso: 'Conserva este archivo en un medio offline seguro. Tu clave privada está cifrada con tu frase secreta.'
      };

      generateBtn.innerHTML = '<span>✅ ¡CLAVES GENERADAS CORRECTAMENTE!</span>';
    } catch (err) {
      alert('Error al generar claves: ' + err.message);
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span>GENERAR CLAVES CRIPTOGRÁFICAS</span>';
    }
  });

  // 3. Botones de Copiar con confirmación visual
  function setupCopyButton(btn, targetEl) {
    btn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(targetEl.textContent.trim());
        const originalText = btn.textContent;
        btn.textContent = '¡COPIADO!';
        btn.style.background = '#2e7d32';
        btn.style.color = '#FAF9F6';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.style.color = '';
        }, 2000);
      } catch (err) {
        alert('No se pudo copiar automáticamente: ' + err.message);
      }
    });
  }

  setupCopyButton(copyPubKeyBtn, pubKeyDisplay);
  setupCopyButton(copyPrivKeyBtn, privKeyDisplay);

  // 4. Descargar Respaldo JSON
  downloadBackupBtn?.addEventListener('click', () => {
    if (!ultimoRespaldo) return;
    const blob = new Blob([JSON.stringify(ultimoRespaldo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zairen-claves-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  // 5. Caja Comprobar y Verificar
  verifyPairBtn?.addEventListener('click', async () => {
    verifyResultAlert.style.display = 'none';
    verifyResultAlert.className = 'result-alert';
    verifyPairBtn.disabled = true;
    verifyPairBtn.textContent = 'VERIFICANDO...';

    try {
      let rawPubKey = verifyPubKeyInput.value.trim();
      let rawPrivKey = verifyPrivKeyInput.value.trim();
      let frase = verifyPassphraseInput.value.trim();

      if (!rawPubKey) throw new Error('Por favor ingresa la CLAVE_PUBLICA.');
      if (!rawPrivKey) throw new Error('Por favor ingresa la PRIVATE_KEY_ENC.');
      if (!frase) throw new Error('Por favor ingresa la Frase Secreta.');

      if (rawPubKey.startsWith('ZRNP1:')) rawPubKey = rawPubKey.slice(6).trim();
      if (rawPrivKey.startsWith('ZRNK1:')) rawPrivKey = rawPrivKey.slice(6).trim();

      // Parsear JSON de clave privada
      let encObj;
      try {
        encObj = JSON.parse(rawPrivKey);
      } catch (e) {
        throw new Error('El valor PRIVATE_KEY_ENC no es un JSON válido. Asegúrate de haber copiado toda la cadena.');
      }

      if (!encObj.salt || !encObj.iv || !encObj.ciphertext) {
        throw new Error('El objeto PRIVATE_KEY_ENC no contiene los campos requeridos (salt, iv, ciphertext).');
      }

      // Descifrar con PBKDF2 + AES-GCM
      let pkcs8Buffer;
      try {
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

        pkcs8Buffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          aesKey,
          ciphertext
        );
      } catch (err) {
        throw new Error('Frase secreta incorrecta o clave corrupta: No se pudo descifrar la clave privada.');
      }

      // Importar clave privada descifrada
      let rsaPrivKey;
      try {
        rsaPrivKey = await crypto.subtle.importKey(
          'pkcs8',
          pkcs8Buffer,
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          false,
          ['decrypt']
        );
      } catch (err) {
        throw new Error('La clave descifrada no es una clave privada RSA válida: ' + err.message);
      }

      // Importar clave pública
      let rsaPubKey;
      try {
        const cleanB64 = rawPubKey.replace(/-----[^\n]+-----|\s+/g, '');
        const bytes = new Uint8Array(atob(cleanB64).split('').map(c => c.charCodeAt(0)));
        rsaPubKey = await crypto.subtle.importKey(
          'spki',
          bytes.buffer,
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          false,
          ['encrypt']
        );
      } catch (err) {
        throw new Error('La CLAVE_PUBLICA no tiene un formato SPKI Base64 válido: ' + err.message);
      }

      // Probar ciclo completo de cifrado / descifrado
      const payloadPrueba = new TextEncoder().encode('ZAIREN_VERIFY_OK_' + Date.now());
      let cifradoPrueba;
      try {
        cifradoPrueba = await crypto.subtle.encrypt(
          { name: 'RSA-OAEP' },
          rsaPubKey,
          payloadPrueba
        );
      } catch (err) {
        throw new Error('Error al cifrar mensaje de prueba con la clave pública: ' + err.message);
      }

      let descifradoPrueba;
      try {
        descifradoPrueba = await crypto.subtle.decrypt(
          { name: 'RSA-OAEP' },
          rsaPrivKey,
          cifradoPrueba
        );
      } catch (err) {
        throw new Error('❌ La clave pública NO corresponde con la clave privada descifrada. Pertenecen a pares de claves diferentes.');
      }

      const match = new TextDecoder().decode(descifradoPrueba) === new TextDecoder().decode(payloadPrueba);
      if (!match) {
        throw new Error('Fallo de integridad: El mensaje descifrado difiere del original.');
      }

      verifyResultAlert.className = 'result-alert success';
      verifyResultAlert.innerHTML = '<strong>✅ Claves válidas y coincidentes:</strong> La clave privada se descifró con éxito con la frase secreta y el ciclo completo de cifrado/descifrado con la clave pública funcionó a la perfección.';
      verifyResultAlert.style.display = 'block';

    } catch (err) {
      verifyResultAlert.className = 'result-alert error';
      verifyResultAlert.innerHTML = `<strong>⚠️ Falló la verificación:</strong> ${err.message}`;
      verifyResultAlert.style.display = 'block';
    } finally {
      verifyPairBtn.disabled = false;
      verifyPairBtn.textContent = '🔍 VERIFICAR COINCIDENCIA DE CLAVES Y FRASE';
    }
  });
});
