/**
 * ============================================================================
 * Cloudflare Pages Function: GET /api/publica
 * ============================================================================
 * Entrega la clave pública RSA (env.CLAVE_PUBLICA) a los clientes para cifrar
 * pedidos en el navegador hacia el taller. No requiere autenticación.
 */

export async function onRequestGet(context) {
  const { env } = context;

  const clavePublica = env.CLAVE_PUBLICA || '';

  return new Response(JSON.stringify({
    clavePublica: clavePublica
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
