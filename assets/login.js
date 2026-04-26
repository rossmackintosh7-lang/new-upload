document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const button = document.getElementById('loginBtn');
  const message = document.getElementById('message');

  function showMessage(text, type = 'info') {
    if (!message) return;

    message.textContent = text;
    message.style.display = 'block';
    message.className = `notice domain-${type}`;
  }

  if (!form) {
    console.error('Login form not found.');
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = String(emailInput?.value || '').trim();
    const password = String(passwordInput?.value || '');

    if (!email || !password) {
      showMessage('Enter your email and password.', 'error');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Logging in...';
    }

    showMessage('Checking your details...', 'info');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || result.message || `Login failed with status ${response.status}`);
      }

      showMessage('Login successful. Taking you to your dashboard...', 'success');

      window.location.href = '/dashboard/';
    } catch (err) {
      console.error('Login failed:', err);
      showMessage(err.message || 'Login failed. Please check your details.', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Login';
      }
    }
  });
});
