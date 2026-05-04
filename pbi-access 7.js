(() => {
  const ADMIN_EMAILS = ['rossmackintosh7@icloud.com', 'info@purbeckbusinessinnovations.co.uk'];

  function normalise(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isAdminEmail(email) {
    return ADMIN_EMAILS.includes(normalise(email));
  }

  function applyAdminState(isAdmin) {
    document.body.classList.toggle('pbi-is-admin', Boolean(isAdmin));
    document.querySelectorAll('[data-admin-only]').forEach((el) => {
      if (isAdmin) {
        el.hidden = false;
        el.setAttribute('aria-hidden', 'false');
      } else {
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function showDenied() {
    const main = document.querySelector('.pbi-app-main') || document.body;
    main.innerHTML = `
      <div class="pbi-access-denied">
        <p class="pbi-kicker">Admin only</p>
        <h1>That area is only available to PBI admin.</h1>
        <p>SEO Agent and Settings are hidden from customer accounts. Please log in as rossmackintosh7@icloud.com to access this section.</p>
        <p><a class="btn" href="/dashboard/">Back to dashboard</a> <a class="btn-ghost" href="/login/">Login</a></p>
      </div>`;
  }

  async function check() {
    applyAdminState(false);
    let email = '';
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.user?.email) email = data.user.email;
    } catch {}

    const isAdmin = isAdminEmail(email);
    applyAdminState(isAdmin);

    if (document.body.dataset.requireAdmin === 'true' && !isAdmin) {
      showDenied();
    }
  }

  document.addEventListener('DOMContentLoaded', check);
})();