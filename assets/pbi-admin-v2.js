(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await response.json().catch(() => ({ ok: false, message: 'Invalid response' }));
    if (!response.ok && !data.error) data.error = data.message || `Request failed with status ${response.status}`;
    return data;
  }

  function badges(...items) {
    const values = items.filter(Boolean);
    if (!values.length) return '';
    return `<div class="pbi-admin-badges">${values.map((item) => `<span class="pbi-admin-badge">${esc(String(item).replaceAll('_', ' '))}</span>`).join('')}</div>`;
  }

  function listReq(items, target) {
    if (!target) return;
    target.innerHTML = items.length
      ? items.map((item) => `
        <button class="pbi-admin-item" data-r="${esc(item.id)}">
          <strong>${esc(item.business_name || item.customer_name || item.request_type)}</strong>
          <span>${esc(item.customer_email || '')}</span>
          ${badges(item.status, item.priority, item.request_type, item.payment_status)}
        </button>
      `).join('')
      : '<p>No requests yet.</p>';
    target.querySelectorAll('[data-r]').forEach((button) => {
      button.addEventListener('click', () => reqDetail(button.dataset.r));
    });
  }

  function listNot(items, target) {
    if (!target) return;
    target.innerHTML = items.length
      ? items.map((item) => `
        <button class="pbi-admin-item" data-n="${esc(item.id)}">
          <strong>${esc(item.title)}</strong>
          <span>${esc(item.message || item.customer_email || '')}</span>
          ${badges(item.status, item.priority, item.type)}
        </button>
      `).join('')
      : '<p>No notifications yet.</p>';
    target.querySelectorAll('[data-n]').forEach((button) => {
      button.addEventListener('click', () => notDetail(items.find((item) => item.id === button.dataset.n)));
    });
  }

  function renderKpis(data) {
    const grid = $('adminKpiGrid');
    if (!grid) return;
    const stats = data.stats || {};
    const notifications = (data.notifications || []).find((item) => item.status === 'new')?.count || 0;
    const requests = (data.requests || []).find((item) => item.status === 'new')?.count || 0;
    grid.innerHTML = `
      <article><strong>${Number(notifications)}</strong><span>New notifications</span></article>
      <article><strong>${Number(requests)}</strong><span>New requests</span></article>
      <article><strong>${Number(stats.ready_drafts || 0)}</strong><span>Publish-ready drafts</span></article>
      <article><strong>${Number(stats.past_due_billing || 0)}</strong><span>Payment issues</span></article>
      <article><strong>${Number(stats.total_users || 0)}</strong><span>Total users</span></article>
      <article><strong>${Number(stats.published_projects || 0)}</strong><span>Live sites</span></article>
      <article><strong>${Number(stats.suspended_sites || 0)}</strong><span>Suspended sites</span></article>
      <article><strong>${Number(stats.domain_queue || 0)}</strong><span>Domain queue</span></article>
      <article><strong>${Number(stats.coupon_count || 0)}</strong><span>Coupons</span></article>
    `;
  }

  function renderPriorities(items = []) {
    const target = $('adminPriorityList');
    if (!target) return;
    target.innerHTML = items.length
      ? items.map((item) => `
        <a class="pbi-priority-item ${esc(item.priority || 'calm')}" href="${esc(item.href || '/admin/')}">
          <strong>${Number(item.count || 0)}</strong>
          <span>${esc(item.label || 'Priority')}</span>
          <small>${esc(item.detail || '')}</small>
        </a>
      `).join('')
      : '<p>No priority data yet.</p>';
  }

  function renderGooseBrief(brief = {}) {
    const target = $('adminGooseBrief');
    const mood = $('adminGooseMood');
    if (!target) return;
    const selectedMood = brief.mood || 'profile';
    if (mood) mood.src = `/assets/goose/goose-${selectedMood}.png`;
    const lines = brief.lines || [];
    target.innerHTML = `
      <h3>${esc(brief.title || 'Goose admin brief')}</h3>
      <ul>${lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
      <div class="pbi-admin-actions">
        <a class="btn" href="/admin/requests/">Open requests</a>
        <a class="btn-ghost" href="/admin/projects/">Review projects</a>
      </div>
    `;
  }

  function renderLaunchQueue(projects = []) {
    const target = $('adminLaunchQueue');
    if (!target) return;
    target.innerHTML = projects.length
      ? projects.map((project) => {
        const paymentReady = ['active', 'trialing', 'not_required', 'paid'].includes(String(project.billing_status || '').toLowerCase());
        return `
          <a class="pbi-admin-item" href="/admin/projects/?project_id=${encodeURIComponent(project.id)}">
            <strong>${esc(project.name || project.business_name || 'Untitled project')}</strong>
            <span>${esc(project.user_email || project.id)}</span>
            ${badges(project.status || 'draft', project.plan, project.billing_status || 'billing unknown', paymentReady ? 'payment ready' : 'payment check')}
          </a>
        `;
      }).join('')
      : '<p>No draft projects in the launch queue.</p>';
  }

  function renderBillingPulse(data) {
    const target = $('adminBillingPulse');
    if (!target) return;
    const stats = data.stats || {};
    const breakdown = data.billing_breakdown || [];
    target.innerHTML = `
      <div class="pbi-pulse-grid">
        <article><strong>${Number(stats.active_billing || 0)}</strong><span>Active billing</span></article>
        <article><strong>${Number(stats.published_projects || 0)}</strong><span>Published</span></article>
        <article><strong>${Number(stats.ready_drafts || 0)}</strong><span>Ready drafts</span></article>
        <article><strong>${Number(stats.past_due_billing || 0)}</strong><span>Needs payment check</span></article>
        <article><strong>${Number(stats.suspended_sites || 0)}</strong><span>Suspended sites</span></article>
        <article><strong>${Number(stats.stripe_webhook_failures || 0)}</strong><span>Webhook failures</span></article>
      </div>
      <div class="pbi-billing-breakdown">
        ${breakdown.map((item) => `
          <div><span>${esc(item.status)}</span><strong>${Number(item.count || 0)}</strong></div>
        `).join('') || '<p>No billing records yet.</p>'}
      </div>
    `;
  }

  function renderOpsSnapshot(data) {
    const target = $('adminOpsSnapshot');
    if (!target) return;
    const stats = data.stats || {};
    const cards = [
      {
        label: 'Publish-ready drafts',
        value: Number(stats.ready_drafts || 0),
        detail: 'Paid or approved drafts waiting for final checks.',
        href: '/admin/projects/'
      },
      {
        label: 'Domain registration queue',
        value: Number(stats.domain_queue || 0),
        detail: 'Projects with a saved new-domain route.',
        href: '/admin/projects/'
      },
      {
        label: 'Domain automation',
        value: stats.domain_automation_enabled ? 'On' : 'Setup',
        detail: stats.domain_automation_enabled ? `${Number(stats.domain_followups || 0)} follow-up item(s) still need review.` : 'Connect registrar automation for true hands-off registration.',
        href: '/admin/'
      },
      {
        label: 'Stripe coupon system',
        value: stats.stripe_coupons_enabled ? 'On' : 'Setup',
        detail: stats.stripe_coupons_enabled ? 'Coupons can be created in Stripe.' : 'Add STRIPE_SECRET_KEY before creating coupons.',
        href: '/admin/'
      },
      {
        label: 'Webhook failures',
        value: Number(stats.stripe_webhook_failures || 0),
        detail: Number(stats.stripe_webhook_failures || 0) ? 'Stripe sent events that PBI did not finish processing.' : 'Webhook processing looks clean right now.',
        href: '/admin/notifications/'
      },
      {
        label: 'Support inbox',
        value: Number((data.requests || []).find((item) => item.status === 'new')?.count || 0),
        detail: 'New requests that need a first reply.',
        href: '/admin/requests/'
      }
    ];
    target.innerHTML = cards.map((card) => `
      <a class="pbi-admin-op-card" href="${esc(card.href)}">
        <strong>${esc(card.value)}</strong>
        <span>${esc(card.label)}</span>
        <small>${esc(card.detail)}</small>
      </a>
    `).join('');
  }

  function searchRecords(data, term) {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    const rows = [];
    (data.latest_users || []).forEach((user) => rows.push({
      type: 'User',
      title: user.email || 'No email',
      text: user.id,
      href: `/admin/users/?user_id=${encodeURIComponent(user.id)}`
    }));
    (data.latest_projects || []).forEach((project) => rows.push({
      type: 'Project',
      title: project.name || project.business_name || 'Untitled project',
      text: `${project.user_email || ''} ${project.id} ${project.billing_status || ''}`,
      href: `/admin/projects/?project_id=${encodeURIComponent(project.id)}`
    }));
    (data.latest_requests || []).forEach((request) => rows.push({
      type: 'Request',
      title: request.business_name || request.customer_name || request.request_type,
      text: `${request.customer_email || ''} ${request.status || ''} ${request.request_type || ''}`,
      href: `/admin/requests/?id=${encodeURIComponent(request.id)}`
    }));
    (data.latest_notifications || []).forEach((notification) => rows.push({
      type: 'Alert',
      title: notification.title,
      text: `${notification.message || ''} ${notification.customer_email || ''} ${notification.status || ''}`,
      href: notification.request_id ? `/admin/requests/?id=${encodeURIComponent(notification.request_id)}` : '/admin/notifications/'
    }));
    return rows.filter((row) => `${row.type} ${row.title} ${row.text}`.toLowerCase().includes(q)).slice(0, 10);
  }

  function bindGlobalSearch(data) {
    const input = $('adminGlobalSearch');
    const target = $('adminGlobalSearchResults');
    if (!input || !target) return;
    const render = () => {
      const results = searchRecords(data, input.value);
      target.innerHTML = input.value.trim()
        ? results.map((row) => `
          <a class="pbi-admin-item" href="${esc(row.href)}">
            <strong>${esc(row.title)}</strong>
            <span>${esc(row.type)} - ${esc(row.text || '')}</span>
          </a>
        `).join('') || '<p>No recent matches. Try the dedicated users, projects or requests pages for older records.</p>'
        : '<p>Start typing to search recent users, projects, requests and alerts.</p>';
    };
    input.addEventListener('input', render);
    render();
  }

  function renderLatest(data) {
    listNot(data.latest_notifications || [], $('adminLatestNotifications'));
    listReq(data.latest_requests || [], $('adminLatestRequests'));
    const userBox = $('adminLatestUsers');
    if (userBox) {
      userBox.innerHTML = (data.latest_users || []).length
        ? (data.latest_users || []).map((user) => `
          <a class="pbi-admin-item" href="/admin/users/?user_id=${encodeURIComponent(user.id)}">
            <strong>${esc(user.email || 'No email')}</strong>
            <span>${esc(user.id)}</span>
            ${badges(user.status || 'active', `${user.project_count || 0} projects`, `${user.session_count || 0} sessions`)}
          </a>
        `).join('')
        : '<p>No users yet.</p>';
    }
    const projectBox = $('adminLatestProjects');
    if (projectBox) {
      projectBox.innerHTML = (data.latest_projects || []).length
        ? (data.latest_projects || []).map((project) => `
          <a class="pbi-admin-item" href="/admin/projects/?project_id=${encodeURIComponent(project.id)}">
            <strong>${esc(project.name || project.business_name || 'Untitled')}</strong>
            <span>${esc(project.user_email || project.id)}</span>
            ${badges(project.billing_status || project.status, project.plan, Number(project.published || 0) === 1 ? 'live' : 'draft')}
          </a>
        `).join('')
        : '<p>No projects yet.</p>';
    }
  }

  function formatCoupon(row = {}) {
    if (Number(row.percent_off || 0) > 0) return `${Number(row.percent_off)}% off`;
    const currency = String(row.currency || 'gbp').toUpperCase();
    const amount = Number(row.amount_off || 0) / 100;
    return `${currency} ${amount.toFixed(2)} off`;
  }

  function renderCouponList(coupons = [], stripeConnected = false) {
    const target = $('adminCouponList');
    if (!target) return;
    if (!stripeConnected) {
      target.innerHTML = '<p>Stripe is not connected yet. Add STRIPE_SECRET_KEY before generating coupons.</p>';
      return;
    }
    target.innerHTML = coupons.length
      ? coupons.map((coupon) => `
        <article class="pbi-admin-item pbi-coupon-row">
          <strong>${esc(coupon.code || 'Coupon')}</strong>
          <span>${esc(coupon.name || 'PBI discount')} - ${esc(formatCoupon(coupon))}</span>
          ${badges(coupon.duration || 'once', coupon.max_redemptions ? `${coupon.max_redemptions} uses` : 'no use limit', coupon.stripe_promotion_code_id ? 'Stripe ready' : 'Stripe pending')}
        </article>
      `).join('')
      : '<p>No coupons created yet.</p>';
  }

  async function loadCoupons() {
    if (!$('adminCouponList')) return;
    const data = await api('/api/admin/coupons');
    if (!data.ok) {
      $('adminCouponList').innerHTML = `<p>${esc(data.error || data.message || 'Could not load coupons.')}</p>`;
      return;
    }
    renderCouponList(data.coupons || [], data.stripe_connected);
  }

  function randomCouponCode() {
    return `PBI-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  function couponPayload() {
    const amount = $('adminCouponAmount')?.value || '';
    const percent = $('adminCouponPercent')?.value || '';
    return {
      code: $('adminCouponCode')?.value || randomCouponCode(),
      name: $('adminCouponName')?.value || 'PBI discount',
      percent_off: amount ? 0 : Number(percent || 10),
      amount_off: amount,
      currency: $('adminCouponCurrency')?.value || 'gbp',
      duration: $('adminCouponDuration')?.value || 'once',
      duration_in_months: $('adminCouponMonths')?.value || '',
      max_redemptions: $('adminCouponMax')?.value || '',
      redeem_by: $('adminCouponRedeemBy')?.value || ''
    };
  }

  function setCouponResult(text, type = 'info') {
    const target = $('adminCouponResult');
    if (!target) return;
    target.style.display = 'block';
    target.className = `notice domain-${type}`;
    target.textContent = text;
  }

  function bindCoupons() {
    const form = $('adminCouponForm');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    $('adminGenerateCouponCode')?.addEventListener('click', () => {
      if ($('adminCouponCode')) $('adminCouponCode').value = randomCouponCode();
    });
    $('adminRefreshCoupons')?.addEventListener('click', loadCoupons);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      if (button) {
        button.disabled = true;
        button.textContent = 'Creating...';
      }
      setCouponResult('Creating Stripe coupon...', 'info');
      try {
        const data = await api('/api/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(couponPayload())
        });
        if (data.ok) {
          setCouponResult(`Coupon ${data.coupon.code} is live in Stripe and can be used at checkout.`, 'success');
          renderCouponList(data.coupons || [], true);
        } else {
          setCouponResult(data.error || data.message || 'Could not create coupon.', 'error');
        }
      } catch (err) {
        setCouponResult(err?.message || 'Could not create coupon. Please try again.', 'error');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = 'Create Stripe coupon';
        }
      }
    });
  }

  async function summary() {
    if (!$('adminKpiGrid')) return;
    const data = await api('/api/admin/summary');
    if (!data.ok) {
      $('adminKpiGrid').innerHTML = `<article><strong>!</strong><span>${esc(data.error || data.message || 'Admin login required')}</span></article>`;
      return;
    }
    renderKpis(data);
    renderPriorities(data.priority_items || []);
    renderGooseBrief(data.goose_brief || {});
    renderLaunchQueue(data.launch_queue || []);
    renderBillingPulse(data);
    renderOpsSnapshot(data);
    renderLatest(data);
    bindGlobalSearch(data);
    loadCoupons();
  }

  async function requests() {
    const target = $('adminRequestsList');
    if (!target) return;
    const type = $('adminRequestType');
    const status = $('adminRequestStatus');
    if (type?.dataset.defaultType && !type.value) type.value = type.dataset.defaultType;
    const query = new URLSearchParams();
    if (type?.value) query.set('type', type.value);
    if (status?.value) query.set('status', status.value);
    const data = await api(`/api/admin/requests?${query.toString()}`);
    listReq(data.requests || [], target);
    const id = new URLSearchParams(location.search).get('id');
    if (id) reqDetail(id);
  }

  async function reqDetail(id) {
    const target = $('adminRequestDetail');
    if (!target) return;
    const data = await api(`/api/admin/requests?id=${encodeURIComponent(id)}`);
    const request = data.request;
    if (!request) {
      target.innerHTML = '<p>Request not found.</p>';
      return;
    }
    target.innerHTML = `
      <h3>${esc(request.business_name || request.customer_name || request.request_type)}</h3>
      ${badges(request.status, request.priority, request.request_type, request.payment_status)}
      <p>${esc(request.brief || request.customer_message || 'No brief supplied.')}</p>
      <p class="meta">${esc(request.customer_email || '')} - Project: ${esc(request.project_id || 'not linked')}</p>
      <label>Status</label>
      <select id="rdStatus">${['new','contacted','waiting_for_customer','in_progress','ready_for_review','changes_requested','complete','cancelled'].map((status) => `<option value="${status}" ${request.status === status ? 'selected' : ''}>${status.replaceAll('_', ' ')}</option>`).join('')}</select>
      <label>Internal notes</label>
      <textarea id="rdNotes" rows="5">${esc(request.internal_notes || '')}</textarea>
      <div class="pbi-admin-actions">
        <button class="btn" id="rdSave">Save</button>
        ${request.project_id ? `<a class="btn-ghost" href="/admin/projects/?project_id=${encodeURIComponent(request.project_id)}">Open project</a><a class="btn-ghost" href="/builder/?project=${encodeURIComponent(request.project_id)}&admin=1">Admin edit</a>` : ''}
      </div>
      <pre>${esc(JSON.stringify(request, null, 2))}</pre>
    `;
    $('rdSave').onclick = async () => {
      await api('/api/admin/requests', {
        method: 'PATCH',
        body: JSON.stringify({ id: request.id, status: $('rdStatus').value, internal_notes: $('rdNotes').value })
      });
      reqDetail(request.id);
    };
  }

  function notDetail(notification) {
    const target = $('adminNotificationDetail');
    if (!target || !notification) return;
    target.innerHTML = `
      <h3>${esc(notification.title)}</h3>
      <p>${esc(notification.message || '')}</p>
      ${badges(notification.status, notification.priority, notification.type)}
      <p>Project: ${esc(notification.project_id || 'not linked')}</p>
      <div class="pbi-admin-actions">
        ${notification.project_id ? `<a class="btn" href="/admin/projects/?project_id=${encodeURIComponent(notification.project_id)}">Open project</a>` : ''}
        ${notification.request_id ? `<a class="btn-ghost" href="/admin/requests/?id=${encodeURIComponent(notification.request_id)}">Open request</a>` : ''}
        <button class="btn-ghost" id="markRead">Mark read</button>
      </div>
    `;
    $('markRead').onclick = async () => {
      await api('/api/admin/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ id: notification.id, status: 'read' })
      });
      notifications();
    };
  }

  async function notifications() {
    const target = $('adminNotificationsList');
    if (!target) return;
    const data = await api('/api/admin/notifications');
    listNot(data.notifications || [], target);
  }

  async function projects() {
    const target = $('adminProjectsList');
    if (!target) return;
    const id = new URLSearchParams(location.search).get('project_id');
    const data = await api('/api/admin/projects-v2?limit=80');
    target.innerHTML = (data.projects || []).map((project) => `
      <button class="pbi-admin-item" data-p="${esc(project.id)}">
        <strong>${esc(project.name || project.business_name || project.id)}</strong>
        <span>${esc(project.user_email || project.status || '')}</span>
        ${badges(project.status || 'project')}
      </button>
    `).join('') || '<p>No projects found.</p>';
    target.querySelectorAll('[data-p]').forEach((button) => {
      button.addEventListener('click', () => projDetail(button.dataset.p));
    });
    if (id) projDetail(id);
  }

  async function projDetail(id) {
    const target = $('adminProjectDetail');
    if (!target || !id) return;
    const data = await api(`/api/admin/projects-v2?project_id=${encodeURIComponent(id)}`);
    const project = data.project || {};
    target.innerHTML = `
      <h3>${esc(project.name || project.business_name || id)}</h3>
      ${badges(project.status || 'project', project.billing_status, project.plan)}
      <p>Project ID: ${esc(id)}</p>
      <div class="pbi-admin-actions">
        <a class="btn" href="/builder/?project=${encodeURIComponent(id)}&admin=1">Admin edit project</a>
        <a class="btn-ghost" href="/canvas-builder/?project=${encodeURIComponent(id)}&admin=1">Advanced editor</a>
        <button class="btn-ghost" id="scanProject">Scan readiness</button>
      </div>
      <div id="scanOut"></div>
      <h4>Sections</h4>
      ${(data.sections || []).map((section) => `<div class="pbi-section-mini"><strong>${esc(section.title || section.section_type)}</strong><br>${esc(section.section_type)} - ${esc(section.layout)}</div>`).join('') || '<p>No section records yet.</p>'}
      <h4>Add note</h4>
      <textarea id="pNote" rows="4"></textarea>
      <button class="btn" id="saveNote">Save note</button>
      ${(data.notes || []).map((note) => `<div class="pbi-section-mini"><strong>${esc(note.created_by || 'Admin')}</strong><p>${esc(note.note)}</p></div>`).join('')}
    `;
    $('scanProject').onclick = async () => {
      const result = await api('/api/admin/repair-project', {
        method: 'POST',
        body: JSON.stringify({ project_id: id })
      });
      $('scanOut').innerHTML = `<div class="pbi-section-mini"><strong>Readiness: ${result.readiness_score || 0}%</strong>${(result.issues || []).map((issue) => `<p>${esc(issue.label)} - ${esc(issue.fix)}</p>`).join('')}</div>`;
    };
    $('saveNote').onclick = async () => {
      if (!$('pNote').value.trim()) return;
      await api('/api/admin/project-note', {
        method: 'POST',
        body: JSON.stringify({ project_id: id, note: $('pNote').value })
      });
      projDetail(id);
    };
  }

  function bind() {
    summary();
    requests();
    notifications();
    projects();
    bindCoupons();
    $('adminRefreshSummary')?.addEventListener('click', summary);
    $('adminRefreshRequests')?.addEventListener('click', requests);
    $('adminRefreshNotifications')?.addEventListener('click', notifications);
    $('adminRequestType')?.addEventListener('change', requests);
    $('adminRequestStatus')?.addEventListener('change', requests);
    $('adminLoadProject')?.addEventListener('click', () => projDetail($('adminProjectSearch').value.trim()));
    $('adminProjectSearch')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') projDetail($('adminProjectSearch').value.trim());
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', bind) : bind();
})();
