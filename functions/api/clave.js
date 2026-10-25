/**
 * ============================================================================
 * Cloudflare Pages Function: GET /api/clave
 * ============================================================================
 * Entrega la clave privada cifrada (PRIVATE_KEY_ENC) ÚNICAMENTE a sesiones
 * con cookie HMAC válida. El servidor nunca conoce la frase secreta.
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

    // 4. Retornar el secreto PRIVATE_KEY_ENC (protegido con la frase secreta del admin)
    const privateKeyEnc = env.PRIVATE_KEY_ENC || '';
    if (!privateKeyEnc) {
      return new Response(JSON.stringify({
        error: 'El secreto PRIVATE_KEY_ENC aún no se ha configurado en Cloudflare Pages. Genéralo en /lector/configurar'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      encryptedPrivateKey: privateKeyEnc
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
