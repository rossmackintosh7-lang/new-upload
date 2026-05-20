(async () => {
  const list = document.getElementById('gooseMissionList');
  if (!list) return;

  const form = document.getElementById('gooseMissionForm');
  const message = document.getElementById('gooseMissionMessage');
  const projectSelect = document.getElementById('gooseMissionProject');
  const typeSelect = document.getElementById('gooseMissionType');
  const goalInput = document.getElementById('gooseMissionGoal');

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

  function actionLinks(mission = {}) {
    const links = [];
    if (mission.project_id) {
      const plan = mission.project_plan || 'starter';
      links.push(`<a class="btn-ghost" href="/canvas-builder/?project=${encodeURIComponent(mission.project_id)}">Open project</a>`);
      links.push(`<a class="btn-ghost" href="/payment/?project=${encodeURIComponent(mission.project_id)}&plan=${encodeURIComponent(plan)}">Launch route</a>`);
    }
    if (mission.mission_type === 'seo_growth') links.push('<a class="btn-ghost" href="/seo-for-small-businesses/">SEO guide</a>');
    return links.join('');
  }

  function renderMissions(missions = []) {
    if (!missions.length) {
      list.innerHTML = `
        <div class="pbi-goose-mission-empty">
          <h3>No Goose missions yet.</h3>
          <p class="muted">Add a clear goal above and Goose will turn it into a practical plan you can track.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = missions.map((mission) => {
      const progress = progressWidth(mission.progress);
      const steps = mission.steps || [];
      const title = mission.summary || mission.goal || 'Goose mission';
      return `
        <article class="pbi-goose-mission-card" data-mission="${esc(mission.id)}">
          <header>
            <div class="pbi-goose-mission-meta">
              <span class="pbi-goose-status-pill ${esc(mission.status || 'active')}">${esc(label(mission.status || 'active'))}</span>
              <span>${esc(label(mission.mission_type))}</span>
              <span>${esc(label(mission.priority || 'medium'))} priority</span>
              ${mission.project_name ? `<span>${esc(mission.project_name)}</span>` : ''}
            </div>
            <h3>${esc(title)}</h3>
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
            <button class="btn-ghost pbiGooseMissionStatus" type="button" data-mission="${esc(mission.id)}" data-status="${mission.status === 'completed' ? 'active' : 'completed'}">${mission.status === 'completed' ? 'Reopen mission' : 'Complete mission'}</button>
            ${actionLinks(mission)}
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('.pbiGooseStepAction').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        const result = await api('/api/goose/missions', {
          method: 'PATCH',
          body: JSON.stringify({
            mission_id: button.dataset.mission,
            step_id: button.dataset.step,
            step_status: button.dataset.next
          })
        });
        if (!result.ok) setMessage(result.data.error || result.data.message || 'Goose could not update that step.', 'error');
        await loadMissions();
      });
    });

    list.querySelectorAll('.pbiGooseMissionStatus').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        const result = await api('/api/goose/missions', {
          method: 'PATCH',
          body: JSON.stringify({ mission_id: button.dataset.mission, status: button.dataset.status })
        });
        if (!result.ok) setMessage(result.data.error || result.data.message || 'Goose could not update that mission.', 'error');
        await loadMissions();
      });
    });
  }

  async function loadProjects() {
    const result = await api('/api/projects/list');
    if (!result.ok || !result.data.authenticated || !projectSelect) return;
    const projects = result.data.projects || [];
    projectSelect.innerHTML = '<option value="">No specific project</option>' + projects.map((project) => `
      <option value="${esc(project.id)}">${esc(project.name || project.id)}${project.plan ? ` · ${esc(project.plan)}` : ''}</option>
    `).join('');
  }

  async function loadMissions() {
    const result = await api('/api/goose/missions');
    if (!result.ok) {
      list.innerHTML = `
        <div class="pbi-goose-mission-empty">
          <h3>Log in to use Goose Missions.</h3>
          <p class="muted">Saved missions sit inside your PBI account so Goose can connect them to projects and launch checks.</p>
          <div class="pbi-goose-mission-actions">
            <a class="btn" href="/login/?next=/dashboard/%23goose-missions">Login</a>
            <a class="btn-ghost" href="/signup/">Create account</a>
          </div>
        </div>
      `;
      return;
    }
    renderMissions(result.data.missions || []);
  }

  const me = await api('/api/auth/me');
  if (me.data?.is_admin) {
    const adminLink = document.getElementById('gooseAdminMissionLink');
    if (adminLink) adminLink.hidden = false;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const goal = goalInput?.value.trim() || '';
    if (goal.length < 8) {
      setMessage('Add a clearer goal for Goose first.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Planning...';
    }
    setMessage('Goose is turning that goal into a mission...', 'info');
    const result = await api('/api/goose/missions', {
      method: 'POST',
      body: JSON.stringify({
        goal,
        mission_type: typeSelect?.value || '',
        project_id: projectSelect?.value || ''
      })
    });
    if (result.ok) {
      goalInput.value = '';
      setMessage('Goose mission created.', 'success');
      await loadMissions();
    } else {
      setMessage(result.data.error || result.data.message || 'Goose could not create that mission.', 'error');
    }
    if (button) {
      button.disabled = false;
      button.textContent = 'Create Goose mission';
    }
  });

  await loadProjects();
  await loadMissions();
})();
