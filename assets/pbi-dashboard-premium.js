(async () => {
  let me = null;
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (response.ok) me = await response.json();
  } catch {}

  const slot = document.getElementById('dashboardAdminSlot');
  if (slot && me?.is_admin) slot.hidden = false;

  const allowedPlans = ['starter', 'business', 'plus'];
  const plan = allowedPlans.includes(String(me?.plan || '').toLowerCase())
    ? String(me.plan).toLowerCase()
    : allowedPlans.includes(String(localStorage.getItem('pbi_plan') || '').toLowerCase())
      ? String(localStorage.getItem('pbi_plan')).toLowerCase()
      : 'starter';
  try { localStorage.setItem('pbi_plan', plan); } catch {}

  document.querySelectorAll('a[href="/canvas-builder/"]').forEach((link) => {
    link.href = `/canvas-builder/?plan=${encodeURIComponent(plan)}`;
  });
  const planEl = document.getElementById('dashPlan');
  if (planEl) planEl.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);

  const note = document.getElementById('dashPlanNote');
  if (note) {
    note.textContent = plan === 'starter'
      ? 'Starter: guided templates with simple edits.'
      : 'Premium: full canvas freedom is unlocked.';
  }

  const script = document.createElement('script');
  script.src = '/assets/pbi-projects.js?v=20260512-dashboard';
  document.body.appendChild(script);
})();
