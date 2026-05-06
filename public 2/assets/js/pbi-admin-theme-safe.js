(function(){
  const logoCandidates = [
    '/assets/images/logo.png','/assets/img/logo.png','/assets/logo.png','/images/logo.png','/img/logo.png','/logo.png','/PBI-logo.png','/pbi-logo.png'
  ];
  function tryLogo(img, wrap, i=0){
    if(!img || !wrap || i >= logoCandidates.length) return;
    img.onload = () => wrap.classList.add('has-logo');
    img.onerror = () => tryLogo(img, wrap, i+1);
    img.src = logoCandidates[i];
  }
  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.querySelector('[data-pbi-logo-wrap]');
    const img = document.querySelector('[data-pbi-logo]');
    tryLogo(img, wrap);
    document.addEventListener('click', function(e){
      if(e.target.closest('[data-pbi-menu]')) document.querySelector('.pbi-admin-sidebar')?.classList.toggle('open');
      if(e.target.closest('.pbi-admin-nav a')) document.querySelector('.pbi-admin-sidebar')?.classList.remove('open');
    });
  });
})();
