(() => {
  function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function filterCards(filter){
    document.querySelectorAll('.pbi-premium-template-card[data-template-category]').forEach(card => {
      const cat = card.getAttribute('data-template-category') || '';
      card.style.display = filter === 'all' || cat === filter ? '' : 'none';
    });
  }

  function normaliseBuilderLinks() {
    document.querySelectorAll('[data-use-template]').forEach((link) => {
      const key = (link.getAttribute('data-use-template') || '').trim();
      if (!key) return;
      const href = link.getAttribute('href') || '';
      if (!href || !href.startsWith('/canvas-builder/')) return;
      const url = new URL(href, window.location.origin);
      if (!url.searchParams.get('preset')) url.searchParams.set('preset', key);
      if (!url.searchParams.get('template')) url.searchParams.set('template', key);
      link.setAttribute('href', `${url.pathname}?${url.searchParams.toString()}`);
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
      if (key) {
        localStorage.setItem('pbi_selected_template', key);
        localStorage.setItem('pbi_selected_template_ts', String(Date.now()));
      }
    }, true);

    const grid = document.querySelector('[data-pbi-premium-template-grid-static]');
    if (grid && !grid.children.length && window.PBIPremiumTemplates) {
      grid.innerHTML = window.PBIPremiumTemplates.all().map(t => `<article class="pbi-premium-template-card" data-template-category="${t.category}" data-template="${t.id}"><a class="pbi-premium-template-image" href="${t.route}"><img src="${t.image}" alt="${t.label} preview"></a><div class="pbi-premium-template-copy"><p class="eyebrow">${t.label}</p><h2>${t.business}</h2><p>${t.copy}</p><div class="row"><a class="btn-ghost" href="${t.route}">View demo</a><a class="btn" href="/canvas-builder/?template=${t.id}&preset=${t.id}" data-use-template="${t.id}">Use template</a></div></div></article>`).join('');
    }

    normaliseBuilderLinks();
  });
})();
