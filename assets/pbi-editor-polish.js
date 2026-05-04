
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


(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function normaliseFreeformVars() {
    $$('.canvas-block.is-freeform').forEach(block => {
      const left = block.style.left || '40px';
      const top = block.style.top || '40px';
      block.style.setProperty('--pbi-free-x', left);
      block.style.setProperty('--pbi-free-y', top);
      if (!block.style.width) block.style.width = '520px';
      if (!block.querySelector('.canvas-freeform-handle')) {
        const handle = document.createElement('span');
        handle.className = 'canvas-freeform-handle';
        handle.textContent = 'Move';
        block.prepend(handle);
      }
    });
  }

  function addFreeformToolbar() {
    const toolbar = $('.pbi-studio-toolbar-actions') || $('.pbi-canvas-top-actions');
    if (!toolbar || $('#pbiFreeformToggleBtn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'pbiFreeformToggleBtn';
    button.className = 'pbi-freeform-toolbar-btn';
    button.textContent = 'Freeform selected';
    button.title = 'Turn the selected block into a draggable freeform layer';
    button.addEventListener('click', () => {
      const selected = $('.canvas-block.selected') || $('.canvas-block[data-block-id]');
      if (!selected) return alert('Select a block first, then press Freeform selected.');
      const action = selected.querySelector('[data-action="free"]');
      if (action) action.click();
      setTimeout(() => {
        const again = document.querySelector(`[data-block-id="${selected.dataset.blockId}"]`);
        const mode = document.getElementById('inspectorPositionMode');
        if (again?.classList.contains('is-freeform')) {
          button.classList.add('active');
          if (mode) mode.value = 'free';
        } else {
          button.classList.remove('active');
          if (mode) mode.value = 'flow';
        }
        normaliseFreeformVars();
      }, 60);
    });
    toolbar.prepend(button);
  }

  function addHelpStrip() {
    const stage = $('.pbi-studio-stage-wrap');
    if (!stage || $('.pbi-freeform-help-strip')) return;
    const strip = document.createElement('div');
    strip.className = 'pbi-freeform-help-strip';
    strip.innerHTML = '<div><strong>Freeform is now active.</strong><small>Select a block, press “Freeform selected”, then drag the Move pill or the block background. Resize from the corner handle.</small></div><a class="btn-ghost" href="/templates/">View templates</a>';
    stage.prepend(strip);
  }

  function observe() {
    addFreeformToolbar();
    addHelpStrip();
    normaliseFreeformVars();
    const observer = new MutationObserver(() => { addFreeformToolbar(); addHelpStrip(); normaliseFreeformVars(); });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe); else observe();
})();
