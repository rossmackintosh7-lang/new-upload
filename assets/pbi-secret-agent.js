(function () {
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

  async function isLoggedIn() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      return response.ok;
    } catch {
      return false;
    }
  }

  function addMessage(log, who, text) {
    const item = document.createElement('div');
    item.className = `pbi-secret-agent-message ${who}`;
    item.innerHTML = `<strong>${who === 'user' ? 'You' : 'Secret Agent'}</strong><p>${esc(text)}</p>`;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  function injectStyles() {
    if (document.getElementById('pbiSecretAgentStyles')) return;
    const style = document.createElement('style');
    style.id = 'pbiSecretAgentStyles';
    style.textContent = `
      .pbi-secret-agent{position:fixed;right:18px;bottom:18px;z-index:1000;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      .pbi-secret-agent-toggle{display:flex;align-items:center;gap:10px;border:1px solid rgba(105,74,49,.18);border-radius:999px;background:#24130c;color:#fffaf4;box-shadow:0 18px 45px rgba(36,19,12,.22);padding:10px 14px;cursor:pointer}
      .pbi-secret-agent-toggle span{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fffaf4;color:#24130c;font-weight:950;font-size:12px}
      .pbi-secret-agent-toggle strong{font-size:14px}
      .pbi-secret-agent-panel{width:min(420px,calc(100vw - 28px));max-height:min(680px,calc(100vh - 96px));display:grid;grid-template-rows:auto minmax(180px,1fr) auto;gap:12px;margin-bottom:12px;border:1px solid rgba(105,74,49,.18);border-radius:24px;background:rgba(255,250,244,.98);box-shadow:0 24px 70px rgba(36,19,12,.24);padding:16px}
      .pbi-secret-agent-panel[hidden]{display:none}
      .pbi-secret-agent-head{display:flex;justify-content:space-between;gap:12px;align-items:start}
      .pbi-secret-agent-head span{display:block;color:#8a431d;font-size:11px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}
      .pbi-secret-agent-head h2{font-size:24px;letter-spacing:-.03em;margin:4px 0 0}
      .pbi-secret-agent-close{border:1px solid rgba(105,74,49,.18);border-radius:999px;background:#fff;color:#2f1b12;padding:8px 10px;font-weight:850;cursor:pointer}
      .pbi-secret-agent-log{overflow:auto;display:grid;gap:10px;padding:8px;border-radius:18px;background:#fff8f1}
      .pbi-secret-agent-message{max-width:88%;border:1px solid rgba(105,74,49,.14);border-radius:18px;padding:10px 12px;background:#fff;color:#2f1b12}
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
    injectStyles();

    const shell = document.createElement('section');
    shell.className = 'pbi-secret-agent';
    shell.setAttribute('data-pbi-secret-agent', 'true');
    shell.innerHTML = `
      <button class="pbi-secret-agent-toggle" type="button" aria-expanded="false" aria-controls="pbiSecretAgentPanel">
        <span>SA</span>
        <strong>Secret Agent</strong>
      </button>
      <div class="pbi-secret-agent-panel" id="pbiSecretAgentPanel" hidden>
        <div class="pbi-secret-agent-head">
          <div>
            <span>Private beta</span>
            <h2>PBI Secret Agent</h2>
          </div>
          <button type="button" class="pbi-secret-agent-close" aria-label="Close Secret Agent">Close</button>
        </div>
        <div class="pbi-secret-agent-log" aria-live="polite"></div>
        <form class="pbi-secret-agent-form">
          <textarea name="message" rows="3" placeholder="Ask for a launch check, SEO fix, copy improvement or admin next step."></textarea>
          <div class="pbi-secret-agent-actions">
            <button type="button" data-agent-prompt="What is the fastest improvement I can make on this page?">Fastest win</button>
            <button type="button" data-agent-prompt="Check this project for launch blockers.">Launch blockers</button>
            <button class="btn" type="submit">Ask agent</button>
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

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open && !log.dataset.started) {
        log.dataset.started = 'true';
        addMessage(log, 'agent', 'I can help with launch checks, SEO, customer support notes and builder next steps. I will suggest changes first before anything gets applied.');
      }
    }

    async function ask(message) {
      const text = String(message || '').trim();
      if (!text) return;
      addMessage(log, 'user', text);
      textarea.value = '';
      addMessage(log, 'agent', 'Thinking through the safest next step...');
      const last = log.lastElementChild;
      try {
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            project_id: projectIdFromUrl(),
            page: window.location.pathname
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.message || `Agent failed with status ${response.status}`);
        last.querySelector('p').textContent = data.reply?.answer || 'No response came back.';
      } catch (error) {
        last.querySelector('p').textContent = error.message || 'Secret Agent could not respond.';
      }
    }

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    shell.querySelectorAll('[data-agent-prompt]').forEach((button) => {
      button.addEventListener('click', () => {
        setOpen(true);
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
