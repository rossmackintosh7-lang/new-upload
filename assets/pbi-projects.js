function pbiEsc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function pbiFetchJson(path, options = {}) {
  try {
    const response = await fetch(path, { credentials: 'include', ...options });
    const data = await response.json().catch(() => ({ ok: false }));
    return { ok: response.ok && data.ok !== false, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { ok: false, error: error?.message || 'Request failed.' } };
  }
}

function pbiLocalProjects() {
  try {
    return JSON.parse(localStorage.getItem('pbi_local_projects') || '[]');
  } catch {
    return [];
  }
}

function pbiMergeProjects(listProjects = [], billingProjects = []) {
  const byId = new Map();
  listProjects.forEach((project) => {
    byId.set(project.id, {
      id: project.id,
      name: project.name || project.project_name || 'Untitled website',
      plan: project.plan || 'starter',
      status: project.status || 'draft',
      billing_status: project.billing_status || 'draft',
      published: Number(project.published || 0) === 1,
      live_url: project.public_slug ? `/site/canvas/${encodeURIComponent(project.public_slug)}/` : '',
      updated_at: project.updated_at || project.created_at || '',
      local_only: false
    });
  });
  billingProjects.forEach((project) => {
    const existing = byId.get(project.id) || {};
    byId.set(project.id, {
      ...existing,
      ...project,
      name: project.name || existing.name || 'Untitled website',
      plan: project.plan || existing.plan || 'starter',
      status: existing.status || project.status || 'draft',
      billing_status: project.billing_status || existing.billing_status || 'draft',
      published: Boolean(project.published ?? existing.published),
      live_url: project.live_url || existing.live_url || '',
      updated_at: project.updated_at || existing.updated_at || '',
      local_only: false
    });
  });
  return [...byId.values()];
}

async function pbiFetchProjects() {
  const [billing, list] = await Promise.all([
    pbiFetchJson('/api/billing/subscription-status'),
    pbiFetchJson('/api/projects/list')
  ]);

  if (billing.ok) {
    return {
      ok: true,
      authenticated: true,
      projects: pbiMergeProjects(list.data?.projects || [], billing.data?.projects || [])
    };
  }

  if (list.ok) {
    return {
      ok: true,
      authenticated: Boolean(list.data?.authenticated),
      projects: list.data?.authenticated ? (list.data?.projects || []) : pbiLocalProjects()
    };
  }

  return { ok: false, authenticated: false, projects: pbiLocalProjects() };
}

function pbiBillingTone(project = {}) {
  const status = String(project.billing_status || '').toLowerCase();
  if (['active', 'trialing', 'paid', 'not_required'].includes(status)) return 'good';
  if (['past_due', 'unpaid', 'failed', 'incomplete'].includes(status)) return 'warn';
  if (['cancelled'].includes(status)) return 'bad';
  return 'calm';
}

function pbiBillingLabel(project = {}) {
  const billing = String(project.billing_status || 'draft').replaceAll('_', ' ');
  if (project.billing_status === 'cancelled') return 'Subscription cancelled';
  if (String(project.billing_status || '').toLowerCase() === 'past_due') return 'Payment issue';
  if (project.published && project.live_url) return `Live and ${billing}`;
  if (String(project.status || '').toLowerCase() === 'cancelled') return 'Website offline';
  return billing || 'draft';
}

function pbiProjectMeta(project = {}) {
  const pieces = [];
  if (project.plan) pieces.push(project.plan);
  if (project.status) pieces.push(project.status);
  if (project.domain_management?.domain_name) {
    pieces.push(project.domain_management.domain_name);
  }
  return pieces.join(' • ');
}

function pbiProjectSummary(project = {}) {
  const billing = String(project.billing_status || '').toLowerCase();
  if (project.local_only) return 'Saved locally on this device. Create an account or save online to unlock billing, domains and live publishing.';
  if (billing === 'cancelled') return 'This website is offline because the subscription has ended. Restart billing to restore it.';
  if (['past_due', 'unpaid', 'failed', 'incomplete'].includes(billing)) return 'Billing needs attention. PBI keeps the project saved so you can fix payment and restore service.';
  if (project.published && project.live_url) return 'This site is live. You can edit it, manage billing, or open the live version.';
  if (project.domain_management?.domain_name) return `Domain path saved: ${project.domain_management.domain_name}.`;
  return 'Build first, then publish when the site and billing route are ready.';
}

function pbiProjectActions(project = {}, authenticated = false) {
  const actions = [
    `<a class="btn" href="/canvas-builder/?project=${encodeURIComponent(project.id || 'local')}">Open canvas</a>`
  ];
  if (project.live_url) {
    actions.push(`<a class="btn-ghost" href="${pbiEsc(project.live_url)}" target="_blank" rel="noopener">View live site</a>`);
  } else if (!project.local_only) {
    actions.push(`<a class="btn-ghost" href="/payment/?project=${encodeURIComponent(project.id)}&plan=${encodeURIComponent(project.plan || 'starter')}">Publish</a>`);
  }
  if (!project.local_only) {
    actions.push(`<a class="btn-ghost" href="/account/billing/">Billing</a>`);
  }
  if (
    authenticated &&
    !project.local_only &&
    (['active', 'trialing', 'past_due', 'unpaid', 'failed', 'incomplete'].includes(String(project.billing_status || '').toLowerCase()) || project.published)
  ) {
    actions.push(`<button class="btn-ghost pbiCancelProjectBtn" type="button" data-project-id="${pbiEsc(project.id)}" data-project-name="${pbiEsc(project.name || 'Untitled website')}">Cancel & take offline</button>`);
  }
  return actions.join('');
}

