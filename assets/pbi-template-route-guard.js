(function(){
  const selector = 'a[href*="/canvas-builder/"][href*="template="], a[data-use-template]';

  function normaliseTarget(link) {
    const href = link.getAttribute('href') || '';
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== '/canvas-builder/') return null;
    const template = link.dataset.useTemplate || url.searchParams.get('preset') || url.searchParams.get('template') || '';
    if (template) {
      url.searchParams.set('preset', template);
      url.searchParams.set('template', template);
    }
    return { template, target: `${url.pathname}${url.search}${url.hash}` };
  }

  function signupUrl(template, target) {
    const params = new URLSearchParams();
    if (template) params.set('template_preset', template);
    params.set('next', target);
    return `/signup/?${params.toString()}`;
  }

  async function isLoggedIn() {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    return Boolean(data.authenticated || data.user);
  }

  document.addEventListener('click', async (event) => {
    if (event.defaultPrevented) return;
    const link = event.target.closest(selector);
    if (!link || document.body.classList.contains('pbi-canvas-page')) return;

    const route = normaliseTarget(link);
    if (!route) return;

    event.preventDefault();
    if (route.template) localStorage.setItem('pbi_selected_template', route.template);

    const oldText = link.textContent;
    if (oldText && /use|open|start/i.test(oldText)) link.textContent = 'Opening...';

    try {
      const loggedIn = await isLoggedIn();
      window.location.href = loggedIn ? route.target : signupUrl(route.template, route.target);
    } catch {
      window.location.href = signupUrl(route.template, route.target);
    }
  });
})();
