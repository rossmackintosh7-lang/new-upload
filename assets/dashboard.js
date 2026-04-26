document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');

  const createBtn =
    document.getElementById('createProjectBtn') ||
    document.getElementById('newProjectBtn');

  const projectsList =
    document.getElementById('projectsList') ||
    document.getElementById('projectList');

  const userEmail = document.getElementById('userEmail');

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const text = await response.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('API returned non-JSON response.');
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    }

    return data;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cleanProjectName(project) {
    const name = String(project.name || '').trim();

    if (!name || name === 'Untitled website') {
      try {
        const data = project.data_json ? JSON.parse(project.data_json) : {};

        if (data.project_name && String(data.project_name).trim()) {
          return String(data.project_name).trim();
        }

        if (data.business_name && String(data.business_name).trim()) {
          return String(data.business_name).trim();
        }
      } catch {}

      return 'Untitled website';
    }

    return name;
  }

  function formatDate(value) {
    if (!value) return 'Not saved yet';

    try {
      return new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return value;
    }
  }

  function showEmpty() {
    if (!projectsList) return;

    projectsList.innerHTML = `
      <div class="notice">
        No projects yet. Create your first one.
      </div>
    `;
  }

  async function deleteProject(projectId, projectName) {
    const confirmed = confirm(`Delete "${projectName}"?\n\nThis cannot be undone.`);

    if (!confirmed) return;

    try {
      await api('/api/projects/delete', {
        method: 'POST',
        body: JSON.stringify({
          id: projectId
        })
      });

      await loadProjects();
    } catch (err) {
      alert(err.message || 'Could not delete project.');
    }
  }

  async function renameProject(projectId, currentName) {
    const newName = prompt('Rename project:', currentName);

    if (newName === null) return;

    const cleaned = newName.trim();

    if (!cleaned) {
      alert('Project name cannot be empty.');
      return;
    }

    try {
      await api('/api/projects/rename', {
        method: 'POST',
        body: JSON.stringify({
          id: projectId,
          name: cleaned
        })
      });

      await loadProjects();
    } catch (err) {
      alert(err.message || 'Could not rename project.');
    }
  }

  function renderProjects(projects) {
    if (!projectsList) return;

    if (!projects || projects.length === 0) {
      showEmpty();
      return;
    }

    projectsList.innerHTML = projects.map((project) => {
      const name = cleanProjectName(project);
      const updatedAt = formatDate(project.updated_at);

      return `
        <div class="project-row" data-project-id="${escapeHtml(project.id)}">
          <a class="project-main" href="/builder/?project=${encodeURIComponent(project.id)}">
            <strong>${escapeHtml(name)}</strong>
            <div class="muted">Last updated ${escapeHtml(updatedAt)}</div>
          </a>

          <div class="project-actions">
            <button class="btn-ghost rename-project" type="button" data-id="${escapeHtml(project.id)}" data-name="${escapeHtml(name)}">
              Rename
            </button>
            <button class="btn-ghost delete-project" type="button" data-id="${escapeHtml(project.id)}" data-name="${escapeHtml(name)}">
              Delete
            </button>
            <a class="btn" href="/builder/?project=${encodeURIComponent(project.id)}">
              Open
            </a>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.delete-project').forEach((button) => {
      button.addEventListener('click', () => {
        deleteProject(button.dataset.id, button.dataset.name);
      });
    });

    document.querySelectorAll('.rename-project').forEach((button) => {
      button.addEventListener('click', () => {
        renameProject(button.dataset.id, button.dataset.name);
      });
    });
  }

  async function loadUser() {
    try {
      const data = await api('/api/auth/me');

      if (userEmail) {
        userEmail.textContent = data.user?.email || data.email || '';
      }
    } catch {
      window.location.href = '/login/';
    }
  }

  async function loadProjects() {
    try {
      const data = await api('/api/projects/list');
      const projects = Array.isArray(data.projects) ? data.projects : [];
      renderProjects(projects);
    } catch (err) {
      console.error('Could not load projects:', err);

      if (projectsList) {
        projectsList.innerHTML = `
          <div class="notice">
            Could not load projects: ${escapeHtml(err.message)}
          </div>
        `;
      }
    }
  }

  async function createProject() {
    try {
      const data = await api('/api/projects/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Untitled website',
          data: {
            project_name: 'Untitled website',
            pages: {
              home: {
                title: 'Your homepage headline',
                body: 'Your website intro will appear here as you build it out.'
              },
              about: {
                title: 'About your business',
                body: 'Tell visitors who you are, what you do, and why they should trust you.'
              },
              services: {
                title: 'Your services',
                body: 'List your main services and explain how you help customers.'
              },
              gallery: {
                title: 'Gallery',
                body: 'Showcase your best work, products, food, projects, or team.'
              },
              contact: {
                title: 'Contact',
                body: 'Tell customers how to get in touch.'
              }
            }
          }
        })
      });

      const project = data.project || data;

      if (!project.id) {
        throw new Error('Project was created but no project ID was returned.');
      }

      window.location.href = `/builder/?project=${encodeURIComponent(project.id)}`;
    } catch (err) {
      console.error('Could not create project:', err);
      alert(err.message || 'Could not create project.');
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      }).catch(() => {});

      window.location.href = '/login/';
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', createProject);
  }

  loadUser();
  loadProjects();
});
