(()=>{
  if (window.__PBI_EDITOR_POLISH_LOADED__) return;
  window.__PBI_EDITOR_POLISH_LOADED__ = true;
  const loadHotfix = () => {
    if ([...document.scripts].some(s => s.src.includes('/assets/pbi-builder-ai-media-hotfix.js'))) return;
    const script = document.createElement('script');
    script.src = '/assets/pbi-builder-ai-media-hotfix.js?v=20260506-ai-media-mobile';
    script.defer = true;
    document.head.appendChild(script);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadHotfix);
  else loadHotfix();
})();
