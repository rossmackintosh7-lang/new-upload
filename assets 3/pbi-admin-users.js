(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  let users = [];
  let selectedUserId = '';

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await response.json().catch(() => ({ ok: false, error: 'Invalid response from server.' }));
    if (!response.ok && !data.error) data.error = `Request failed with status ${response.status}`;
    return data;
  }

  function badge(value) {
    if (!value) return '';
    return `<span class="pbi-admin-badge">${esc(String(value).replaceAll('_',' '))}</span>`;
  }

  function badgeRow(...values) {
    return `<div class="pbi-admin-badges">${values.filter(Boolean).map(badge).join('')}</div>`;
  }

  function renderKpis(stats = {}) {
    const el = $('userManagerKpis');
    if (!el) return;
    el.innerHTML = `
      <article><strong>${Number(stats.total_users || 0)}</strong><span>Total users</span></article>
      <article><strong>${Number(stats.suspended_users || 0)}</strong><span>Suspended</span></article>
      <article><strong>${Number(stats.total_projects || 0)}</strong><span>Projects</span></article>
      <article><strong>${Number(stats.active_billing || 0)}</strong><span>Active billing projects</span></article>
    `;
  }

  function renderList() {
    const list = $('userList');
    if (!list) return;
    if (!users.length) {
      list.innerHTML = '<p>No users found.</p>';
      return;
    }
    list.innerHTML = users.map((user) => `
      <button class="pbi-admin-item" data-user-id="${esc(user.id)}">
        <strong>${esc(user.email || 'No email')}</strong>
        <span>${esc(user.id)}</span>
        ${badgeRow(user.status || 'active', `${user.project_count || 0} projects`, `${user.session_count || 0} sessions`, user.email_verified ? 'verified' : 'unverified')}
      </button>
    `).join('');
    list.querySelectorAll('[data-user-id]').forEach((button) => {
      button.addEventListener('click', () => loadDetail(button.dataset.userId));
    });
  }

  async function loadUsers() {
    const q = $('userSearch')?.value || '';
    const params = new URLSearchParams();
    if (q.trim()) params.set('search', q.trim());
    const data = await api(`/api/admin/users?${params.toString()}`);
    if (!data.ok) {
      const list = $('userList');
      if (list) list.innerHTML = `<p>${esc(data.error || 'Admin login required.')}</p>`;
      return;
    }
    users = data.users || [];
    renderKpis(data.stats || {});
    renderList();
    const open = new URLSearchParams(location.search).get('user_id');
    if (open) loadDetail(open);
  }

  function projectRows(projects = []) {
    if (!projects.length) return '<p>No projects for this user.</p>';
    return `<div class="pbi-admin-list">${projects.map((project) => `
      <div class="pbi-admin-item">
        <strong>${esc(project.name || project.business_name || 'Untitled project')}</strong>
        <span>${esc(project.id)}</span>
        ${badgeRow(project.plan, project.billing_status, project.status, Number(project.published) === 1 ? 'published' : 'draft')}
        <div class="pbi-admin-actions">
          <a class="btn-ghost" href="/builder/?project=${encodeURIComponent(project.id)}&admin=1">Open builder</a>
          <a class="btn-ghost" href="/admin/projects/?project_id=${encodeURIComponent(project.id)}">Admin project</a>
          ${project.live_url || project.public_slug ? `<a class="btn-ghost" href="${esc(project.live_url || `/site/canvas/${encodeURIComponent(project.public_slug)}/`)}">Public site</a>` : ''}
          ${Number(project.published || 0) === 1 ? `<button class="btn-ghost adminTakeDownProject" type="button" data-project-id="${esc(project.id)}">Take down site</button>` : ''}
          ${['active','trialing','past_due'].includes(String(project.billing_status || '').toLowerCase()) ? `<button class="btn-ghost adminCancelProject" type="button" data-project-id="${esc(project.id)}">Cancel subscription</button>` : ''}
        </div>
      </div>
    `).join('')}</div>`;
  }

  function sessionRows(sessions = []) {
    if (!sessions.length) return '<p>No active sessions.</p>';
    return `<ul>${sessions.map((s) => `<li><code>${esc(s.id)}</code> · expires ${esc(s.expires_at || 'unknown')} · seen ${esc(s.last_seen_at || 'not recorded')}</li>`).join('')}</ul>`;
  }

  async function loadDetail(id = selectedUserId) {
    selectedUserId = id;
    const target = $('userDetail');
    if (target) target.innerHTML = '<p>Loading user...</p>';
    const data = await api(`/api/admin/users?user_id=${encodeURIComponent(id)}`);
    if (!data.ok || !data.user) {
      if (target) target.innerHTML = `<p>${esc(data.error || 'User not found.')}</p>`;
      return;
    }
    const user = data.user;
    const controls = data.controls || {};
    const dangerEmail = esc(user.email || user.id);
    target.innerHTML = `
      <h3>${esc(user.email || 'No email')}</h3>
      <p class="meta">${esc(user.id)} · Created ${esc(user.created_at || 'unknown')}</p>
      ${badgeRow(user.status || 'active', user.email_verified ? 'verified' : 'unverified', `${data.projects?.length || 0} projects`, `${data.sessions?.length || 0} sessions`)}
      <div class="pbi-admin-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin:18px 0">
        <div class="card"><strong>${Number(data.counts?.canvas || 0)}</strong><span> Canvas records</span></div>
        <div class="card"><strong>${Number(data.counts?.cms || 0)}</strong><span> CMS entries</span></div>
        <div class="card"><strong>${Number(data.counts?.active_billing || 0)}</strong><span> Active billing</span></div>
        <div class="card"><strong>${Number(data.counts?.published_projects || 0)}</strong><span> Live sites</span></div>
      </div>
      <label>Admin notes</label>
      <textarea id="userAdminNotes" rows="4" placeholder="Internal notes only">${esc(controls.notes || '')}</textarea>
      <div class="pbi-admin-actions">
        <button class="btn" id="saveUserNotes" type="button">Save notes</button>
        <button class="btn-ghost" id="logoutUser" type="button">Revoke sessions</button>
        ${user.status === 'suspended' ? '<button class="btn" id="reactivateUser" type="button">Reactivate</button>' : '<button class="btn-ghost" id="suspendUser" type="button">Suspend</button>'}
      </div>
      <hr>
      <h3>Projects</h3>
      ${projectRows(data.projects || [])}
      <h3>Active sessions</h3>
      ${sessionRows(data.sessions || [])}
      <hr>
      <h3>Danger zone</h3>
      <p class="muted">Deleting removes the user account, sessions, projects, canvas records, CMS entries, notes and collaborator records. It does not cancel Stripe subscriptions.</p>
      <button class="btn-ghost" id="deleteUser" type="button">Delete ${dangerEmail}</button>
    `;

    document.querySelectorAll('.adminTakeDownProject').forEach((button) => {
      button.addEventListener('click', async () => {
        const projectId = button.dataset.projectId;
        if (!confirm('Take this website offline now? The public site will stop loading.')) return;
        await runProjectAction('take_down_project', projectId);
      });
    });
    document.querySelectorAll('.adminCancelProject').forEach((button) => {
      button.addEventListener('click', async () => {
        const projectId = button.dataset.projectId;
        if (!confirm('Cancel this subscription and take the website offline now?')) return;
        await runProjectAction('cancel_project_subscription', projectId);
      });
    });

    $('saveUserNotes')?.addEventListener('click', async () => runAction('notes', { notes: $('userAdminNotes')?.value || '' }));
    $('logoutUser')?.addEventListener('click', async () => runAction('logout'));
    $('suspendUser')?.addEventListener('click', async () => runAction('suspend', { notes: $('userAdminNotes')?.value || '' }));
    $('reactivateUser')?.addEventListener('click', async () => runAction('reactivate', { notes: $('userAdminNotes')?.value || '' }));
    $('deleteUser')?.addEventListener('click', async () => deleteUser(user));
  }

  async function runProjectAction(action, projectId) {
    if (!selectedUserId || !projectId) return;
    const data = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ action, user_id: selectedUserId, project_id: projectId }) });
    if (!data.ok) return alert(data.error || 'Action failed.');
    await loadUsers();
    await loadDetail(selectedUserId);
  }

  async function runAction(action, extra = {}) {
    if (!selectedUserId) return;
    const data = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ action, user_id: selectedUserId, ...extra }) });
    if (!data.ok) return alert(data.error || 'Action failed.');
    await loadUsers();
    await loadDetail(selectedUserId);
  }

  async function deleteUser(user) {
    const label = user.email || user.id;
    const typed = prompt(`Type DELETE ${label} to permanently delete this PBI user. Stripe billing is not cancelled automatically.`);
    if (typed !== `DELETE ${label}`) return;
    const data = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ action: 'delete', user_id: user.id, confirm: label }) });
    if (!data.ok) return alert(data.error || 'Delete failed.');
    selectedUserId = '';
    $('userDetail').innerHTML = `<p>User deleted. Removed ${Number(data.deleted?.projects || 0)} projects and related records.</p>`;
    await loadUsers();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('userSearchBtn')?.addEventListener('click', loadUsers);
    $('userRefreshBtn')?.addEventListener('click', loadUsers);
    $('userSearch')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') loadUsers(); });
    loadUsers();
  });
})();
