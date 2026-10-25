document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const errorMsg = document.getElementById('errorMessage');
  const submitBtn = document.getElementById('submitBtn');

  // Si hay error en la URL (ej. sesión expirada)
  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get('error');

  if (errorParam === 'expired') {
    errorMsg.textContent = 'Tu sesión ha expirado. Por favor ingresa nuevamente.';
    errorMsg.style.display = 'block';
  } else if (!errorParam) {
    // Si ya existe sesión activa válida, redirigir directamente al lector
    fetch('/api/clave', { method: 'GET' })
      .then(res => {
        if (res.ok) {
          const redirect = urlParams.get('redirect') || '/lector';
          window.location.replace(redirect);
        }
      })
      .catch(() => {});
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';

    const password = passwordInput.value;
    if (!password) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'VERIFICANDO...';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error de autenticación');
      }

      // Redireccionar al lector o a la ruta solicitada
      const redirect = urlParams.get('redirect') || '/lector';
      window.location.href = redirect;

    } catch (err) {
      errorMsg.textContent = err.message;
      errorMsg.style.display = 'block';
      passwordInput.focus();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'INGRESAR AL LECTOR';
    }
  });
});
