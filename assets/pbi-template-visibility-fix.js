
(() => {
  function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function filterCards(filter){
    document.querySelectorAll('.pbi-premium-template-card[data-template-category]').forEach(card => {
      const cat = card.getAttribute('data-template-category') || '';
      card.style.display = filter === 'all' || cat === filter ? '' : 'none';
    });
  }
  ready(() => {
    document.querySelectorAll('[data-premium-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-premium-filter]').forEach(b => b.classList.toggle('active', b === btn));
        filterCards(btn.dataset.premiumFilter || 'all');
      });
    });
    document.addEventListener('click', (event) => {
      const el = event.target.closest('[data-use-template]');
      if (!el) return;
      const key = el.getAttribute('data-use-template');
      if (key) localStorage.setItem('pbi_selected_template', key);
    }, true);
    const grid = document.querySelector('[data-pbi-premium-template-grid-static]');
    if (grid && !grid.children.length && window.PBIPremiumTemplates) {
      grid.innerHTML = window.PBIPremiumTemplates.all().map(t => `<article class="pbi-premium-template-card" data-template-category="${t.category}" data-template="${t.id}"><a class="pbi-premium-template-image" href="${t.route}"><img src="${t.image}" alt="${t.label} preview"></a><div class="pbi-premium-template-copy"><p class="eyebrow">${t.label}</p><h2>${t.business}</h2><p>${t.copy}</p><div class="row"><a class="btn-ghost" href="${t.route}">View demo</a><a class="btn" href="/canvas-builder/?template=${t.pack}&preset=${t.id}" data-use-template="${t.id}">Use template</a></div></div></article>`).join('');
    }
  });
})();
