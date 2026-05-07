(function(){
  function updateHeaderState() {
    document.body.classList.toggle('pbi-nav-compact', window.scrollY > 72);
  }

  if (!document.body?.classList.contains('pbi-shrink-header')) return;
  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', updateHeaderState);
})();
