(async () => {
  let me = null;
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (response.ok) me = await response.json();
  } catch {}

  const slot = document.getElementById('dashboardAdminSlot');
  if (slot && me?.is_admin) slot.hidden = false;

  const allowedPlans = ['starter', 'business', 'plus'];
  const plan = allowedPlans.includes(String(me?.plan || '').toLowerCase())
    ? String(me.plan).toLowerCase()
    : allowedPlans.includes(String(localStorage.getItem('pbi_plan') || '').toLowerCase())
      ? String(localStorage.getItem('pbi_plan')).toLowerCase()
      : 'starter';
  try { localStorage.setItem('pbi_plan', plan); } catch {}

  document.querySelectorAll('a[href="/canvas-builder/"]').forEach((link) => {
    link.href = `/canvas-builder/?plan=${encodeURIComponent(plan)}`;
  });
  const planEl = document.getElementById('dashPlan');
  if (planEl) planEl.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);

  const note = document.getElementById('dashPlanNote');
  if (note) {
    note.textContent = plan === 'starter'
      ? 'Starter: guided templates with simple edits.'
      : 'Premium: full canvas freedom is unlocked.';
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function fetchJson(path, options = {}) {
    try {
      const response = await fetch(path, { credentials: 'include', ...options });
      const data = await response.json().catch(() => ({ ok: false }));
      return { ok: response.ok && data.ok !== false, data };
    } catch (err) {
      return { ok: false, data: { error: err?.message || 'Request failed.' } };
    }
  }

  function siteTone(site = {}) {
    const status = String(site.status || '').toLowerCase();
    if (status === 'live') return 'good';
    if (status === 'payment_required') return 'warn';
    if (status === 'suspended' || status === 'unpublished') return 'bad';
    return 'calm';
  }

  function renderHostingSites(sites = []) {
    const target = document.getElementById('dashboardHostingSites');
    if (!target) return;
    if (!sites.length) {
      target.innerHTML = `
        <article class="pbi-project-card pbi-project-card-rich">
          <div class="pbi-project-main">
            <span>No hosted sites yet</span>
            <h3>Publish from the canvas when your site is ready.</h3>
            <p class="muted">PBI will show live status, payment state, domain status, leads, media and analytics here.</p>
          </div>
          <div class="pbi-project-actions">
            <a class="btn" href="/canvas-builder/">Open PBI Designer</a>
            <a class="btn-ghost" href="/templates/">Choose template</a>
          </div>
        </article>
      `;
      return;
    }
    target.innerHTML = sites.map((site) => `
      <article class="pbi-project-card pbi-project-card-rich">
        <div class="pbi-project-main">
          <span>${esc(site.plan || 'website')} hosting</span>
          <h3>${esc(site.project_name || site.site_slug || 'Hosted website')}</h3>
          <p class="muted">${esc(site.status === 'live' ? 'This site is live and being managed by PBI.' : site.status === 'payment_required' ? 'Ready to publish once payment is active.' : 'This site is saved, but not currently live.')}</p>
          <div class="pbi-project-chip-row">
            <span class="pbi-project-chip ${esc(siteTone(site))}">${esc(String(site.status || 'draft').replaceAll('_', ' '))}</span>
            <span class="pbi-project-chip">${esc(String(site.payment_status || 'unpaid').replaceAll('_', ' '))}</span>
            <span class="pbi-project-chip">${Number(site.page_views || 0)} views</span>
            <span class="pbi-project-chip">${Number(site.lead_count || 0)} leads</span>
            <span class="pbi-project-chip">${Number(site.media_count || 0)} media</span>
          </div>
        </div>
        <div class="pbi-project-actions">
          <a class="btn" href="/canvas-builder/?project=${encodeURIComponent(site.project_id)}">Open builder</a>
          ${site.live_url ? `<a class="btn-ghost" href="${esc(site.live_url)}" target="_blank" rel="noopener">View live site</a>` : ''}
          ${site.status === 'live' ? `<button class="btn-ghost pbiHostingAction" data-action="unpublish" data-project="${esc(site.project_id)}" type="button">Unpublish</button>` : `<button class="btn-ghost pbiHostingAction" data-action="republish" data-project="${esc(site.project_id)}" type="button">Publish live</button>`}
          <button class="btn-ghost pbiHostingAction" data-action="republish" data-project="${esc(site.project_id)}" type="button">Run publish check</button>
          <a class="btn-ghost" href="/canvas-builder/?project=${encodeURIComponent(site.project_id)}#launch-domain">Connect custom domain</a>
          <a class="btn-ghost" href="/api/leads/export?project_id=${encodeURIComponent(site.project_id)}">Manage leads</a>
        </div>
      </article>
    `).join('');
    target.querySelectorAll('.pbiHostingAction').forEach((button) => {
      button.addEventListener('click', async () => {
        const action = button.dataset.action === 'unpublish' ? 'unpublish' : 'republish';
        button.disabled = true;
        button.textContent = action === 'unpublish' ? 'Unpublishing...' : 'Republishing...';
        await fetchJson(`/api/hosting/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: button.dataset.project })
        });
        loadHostingSites();
      });
    });
  }

  async function loadHostingSites() {
    const result = await fetchJson('/api/hosting/list');
    renderHostingSites(result.ok ? (result.data.sites || []) : []);
  }

  const script = document.createElement('script');
  script.src = '/assets/pbi-projects.js?v=20260512-dashboard';
  document.body.appendChild(script);
  loadHostingSites();
})();
