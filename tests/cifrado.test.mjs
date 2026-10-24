/**
 * ============================================================================
 * ZAIREN CAD Textil v2 — Test Automatizado de Cifrado y Descifrado .zrn
 * ============================================================================
 * Ejecutable con Node.js (v18+ con Web Crypto nativo):
 *   node tests/cifrado.test.mjs
 *
 * Verifica:
 * 1. Generación de par RSA-OAEP 3072 bits.
 * 2. Cifrado de clave privada con PBKDF2 (600k iteraciones) + AES-GCM y prefijo ZRNK1:.
 * 3. Exportación de clave pública con prefijo ZRNP1:.
 * 4. Cifrado binario híbrido .zrn de un payload simulado.
 * 5. Descifrado exitoso con la frase correcta y verificación byte a byte.
 * 6. Rechazo garantizado si se utiliza una frase secreta incorrecta.
 * 7. Rechazo garantizado si el paquete fue cifrado con un par de claves diferente.
 */

import assert from 'node:assert';

const MAGIC_ZRN1 = new Uint8Array([0x5A, 0x52, 0x4E, 0x31]); // ASCII: "ZRN1"

async function runTests() {
  console.log('--- INICIANDO SUITE DE PRUEBAS CRIPTOGRÁFICAS ZAIREN CAD V2 ---');

  const FRASE_CORRECTA = 'zairen-tarija-silueta-2026-corte-seguro';
  const FRASE_INCORRECTA = 'frase-totalmente-erronea-invalida';

  // --------------------------------------------------------------------------
  // PASO 1: Generar par RSA-OAEP 3072 bits
  // --------------------------------------------------------------------------
  console.log('1. Generando par de claves RSA-OAEP 3072 bits...');
  const keyPair1 = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 3072,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );

  // Exportar pública SPKI con prefijo ZRNP1:
  const spkiBuf1 = await crypto.subtle.exportKey('spki', keyPair1.publicKey);
  const spkiB64_1 = Buffer.from(spkiBuf1).toString('base64');
  const CLAVE_PUBLICA_1 = `ZRNP1:${spkiB64_1}`;
  console.log(`   ✓ Clave pública exportada (${CLAVE_PUBLICA_1.length} caracteres, prefijo ZRNP1:)`);

  // Cifrar privada PKCS#8 con PBKDF2 600K + AES-GCM
  const pkcs8Buf1 = await crypto.subtle.exportKey('pkcs8', keyPair1.privateKey);
  const salt1 = crypto.getRandomValues(new Uint8Array(16));
  const iv1 = crypto.getRandomValues(new Uint8Array(12));

  const baseKey1 = await crypto.subtle.importKey(
    'raw',
    Buffer.from(FRASE_CORRECTA),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey1 = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt1,
      iterations: 600000,
      hash: 'SHA-256'
    },
    baseKey1,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encryptedPrivKeyBuf1 = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv1 },
    aesKey1,
    pkcs8Buf1
  );

  const encObj1 = {
    salt: Buffer.from(salt1).toString('base64'),
    iv: Buffer.from(iv1).toString('base64'),
    ciphertext: Buffer.from(encryptedPrivKeyBuf1).toString('base64'),
    iterations: 600000,
    hash: 'SHA-256'
  };
  const PRIVATE_KEY_ENC_1 = `ZRNK1:${JSON.stringify(encObj1)}`;
  console.log(`   ✓ Clave privada cifrada con PBKDF2 (600k iter.) + AES-GCM (${PRIVATE_KEY_ENC_1.length} car., prefijo ZRNK1:)`);

  // --------------------------------------------------------------------------
  // PASO 2: Cifrar un paquete .zrn simulado con la clave pública
  // --------------------------------------------------------------------------
  console.log('2. Cifrando paquete .zrn simulado (32 KB datos de prueba)...');
  const payloadOriginal = crypto.getRandomValues(new Uint8Array(32 * 1024));

  // Importar clave pública tras retirar prefijo
  assert(CLAVE_PUBLICA_1.startsWith('ZRNP1:'));
  const rawSpkiB64 = CLAVE_PUBLICA_1.slice(6);
  const rsaPubKeyImportada = await crypto.subtle.importKey(
    'spki',
    Buffer.from(rawSpkiB64, 'base64'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  // Clave AES simétrica efímera
  const aesEphemeral = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const ivSimetrico = crypto.getRandomValues(new Uint8Array(12));

  // Cifrar datos con AAD "ZRN1"
  const aad = new TextEncoder().encode('ZRN1');
  const ciphertextSimetrico = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivSimetrico, additionalData: aad },
    aesEphemeral,
    payloadOriginal
  );

  // Envolver clave AES con RSA-OAEP
  const rawAesKey = await crypto.subtle.exportKey('raw', aesEphemeral);
  const wrappedKeyBuf = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPubKeyImportada,
    rawAesKey
  );

  // Ensamblar binario .zrn
  const wrappedKeyLen = wrappedKeyBuf.byteLength;
  const totalLen = 4 + 2 + wrappedKeyLen + 12 + ciphertextSimetrico.byteLength;
  const zrnBuffer = new ArrayBuffer(totalLen);
  const zrnView = new DataView(zrnBuffer);
  const zrnBytes = new Uint8Array(zrnBuffer);

  zrnBytes.set(MAGIC_ZRN1, 0);
  zrnView.setUint16(4, wrappedKeyLen, false);
  zrnBytes.set(new Uint8Array(wrappedKeyBuf), 6);
  zrnBytes.set(ivSimetrico, 6 + wrappedKeyLen);
  zrnBytes.set(new Uint8Array(ciphertextSimetrico), 6 + wrappedKeyLen + 12);

  console.log(`   ✓ Archivo .zrn generado exitosamente (${zrnBytes.byteLength} bytes)`);

  // --------------------------------------------------------------------------
  // PASO 3: Descifrado con la frase correcta
  // --------------------------------------------------------------------------
  console.log('3. Probando descifrado con la frase secreta correcta...');
  assert(PRIVATE_KEY_ENC_1.startsWith('ZRNK1:'));
  const parsedEncObj = JSON.parse(PRIVATE_KEY_ENC_1.slice(6));

  const baseKeyDesbloqueo = await crypto.subtle.importKey(
    'raw',
    Buffer.from(FRASE_CORRECTA),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKeyDesbloqueo = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: Buffer.from(parsedEncObj.salt, 'base64'),
      iterations: parsedEncObj.iterations,
      hash: 'SHA-256'
    },
    baseKeyDesbloqueo,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const pkcs8DescifradoBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(parsedEncObj.iv, 'base64') },
    aesKeyDesbloqueo,
    Buffer.from(parsedEncObj.ciphertext, 'base64')
  );

  const rsaPrivKeyDesbloqueada = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8DescifradoBuf,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );

  // Desempaquetar y descifrar paquete .zrn
  const desempaquetarView = new DataView(zrnBuffer);
  const desempaquetarBytes = new Uint8Array(zrnBuffer);
  const magicStr = String.fromCharCode(...desempaquetarBytes.slice(0, 4));
  assert.strictEqual(magicStr, 'ZRN1', 'La cabecera mágica debe ser ZRN1');

  const wKeyLen = desempaquetarView.getUint16(4, false);
  const wKey = zrnBuffer.slice(6, 6 + wKeyLen);
  const ivExtraido = desempaquetarBytes.slice(6 + wKeyLen, 6 + wKeyLen + 12);
  const cipherExtraido = zrnBuffer.slice(6 + wKeyLen + 12);

  // Desenvolver clave AES
  const rawAesDesenvoltorio = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivKeyDesbloqueada,
    wKey
  );

  const aesImportadaLector = await crypto.subtle.importKey(
    'raw',
    rawAesDesenvoltorio,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const payloadDescifradoBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivExtraido, additionalData: aad },
    aesImportadaLector,
    cipherExtraido
  );

  const payloadDescifradoBytes = new Uint8Array(payloadDescifradoBuf);
  assert.strictEqual(payloadDescifradoBytes.byteLength, payloadOriginal.byteLength, 'La longitud debe coincidir exactamente');
  assert.deepStrictEqual(payloadDescifradoBytes, payloadOriginal, 'El contenido descifrado debe ser idéntico byte a byte');
  console.log('   ✓ Descifrado exitoso e integridad verificada al 100%');

  // --------------------------------------------------------------------------
  // PASO 4: Prueba negativa con frase secreta incorrecta
  // --------------------------------------------------------------------------
  console.log('4. Probando rechazo con frase secreta incorrecta...');
  let falloEsperadoFrase = false;
  try {
    const baseKeyFalsa = await crypto.subtle.importKey(
      'raw',
      Buffer.from(FRASE_INCORRECTA),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const aesKeyFalsa = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: Buffer.from(parsedEncObj.salt, 'base64'),
        iterations: parsedEncObj.iterations,
        hash: 'SHA-256'
      },
      baseKeyFalsa,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Buffer.from(parsedEncObj.iv, 'base64') },
      aesKeyFalsa,
      Buffer.from(parsedEncObj.ciphertext, 'base64')
    );
  } catch (err) {
    falloEsperadoFrase = true;
  }
  assert.strictEqual(falloEsperadoFrase, true, 'Debe fallar el descifrado si la frase es incorrecta');
  console.log('   ✓ Rechazo correcto: una frase incorrecta no puede descifrar la clave');

  // --------------------------------------------------------------------------
  // PASO 5: Prueba negativa con clave pública distinta
  // --------------------------------------------------------------------------
  console.log('5. Probando rechazo cuando el pedido se cifra con otra clave pública...');
  const keyPair2 = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 3072,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );

  // Cifrar clave AES con clave pública 2
  const wrappedKeyConClave2 = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    keyPair2.publicKey,
    rawAesKey
  );

  let falloEsperadoParDistinto = false;
  try {
    // Intentar descifrar con la clave privada 1
    await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      rsaPrivKeyDesbloqueada,
      wrappedKeyConClave2
    );
  } catch (err) {
    falloEsperadoParDistinto = true;
  }
  assert.strictEqual(falloEsperadoParDistinto, true, 'Debe fallar el descifrado si se cifró con otra clave pública');
  console.log('   ✓ Rechazo correcto: un pedido cifrado con otra clave pública es rechazado');

  console.log('\n===============================================================');
  console.log('TODAS LAS PRUEBAS CRIPTOGRÁFICAS PASARON CON ÉXITO (7/7)');
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('ERROR EN PRUEBAS CRIPTOGRÁFICAS:', err);
  process.exit(1);
});
