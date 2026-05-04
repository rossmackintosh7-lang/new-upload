
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  let guides = [];

  function ensureGuides() {
    if (guides.length) return guides;
    const v = document.createElement('div');
    const h = document.createElement('div');
    v.className = 'pbi-studio-snap-line vertical';
    h.className = 'pbi-studio-snap-line horizontal';
    v.hidden = h.hidden = true;
    document.body.append(v, h);
    guides = [v, h];
    return guides;
  }

  function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = String(Math.round(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function addResizeHandles() {
    $$('.canvas-block.is-freeform.selected').forEach((block) => {
      if ($('.pbi-resize-handle', block)) return;
      const handle = document.createElement('span');
      handle.className = 'pbi-resize-handle';
      handle.title = 'Drag to resize';
      block.appendChild(handle);
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const rect = block.getBoundingClientRect();
        const startWidth = rect.width;
        const [vGuide, hGuide] = ensureGuides();
        handle.setPointerCapture?.(event.pointerId);
        const move = (moveEvent) => {
          const next = Math.max(180, Math.min(980, startWidth + (moveEvent.clientX - startX)));
          block.style.width = `${next}px`;
          setInputValue('inspectorWidth', next);
          const centreX = rect.left + next / 2;
          vGuide.style.left = `${Math.round(centreX)}px`;
          hGuide.style.top = `${Math.round(rect.top + rect.height)}px`;
          vGuide.hidden = hGuide.hidden = false;
        };
        const up = () => {
          vGuide.hidden = hGuide.hidden = true;
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up, { once: true });
      });
    });
  }

  function keyboardShortcuts(event) {
    const target = event.target;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      document.getElementById(event.shiftKey ? 'canvasRedoBtn' : 'canvasUndoBtn')?.click();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      document.getElementById('canvasExportBtn')?.click();
    }
    if (event.key === 'Escape') document.getElementById('canvasPreviewBtn')?.click();
  }

  function addMiniGuides() {
    const target = document.querySelector('.pbi-canvas-panel-head');
    if (!target || document.querySelector('.pbi-mini-guide')) return;
    const guide = document.createElement('div');
    guide.className = 'pbi-mini-guide';
    guide.innerHTML = '<span><b>1</b>Pick a polished template</span><span><b>2</b>Edit text directly on the canvas</span><span><b>3</b>Use device buttons before publishing</span><span><b>4</b>Save first, publish only after payment is ready</span>';
    target.appendChild(guide);
  }

  function observe() {
    addMiniGuides();
    addResizeHandles();
    const observer = new MutationObserver(() => addResizeHandles());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', keyboardShortcuts);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe);
  else observe();
})();
