(() => {
  const params = new URLSearchParams(location.search);
  const order = { starter: 1, business: 2, plus: 3 };
  const copy = {
    starter: {
      title: 'Starter Site',
      description: 'Starter tools are active: template choice, core pages, basic wording, launch checklist and PBI subdomain publishing.'
    },
    business: {
      title: 'Business Site',
      description: 'Business tools are active: Starter plus image uploads, gallery/trust sections, stronger content controls and existing-domain route.'
    },
    plus: {
      title: 'Plus Site',
      description: 'Plus tools are active: full builder toolkit, advanced design controls, AI wording help, retail tools and priority growth controls.'
    }
  };
  function cleanPlan(value) {
    value = String(value || '').toLowerCase();
    return order[value] ? value : 'starter';
  }
  let plan = cleanPlan(params.get('plan') || localStorage.getItem('pbiSelectedPlan') || document.body.dataset.plan || 'starter');
  localStorage.setItem('pbiSelectedPlan', plan);
  document.body.dataset.plan = plan;
  window.PBISelectedPlan = plan;
  window.PBIPlanRank = order[plan];
  window.PBIPlanAllows = (min) => order[plan] >= order[cleanPlan(min)];

  function labelFor(min) { return cleanPlan(min) === 'plus' ? 'Plus' : cleanPlan(min) === 'business' ? 'Business' : 'Starter'; }

  function disableInside(node, disabled) {
    node.querySelectorAll('input,select,textarea,button').forEach((el) => {
      if (el.id === 'pbiPlanUpgradeLink') return;
      el.disabled = disabled;
    });
    node.querySelectorAll('a.btn,a.btn-ghost').forEach((el) => {
      if (el.id === 'pbiPlanUpgradeLink') return;
      el.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      if (disabled) el.addEventListener('click', preventLocked, { capture: true });
    });
  }
  function preventLocked(event) { event.preventDefault(); event.stopPropagation(); }

  function apply() {
    const c = copy[plan];
    const title = document.getElementById('pbiPlanTitle');
    const desc = document.getElementById('pbiPlanDescription');
    if (title) title.textContent = c.title;
    if (desc) desc.textContent = c.description;
    document.querySelectorAll('[data-plan-chip]').forEach((chip) => chip.classList.toggle('active', chip.dataset.planChip === plan));

    document.querySelectorAll('[data-plan-min]').forEach((node) => {
      const min = cleanPlan(node.dataset.planMin);
      const allowed = order[plan] >= order[min];
      node.classList.toggle('pbi-plan-locked', !allowed);
      node.setAttribute('aria-hidden', allowed ? 'false' : 'true');
      disableInside(node, !allowed);
      if (!allowed && !node.querySelector('.pbi-plan-lock-note') && node.matches('.card')) {
        const note = document.createElement('p');
        note.className = 'pbi-plan-lock-note small-note muted';
        note.textContent = `${labelFor(min)} package feature.`;
        node.prepend(note);
      }
    });

    // Domain choices: starter = PBI subdomain, business = connect existing, plus = register new too.
    document.querySelectorAll('input[name="launchDomainOption"]').forEach((input) => {
      const min = input.value === 'pbi_subdomain' ? 'starter' : input.value === 'connect_existing' ? 'business' : 'plus';
      const allowed = order[plan] >= order[min];
      const card = input.closest('.domain-option-card');
      if (card) {
        card.classList.toggle('pbi-plan-locked', !allowed);
        card.setAttribute('aria-hidden', allowed ? 'false' : 'true');
      }
      input.disabled = !allowed;
      if (!allowed && input.checked) {
        const fallback = document.querySelector('input[name="launchDomainOption"][value="pbi_subdomain"]');
        if (fallback) { fallback.checked = true; fallback.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    });

    // Page choices: starter = core only, business = gallery, plus = shop.
    document.querySelectorAll('.pageToggle').forEach((input) => {
      const min = input.value === 'shop' ? 'plus' : input.value === 'gallery' ? 'business' : 'starter';
      const allowed = order[plan] >= order[min];
      const card = input.closest('.page-choice');
      if (card) {
        card.classList.toggle('pbi-plan-locked', !allowed);
        card.setAttribute('aria-hidden', allowed ? 'false' : 'true');
      }
      input.disabled = !allowed || input.value === 'home';
      if (!allowed) input.checked = false;
    });

    // Add-section select options follow package gates.
    const select = document.getElementById('pbiAddSectionType');
    if (select) {
      [...select.options].forEach((option) => {
        const type = option.value;
        const min = option.dataset.planMin || ({ gallery:'business', featureGrid:'business', cta:'business', testimonial:'plus', faq:'plus', retail:'plus' }[type] || 'starter');
        const allowed = order[plan] >= order[cleanPlan(min)];
        option.disabled = !allowed;
        option.hidden = !allowed;
      });
      if (select.selectedOptions[0]?.disabled) select.value = 'hero';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  document.addEventListener('pbi:sections-updated', apply);
  setInterval(apply, 1500);
})();
