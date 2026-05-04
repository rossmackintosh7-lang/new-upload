
(() => {
  const routes = ['/', '/pricing/', '/signup/', '/login/', '/dashboard/', '/builder/', '/canvas-builder/', '/payment/', '/examples/', '/templates/', '/support/', '/start-here/'];
  const list = document.getElementById('qaJourneyList');
  const envBox = document.getElementById('qaEnvStatus');
  const runBtn = document.getElementById('qaRunBtn');

  function row(label, state = 'warn', detail = '') {
    return `<li><span class="pbi-qa-dot ${state}"></span><span><strong>${label}</strong>${detail ? `<br><small>${detail}</small>` : ''}</span></li>`;
  }

  async function checkRoute(route) {
    try {
      const res = await fetch(route, { credentials: 'include', cache: 'no-store' });
      return { route, ok: res.ok || res.status === 401 || res.status === 403, status: res.status };
    } catch (error) {
      return { route, ok: false, status: 0, error: error.message };
    }
  }

  async function run() {
    if (runBtn) runBtn.disabled = true;
    if (list) list.innerHTML = row('Running live page checks...', 'warn');

    const results = await Promise.all(routes.map(checkRoute));
    if (list) list.innerHTML = results.map((item) => row(item.route, item.ok ? 'pass' : 'fail', item.ok ? `Reachable, status ${item.status}` : `Failed, status ${item.status || 'network'}`)).join('');

    try {
      const [preflight, billing] = await Promise.all([
        fetch('/api/qa/preflight', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/billing/config-status', { credentials: 'include', cache: 'no-store' }).then((r) => r.json())
      ]);
      if (envBox) {
        const checks = [
          ['D1 database', preflight.db_ready],
          ['Auth endpoint', preflight.auth_endpoint],
          ['Stripe secret', billing.stripe_secret_key],
          ['Starter price', billing.prices?.starter],
          ['Business price', billing.prices?.business],
          ['Plus price', billing.prices?.plus],
          ['Payment required at publish', billing.payment_required]
        ];
        envBox.innerHTML = checks.map(([name, ok]) => `<article><strong>${name}</strong><span class="pbi-setup-badge ${ok ? 'pass' : 'fail'}">${ok ? 'Ready' : 'Missing'}</span></article>`).join('');
      }
    } catch (error) {
      if (envBox) envBox.innerHTML = `<article><strong>Runtime checks</strong><span class="pbi-setup-badge fail">${error.message || 'Failed'}</span></article>`;
    }
    if (runBtn) runBtn.disabled = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    runBtn?.addEventListener('click', run);
    run();
  });
})();
