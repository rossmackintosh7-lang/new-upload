(function(){
  const presets = window.PBITemplatePresets?.all?.() || [];
  const grid = document.getElementById('templateGrid');
  if(!grid) return;

  const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));

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
    const templateUrl = `/canvas-builder/?preset=${encodeURIComponent(p.id)}&template=${encodeURIComponent(p.id)}`;
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

  grid.innerHTML = presets.map(card).join('') || '<article class="pbi-project-card"><h3>No templates found</h3><p>Open a blank canvas instead.</p><a class="btn" href="/canvas-builder/">Open Canvas Builder</a></article>';
  document.querySelectorAll('[data-use-template]').forEach((a) => {
    a.addEventListener('click', () => localStorage.setItem('pbi_selected_template', a.dataset.useTemplate));
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
