(() => {
  const allowed = ['starter', 'business', 'plus'];
  const labels = {
    starter: 'Starter Site',
    business: 'Business Site',
    plus: 'Plus Site'
  };
  const descriptions = {
    starter: 'You will get the Starter builder controls: core pages, starter template editing, basic content controls and PBI subdomain publishing. Building is free and no payment is taken until you publish.',
    business: 'You will get Business controls: everything in Starter plus image uploads, gallery/trust sections, stronger content tools and existing-domain support. Building is free and no payment is taken until you publish.',
    plus: 'You will get Plus controls: everything in Business plus advanced design controls, AI wording help, shop/retail tools and growth support features. Building is free and no payment is taken until you publish.'
  };

  function clean(value) {
    value = String(value || '').toLowerCase();
    return allowed.includes(value) ? value : '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function safeNext(path) {
    const value = String(path || '');
    if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard/';
    return value;
  }

  function packageLinks() {
    const current = new URLSearchParams(location.search);
    return allowed.map((plan) => {
      const qs = new URLSearchParams(current.toString());
      qs.set('plan', plan);
      return `<a class="btn-ghost" href="/signup/?${qs.toString()}">${labels[plan]}</a>`;
    }).join(' ');
  }

  function updateLoginLinks() {
    const next = safeNext(`${location.pathname}${location.search}`);
    document.querySelectorAll('a[href="/login/"], a[href^="/login/?"]').forEach((link) => {
      const url = new URL(link.getAttribute('href'), location.origin);
      url.searchParams.set('next', next);
      link.setAttribute('href', `${url.pathname}?${url.searchParams.toString()}`);
    });
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

  async function createProjectForExistingAccount({ plan, templatePreset, projectName }) {
    const response = await fetch('/api/projects/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        template_preset: templatePreset || '',
        name: projectName || `${labels[plan] || 'New'} website`
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || 'Could not create your project.');
    return data.project;
  }

  function disableSignupForm(form, disabled = true) {
    form.querySelectorAll('input,button,select,textarea').forEach((el) => {
      el.disabled = disabled;
    });
  }

  function renderLoggedInStart({ notice, form, user, plan, templatePreset }) {
    disableSignupForm(form, true);
    const projectNameInput = form.querySelector('input[name="project_name"]');
    const storedName = localStorage.getItem('pbiPendingProjectName') || '';
    if (projectNameInput && storedName && !projectNameInput.value) projectNameInput.value = storedName;

    notice.style.display = 'block';
    notice.className = 'notice success';
    notice.innerHTML = `
      <strong>You are already logged in${user?.email ? ` as ${escapeHtml(user.email)}` : ''}.</strong><br>
      ${plan ? `${labels[plan]} is selected. Click below to create the project in your existing dashboard.` : 'Choose a package first, then PBI will add the project to your existing dashboard.'}
      <div class="row" style="margin-top:12px;gap:10px;flex-wrap:wrap">
        ${plan ? `<button class="btn" type="button" id="continueExistingAccountBtn">Continue with existing account</button>` : packageLinks()}
        <a class="btn-ghost" href="/dashboard/">Go to dashboard</a>
      </div>
    `;

    const continueBtn = document.getElementById('continueExistingAccountBtn');
    if (!continueBtn || !plan) return;

    continueBtn.addEventListener('click', async () => {
      const oldText = continueBtn.textContent;
      continueBtn.disabled = true;
      continueBtn.textContent = 'Creating project...';
      try {
        const project = await createProjectForExistingAccount({
          plan,
          templatePreset,
          projectName: projectNameInput?.value || storedName || `${labels[plan]} website`
        });
        localStorage.removeItem('pbiPendingProjectName');
        if (!project?.id) throw new Error('Project created, but no project ID was returned.');
        const target = new URL('/builder/', location.origin);
        target.searchParams.set('project', project.id);
        target.searchParams.set('plan', plan);
        if (templatePreset) target.searchParams.set('preset', templatePreset);
        location.href = `${target.pathname}${target.search}`;
      } catch (error) {
        notice.className = 'notice error';
        notice.innerHTML = `<strong>Could not create the project.</strong><br>${escapeHtml(error.message || 'Please try again from the dashboard.')}`;
        continueBtn.disabled = false;
        continueBtn.textContent = oldText;
      }
    });
  }

  async function run() {
    const params = new URLSearchParams(location.search);
    const plan = clean(params.get('plan'));
    const templatePreset = params.get('template_preset') || '';
    const notice = document.getElementById('pbiSelectedPackageNotice') || document.getElementById('message');
    const form = document.getElementById('signupForm');
    if (!form) return;

    updateLoginLinks();

    const user = await getCurrentUser();
    if (user) {
      renderLoggedInStart({ notice, form, user, plan, templatePreset });
      return;
    }

    if (!plan) {
      localStorage.removeItem('pbiPlanConfirmed');
      localStorage.removeItem('pbiSelectedPlan');
      if (notice) {
        notice.style.display = 'block';
        notice.className = 'notice error';
        notice.innerHTML = `<strong>Choose a package first.</strong><br>PBI needs to know which package you want before the builder can unlock the right controls. This does not take payment.<div class="row" style="margin-top:12px;gap:10px;flex-wrap:wrap">${packageLinks()}</div>`;
      }
      disableSignupForm(form, true);
      return;
    }

    localStorage.setItem('pbiSelectedPlan', plan);
    localStorage.setItem('pbiPlanConfirmed', '1');
    document.body.dataset.plan = plan;
    const existing = form.querySelector('input[name="plan"]');
    if (existing) existing.value = plan;
    else {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'plan';
      hidden.value = plan;
      form.appendChild(hidden);
    }
    if (notice) {
      notice.style.display = 'block';
      notice.className = 'notice success';
      notice.innerHTML = `<strong>${labels[plan]} selected.</strong><br>${descriptions[plan]} <a href="/pricing/#packages">Change package</a>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
