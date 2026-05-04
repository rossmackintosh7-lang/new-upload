(() => {
  async function getCurrentUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      return data.user || null;
    } catch { return null; }
  }

  async function createProjectFromTemplate(templateKey) {
    const presetApi = window.PBITemplatePresets;
    const preset = presetApi?.get?.(templateKey);
    if (!preset) { window.location.href = '/pricing/#packages'; return; }

    const qs = new URLSearchParams({ template_preset: templateKey });
    window.location.href = `/pricing/?${qs.toString()}#packages`;
  }

  function bindFilters() {
    const buttons = document.querySelectorAll('[data-filter]');
    const cards = document.querySelectorAll('[data-template-category]');
    buttons.forEach((button) => button.addEventListener('click', () => {
      const filter = button.getAttribute('data-filter');
      buttons.forEach((btn) => btn.classList.toggle('active', btn === button));
      cards.forEach((card) => {
        const show = filter === 'all' || card.getAttribute('data-template-category') === filter;
        card.style.display = show ? '' : 'none';
      });
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-use-template]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const templateKey = button.getAttribute('data-use-template');
        const oldText = button.textContent;
        button.textContent = 'Opening...';
        button.setAttribute('disabled', 'disabled');
        try { await createProjectFromTemplate(templateKey); }
        catch (error) { alert(error.message || 'Could not open template.'); button.textContent = oldText; button.removeAttribute('disabled'); }
      });
    });
    bindFilters();
  });
})();
