(async () => {
  const list = document.getElementById('adminGooseMissionList');
  if (!list) return;

  const kpis = document.getElementById('adminGooseMissionKpis');
  const form = document.getElementById('adminGooseMissionForm');
  const message = document.getElementById('adminGooseMissionMessage');
  const typeInput = document.getElementById('adminGooseMissionType');
  const projectInput = document.getElementById('adminGooseMissionProject');
  const goalInput = document.getElementById('adminGooseMissionGoal');

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function label(value) {
    return String(value || '').replaceAll('_', ' ').trim() || 'mission';
  }

  function setMessage(text, type = 'info') {
    if (!message) return;
    message.style.display = text ? 'block' : 'none';
    message.className = `notice domain-${type}`;
    message.textContent = text || '';
  }

  async function api(path, options = {}) {
    try {
      const response = await fetch(path, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      const data = await response.json().catch(() => ({ ok: false }));
      return { ok: response.ok && data.ok !== false, status: response.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { error: err?.message || 'Request failed.' } };
    }
  }

  function progressWidth(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function renderStats(stats = {}) {
    if (!kpis) return;
    kpis.innerHTML = `
      <article><strong>${Number(stats.total || 0)}</strong><span>Total missions</span></article>
      <article><strong>${Number(stats.active || 0)}</strong><span>Active</span></article>
      <article><strong>${Number(stats.needs_approval || 0)}</strong><span>Needs approval</span></article>
      <article><strong>${Number(stats.completed || 0)}</strong><span>Completed</span></article>
      <article><strong>${Number(stats.avg_progress || 0)}%</strong><span>Average progress</span></article>
    `;
  }

  function renderMissions(missions = []) {
    if (!missions.length) {
      list.innerHTML = `
        <div class="pbi-goose-mission-empty">
          <h3>No Goose missions yet.</h3>
          <p>Create the first mission above or ask a customer to add one from their dashboard.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = missions.map((mission) => {
      const progress = progressWidth(mission.progress);
      const steps = mission.steps || [];
      return `
        <article class="pbi-goose-mission-card" data-mission="${esc(mission.id)}">
          <header>
            <div class="pbi-goose-mission-meta">
              <span class="pbi-goose-status-pill ${esc(mission.status || 'active')}">${esc(label(mission.status || 'active'))}</span>
              <span>${esc(label(mission.mission_type))}</span>
              <span>${esc(label(mission.priority || 'medium'))} priority</span>
              ${mission.user_email ? `<span>${esc(mission.user_email)}</span>` : ''}
              ${mission.project_name ? `<span>${esc(mission.project_name)}</span>` : ''}
            </div>
            <h3>${esc(mission.summary || mission.goal || 'Goose mission')}</h3>
            <p>${esc(mission.goal || '')}</p>
          </header>
          <div class="pbi-goose-progress">
            <div><span style="width:${progress}%"></span></div>
            <small>${progress}% complete</small>
          </div>
          <div class="pbi-goose-steps">
            ${steps.map((step) => `
              <div class="pbi-goose-step ${esc(step.status === 'done' ? 'done' : '')}">
                <strong>${esc(step.title)}</strong>
                <p>${esc(step.detail)}</p>
                <div class="pbi-goose-step-meta">
                  <span>${esc(label(step.category))}</span>
                  <span>${esc(label(step.estimated_impact || 'medium'))} impact</span>
                  <span>${esc(label(step.status || 'todo'))}</span>
                </div>
                <button class="btn-ghost pbiGooseStepAction" type="button" data-mission="${esc(mission.id)}" data-step="${esc(step.id)}" data-next="${step.status === 'done' ? 'todo' : 'done'}">${step.status === 'done' ? 'Mark to do' : 'Mark done'}</button>
              </div>
            `).join('')}
          </div>
          <div class="pbi-goose-mission-actions">
            <button class="btn-ghost pbiGooseMissionStatus" type="button" data-mission="${esc(mission.id)}" data-status="${mission.status === 'paused' ? 'active' : 'paused'}">${mission.status === 'paused' ? 'Resume' : 'Pause'}</button>
            <button class="btn-ghost pbiGooseMissionStatus" type="button" data-mission="${esc(mission.id)}" data-status="${mission.status === 'completed' ? 'active' : 'completed'}">${mission.status === 'completed' ? 'Reopen' : 'Complete'}</button>
            ${mission.project_id ? `<a class="btn-ghost" href="/admin/projects/?project_id=${encodeURIComponent(mission.project_id)}">Project admin</a>` : ''}
            ${mission.project_id ? `<a class="btn" href="/canvas-builder/?project=${encodeURIComponent(mission.project_id)}&admin=1">Open PBI Designer</a>` : ''}
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('.pbiGooseStepAction').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        const result = await api('/api/admin/goose-missions', {
          method: 'PATCH',
          body: JSON.stringify({
            mission_id: button.dataset.mission,
            step_id: button.dataset.step,
            step_status: button.dataset.next
          })
        });
        if (!result.ok) setMessage(result.data.error || result.data.message || 'Goose could not update that step.', 'error');
        await load();
      });
    });

    list.querySelectorAll('.pbiGooseMissionStatus').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        const result = await api('/api/admin/goose-missions', {
          method: 'PATCH',
          body: JSON.stringify({ mission_id: button.dataset.mission, status: button.dataset.status })
        });
        if (!result.ok) setMessage(result.data.error || result.data.message || 'Goose could not update that mission.', 'error');
        await load();
      });
    });
  }

  async function load() {
    const result = await api('/api/admin/goose-missions');
    if (!result.ok) {
      list.innerHTML = `<p>${esc(result.data.error || result.data.message || 'Admin login required.')}</p>`;
      renderStats({});
      return;
    }
    renderStats(result.data.stats || {});
    renderMissions(result.data.missions || []);
  }

  document.getElementById('adminGooseRefresh')?.addEventListener('click', load);

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const goal = goalInput?.value.trim() || '';
    if (goal.length < 8) {
      setMessage('Add a clearer mission goal first.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Planning...';
    }
    setMessage('Goose is creating the mission plan...', 'info');
    const result = await api('/api/admin/goose-missions', {
      method: 'POST',
      body: JSON.stringify({
        goal,
        mission_type: typeInput?.value || '',
        project_id: projectInput?.value.trim() || ''
      })
    });
    if (result.ok) {
      goalInput.value = '';
      setMessage('Goose mission created.', 'success');
      await load();
    } else {
      setMessage(result.data.error || result.data.message || 'Goose could not create that mission.', 'error');
    }
    if (button) {
      button.disabled = false;
      button.textContent = 'Create mission';
    }
  });

  await load();
})();
