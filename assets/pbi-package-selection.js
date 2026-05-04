(() => {
  const allowed = ['starter', 'business', 'plus'];
  const labels = {
    starter: 'Starter Site',
    business: 'Business Site',
    plus: 'Plus Site'
  };
  const descriptions = {
    starter: 'You will get the Starter builder controls: core pages, starter template editing, basic content controls and PBI subdomain publishing. Building is free and no payment is taken until you publish.',
    business: 'You will get Business controls: everything in Starter plus image uploads, gallery/trust sections, stronger content tools and existing-domain support. Building is free and no payment is taken until you publish.',
    plus: 'You will get Plus controls: everything in Business plus advanced design controls, AI wording help, shop/retail tools and growth support features. Building is free and no payment is taken until you publish.'
  };
  function clean(value) {
    value = String(value || '').toLowerCase();
    return allowed.includes(value) ? value : '';
  }
  function packageLinks() {
    const current = new URLSearchParams(location.search);
    return allowed.map((plan) => {
      const qs = new URLSearchParams(current.toString());
      qs.set('plan', plan);
      return `<a class="btn-ghost" href="/signup/?${qs.toString()}">${labels[plan]}</a>`;
    }).join(' ');
  }
  function run() {
    const params = new URLSearchParams(location.search);
    const plan = clean(params.get('plan'));
    const notice = document.getElementById('pbiSelectedPackageNotice') || document.getElementById('message');
    const form = document.getElementById('signupForm');
    if (!form) return;

    if (!plan) {
      localStorage.removeItem('pbiPlanConfirmed');
      localStorage.removeItem('pbiSelectedPlan');
      if (notice) {
        notice.style.display = 'block';
        notice.className = 'notice error';
        notice.innerHTML = `<strong>Choose a package first.</strong><br>PBI needs to know which package you want before the builder can unlock the right controls. This does not take payment.<div class="row" style="margin-top:12px;gap:10px;flex-wrap:wrap">${packageLinks()}</div>`;
      }
      form.querySelectorAll('input,button,select,textarea').forEach((el) => {
        if (el.name === 'terms_accepted') el.disabled = true;
        else el.disabled = true;
      });
      return;
    }

    localStorage.setItem('pbiSelectedPlan', plan);
    localStorage.setItem('pbiPlanConfirmed', '1');
    document.body.dataset.plan = plan;
    const existing = form.querySelector('input[name="plan"]');
    if (existing) existing.value = plan;
    else {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'plan';
      hidden.value = plan;
      form.appendChild(hidden);
    }
    if (notice) {
      notice.style.display = 'block';
      notice.className = 'notice success';
      notice.innerHTML = `<strong>${labels[plan]} selected.</strong><br>${descriptions[plan]} <a href="/pricing/#packages">Change package</a>`;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
