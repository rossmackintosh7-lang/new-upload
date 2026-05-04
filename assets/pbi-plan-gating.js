(() => {
  const params = new URLSearchParams(location.search);
  const order = { starter: 1, business: 2, plus: 3 };
  const copy = {
    starter: {
      title: 'Starter Site',
      description: 'Starter tools are active. Build and preview for free. Payment is only taken when you publish.'
    },
    business: {
      title: 'Business Site',
      description: 'Business tools are active. Build and preview for free with image, gallery and trust-section tools. Payment is only taken when you publish.'
    },
    plus: {
      title: 'Plus Site',
      description: 'Plus tools are active. Build and preview for free with the full builder toolkit. Payment is only taken when you publish.'
    }
  };
  function cleanPlan(value) {
    value = String(value || '').toLowerCase();
    return order[value] ? value : '';
  }
  function normalPlan(value) { return cleanPlan(value) || 'starter'; }
  function labelFor(min) { return normalPlan(min) === 'plus' ? 'Plus' : normalPlan(min) === 'business' ? 'Business' : 'Starter'; }
  function preventLocked(event) { event.preventDefault(); event.stopPropagation(); }
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
  function showPackageRequired() {
    const main = document.querySelector('.pbi-app-content') || document.querySelector('main') || document.body;
    const current = new URLSearchParams(location.search);
    current.delete('plan');
    const back = current.toString() ? `?${current.toString()}` : '';
    main.innerHTML = `<section class="card" style="max-width:780px;margin:60px auto;padding:34px"><p class="eyebrow">Package required</p><h1>Choose a package before opening the builder</h1><p class="muted">PBI needs a selected package first so it can unlock the correct builder controls for Starter, Business or Plus. This does not take payment. Billing starts only when you publish.</p><div class="row" style="margin-top:18px"><a class="btn" href="/pricing/${back}#packages">Choose package</a><a class="btn-ghost" href="/dashboard/">Back to dashboard</a></div></section>`;
  }
  async function fetchProjectPlan(projectId) {
    if (!projectId) return '';
    try {
      const res = await fetch(`/api/projects/get?id=${encodeURIComponent(projectId)}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      let parsed = {}; try { parsed = typeof data?.project?.data_json === 'string' ? JSON.parse(data.project.data_json || '{}') : (data?.project?.data_json || {}); } catch { parsed = {}; }
      return cleanPlan(data?.project?.plan || parsed.selected_plan || parsed.plan || '');
    } catch { return ''; }
  }

  async function resolvePlan() {
    const explicit = cleanPlan(params.get('plan'));
    if (explicit) {
      localStorage.setItem('pbiSelectedPlan', explicit);
      localStorage.setItem('pbiPlanConfirmed', '1');
      return explicit;
    }
    const projectPlan = await fetchProjectPlan(params.get('project') || params.get('project_id'));
    if (projectPlan) {
      localStorage.setItem('pbiSelectedPlan', projectPlan);
      localStorage.setItem('pbiPlanConfirmed', '1');
      return projectPlan;
    }
    const stored = cleanPlan(localStorage.getItem('pbiSelectedPlan'));
    const confirmed = localStorage.getItem('pbiPlanConfirmed') === '1';
    if (stored && confirmed) return stored;
    return '';
  }

  function apply(plan) {
    const c = copy[plan];
    const title = document.getElementById('pbiPlanTitle');
    const desc = document.getElementById('pbiPlanDescription');
    if (title) title.textContent = c.title;
    if (desc) desc.textContent = c.description;
    document.body.dataset.plan = plan;
    window.PBISelectedPlan = plan;
    window.PBIPlanRank = order[plan];
    window.PBIPlanAllows = (min) => order[plan] >= order[normalPlan(min)];
    document.querySelectorAll('[data-plan-chip]').forEach((chip) => chip.classList.toggle('active', chip.dataset.planChip === plan));

    document.querySelectorAll('[data-plan-min]').forEach((node) => {
      const min = normalPlan(node.dataset.planMin);
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

    const select = document.getElementById('pbiAddSectionType');
    if (select) {
      [...select.options].forEach((option) => {
        const type = option.value;
        const min = option.dataset.planMin || ({ gallery:'business', featureGrid:'business', cta:'business', testimonial:'plus', faq:'plus', retail:'plus' }[type] || 'starter');
        const allowed = order[plan] >= order[normalPlan(min)];
        option.disabled = !allowed;
        option.hidden = !allowed;
      });
      if (select.selectedOptions[0]?.disabled) select.value = 'hero';
    }
  }

  async function init() {
    const plan = await resolvePlan();
    if (!plan) { showPackageRequired(); return; }
    apply(plan);
    document.addEventListener('pbi:sections-updated', () => apply(plan));
    setInterval(() => apply(plan), 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
