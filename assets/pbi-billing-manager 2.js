(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await response.json().catch(() => ({ ok: false, error: 'Invalid server response.' }));
    if (!response.ok && !data.error) data.error = `Request failed with status ${response.status}`;
    return data;
  }

  function message(text, type = 'info') {
    const el = $('billingMessage');
    if (!el) return;
    el.textContent = text;
    el.className = `notice domain-${type}`;
    el.style.display = 'block';
  }

  function statusText(project) {
    const status = String(project.billing_status || 'draft').replaceAll('_', ' ');
    if (project.published) return `Live • ${status}`;
    if (project.billing_status === 'cancelled') return 'Cancelled • website offline';
    return status;
  }

  function render(projects = []) {
    const root = $('billingProjects');
    if (!root) return;
    if (!projects.length) {
      root.innerHTML = '<article class="card"><h3>No projects found</h3><p>Log in with the account that owns the website you want to manage.</p></article>';
      return;
    }
    root.innerHTML = projects.map((project) => `
      <article class="card pbi-customer-action-card" data-project-id="${esc(project.id)}">
        <div>
          <p class="eyebrow">${esc(project.plan || 'website')}</p>
          <h3>${esc(project.name || 'Untitled website')}</h3>
          <p class="muted">${esc(statusText(project))}</p>
          ${project.live_url ? `<p><a class="btn-ghost" href="${esc(project.live_url)}" target="_blank" rel="noopener">View live site</a></p>` : ''}
          ${project.stripe_subscription_id ? `<p class="muted">Stripe subscription: ${esc(project.stripe_subscription_id)}</p>` : '<p class="muted">No Stripe subscription ID is stored for this project.</p>'}
        </div>
        <div class="stack">
          <a class="btn-ghost" href="/builder/?project=${encodeURIComponent(project.id)}">Edit website</a>
          ${['active','trialing','past_due'].includes(String(project.billing_status || '').toLowerCase()) || project.published ? `<button class="btn-danger cancelSubscriptionBtn" type="button" data-project-id="${esc(project.id)}" data-project-name="${esc(project.name || 'Untitled website')}">Cancel subscription & take site down</button>` : '<span class="status-pill">No active subscription</span>'}
        </div>
      </article>
    `).join('');

    document.querySelectorAll('.cancelSubscriptionBtn').forEach((button) => {
      button.addEventListener('click', async () => {
        const name = button.dataset.projectName || 'this website';
        const confirmed = prompt(`Type CANCEL to stop service for ${name}. The public website will be taken offline immediately.`);
        if (String(confirmed || '').trim().toUpperCase() !== 'CANCEL') return;
        const old = button.textContent;
        button.disabled = true;
        button.textContent = 'Cancelling...';
        const result = await api('/api/billing/cancel-subscription', { method: 'POST', body: JSON.stringify({ project_id: button.dataset.projectId, confirm: 'CANCEL' }) });
        if (!result.ok) {
          message(result.error || 'Cancellation failed. Contact PBI support.', 'error');
          button.disabled = false;
          button.textContent = old;
          return;
        }
        message(result.message || 'Subscription cancelled and website taken offline.', 'success');
        await load();
      });
    });
  }

  async function load() {
    const data = await api('/api/billing/subscription-status');
    if (!data.ok) {
      message(data.error || 'Please log in to manage billing.', 'error');
      $('billingProjects').innerHTML = '<article class="card"><h3>Login required</h3><p>Open the dashboard and log in to manage subscriptions.</p><a class="btn" href="/login/?return=/account/billing/">Login</a></article>';
      return;
    }
    render(data.projects || []);
  }

  document.addEventListener('DOMContentLoaded', load);
})();
