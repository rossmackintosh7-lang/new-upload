(() => {
  const allowedPlans = ['starter', 'business', 'plus'];
  const planLabels = {
    starter: 'Starter Site',
    business: 'Business Site',
    plus: 'Plus Site'
  };

  function safeNext(path) {
    const value = String(path || '');
    if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard/';
    return value;
  }

  async function getCurrentUser() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) return null;
      const data = await response.json().catch(() => ({}));
      return data.user || null;
    } catch {
      return null;
    }
  }

  async function createProject({ plan, templatePreset, projectName }) {
    const response = await fetch('/api/projects/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        template_preset: templatePreset || '',
        name: projectName || `${planLabels[plan] || 'New'} website`
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || 'Could not create your project.');
    return data.project;
  }

  function getPendingProjectName(url) {
    const fromQuery = url.searchParams.get('project_name') || '';
    const fromStorage = localStorage.getItem('pbiPendingProjectName') || '';
    return (fromQuery || fromStorage || '').trim();
  }

  function addLoggedInNotice(user) {
    const hero = document.querySelector('.pbi-section-head') || document.querySelector('.page-hero .container');
    if (!hero || document.getElementById('pbiExistingAccountNotice')) return;
    const notice = document.createElement('div');
    notice.id = 'pbiExistingAccountNotice';
    notice.className = 'notice domain-success';
    notice.style.margin = '0 0 20px';
    notice.innerHTML = `<strong>You are logged in${user?.email ? ` as ${escapeHtml(user.email)}` : ''}.</strong> Choose a package below and PBI will create a new project in your existing dashboard. No second account needed.`;
    hero.insertAdjacentElement('afterend', notice);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setButtonBusy(link, busy) {
    if (busy) {
      link.dataset.originalText = link.dataset.originalText || link.textContent;
      link.textContent = 'Opening your builder...';
      link.setAttribute('aria-busy', 'true');
      link.classList.add('is-busy');
    } else {
      if (link.dataset.originalText) link.textContent = link.dataset.originalText;
      link.removeAttribute('aria-busy');
      link.classList.remove('is-busy');
    }
  }

  function bindPricingLinks() {
    document.querySelectorAll('a[href^="/signup/?plan="]').forEach((link) => {
      link.addEventListener('click', async (event) => {
        const target = new URL(link.getAttribute('href'), window.location.origin);
        const plan = String(target.searchParams.get('plan') || '').toLowerCase();
        if (!allowedPlans.includes(plan)) return;

        localStorage.setItem('pbiSelectedPlan', plan);
        localStorage.setItem('pbiPlanConfirmed', '1');

        event.preventDefault();
        setButtonBusy(link, true);

        try {
          const user = await getCurrentUser();
          if (!user) {
            const next = safeNext(`${target.pathname}${target.search}${target.hash || ''}`);
            target.searchParams.set('next', next);
            window.location.href = `${target.pathname}?${target.searchParams.toString()}${target.hash || ''}`;
            return;
          }

          const project = await createProject({
            plan,
            templatePreset: target.searchParams.get('template_preset') || '',
            projectName: getPendingProjectName(target)
          });

          localStorage.removeItem('pbiPendingProjectName');
          if (!project?.id) throw new Error('Project created, but no project ID was returned.');

          const builder = new URL('/builder/', window.location.origin);
          builder.searchParams.set('project', project.id);
          builder.searchParams.set('plan', plan);
          const templatePreset = target.searchParams.get('template_preset') || '';
          if (templatePreset) builder.searchParams.set('preset', templatePreset);
          window.location.href = `${builder.pathname}${builder.search}`;
        } catch (error) {
          alert(error.message || 'Could not open the builder.');
          setButtonBusy(link, false);
        }
      });
    });
  }

  async function init() {
    bindPricingLinks();
    const user = await getCurrentUser();
    if (user) addLoggedInNotice(user);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
