document.addEventListener('DOMContentLoaded', () => {
  const projectList = document.getElementById('projectList');
  const newProjectBtn = document.getElementById('newProjectBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userEmail = document.getElementById('userEmail');
  const dashboardMessage = document.getElementById('dashboardMessage');

  function esc(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function showMessage(text, type = 'info') {
    if (!dashboardMessage) return;
    dashboardMessage.textContent = text;
    dashboardMessage.className = `notice domain-${type}`;
    dashboardMessage.style.display = 'block';
  }

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    return data;
  }

  function parseData(project) {
    try { return typeof project.data_json === 'string' ? JSON.parse(project.data_json || '{}') : (project.data_json || {}); }
    catch { return {}; }
  }

  function planLabel(plan) {
    return { starter: 'Starter Launch', business: 'Business Launch', plus: 'Business Plus', free_preview: 'Free preview', custom_build_deposit: 'Custom build deposit' }[plan] || 'Free preview';
  }

  function statusLabel(project) {
    if (Number(project.published || 0) === 1) return 'Published';
    if (project.billing_status === 'active') return 'Paid, ready to publish';
    if (project.billing_status === 'pending') return 'Payment pending';
    if (project.billing_status === 'setup_required') return 'Stripe setup required';
    return 'Draft';
  }

  function render(projects) {
    if (!projects.length) {
      projectList.innerHTML = '<div class="notice">No projects yet. Create your first website to get started.</div>';
      return;
    }

    projectList.innerHTML = projects.map((project) => {
      const data = parseData(project);
      const live = project.public_slug ? `/site/${encodeURIComponent(project.public_slug)}/` : '';
      const assistedPaid = data.assisted_setup_paid === true;
      const customDepositPaid = data.custom_build_deposit_paid === true || project.billing_status === 'custom_build_deposit_paid';
      const domainName = data.custom_domain || project.custom_domain || data.subdomain_slug || '';

      return `
        <div class="project-row dashboard-project" data-project-id="${esc(project.id)}">
          <a class="project-main" href="/builder/?project=${encodeURIComponent(project.id)}">
            <h3>${esc(project.name || 'Untitled website')}</h3>
            <p class="muted">${esc(statusLabel(project))} • ${esc(planLabel(project.plan))}${project.updated_at ? ` • Updated ${esc(project.updated_at)}` : ''}</p>
            ${Number(project.published || 0) === 1 && live ? `<p class="muted">Live: ${esc(live)}</p>` : ''}
          </a>
          <div class="project-actions">
            ${Number(project.published || 0) === 1 && live ? `<a class="btn-ghost" href="${esc(live)}" target="_blank" rel="noopener">View live</a>` : ''}
            <a class="btn-ghost" href="/builder/?project=${encodeURIComponent(project.id)}">Edit</a>
            <a class="btn" href="/payment/?project=${encodeURIComponent(project.id)}">${Number(project.published || 0) === 1 ? 'Manage plan' : 'Publish'}</a>
          </div>
          <div class="dashboard-upgrade-grid">
            <div class="dashboard-upgrade-card">
              <p class="eyebrow">Assisted setup</p>
              <h4>${assistedPaid ? 'Assisted setup active' : 'Need a hand setting it up?'}</h4>
              <p class="muted">${assistedPaid ? 'Send a setup request to PBI. Your current project details will be included so we can see what you are working on.' : 'Add assisted setup for £99. PBI can help with wording, page structure, layout and images.'}</p>
              ${assistedPaid ? `
                <form class="assisted-request-form" data-assisted-form="${esc(project.id)}">
                  <textarea class="textarea" name="message" required placeholder="Tell PBI what you need help with on this project."></textarea>
                  <button class="btn" type="submit">Send assisted setup request</button>
                </form>
              ` : `<button class="btn dashboardCheckoutBtn" type="button" data-plan="assisted_setup" data-project-id="${esc(project.id)}">Add assisted setup £99</button>`}
            </div>
            <div class="dashboard-upgrade-card">
              <p class="eyebrow">Custom build deposit</p>
              <h4>${customDepositPaid ? 'Deposit paid' : 'Secure a custom build slot'}</h4>
              <p class="muted">${customDepositPaid ? 'Your custom build deposit has been marked as paid.' : 'Pay the £500 custom build deposit from your dashboard when you are ready to secure a build slot.'}</p>
              ${customDepositPaid ? '<span class="status-pill">Paid</span>' : `<button class="btn-ghost dashboardCheckoutBtn" type="button" data-plan="custom_build_deposit" data-project-id="${esc(project.id)}">Pay £500 deposit</button>`}
            </div>
            <div class="dashboard-upgrade-card">
              <p class="eyebrow">Domain renewal</p>
              <h4>Renewal reminder email</h4>
              <p class="muted">Send the customer a domain renewal reminder when a domain renewal date is due.</p>
              <form class="domain-renewal-form" data-renewal-form="${esc(project.id)}">
                <input class="input" name="domain_name" placeholder="Domain name" value="${esc(domainName)}">
                <input class="input" name="renewal_date" type="date">
                <button class="btn-ghost" type="submit">Send renewal email</button>
              </form>
            </div>
          </div>
        </div>
      `;
    }).join('');

    bindProjectActions();
  }

  function bindProjectActions() {
    document.querySelectorAll('.dashboardCheckoutBtn').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        const oldText = button.textContent;
        button.textContent = 'Preparing checkout...';
        try {
          const data = await api('/api/billing/create-checkout', { method: 'POST', body: JSON.stringify({ project_id: button.dataset.projectId, plan: button.dataset.plan, domain_option: 'pbi_subdomain' }) });
          if (data.url) { window.location.href = data.url; return; }
          showMessage(data.message || 'Checkout could not be started.', data.setup_required ? 'info' : 'error');
        } catch (error) { showMessage(error.message || 'Could not start checkout.', 'error'); }
        finally { button.disabled = false; button.textContent = oldText; }
      });
    });

    document.querySelectorAll('.assisted-request-form').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const projectId = form.dataset.assistedForm;
        const message = new FormData(form).get('message');
        try {
          await api('/api/assisted-setup/request', { method: 'POST', body: JSON.stringify({ project_id: projectId, message }) });
          form.reset();
          showMessage('Assisted setup request sent to PBI.', 'success');
        } catch (error) { showMessage(error.message || 'Could not send assisted setup request.', 'error'); }
      });
    });

    document.querySelectorAll('.domain-renewal-form').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const projectId = form.dataset.renewalForm;
        const fd = new FormData(form);
        try {
          await api('/api/domain/renewal-reminder', { method: 'POST', body: JSON.stringify({ project_id: projectId, domain_name: fd.get('domain_name'), renewal_date: fd.get('renewal_date') }) });
          showMessage('Domain renewal reminder email sent.', 'success');
        } catch (error) { showMessage(error.message || 'Could not send domain renewal email.', 'error'); }
      });
    });
  }

  async function load() {
    try {
      const data = await api('/api/projects/list');
      if (data.user?.email && userEmail) userEmail.textContent = data.user.email;
      render(data.projects || []);
    } catch (error) {
      projectList.innerHTML = `<div class="notice domain-error">${esc(error.message || 'Could not load projects.')}</div>`;
    }
  }

  async function create() {
    const name = prompt('Project name:', 'New website');
    if (name === null) return;
    if (newProjectBtn) { newProjectBtn.disabled = true; newProjectBtn.textContent = 'Creating...'; }
    try {
      const data = await api('/api/projects/create', { method: 'POST', body: JSON.stringify({ name: name.trim() || 'New website' }) });
      if (!data.project?.id) throw new Error('Project created but no project id was returned.');
      location.href = `/builder/?project=${encodeURIComponent(data.project.id)}`;
    } catch (error) { alert(error.message || 'Could not create project.'); }
    finally { if (newProjectBtn) { newProjectBtn.disabled = false; newProjectBtn.textContent = 'Create new project'; } }
  }

  async function logout() { try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } finally { location.href = '/login/'; } }

  if (newProjectBtn) newProjectBtn.onclick = create;
  if (logoutBtn) logoutBtn.onclick = logout;
  load();
});
