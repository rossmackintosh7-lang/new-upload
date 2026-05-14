(function(){
  const presets = window.PBITemplatePresets?.all?.() || [];
  const grid = document.getElementById('templateGrid');

  const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));

  function canvasUrlFor(id) {
    return `/canvas-builder/?preset=${encodeURIComponent(id)}&template=${encodeURIComponent(id)}`;
  }

  function signupUrlFor(id) {
    const next = canvasUrlFor(id);
    return `/signup/?template_preset=${encodeURIComponent(id)}&next=${encodeURIComponent(next)}`;
  }

  async function routeTemplateUse(event, id) {
    event.preventDefault();
    localStorage.setItem('pbi_selected_template', id);
    const target = canvasUrlFor(id);
    const link = event.currentTarget;
    const original = link.textContent;
    link.textContent = 'Opening...';

    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      window.location.href = data.authenticated ? target : signupUrlFor(id);
    } catch (_) {
      window.location.href = signupUrlFor(id);
    } finally {
      link.textContent = original;
    }
  }

  function card(p){
    const img = p.heroImage || (p.galleryImages && p.galleryImages[0]) || '/assets/demo-media/cafe-hero.jpg';
    const cat = (p.kind_label || p.category || '').toLowerCase();
    const bullets = (p.cardBullets || p.featureBullets || [])
      .slice(0,3)
      .map((x) => `<span>${esc(x)}</span>`)
      .join('');
    const pageFlow = (p.selectedPages || [])
      .map((key) => p.pages?.[key]?.label || key)
      .slice(0, 5)
      .join(' / ');
    const templateUrl = canvasUrlFor(p.id);
    const route = p.route || '/examples/';
    return `
      <article class="pbi-premium-template-card" data-category="${esc(cat)}">
        <a class="pbi-premium-template-image" href="${esc(route)}">
          <img src="${esc(img)}" alt="${esc(p.label)} example">
        </a>
        <div class="pbi-premium-template-copy">
          <p class="eyebrow">${esc(p.label)}</p>
          <h2>${esc(p.businessName || p.projectName || p.label)}</h2>
          <p>${esc(p.cardDescription || p.subHeading || '')}</p>
          <div class="pbi-premium-proof-row">${bullets}</div>
          <div class="pbi-template-launch-path">
            <span>${esc(p.flowLabel || 'Purpose-built flow')}</span>
            <span>${esc(pageFlow || 'Editable pages')}</span>
            <span>Assisted setup optional</span>
          </div>
          <div class="row pbi-template-action-row">
            <a class="btn-ghost" href="${esc(route)}">View demo</a>
            <a class="btn" href="${esc(templateUrl)}" data-use-template="${esc(p.id)}">Use template</a>
          </div>
        </div>
      </article>`;
  }

  if (grid) {
    grid.innerHTML = presets.map(card).join('') || '<article class="pbi-project-card"><h3>No templates found</h3><p>Open a blank canvas instead.</p><a class="btn" href="/canvas-builder/">Open PBI Designer</a></article>';
  }

  document.querySelectorAll('[data-use-template]').forEach((a) => {
    if (a.dataset.templateRouteBound) return;
    a.dataset.templateRouteBound = '1';
    a.addEventListener('click', (event) => routeTemplateUse(event, a.dataset.useTemplate));
  });
  document.querySelectorAll('#templateFilters [data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#templateFilters button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      document.querySelectorAll('.pbi-premium-template-card').forEach((c) => {
        c.style.display = (f === 'all' || (c.dataset.category || '').includes(f)) ? '' : 'none';
      });
    });
  });
})();
