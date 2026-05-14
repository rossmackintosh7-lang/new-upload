(function () {
  const GOOSE_ASSETS = {
    profile: '/assets/goose/goose-profile.png',
    thinking: '/assets/goose/goose-thinking.png',
    wink: '/assets/goose/goose-wink.png',
    answer: '/assets/goose/goose-answer.png',
    success: '/assets/goose/goose-success.png',
    alert: '/assets/goose/goose-alert.png',
    excited: '/assets/goose/goose-excited.png'
  };

  function preloadGooseFaces() {
    Object.values(GOOSE_ASSETS).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));

  function projectIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('project') || params.get('project_id') || params.get('id') || '';
  }

  function collectPageContext() {
    const readText = (selector, limit = 16) => Array.from(document.querySelectorAll(selector))
      .map((node) => node.textContent.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .slice(0, limit);
    const meta = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    return {
      title: document.title,
      path: window.location.pathname,
      bodyClass: document.body.className || '',
      metaDescription: meta,
      headings: readText('h1,h2,h3', 18),
      buttons: readText('button,a.btn,a.btn-ghost,[role="button"]', 18),
      fields: Array.from(document.querySelectorAll('label, input[placeholder], textarea[placeholder], select'))
        .map((node) => node.textContent?.trim() || node.getAttribute('placeholder') || node.getAttribute('name') || node.id || '')
        .map((text) => text.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 18)
    };
  }

  async function isLoggedIn() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      return response.ok;
    } catch {
      return false;
    }
  }

  function moodForPrompt(text) {
    const lower = String(text || '').toLowerCase();
    if (/block|broken|error|issue|risk|missing|urgent|fail|stuck/.test(lower)) return 'alert';
    if (/launch|publish|ready|payment|stripe|check/.test(lower)) return 'excited';
    if (/seo|copy|rewrite|improve|fastest|win|idea/.test(lower)) return 'answer';
    return 'profile';
  }

  function moodForAnswer(prompt, answer) {
    const lower = `${prompt || ''} ${answer || ''}`.toLowerCase();
    if (/error|failed|could not|blocked|missing|risk|broken|problem/.test(lower)) return 'alert';
    if (/passed|done|success|quickest|fastest|win/.test(lower)) return 'success';
    if (/launch|publish|live|ready|payment|stripe/.test(lower)) return 'excited';
    if (/seo|title|description|copy|rewrite|improve/.test(lower)) return 'wink';
    return 'answer';
  }

  function setGooseFace(shell, mood) {
    const src = GOOSE_ASSETS[mood] || GOOSE_ASSETS.profile;
    shell.querySelectorAll('[data-goose-face]').forEach((img) => {
      img.src = src;
      img.dataset.mood = mood;
    });
  }

  function addMessage(log, who, text, mood = 'answer') {
    const item = document.createElement('div');
    item.className = `pbi-secret-agent-message ${who}`;
    if (who === 'agent') {
      const src = GOOSE_ASSETS[mood] || GOOSE_ASSETS.answer;
      item.dataset.mood = mood;
      item.innerHTML = `
        <img class="pbi-secret-agent-avatar" data-goose-message-face src="${src}" alt="Goose">
        <div>
          <strong>Goose</strong>
          <p>${esc(text)}</p>
        </div>
      `;
    } else {
      item.innerHTML = `<strong>You</strong><p>${esc(text)}</p>`;
    }
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
    return item;
  }

  function injectStyles() {
    if (document.getElementById('pbiSecretAgentStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbiSecretAgentStyles';
    style.textContent = `
      .pbi-secret-agent{position:fixed;right:18px;bottom:18px;z-index:1000;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      .pbi-secret-agent-toggle{display:flex;align-items:center;gap:10px;border:1px solid rgba(105,74,49,.18);border-radius:999px;background:#24130c;color:#fffaf4;box-shadow:0 18px 45px rgba(36,19,12,.22);padding:10px 14px;cursor:pointer}
      .pbi-secret-agent-toggle img{width:38px;height:38px;border-radius:50%;object-fit:cover;background:#fffaf4;border:2px solid rgba(255,250,244,.9)}
      .pbi-secret-agent-toggle strong{font-size:14px}
      .pbi-secret-agent-panel{width:min(430px,calc(100vw - 28px));max-height:min(700px,calc(100vh - 96px));display:grid;grid-template-rows:auto minmax(190px,1fr) auto;gap:12px;margin-bottom:12px;border:1px solid rgba(105,74,49,.18);border-radius:24px;background:rgba(255,250,244,.98);box-shadow:0 24px 70px rgba(36,19,12,.24);padding:16px}
      .pbi-secret-agent-panel[hidden]{display:none}
      .pbi-secret-agent-head{display:flex;justify-content:space-between;gap:12px;align-items:start}
      .pbi-secret-agent-id{display:flex;gap:12px;align-items:center}
      .pbi-secret-agent-portrait{width:58px;height:58px;border-radius:18px;object-fit:cover;border:1px solid rgba(105,74,49,.18);background:#fff;box-shadow:0 10px 24px rgba(36,19,12,.12)}
      .pbi-secret-agent-head span{display:block;color:#8a431d;font-size:11px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}
      .pbi-secret-agent-head h2{font-size:26px;letter-spacing:-.03em;margin:4px 0 0}
      .pbi-secret-agent-close{border:1px solid rgba(105,74,49,.18);border-radius:999px;background:#fff;color:#2f1b12;padding:8px 10px;font-weight:850;cursor:pointer}
      .pbi-secret-agent-log{overflow:auto;display:grid;gap:10px;padding:8px;border-radius:18px;background:#fff8f1}
      .pbi-secret-agent-suggestions{display:flex;gap:8px;flex-wrap:wrap;padding:0 2px}
      .pbi-secret-agent-suggestions[hidden]{display:none}
      .pbi-secret-agent-suggestions button{border:1px solid rgba(105,74,49,.18);border-radius:999px;background:#fff;color:#2f1b12;padding:8px 10px;font-size:12px;font-weight:850;cursor:pointer}
      .pbi-secret-agent-message{max-width:92%;border:1px solid rgba(105,74,49,.14);border-radius:18px;padding:10px 12px;background:#fff;color:#2f1b12}
      .pbi-secret-agent-message.agent{display:grid;grid-template-columns:38px 1fr;gap:10px;align-items:start}
      .pbi-secret-agent-message.agent[data-mood="alert"]{border-color:rgba(191,92,41,.28);background:#fff3e8}
      .pbi-secret-agent-message.agent[data-mood="success"]{border-color:rgba(73,130,76,.28);background:#f5fff1}
      .pbi-secret-agent-message.agent[data-mood="excited"]{border-color:rgba(138,67,29,.28);background:#fff7dc}
      .pbi-secret-agent-avatar{width:38px;height:38px;border-radius:50%;object-fit:cover;border:1px solid rgba(105,74,49,.18);background:#fff}
      .pbi-secret-agent-message.user{justify-self:end;background:#24130c;color:#fffaf4}
      .pbi-secret-agent-message strong{display:block;font-size:12px;margin-bottom:4px}
      .pbi-secret-agent-message p{margin:0;line-height:1.45;font-size:14px;white-space:pre-wrap}
      .pbi-secret-agent-form{display:grid;gap:10px}
      .pbi-secret-agent-form textarea{width:100%;resize:vertical;border:1px solid rgba(105,74,49,.18);border-radius:16px;padding:12px;font:inherit;background:#fff;color:#2f1b12}
      .pbi-secret-agent-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .pbi-secret-agent-actions button{border:1px solid rgba(105,74,49,.18);border-radius:999px;background:#fff;color:#2f1b12;padding:9px 12px;font-weight:850;cursor:pointer}
      .pbi-secret-agent-actions .btn{background:#bf5c29;color:#fff;border-color:transparent}
      @media(max-width:560px){.pbi-secret-agent{right:10px;bottom:10px}.pbi-secret-agent-toggle strong{display:none}.pbi-secret-agent-panel{max-height:calc(100vh - 80px)}}
    `;
    document.head.appendChild(style);
  }

  async function init() {
    if (!document.body || document.querySelector('[data-pbi-secret-agent]')) return;
    if (!await isLoggedIn()) return;
    preloadGooseFaces();
    injectStyles();

    const shell = document.createElement('section');
    shell.className = 'pbi-secret-agent';
    shell.setAttribute('data-pbi-secret-agent', 'true');
    shell.innerHTML = `
      <button class="pbi-secret-agent-toggle" type="button" aria-expanded="false" aria-controls="pbiSecretAgentPanel">
        <img data-goose-face src="${GOOSE_ASSETS.profile}" alt="" aria-hidden="true">
        <strong>Goose</strong>
      </button>
      <div class="pbi-secret-agent-panel" id="pbiSecretAgentPanel" hidden>
        <div class="pbi-secret-agent-head">
          <div class="pbi-secret-agent-id">
            <img class="pbi-secret-agent-portrait" data-goose-face src="${GOOSE_ASSETS.profile}" alt="Goose">
            <div>
              <span>Private agent</span>
              <h2>Goose</h2>
            </div>
          </div>
          <button type="button" class="pbi-secret-agent-close" aria-label="Close Goose">Close</button>
        </div>
        <div class="pbi-secret-agent-log" aria-live="polite"></div>
        <div class="pbi-secret-agent-suggestions" hidden></div>
        <form class="pbi-secret-agent-form">
          <textarea name="message" rows="3" placeholder="Ask Goose anything about PBI: pricing, domains, templates, publishing, SEO, admin, custom builds or this page."></textarea>
          <div class="pbi-secret-agent-actions">
            <button type="button" data-agent-prompt="What should I do next on this PBI page?">Next step</button>
            <button type="button" data-agent-prompt="Explain the PBI packages and publish route.">Packages</button>
            <button type="button" data-agent-prompt="How should I handle domains for this project?">Domains</button>
            <button class="btn" type="submit">Ask Goose</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(shell);

    const toggle = shell.querySelector('.pbi-secret-agent-toggle');
    const panel = shell.querySelector('.pbi-secret-agent-panel');
    const close = shell.querySelector('.pbi-secret-agent-close');
    const form = shell.querySelector('.pbi-secret-agent-form');
    const textarea = form.querySelector('textarea');
    const log = shell.querySelector('.pbi-secret-agent-log');
    const suggestions = shell.querySelector('.pbi-secret-agent-suggestions');

    function renderSuggestions(items = []) {
      const useful = items.filter(Boolean).slice(0, 3);
      suggestions.hidden = !useful.length;
      suggestions.innerHTML = '';
      useful.forEach((label) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', () => ask(label));
        suggestions.appendChild(button);
      });
    }

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open && !log.dataset.started) {
        log.dataset.started = 'true';
        setGooseFace(shell, 'profile');
        addMessage(log, 'agent', 'I am Goose. Ask me anything PBI-related: pricing, domains, templates, publishing, SEO, admin, support routes, custom builds or what to do next on the page you are viewing.', 'profile');
        renderSuggestions(['What should I do next?', 'Explain this page', 'Check launch readiness']);
      }
    }

    async function ask(message) {
      const text = String(message || '').trim();
      if (!text) return;
      addMessage(log, 'user', text);
      textarea.value = '';
      setGooseFace(shell, 'thinking');
      const last = addMessage(log, 'agent', 'Thinking through the safest next step...', 'thinking');
      try {
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            project_id: projectIdFromUrl(),
            page: window.location.pathname,
            page_url: window.location.href,
            page_title: document.title,
            page_context: collectPageContext()
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.message || `Agent failed with status ${response.status}`);
        const answer = data.reply?.answer || 'No response came back.';
        const mood = data.reply?.mood || moodForAnswer(text, answer);
        last.dataset.mood = mood;
        last.querySelector('[data-goose-message-face]').src = GOOSE_ASSETS[mood] || GOOSE_ASSETS.answer;
        last.querySelector('p').textContent = answer;
        setGooseFace(shell, mood);
        renderSuggestions(data.reply?.suggestedActions || []);
      } catch (error) {
        last.dataset.mood = 'alert';
        last.querySelector('[data-goose-message-face]').src = GOOSE_ASSETS.alert;
        last.querySelector('p').textContent = error.message || 'Goose could not respond.';
        setGooseFace(shell, 'alert');
      }
    }

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    shell.querySelectorAll('[data-agent-prompt]').forEach((button) => {
      button.addEventListener('click', () => {
        setOpen(true);
        setGooseFace(shell, moodForPrompt(button.dataset.agentPrompt));
        ask(button.dataset.agentPrompt);
      });
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      ask(textarea.value);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
