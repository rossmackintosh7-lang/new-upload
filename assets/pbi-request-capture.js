(function(){document.querySelectorAll('[data-capture-request]').forEach(el=>el.addEventListener('click',()=>localStorage.setItem('pbi_last_request',new Date().toISOString())));})();
