/**
 * ============================================================================
 * Cloudflare Pages Function: GET /api/clave
 * ============================================================================
 * Entrega la clave privada a sesiones con cookie HMAC válida.
 * Soporta dos modalidades de acceso:
 * 1. Acceso Directo Total: Si FRASE_SECRETA (o PRIVATE_KEY) está configurada
 *    en Cloudflare Pages Secrets, el servidor descifra la clave vía Web Crypto
 *    (PBKDF2 600.000 iteraciones + AES-GCM-256) y entrega `rawPrivateKey` (Base64 PKCS#8),
 *    permitiendo al administrador entrar directo sin ingresar la frase manualmente.
 * 2. Cero-Conocimiento: Si FRASE_SECRETA no está en el servidor, entrega
 *    `encryptedPrivateKey` (PRIVATE_KEY_ENC) para descifrado local en navegador.
 */

export async function onRequestGet(context) {
  const { request, env } = context;

  // 1. Obtener cookie de sesión
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/zairen_session=([^;]+)/);

  if (!match) {
    return new Response(JSON.stringify({ error: 'No autenticado. Inicia sesión en /acceso' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = match[1];
  const partes = token.split('.');
  if (partes.length !== 2) {
    return new Response(JSON.stringify({ error: 'Sesión corrupta' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const [payloadB64, signatureB64] = partes;

  // 2. Verificar firma HMAC
  const sessionSecret = env.SESSION_SECRET || '';
  if (!sessionSecret) {
    return new Response(JSON.stringify({ error: 'SESSION_SECRET no configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(sessionSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(atob(signatureB64).split('').map(c => c.charCodeAt(0)));
    const esValida = await crypto.subtle.verify(
      'HMAC',
      hmacKey,
      sigBytes,
      new TextEncoder().encode(payloadB64)
    );

    if (!esValida) {
      return new Response(JSON.stringify({ error: 'Firma de sesión inválida' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Verificar expiración
    const payload = JSON.parse(atob(payloadB64));
    if (!payload.exp || Date.now() > payload.exp) {
      return new Response(JSON.stringify({ error: 'Sesión expirada' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Modo Directo: Clave privada sin cifrar ya configurada en entorno
    const rawDirectKey = env.PRIVATE_KEY || '';
    if (rawDirectKey) {
      let cleanKey = rawDirectKey.trim();
      if (cleanKey.startsWith('ZRNK1:')) cleanKey = cleanKey.slice(6).trim();
      return new Response(JSON.stringify({
        rawPrivateKey: cleanKey,
        modo: 'directo_env'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    // 5. Verificar si existe PRIVATE_KEY_ENC
    const privateKeyEnc = env.PRIVATE_KEY_ENC || '';
    if (!privateKeyEnc) {
      return new Response(JSON.stringify({
        error: 'El secreto PRIVATE_KEY_ENC aún no se ha configurado en Cloudflare Pages. Genéralo en /lector/configurar'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Modo Acceso Directo por Servidor: Si FRASE_SECRETA está en Cloudflare
    const fraseSecreta = (env.FRASE_SECRETA || env.SECRET_PASSPHRASE || '').trim();
    if (fraseSecreta) {
      try {
        let rawJsonStr = privateKeyEnc.trim();
        if (rawJsonStr.startsWith('ZRNK1:')) rawJsonStr = rawJsonStr.slice(6).trim();
        const encObj = JSON.parse(rawJsonStr);

        const salt = new Uint8Array(atob(encObj.salt).split('').map(c => c.charCodeAt(0)));
        const iv = new Uint8Array(atob(encObj.iv).split('').map(c => c.charCodeAt(0)));
        const ciphertext = new Uint8Array(atob(encObj.ciphertext).split('').map(c => c.charCodeAt(0)));

        const baseKey = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(fraseSecreta),
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

        const decryptedBuf = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          aesKey,
          ciphertext
        );

        const decBytes = new Uint8Array(decryptedBuf);
        let binaryStr = '';
        const chunk = 8192;
        for (let i = 0; i < decBytes.length; i += chunk) {
          binaryStr += String.fromCharCode.apply(null, decBytes.subarray(i, i + chunk));
        }
        const rawPrivateKeyB64 = btoa(binaryStr);

        return new Response(JSON.stringify({
          rawPrivateKey: rawPrivateKeyB64,
          modo: 'directo_servidor'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });

      } catch (decryptErr) {
        console.error('Error al descifrar con FRASE_SECRETA en Cloudflare:', decryptErr);
        // Fallback defensivo a modo cero-conocimiento con advertencia
        return new Response(JSON.stringify({
          encryptedPrivateKey: privateKeyEnc,
          aviso: 'La FRASE_SECRETA en Cloudflare no coincide con PRIVATE_KEY_ENC. Por favor introduce la frase manualmente.',
          modo: 'cero_conocimiento'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
      }
    }

    // 7. Modo Cero-Conocimiento: Retornar PRIVATE_KEY_ENC para desbloqueo local en navegador
    return new Response(JSON.stringify({
      encryptedPrivateKey: privateKeyEnc,
      modo: 'cero_conocimiento'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error al verificar sesión: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
