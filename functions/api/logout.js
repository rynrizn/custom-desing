/**
 * ============================================================================
 * Cloudflare Pages Function: /api/logout
 * ============================================================================
 * Invalida la sesión del administrador revocando la cookie zairen_session.
 */

export async function onRequest(context) {
  const cookieHeader = 'zairen_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';

  // Si es llamada desde navegador, redirigir a /acceso
  const url = new URL(context.request.url);
  if (context.request.headers.get('accept')?.includes('text/html')) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/acceso',
        'Set-Cookie': cookieHeader
      }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieHeader
    }
  });
}
