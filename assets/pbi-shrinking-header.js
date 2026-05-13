(function(){
  const body = document.body;
  if (!body || body.classList.contains('pbi-app-page') || body.classList.contains('pbi-canvas-page')) return;

  body.classList.add('pbi-shrink-header');

  let ticking = false;
  function updateHeaderState() {
    body.classList.toggle('pbi-nav-compact', window.scrollY > 18);
    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateHeaderState);
  }

  updateHeaderState();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
})();
