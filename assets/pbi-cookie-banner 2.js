
(() => {
  const KEY = 'pbi_cookie_choice_v1';

  function choice() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }

  function save(value) {
    try { localStorage.setItem(KEY, value); } catch {}
  }

  function buildBanner() {
    if (choice()) return;

    const banner = document.createElement('div');
    banner.className = 'pbi-cookie-banner show';
    banner.innerHTML = `
      <div>
        <strong>Cookies and privacy</strong>
        <p>PBI uses essential cookies for login and website building. We only use optional analytics/marketing cookies if you accept them. Read our <a href="/privacy/">Privacy</a> and <a href="/cookies/">Cookie</a> pages.</p>
      </div>
      <div class="pbi-cookie-actions">
        <button class="btn-ghost" type="button" data-cookie-choice="essential">Essential only</button>
        <button class="btn" type="button" data-cookie-choice="all">Accept all</button>
      </div>
    `;

    banner.querySelectorAll('[data-cookie-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        save(button.getAttribute('data-cookie-choice'));
        banner.classList.remove('show');
        banner.remove();
      });
    });

    document.body.appendChild(banner);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildBanner);
  } else {
    buildBanner();
  }
})();
