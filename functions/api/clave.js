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
    // Se incluye un fallback pre-cifrado con la frase maestra "zairen2026" para funcionamiento inmediato
    const FALLBACK_PRIVATE_KEY_ENC = '{"salt":"iGTMW3MVtz/8TqNCU3Q26A==","iv":"gQdHZHylNSxprlCE","ciphertext":"pXh4uRhwsMJpXMoR65HDEPW4BzgWjfW39RMLMg3caV72EOIgVQIJ66NQ/HDvW493K3y66VsOxSWwr01aiu/k5liBFVOgy6CexUbZfvgJpRUGPBS65YDazY0T7+IQpj4lT4ylD/QHrxRjSBLdMl3okfqb5ios5IHmGm3GK4zwxyu5s8zjlLFFI1WMyPcsQ3ojGSsXvUL24Y3kU6EtsBmOEihstbGp46PziBCTYP3kPGgFa32cQGJLcU/4ryKNOMkf5XjFQF3glM3/cgWyjdqKtpsnUzKoiW0EEcBWpDnp8cxWLsdVrBML+NRlzzZKUDoKBdWUEA8NobMlrpzFg/hUfFxwkjNkA5efut0EDatZ1aMnltO3jkpV0LYlP/7m3+IJICHdo+487R+YOUME2MBR3ezUKShrO+8NOdEWLkasFLG0mjIXvZnQWEKTBp7LSxLSsEt9keEoNOOidZSQIQNjo12BYrqdSwmnYwC1nbTMnFvON8Dc6k2GoZEPDpJQoCPS1t8QWZm8rXT6x01HRbvqk/fgvi/694yRsCTnH9j9OsDUov1EIbJ5f7QeQIGrxMVcyONLD5CQrnNxf0WrvPu6/6w4/qSyEZbfy2ULjP9G/P/5rT8ExPbvZe4BOyjpP5v0kOYVsteYBWqOeZ82ZW75YpvMFndCiKRQ/7btCX7ZqIvq2rckONjdQszrf0G2H4B4JPiixb05proLrZew1CavXMwBf9zoTSM4HFH1qm2Rp/JCnS22S4b7B64AzD0HUaQTv9J5sL0+K9xmgqOeS7CHWbDUApqp8SIEWp192pRXC/j6jIDyEGG/sTSHhKHXm1o/14F+NoZBlwyGzNxw4+O774UwQbGxvObtVA7KbRTPkBgkktQJjvd5jCdhgRZTcgkgVbkFmybSoaHNU5yfNBymdxs4Uo5+BM5a4tGunt3FQOMEriqZWuJ6CPwhlTXQaYmdK5My9uFI24y9YhfNdcPJEOlBvR6MKtfiw3O6gjk/h3eDuSzoOIN7q4MvuE7R4quRVsmgsLw30PH4hohNOM9VFgX0cS2QjUIKrVsEATbhwiBh+PPL00gYMQijbAIk4mOGShwogzaB3DBOh7p0g8i8X+x/+xsz34KYa77XgLD16NxlOUx/DZMJg9/aPjfVQwRNXvXNwvJVR4Q/fAuISLkqpIC16d4l4cxZ6RM+iKgCvQOiTmH/D3a/pe5TDeqOufszXtleVrsC18x5jWfaCVMBuj1103cgkrPN2ppdetwgypntjgvDdiEOBCXzaX6Jp3gcoMNsDDs8ek57N4HExF4v3PPl3U0/BcAnjNfHrTIclQnvhS15QAXRLN14WURocNS5Nfkc39kiGqhhnnAv0269htyAF0lxlwy7LEu3HpTIQTrb/n9UcJFV54+GBDA3x+rvVhJYtqv1RVKJna+e3rSTC25NVqoJVxgkE9tOg2FbGMTQI+Z0BV8t+Sz2/ryZN6zAxl/xaC+Oe/nTi/+gMds/bcP2tM6TthLw7pmuYSbD1nuEx5GVkqdpMzMQcGGxmsm+RSWz70rp06yXPW61cVLosR/0rkeKDiDqhpw+v0NT/Ih9OF3ybdcVxFguWmvwDjNGou5vWM+fxLeATxGpse4HPY7g6vOwCFVPsMgL2sJW31xUYw==","iterations":100000}';
    const privateKeyEnc = env.PRIVATE_KEY_ENC || FALLBACK_PRIVATE_KEY_ENC;

    return new Response(JSON.stringify({
      encryptedPrivateKey: privateKeyEnc
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
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
