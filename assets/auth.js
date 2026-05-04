window.PBIAuth = (() => {
  function showMessage(id, kind, text, html = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    el.className = `notice ${kind}`;
    if (html) el.innerHTML = text;
    else el.textContent = text;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function signupLoginLink() {
    const next = `${location.pathname}${location.search}`;
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard/';
    return `/login/?next=${encodeURIComponent(safeNext)}`;
  }

  async function requestJson(path, body) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin'
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
    if (!response.ok) {
      const fallback = text && text.length < 240 && !text.trim().startsWith('<') ? text.trim() : `Request failed with status ${response.status}.`;
      throw new Error(data.error || data.message || fallback);
    }
    return data;
  }

  function attachSignup(formId, messageId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(form);
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
      try {
        const params = new URLSearchParams(window.location.search);
        const templatePreset = params.get('template_preset') || '';
        const selectedPlan = ['starter','business','plus'].includes((params.get('plan') || '').toLowerCase()) ? (params.get('plan') || '').toLowerCase() : '';
        if (!selectedPlan) throw new Error('Choose a package before creating your account.');
        localStorage.setItem('pbiSelectedPlan', selectedPlan);
        localStorage.setItem('pbiPlanConfirmed', '1');
        const data = await requestJson('/api/auth/signup', {
          email: fd.get('email'),
          password: fd.get('password'),
          project_name: fd.get('project_name'),
          template_preset: templatePreset,
          plan: selectedPlan,
          terms_accepted: fd.get('terms_accepted') === 'on',
          terms_version: fd.get('terms_version') || '2026-04-28',
          turnstileToken: fd.get('cf-turnstile-response')
        });
        showMessage(messageId, 'success', 'Account created. Redirecting...');
        const target = templatePreset && data.project?.id
          ? `/builder/?project=${encodeURIComponent(data.project.id)}&preset=${encodeURIComponent(templatePreset)}&plan=${encodeURIComponent(selectedPlan)}`
          : (data.project?.id ? `/builder/?project=${encodeURIComponent(data.project.id)}&plan=${encodeURIComponent(selectedPlan)}` : '/dashboard/');
        setTimeout(() => { location.href = target; }, 500);
      } catch (err) {
        if (window.turnstile) window.turnstile.reset();
        const message = err.message || 'Request failed.';
        if (message.toLowerCase().includes('account') && message.toLowerCase().includes('exists')) {
          showMessage(
            messageId,
            'error',
            `<strong>That email already has a PBI account.</strong><br>Log in and PBI will continue with the package you selected. <a href="${signupLoginLink()}">Login to continue</a>.`,
            true
          );
        } else {
          showMessage(messageId, 'error', escapeHtml(message));
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Create account'; }
      }
    });
  }

  function attachLogin(formId, messageId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(form);
      try {
        await requestJson('/api/auth/login', {
          email: fd.get('email'),
          password: fd.get('password'),
          turnstileToken: fd.get('cf-turnstile-response')
        });
        showMessage(messageId, 'success', 'Logged in. Redirecting...');
        setTimeout(() => { location.href = '/dashboard/'; }, 500);
      } catch (err) {
        if (window.turnstile) window.turnstile.reset();
        showMessage(messageId, 'error', err.message || 'Request failed.');
      }
    });
  }

  return { attachSignup, attachLogin };
})();
