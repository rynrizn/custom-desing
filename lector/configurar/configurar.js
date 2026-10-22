document.addEventListener('DOMContentLoaded', () => {
  const passphraseInput = document.getElementById('passphraseInput');
  const generateBtn = document.getElementById('generateKeysBtn');
  const resultsContainer = document.getElementById('resultsContainer');
  const pubKeyDisplay = document.getElementById('pubKeyDisplay');
  const privKeyDisplay = document.getElementById('privKeyDisplay');
  const copyPubKeyBtn = document.getElementById('copyPubKeyBtn');
  const copyPrivKeyBtn = document.getElementById('copyPrivKeyBtn');
  const downloadBackupBtn = document.getElementById('downloadBackupBtn');

  let ultimoRespaldo = null;

  generateBtn.addEventListener('click', async () => {
    const frase = passphraseInput.value.trim();
    if (!frase || frase.length < 8) {
      alert('Por favor introduce una frase secreta de al menos 8 caracteres.');
      passphraseInput.focus();
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'GENERANDO CLAVES (PUEDE TARDAR UNOS SEGUNDOS)...';

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

      // 2. Exportar Clave Pública SPKI a Base64
      const spkiBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const spkiB64 = btoa(String.fromCharCode(...new Uint8Array(spkiBuffer)));

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

      // Formato compacto para Cloudflare Secret PRIVATE_KEY_ENC (< 5 KB)
      const privKeyEncJSON = JSON.stringify({
        salt: saltB64,
        iv: ivB64,
        ciphertext: ciphertextB64,
        iterations: 600000,
        hash: 'SHA-256'
      });

      // Mostrar en pantalla
      pubKeyDisplay.textContent = spkiB64;
      privKeyDisplay.textContent = privKeyEncJSON;
      resultsContainer.style.display = 'flex';

      ultimoRespaldo = {
        app: 'ZAIREN CAD Textil v2',
        fechaGeneracion: new Date().toISOString(),
        publicKeySpkiBase64: spkiB64,
        encryptedPrivateKey: privKeyEncJSON,
        nota: 'Guarda este archivo en un lugar seguro. Tu clave privada está cifrada con tu frase secreta.'
      };

      generateBtn.textContent = '¡CLAVES GENERADAS EXITOSAMENTE!';
    } catch (err) {
      alert('Error al generar claves: ' + err.message);
      generateBtn.disabled = false;
      generateBtn.textContent = 'GENERAR CLAVES CRIPTOGRÁFICAS';
    }
  });

  copyPubKeyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(pubKeyDisplay.textContent);
    copyPubKeyBtn.textContent = '¡COPIADO!';
    setTimeout(() => copyPubKeyBtn.textContent = 'COPIAR', 2000);
  });

  copyPrivKeyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(privKeyDisplay.textContent);
    copyPrivKeyBtn.textContent = '¡COPIADO!';
    setTimeout(() => copyPrivKeyBtn.textContent = 'COPIAR', 2000);
  });

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
});
