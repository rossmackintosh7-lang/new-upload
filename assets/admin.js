(() => {
  const state = {
    tab: 'projects',
    search: '',
    overview: null,
    selectedProjectId: new URLSearchParams(window.location.search).get('project') || ''
  };

  const els = {
    message: document.getElementById('adminMessage'),
    stats: document.getElementById('adminStats'),
    list: document.getElementById('adminList'),
    detail: document.getElementById('adminDetail'),
    search: document.getElementById('adminSearch'),
    refresh: document.getElementById('adminRefreshBtn')
  };

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function showMessage(text, type = 'info') {
    if (!els.message) return;
    els.message.style.display = 'block';
    els.message.className = `notice ${type}`;
    els.message.textContent = text;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    return data;
  }

  function parseBodyJson(item) {
    try { return typeof item?.body_json === 'string' ? JSON.parse(item.body_json || '{}') : (item?.body_json || {}); }
    catch { return {}; }
  }

  function matches(item) {
    const needle = state.search.trim().toLowerCase();
    if (!needle) return true;
    return JSON.stringify(item || {}).toLowerCase().includes(needle);
  }

  function renderStats() {
    const stats = state.overview?.stats || {};
    els.stats.innerHTML = `
      <article class="admin-stat card"><strong>${esc(stats.users || 0)}</strong><span>Users</span></article>
      <article class="admin-stat card"><strong>${esc(stats.projects || 0)}</strong><span>Projects</span></article>
      <article class="admin-stat card"><strong>${esc(stats.published_projects || 0)}</strong><span>Published</span></article>
      <article class="admin-stat card"><strong>${esc(stats.active_billing || 0)}</strong><span>Active billing</span></article>
      <article class="admin-stat card"><strong>${esc(stats.custom_enquiries || 0)}</strong><span>Custom enquiries</span></article>
      <article class="admin-stat card"><strong>${esc(stats.support_requests || 0)}</strong><span>Support requests</span></article>
    `;
  }

  function listItems() {
    if (!state.overview) return [];

    if (state.tab === 'projects') return (state.overview.projects || []).filter(matches);
    if (state.tab === 'enquiries') return (state.overview.enquiries || []).filter(matches);
    if (state.tab === 'support') return (state.overview.support_requests || []).filter(matches);
    if (state.tab === 'users') return (state.overview.users || []).filter(matches);
    return [];
  }

  function projectTitle(project) {
    return project.name || project.business_name || project.data?.business_name || 'Untitled website';
  }

  function renderList() {
    const items = listItems();

    if (!items.length) {
      els.list.innerHTML = '<div class="notice">No items found.</div>';
      return;
    }

    if (state.tab === 'projects') {
      els.list.innerHTML = items.map((project) => `
        <button class="admin-list-item ${project.id === state.selectedProjectId ? 'active' : ''}" data-project-id="${esc(project.id)}" type="button">
          <strong>${esc(projectTitle(project))}</strong>
          <span>${esc(project.user_email || 'No email')} • ${esc(project.billing_status || 'no billing')}</span>
          <small>${Number(project.published) === 1 ? 'Published' : 'Draft'} • ${esc(project.domain_option || 'pbi_subdomain')}</small>
        </button>
      `).join('');

      els.list.querySelectorAll('[data-project-id]').forEach((button) => {
        button.addEventListener('click', () => loadProject(button.dataset.projectId));
      });
      return;
    }

    if (state.tab === 'enquiries') {
      els.list.innerHTML = items.map((item) => {
        const body = parseBodyJson(item);
        return `
          <button class="admin-list-item" data-enquiry-id="${esc(item.id)}" type="button">
            <strong>${esc(item.business_name || body.business_name || item.contact_name || 'Custom build enquiry')}</strong>
            <span>${esc(item.email || body.email || '')} • ${esc(item.status || 'new')}</span>
            <small>${esc(item.main_promotion_goal || body.main_promotion_goal || 'No promotion goal')}</small>
          </button>
        `;
      }).join('');

      els.list.querySelectorAll('[data-enquiry-id]').forEach((button) => {
        const item = items.find((row) => row.id === button.dataset.enquiryId);
        button.addEventListener('click', () => renderEnquiry(item));
      });
      return;
    }

    if (state.tab === 'support') {
      els.list.innerHTML = items.map((item) => `
        <button class="admin-list-item" data-support-id="${esc(item.id)}" type="button">
          <strong>${esc(item.email || 'Support request')}</strong>
          <span>${esc(item.type || 'support')} • ${esc(item.status || 'new')}</span>
          <small>${esc((item.message || '').slice(0, 90))}</small>
        </button>
      `).join('');

      els.list.querySelectorAll('[data-support-id]').forEach((button) => {
        const item = items.find((row) => row.id === button.dataset.supportId);
        button.addEventListener('click', () => renderSupport(item));
      });
      return;
    }

    if (state.tab === 'users') {
      els.list.innerHTML = items.map((user) => `
        <button class="admin-list-item" data-user-id="${esc(user.id)}" type="button">
          <strong>${esc(user.email)}</strong>
          <span>${esc(user.id)}</span>
          <small>${esc(user.created_at || '')}</small>
        </button>
      `).join('');

      els.list.querySelectorAll('[data-user-id]').forEach((button) => {
        const user = items.find((row) => row.id === button.dataset.userId);
        button.addEventListener('click', () => renderUser(user));
      });
    }
  }

  function pretty(value) {
    return esc(JSON.stringify(value || {}, null, 2));
  }

  async function loadProject(id) {
    state.selectedProjectId = id;
    history.replaceState(null, '', `/admin/?project=${encodeURIComponent(id)}`);
    renderList();
    els.detail.innerHTML = '<div class="notice">Loading project...</div>';

    try {
      const data = await api(`/api/admin/project?id=${encodeURIComponent(id)}`);
      renderProject(data.project, data.related || {});
    } catch (error) {
      els.detail.innerHTML = `<div class="notice error">${esc(error.message)}</div>`;
    }
  }

  function renderProject(project, related) {
    const data = project.data || {};
    const liveUrl = project.public_slug ? `/site/${encodeURIComponent(project.public_slug)}/` : '';
    const domain = data.domain_registration?.name || project.custom_domain || '';
    const supportCount = (related.support_requests || []).length;
    const enquiryCount = (related.custom_enquiries || []).length;

    els.detail.innerHTML = `
      <div class="admin-detail-head">
        <div>
          <p class="eyebrow">Customer project</p>
          <h2>${esc(projectTitle(project))}</h2>
          <p class="muted">${esc(project.user_email || '')}</p>
        </div>
        <div class="admin-action-row">
          <a class="btn" href="/builder/?project=${encodeURIComponent(project.id)}&admin=1">Open builder</a>
          ${liveUrl ? `<a class="btn-ghost" href="${esc(liveUrl)}" target="_blank" rel="noopener">View live site</a>` : ''}
          <button class="btn-ghost" id="adminPublishBtn" type="button">Publish</button>
        </div>
      </div>

      <div class="admin-grid-2">
        <div class="admin-info-card"><strong>Status</strong><span>${esc(project.status || 'draft')}</span></div>
        <div class="admin-info-card"><strong>Billing</strong><span>${esc(project.billing_status || 'not active')}</span></div>
        <div class="admin-info-card"><strong>Plan</strong><span>${esc(project.plan || 'none')}</span></div>
        <div class="admin-info-card"><strong>Domain</strong><span>${esc(domain || project.domain_option || 'PBI subdomain')}</span></div>
        <div class="admin-info-card"><strong>Assisted setup</strong><span>${data.assisted_setup_paid ? 'Paid' : 'Not paid'}</span></div>
        <div class="admin-info-card"><strong>Requests</strong><span>${supportCount} support • ${enquiryCount} custom</span></div>
      </div>

      <form id="adminProjectForm" class="admin-edit-form">
        <input type="hidden" name="id" value="${esc(project.id)}">
        <div class="field"><label>Project name</label><input class="input" name="name" value="${esc(project.name || '')}"></div>
        <div class="admin-grid-2">
          <div class="field"><label>Status</label><input class="input" name="status" value="${esc(project.status || '')}"></div>
          <div class="field"><label>Billing status</label><input class="input" name="billing_status" value="${esc(project.billing_status || '')}" placeholder="active / pending / setup_required"></div>
          <div class="field"><label>Plan</label><input class="input" name="plan" value="${esc(project.plan || '')}"></div>
          <div class="field"><label>Domain option</label><input class="input" name="domain_option" value="${esc(project.domain_option || data.domain_option || 'pbi_subdomain')}"></div>
          <div class="field"><label>Custom domain</label><input class="input" name="custom_domain" value="${esc(project.custom_domain || data.custom_domain || '')}"></div>
          <div class="field"><label>Public slug</label><input class="input" name="public_slug" value="${esc(project.public_slug || '')}"></div>
        </div>
        <label class="terms-check"><input type="checkbox" name="published" ${Number(project.published) === 1 ? 'checked' : ''}> <span>Mark as published</span></label>
        <div class="field"><label>Project JSON / builder data</label><textarea class="input admin-json-box" name="data_json">${pretty(data)}</textarea></div>
        <div class="row"><button class="btn" type="submit">Save admin changes</button><button class="btn-ghost" id="copyProjectJsonBtn" type="button">Copy JSON</button></div>
      </form>

      <details class="admin-raw-details">
        <summary>Related records</summary>
        <pre>${pretty(related)}</pre>
      </details>
    `;

    document.getElementById('adminProjectForm')?.addEventListener('submit', saveProject);
    document.getElementById('adminPublishBtn')?.addEventListener('click', () => publishProject(project.id));
    document.getElementById('copyProjectJsonBtn')?.addEventListener('click', async () => {
      const box = document.querySelector('[name="data_json"]');
      try { await navigator.clipboard.writeText(box.value); showMessage('Project JSON copied.', 'success'); }
      catch { showMessage('Could not copy JSON.', 'error'); }
    });
  }

  async function saveProject(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);

    try {
      JSON.parse(fd.get('data_json') || '{}');
    } catch {
      showMessage('Project JSON is invalid. Fix it before saving.', 'error');
      return;
    }

    try {
      const data = await api('/api/admin/project', {
        method: 'POST',
        body: JSON.stringify({
          id: fd.get('id'),
          name: fd.get('name'),
          status: fd.get('status'),
          billing_status: fd.get('billing_status'),
          plan: fd.get('plan'),
          domain_option: fd.get('domain_option'),
          custom_domain: fd.get('custom_domain'),
          public_slug: fd.get('public_slug'),
          published: fd.get('published') === 'on',
          data_json: fd.get('data_json')
        })
      });

      showMessage('Project updated.', 'success');
      await loadOverview(false);
      renderProject(data.project, {});
    } catch (error) {
      showMessage(error.message || 'Could not save project.', 'error');
    }
  }

  async function publishProject(id) {
    try {
      const data = await api('/api/admin/publish', {
        method: 'POST',
        body: JSON.stringify({ project_id: id })
      });
      showMessage(`Published: ${data.live_url}`, 'success');
      await loadOverview(false);
      await loadProject(id);
    } catch (error) {
      showMessage(error.message || 'Could not publish project.', 'error');
    }
  }

  function renderEnquiry(item) {
    const body = parseBodyJson(item);
    els.detail.innerHTML = `
      <p class="eyebrow">Custom build enquiry</p>
      <h2>${esc(item.business_name || body.business_name || item.contact_name || 'Custom build enquiry')}</h2>
      <div class="admin-grid-2">
        <div class="admin-info-card"><strong>Name</strong><span>${esc(item.contact_name || body.contact_name || body.name || '')}</span></div>
        <div class="admin-info-card"><strong>Email</strong><span>${esc(item.email || body.email || '')}</span></div>
        <div class="admin-info-card"><strong>Phone</strong><span>${esc(item.phone || body.phone || '')}</span></div>
        <div class="admin-info-card"><strong>Status</strong><span>${esc(item.status || 'new')}</span></div>
        <div class="admin-info-card"><strong>Main promotion goal</strong><span>${esc(item.main_promotion_goal || body.main_promotion_goal || '')}</span></div>
        <div class="admin-info-card"><strong>Project ID</strong><span>${esc(item.project_id || body.project_id || '')}</span></div>
      </div>
      <div class="admin-action-row">
        ${item.project_id ? `<button class="btn" data-open-project="${esc(item.project_id)}" type="button">Open linked project</button>` : ''}
        <a class="btn-ghost" href="mailto:${esc(item.email || body.email || '')}">Email customer</a>
        <button class="btn-ghost" id="markEnquiryReviewedBtn" type="button">Mark reviewed</button>
      </div>
      <details open class="admin-raw-details"><summary>Full enquiry</summary><pre>${pretty(body)}</pre></details>
    `;

    document.querySelector('[data-open-project]')?.addEventListener('click', (event) => loadProject(event.currentTarget.dataset.openProject));
    document.getElementById('markEnquiryReviewedBtn')?.addEventListener('click', () => markMessage('custom_enquiry', item.id, 'reviewed'));
  }

  function renderSupport(item) {
    const body = parseBodyJson(item);
    els.detail.innerHTML = `
      <p class="eyebrow">Assisted setup / support</p>
      <h2>${esc(item.email || 'Support request')}</h2>
      <div class="admin-grid-2">
        <div class="admin-info-card"><strong>Status</strong><span>${esc(item.status || 'new')}</span></div>
        <div class="admin-info-card"><strong>Type</strong><span>${esc(item.type || 'support')}</span></div>
        <div class="admin-info-card"><strong>Project ID</strong><span>${esc(item.project_id || '')}</span></div>
        <div class="admin-info-card"><strong>Created</strong><span>${esc(item.created_at || '')}</span></div>
      </div>
      <div class="admin-message-box">${esc(item.message || '')}</div>
      <div class="admin-action-row">
        ${item.project_id ? `<button class="btn" data-open-project="${esc(item.project_id)}" type="button">Open project</button>` : ''}
        <a class="btn-ghost" href="mailto:${esc(item.email || '')}">Email customer</a>
        <button class="btn-ghost" id="markSupportDoneBtn" type="button">Mark done</button>
      </div>
      <details class="admin-raw-details"><summary>Support JSON</summary><pre>${pretty(body)}</pre></details>
    `;

    document.querySelector('[data-open-project]')?.addEventListener('click', (event) => loadProject(event.currentTarget.dataset.openProject));
    document.getElementById('markSupportDoneBtn')?.addEventListener('click', () => markMessage('support_request', item.id, 'done'));
  }

  function renderUser(user) {
    const projects = (state.overview?.projects || []).filter((project) => project.user_id === user.id);
    els.detail.innerHTML = `
      <p class="eyebrow">Customer account</p>
      <h2>${esc(user.email)}</h2>
      <p class="muted">User ID: ${esc(user.id)}</p>
      <h3>Projects</h3>
      <div class="admin-list">
        ${projects.length ? projects.map((project) => `<button class="admin-list-item" data-open-project="${esc(project.id)}" type="button"><strong>${esc(projectTitle(project))}</strong><span>${esc(project.billing_status || 'no billing')}</span></button>`).join('') : '<div class="notice">No projects found for this user.</div>'}
      </div>
    `;
    els.detail.querySelectorAll('[data-open-project]').forEach((button) => button.addEventListener('click', () => loadProject(button.dataset.openProject)));
  }

  async function markMessage(type, id, status) {
    try {
      await api('/api/admin/message', {
        method: 'POST',
        body: JSON.stringify({ type, id, status })
      });
      showMessage('Status updated.', 'success');
      await loadOverview();
    } catch (error) {
      showMessage(error.message || 'Could not update status.', 'error');
    }
  }

  async function loadOverview(shouldRenderDetail = true) {
    try {
      state.overview = await api('/api/admin/overview');
      renderStats();
      renderList();

      if (shouldRenderDetail && state.selectedProjectId) {
        await loadProject(state.selectedProjectId);
      }
    } catch (error) {
      showMessage(error.message || 'Could not load admin panel.', 'error');
      els.stats.innerHTML = `<div class="card notice error">${esc(error.message || 'Could not load admin panel.')}</div>`;
    }
  }

  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-admin-tab]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.tab = button.dataset.adminTab;
      renderList();
      els.detail.innerHTML = '<h2>Select an item</h2><p class="muted">Choose an item from the list.</p>';
    });
  });

  els.search?.addEventListener('input', () => {
    state.search = els.search.value || '';
    renderList();
  });

  els.refresh?.addEventListener('click', () => loadOverview());

  loadOverview();
})();
