window.PBIAuth = (() => {
  function showMessage(id, kind, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    el.className = `notice ${kind}`;
    el.textContent = text;
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

    function safeNext(value) {
      if (!value) return '';
      try {
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin) return '';
        if (!url.pathname.startsWith('/')) return '';
        return `${url.pathname}${url.search}${url.hash}`;
      } catch {
        return '';
      }
    }

    function signupTarget(next, projectId, templatePreset, selectedPlan) {
      const fallback = projectId
        ? `/canvas-builder/?project=${encodeURIComponent(projectId)}&preset=${encodeURIComponent(templatePreset)}&template=${encodeURIComponent(templatePreset)}&plan=${encodeURIComponent(selectedPlan)}`
        : '/dashboard/';
      const safe = safeNext(next);
      if (!safe) return fallback;
      const url = new URL(safe, window.location.origin);
      if (projectId && url.pathname === '/canvas-builder/') {
        url.searchParams.set('project', projectId);
        if (!url.searchParams.get('preset')) url.searchParams.set('preset', templatePreset);
        if (!url.searchParams.get('template')) url.searchParams.set('template', templatePreset);
        url.searchParams.set('plan', selectedPlan);
      }
      return `${url.pathname}${url.search}${url.hash}`;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(form);
      const btn = form.querySelector('button[type="submit"]');
      const originalButtonText = btn?.textContent || 'Create account';
      if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
      try {
        const params = new URLSearchParams(window.location.search);
        const templatePreset = params.get('template_preset') || params.get('preset') || params.get('template') || localStorage.getItem('pbi_selected_template') || 'cafe';
        const selectedPlan = (params.get('plan') || localStorage.getItem('pbi_plan') || 'starter').toLowerCase();
        const data = await requestJson('/api/auth/signup', {
          email: fd.get('email'),
          password: fd.get('password'),
          project_name: fd.get('project_name'),
          template_preset: templatePreset,
          plan: selectedPlan,
          package: selectedPlan,
          terms_accepted: fd.get('terms_accepted') === 'on',
          terms_version: fd.get('terms_version') || '2026-04-28',
          turnstileToken: fd.get('cf-turnstile-response')
        });
        showMessage(messageId, 'success', 'Account created. Redirecting...');
        const target = signupTarget(params.get('next'), data.project?.id || '', templatePreset, selectedPlan);
        setTimeout(() => { location.href = target; }, 500);
      } catch (err) {
        if (window.turnstile) window.turnstile.reset();
        showMessage(messageId, 'error', err.message || 'Request failed.');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = originalButtonText; }
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
