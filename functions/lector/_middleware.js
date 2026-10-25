/**
 * ============================================================================
 * Cloudflare Pages Function Middleware: /lector/*
 * ============================================================================
 * Protege todas las rutas de /lector/* (incluyendo /lector/configurar) verificando
 * la cookie de sesión HMAC. El generador y el lector solo los usa el administrador.
 */

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const redirectTarget = `/acceso?redirect=${encodeURIComponent(url.pathname)}`;

  // 1. Extraer cookie zairen_session
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/zairen_session=([^;]+)/);

  if (!match) {
    return Response.redirect(new URL(redirectTarget, request.url), 302);
  }

  const token = match[1];
  const partes = token.split('.');
  if (partes.length !== 2) {
    return Response.redirect(new URL(redirectTarget, request.url), 302);
  }

  const [payloadB64, signatureB64] = partes;
  const sessionSecret = env.SESSION_SECRET || '';

  if (!sessionSecret) {
    return Response.redirect(new URL('/acceso?error=no_secret', request.url), 302);
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
      return Response.redirect(new URL(redirectTarget, request.url), 302);
    }

    const payload = JSON.parse(atob(payloadB64));
    if (!payload.exp || Date.now() > payload.exp) {
      return Response.redirect(new URL('/acceso?error=expired', request.url), 302);
    }

    return next();
  } catch (err) {
    return Response.redirect(new URL('/acceso?error=invalid', request.url), 302);
  }
}
