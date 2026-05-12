(()=>{
  if (window.__PBI_EDITOR_POLISH_LOADED__) return;
  window.__PBI_EDITOR_POLISH_LOADED__ = true;
  const load = (src) => {
    if ([...document.scripts].some(s => s.src.includes(src))) return;
    const script = document.createElement('script');
    script.src = src + '?v=20260512-pbi-designs-image-drop';
    script.defer = true;
    document.head.appendChild(script);
  };
  const loadCss = (href) => {
    if ([...document.styleSheets].some(s => (s.href || '').includes(href))) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href + '?v=20260512-pbi-designs-image-drop';
    document.head.appendChild(link);
  };
  const init = () => {
    loadCss('/assets/pbi-9-10-platform.css');
    load('/assets/pbi-builder-ai-media-hotfix.js');
    load('/assets/pbi-9-10-platform.js');
    load('/assets/pbi-platform-bridge.js');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
