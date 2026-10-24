/**
 * ============================================================================
 * Cloudflare Pages Function: POST /api/login
 * ============================================================================
 * Compara la contraseña en tiempo constante, protege contra fuerza bruta
 * (máx 5 intentos en 15 min vía KV opcional) y emite cookie firmada con HMAC.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const password = body.password || '';

    // Obtener IP del cliente
    const clientIP = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
    const kvKey = `login_fail:${clientIP}`;

    // 1. Control de Fuerza Bruta (KV opcional: LOGIN_KV)
    if (env.LOGIN_KV) {
      const intentos = parseInt(await env.LOGIN_KV.get(kvKey) || '0', 10);
      if (intentos >= 5) {
        return new Response(JSON.stringify({
          error: 'Demasiados intentos fallidos. Bloqueado temporalmente por 15 minutos.'
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Retardo fijo de seguridad si no hay KV configurado
      await new Promise(r => setTimeout(r, 450));
    }

    const expectedPassword = env.ADMIN_PASSWORD || '';
    if (!expectedPassword) {
      return new Response(JSON.stringify({
        error: 'El secreto ADMIN_PASSWORD no está configurado en Cloudflare Pages.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Comparación en tiempo constante usando SHA-256 de ambas
    const hashInput = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const hashExpected = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(expectedPassword));

    const bytesInput = new Uint8Array(hashInput);
    const bytesExpected = new Uint8Array(hashExpected);

    let match = true;
    for (let i = 0; i < bytesInput.length; i++) {
      if (bytesInput[i] !== bytesExpected[i]) {
        match = false;
      }
    }

    if (!match) {
      if (env.LOGIN_KV) {
        const fallos = parseInt(await env.LOGIN_KV.get(kvKey) || '0', 10) + 1;
        await env.LOGIN_KV.put(kvKey, fallos.toString(), { expirationTtl: 900 }); // 15 min
      }
      return new Response(JSON.stringify({
        error: 'Contraseña incorrecta.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Limpiar intentos fallidos si el login es exitoso
    if (env.LOGIN_KV) {
      await env.LOGIN_KV.delete(kvKey);
    }

    // 3. Emitir Cookie Firmada con HMAC-SHA256 (Vence en 8 horas = 28800s)
    const sessionSecret = env.SESSION_SECRET || '';
    if (!sessionSecret) {
      return new Response(JSON.stringify({
        error: 'SESSION_SECRET no configurado en Cloudflare Pages.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const expiresAt = Date.now() + 8 * 3600 * 1000;
    const payload = JSON.stringify({ admin: true, exp: expiresAt });
    const payloadB64 = btoa(payload);

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(sessionSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(payloadB64));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    const cookieValue = `${payloadB64}.${signatureB64}`;
    const cookieHeader = `zairen_session=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;

    return new Response(JSON.stringify({
      ok: true,
      redirect: '/lector'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