function pbiProjectCard(project = {}, authenticated = false) {
  return `
    <article class="pbi-project-card pbi-project-card-rich">
      <div class="pbi-project-main">
        <span>${pbiEsc(pbiProjectMeta(project) || 'website')}</span>
        <h3>${pbiEsc(project.name || 'Untitled website')}</h3>
        <p class="muted">${pbiEsc(pbiProjectSummary(project))}</p>
        <div class="pbi-project-chip-row">
          <span class="pbi-project-chip ${pbiEsc(pbiBillingTone(project))}">${pbiEsc(pbiBillingLabel(project))}</span>
          ${project.domain_management?.domain_name ? `<span class="pbi-project-chip">${pbiEsc(project.domain_management.domain_name)}</span>` : ''}
          ${project.website_subscription_status ? `<span class="pbi-project-chip">${pbiEsc(String(project.website_subscription_status).replaceAll('_', ' '))}</span>` : ''}
        </div>
      </div>
      <div class="pbi-project-actions">
        ${pbiProjectActions(project, authenticated)}
      </div>
    </article>
  `;
}

function pbiSetMessage(text, type = 'info') {
  const target = document.getElementById('dashboardMessage') || document.getElementById('billingMessage');
  if (!target) return;
  target.textContent = text;
  target.className = `notice domain-${type}`;
  target.style.display = 'block';
}

function pbiRenderProjects(el, projects, authenticated) {
  if (!el) return;
  if (!projects || !projects.length) {
    el.innerHTML = `
      <article class="pbi-project-card">
        <div>
          <span>No projects yet</span>
          <h3>Start with a template or blank canvas.</h3>
          <p class="muted">Your saved websites will appear here once created.</p>
        </div>
        <div class="pbi-project-actions">
          <a class="btn" href="/templates/">Choose template</a>
          <a class="btn-ghost" href="/canvas-builder/">Blank canvas</a>
        </div>
      </article>
    `;
    return;
  }
  el.innerHTML = projects.map((project) => pbiProjectCard(project, authenticated)).join('');
}

function pbiUpdateDashboardMetrics(projects = []) {
  const liveCount = projects.filter((project) => project.published && project.live_url).length;
  const billingProblems = projects.filter((project) => ['past_due', 'unpaid', 'failed', 'incomplete'].includes(String(project.billing_status || '').toLowerCase())).length;
  const cancelled = projects.filter((project) => String(project.billing_status || '').toLowerCase() === 'cancelled').length;

  const projectCount = document.getElementById('dashProjectCount');
  if (projectCount) projectCount.textContent = String(projects.length);

  const live = document.getElementById('dashLiveCount');
  if (live) live.textContent = String(liveCount);

  const health = document.getElementById('dashBillingHealth');
  const healthNote = document.getElementById('dashBillingHealthNote');
  if (health) {
    if (billingProblems) health.textContent = 'Needs attention';
    else if (cancelled) health.textContent = 'Some offline';
    else if (projects.length) health.textContent = 'Healthy';
    else health.textContent = 'No projects';
  }
  if (healthNote) {
    if (billingProblems) healthNote.textContent = `${billingProblems} project(s) need a payment fix.`;
    else if (cancelled) healthNote.textContent = `${cancelled} project(s) are currently offline after cancellation.`;
    else if (projects.length) healthNote.textContent = 'Subscriptions and site status look steady right now.';
    else healthNote.textContent = 'Create your first project to unlock live metrics.';
  }
}

function pbiBindProjectActions(authenticated) {
  document.querySelectorAll('.pbiCancelProjectBtn').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!authenticated) {
        pbiSetMessage('Log in before changing subscription status.', 'error');
        return;
      }
      const projectId = button.dataset.projectId || '';
      const projectName = button.dataset.projectName || 'this website';
      const confirmed = prompt(`Type CANCEL to stop service for ${projectName}. The public website will be taken offline immediately.`);
      if (String(confirmed || '').trim().toUpperCase() !== 'CANCEL') return;

      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Cancelling...';
      const result = await pbiFetchJson('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, confirm: 'CANCEL' })
      });
      if (!result.ok) {
        pbiSetMessage(result.data?.error || result.data?.message || 'Cancellation failed. Please try again.', 'error');
        button.disabled = false;
        button.textContent = original;
        return;
      }
      pbiSetMessage(result.data?.message || 'Subscription cancelled and website taken offline.', 'success');
      await pbiBootProjects();
    });
  });
}

async function pbiBootProjects() {
  const data = await pbiFetchProjects();
  const projects = data.projects || [];
  const authenticated = Boolean(data.authenticated);

  pbiRenderProjects(document.getElementById('projectsList'), projects, authenticated);
  pbiRenderProjects(document.getElementById('dashboardProjects'), projects.slice(0, 4), authenticated);
  pbiUpdateDashboardMetrics(projects);
  pbiBindProjectActions(authenticated);
}

pbiBootProjects();
