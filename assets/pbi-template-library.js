(function(){
  const presets = window.PBITemplatePresets?.all?.() || [];
  const grid = document.getElementById('templateGrid');
  if(!grid) return;
  function card(p){
    const img = p.heroImage || (p.galleryImages && p.galleryImages[0]) || '/assets/demo-media/cafe-hero.jpg';
    const cat = (p.kind_label || p.category || '').toLowerCase();
    const bullets = (p.cardBullets || p.featureBullets || []).slice(0,3).map(x=>`<span>${x}</span>`).join('');
    return `<article class="pbi-premium-template-card" data-category="${cat}"><a class="pbi-premium-template-image" href="${p.route || '/examples/'}"><img src="${img}" alt="${p.label} example"></a><div class="pbi-premium-template-copy"><p class="eyebrow">${p.label}</p><h2>${p.businessName || p.projectName || p.label}</h2><p>${p.cardDescription || p.subHeading || ''}</p><div class="pbi-premium-proof-row">${bullets}</div><div class="row"><a class="btn-ghost" href="${p.route || '/examples/'}">View example</a><a class="btn" href="/canvas-builder/?preset=${encodeURIComponent(p.id)}&template=${encodeURIComponent(p.id)}" data-use-template="${p.id}">Use this template</a></div></div></article>`;
  }
  grid.innerHTML = presets.map(card).join('') || '<article class="pbi-project-card"><h3>No templates found</h3><p>Open a blank canvas instead.</p><a class="btn" href="/canvas-builder/">Open Canvas Builder</a></article>';
  document.querySelectorAll('[data-use-template]').forEach(a=>a.addEventListener('click',()=>localStorage.setItem('pbi_selected_template', a.dataset.useTemplate)));
  document.querySelectorAll('#templateFilters [data-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('#templateFilters button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;document.querySelectorAll('.pbi-premium-template-card').forEach(c=>{c.style.display=(f==='all'||(c.dataset.category||'').includes(f))?'':'none';});}));
})();
