(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const cssEscape = (value) => window.CSS?.escape ? window.CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));

  const SECTION_GROUPS = [
    { type: 'trustBand', label: 'Trust proof', note: 'Reviews, response time, local confidence' },
    { type: 'process', label: 'How it works', note: 'Clarifies the customer journey' },
    { type: 'testimonial', label: 'Testimonial', note: 'Adds third-party confidence' },
    { type: 'faq', label: 'FAQ', note: 'Handles hesitation before enquiry' },
    { type: 'booking', label: 'Booking CTA', note: 'Makes the next step obvious' },
    { type: 'quoteForm', label: 'Quote flow', note: 'Collects job details and urgency' },
    { type: 'map', label: 'Service area', note: 'Clarifies local coverage' },
    { type: 'retail', label: 'Retail strip', note: 'Product-led route for shops' }
  ];

  const GOOSE_PROMPTS = {
    missing: 'Review this PBI canvas project and tell me the most important things missing before launch. Focus on content, SEO, trust, conversion, domain and publish readiness.',
    seo: 'Suggest stronger local SEO improvements for this PBI canvas project, including title, meta description, useful sections and local landing page ideas.',
    assisted: 'Should this PBI project stay self-serve, use Assisted Setup, or move to a custom build? Give a practical recommendation and why.',
    harmony: 'Compare this PBI project to a top AI website builder launch experience. Tell me the exact missing pieces Goose should apply next: business system, mobile, SEO pages, domains, proof, dashboard or Assisted Setup.'
  };

  function readState() {
    try {
      return JSON.parse(localStorage.getItem('pbi_canvas_state') || '{}') || {};
    } catch {
      return {};
    }
  }

  function activePageKey(state) {
    return state.activePage || state.active_page || state.selected_pages?.[0] || Object.keys(state.pages || {})[0] || 'home';
  }

  function activeBlocks(state) {
    const page = activePageKey(state);
    return Array.isArray(state.blocksByPage?.[page]) ? state.blocksByPage[page] : [];
  }

  function allBlocks(state) {
    return Object.values(state.blocksByPage || {}).flatMap((blocks) => Array.isArray(blocks) ? blocks : []);
  }

  function blockTypes(state) {
    return new Set(allBlocks(state).map((block) => block?.type).filter(Boolean));
  }

  function textLength(state) {
    return allBlocks(state)
      .map((block) => [block?.eyebrow, block?.title, block?.text, block?.button].filter(Boolean).join(' '))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .length;
  }

  function selectedPages(state) {
    const pages = state.selected_pages || state.selectedPages || Object.keys(state.pages || {});
    return Array.isArray(pages) ? pages.filter(Boolean) : [];
  }

  function hasDomain(state) {
    return Boolean(
      state.domain_option === 'pbi_subdomain' ||
      state.custom_domain ||
      state.customDomain ||
      state.domain_registration?.name ||
      state.domainRegistration?.name ||
      state.subdomain_slug
    );
  }

  function hasSeo(state) {
    return Boolean(
      (state.seo?.title && state.seo?.description) ||
      (state.page_main_heading && state.sub_heading) ||
      (state.pages?.home?.title && state.pages?.home?.body)
    );
  }

  function hasResponsiveSystem(state) {
    const blocks = allBlocks(state);
    return Boolean(
      state.responsive_system_applied_at ||
      state.mobile_polish_applied_at ||
      (blocks.length && blocks.every((block) => block.visibility && block.positionMode !== 'free'))
    );
  }

  function hasImages(state) {
    const heroBlocks = allBlocks(state).filter((block) => ['hero', 'splitHero', 'gallery'].includes(block.type));
    if (!heroBlocks.length) return false;
    return heroBlocks.some((block) => block.image || block.images?.length || state.heroImage);
  }

  function hasBusinessSystem(state) {
    return Boolean(state.business_os?.installed_at || state.business_os?.primary_app || (Array.isArray(state.business_apps) && state.business_apps.length));
  }

  function hasAccessibilitySystem(state) {
    return Boolean(
      state.accessibility_checked_at ||
      allBlocks(state).some((block) => block.imageAlt || block.buttonAriaLabel || block.accessibility_checked_at)
    );
  }

  function hasAssistedRoute(state) {
    const blocks = allBlocks(state);
    return Boolean(
      state.assisted_setup_nudge ||
      blocks.some((block) => /assisted setup|custom build|pbi for help/i.test(`${block.title || ''} ${block.text || ''} ${block.button || ''}`))
    );
  }

  function assess(state) {
    const types = blockTypes(state);
    const checks = [
      {
        key: 'offer',
        label: 'Clear offer',
        ok: types.has('hero') || types.has('splitHero'),
        detail: 'A strong hero section explains the business quickly.',
        action: 'Add hero',
        block: 'hero'
      },
      {
        key: 'services',
        label: 'Services explained',
        ok: types.has('services') || types.has('featureGrid') || types.has('productGrid'),
        detail: 'Visitors need to understand the main offers without guessing.',
        action: 'Add services',
        block: 'services'
      },
      {
        key: 'proof',
        label: 'Trust proof',
        ok: types.has('trustBand') || types.has('testimonial') || types.has('stats') || types.has('logoCloud'),
        detail: 'Top builders surface reviews, proof and reassurance near the decision point.',
        action: 'Add proof',
        block: 'trustBand'
      },
      {
        key: 'conversion',
        label: 'Conversion route',
        ok: types.has('contact') || types.has('booking') || types.has('cta'),
        detail: 'Every local business site needs a direct enquiry, call, booking or payment route.',
        action: 'Add CTA',
        block: 'booking'
      },
      {
        key: 'pages',
        label: 'Useful pages',
        ok: selectedPages(state).length >= 4,
        detail: 'Home, about, services and contact gives PBI a stronger launch shape.',
        action: 'Open pages',
        tab: 'pages'
      },
      {
        key: 'seo',
        label: 'SEO basics',
        ok: hasSeo(state) && textLength(state) > 420,
        detail: 'Enough clear copy plus title/description context helps Goose and search engines.',
        action: 'Ask Goose',
        goose: 'seo'
      },
      {
        key: 'domain',
        label: 'Domain path',
        ok: hasDomain(state),
        detail: 'A publish-ready project should know whether it uses a PBI subdomain, owned domain or new domain.',
        action: 'Open domain',
        tab: 'domain'
      },
      {
        key: 'business-system',
        label: 'Business system',
        ok: hasBusinessSystem(state),
        detail: 'Top builders ship with useful business flows, not just page sections.',
        action: 'Install business system',
        command: 'business-system'
      },
      {
        key: 'responsive',
        label: 'Responsive system',
        ok: hasResponsiveSystem(state),
        detail: 'The project needs a mobile/tablet pass for long text, motion, visibility and flow.',
        action: 'Responsive sweep',
        command: 'responsive'
      },
      {
        key: 'accessibility',
        label: 'Accessibility pass',
        ok: hasAccessibilitySystem(state),
        detail: 'Top builders help with alt text, button labels, heading clarity and accessible publishing basics.',
        action: 'Accessibility pass',
        command: 'accessibility'
      },
      {
        key: 'images',
        label: 'Real images',
        ok: hasImages(state),
        detail: 'Pages need specific real-life images rather than generic placeholders.',
        action: 'Open media',
        tab: 'media'
      },
      {
        key: 'support-route',
        label: 'Help route',
        ok: hasAssistedRoute(state),
        detail: 'PBI should gently surface Assisted Setup or custom build help when needed.',
        action: 'Prepare dashboard',
        command: 'dashboard'
      },
      {
        key: 'launch',
        label: 'Publish route',
        ok: Boolean(state.plan || state.package || localStorage.getItem('pbi_plan')),
        detail: 'Plan, save, readiness and checkout should be visible before going live.',
        action: 'Save project',
        domAction: 'save'
      }
    ];
    const passed = checks.filter((check) => check.ok).length;
    return {
      score: Math.round((passed / checks.length) * 100),
      passed,
      total: checks.length,
      checks,
      next: checks.find((check) => !check.ok) || checks[checks.length - 1]
    };
  }

  function contextSummary(state, assessment) {
    return {
      business_name: state.business_name || state.project_name || '',
      template: state.templateId || state.template_preset || state.template || '',
      plan: state.plan || state.package || localStorage.getItem('pbi_plan') || '',
      active_page: activePageKey(state),
      selected_pages: selectedPages(state),
      block_types: Array.from(blockTypes(state)),
      active_blocks: activeBlocks(state).map((block) => ({ type: block.type, title: block.title, text: block.text })).slice(0, 8),
      domain_option: state.domain_option || '',
      custom_domain: state.custom_domain || state.domain_registration?.name || '',
      readiness: assessment
    };
  }

  function runGooseCommand(command) {
    window.dispatchEvent(new CustomEvent('pbi:goose-command', { detail: { command } }));
    setStatus(`Goose command started: ${command.replace(/-/g, ' ')}`);
    window.setTimeout(() => refresh(), 500);
  }

  function mount() {
    if ($('#pbiBuilderV2Command')) return;
    const topbar = $('.pbi-canvas-topbar');
    const app = $('.pbi-canvas-app');
    if (!topbar || !app) return;

    const shell = document.createElement('section');
    shell.id = 'pbiBuilderV2Command';
    shell.className = 'pbi-builder-v2-command';
    shell.setAttribute('aria-label', 'Builder launch command centre');
    shell.innerHTML = `
      <div class="pbi-builder-v2-head">
        <div>
          <p class="eyebrow">Builder V3</p>
          <h1>Launch command centre</h1>
          <p>PBI should help local businesses actually launch, not just design. Add missing sections, ask Goose, tune selected blocks, check domains, save and publish from one place.</p>
        </div>
        <div class="pbi-builder-v2-score" aria-live="polite">
          <strong data-v2-score>0%</strong>
          <span data-v2-score-label>Checking readiness</span>
        </div>
      </div>

      <div class="pbi-builder-v2-grid">
        <article class="pbi-builder-v2-card pbi-builder-v2-goose">
          <div class="pbi-builder-v2-card-head">
            <img src="/assets/goose/goose-thinking.png" alt="" aria-hidden="true">
            <div>
              <h2>Goose in the builder</h2>
              <p>Ask project-aware PBI questions about launch, SEO, domains, support routes and what should happen next.</p>
            </div>
          </div>
          <div class="pbi-builder-v2-action-row">
            <button type="button" data-v2-goose="missing">What is missing?</button>
            <button type="button" data-v2-goose="seo">SEO next move</button>
            <button type="button" data-v2-goose="assisted">Self-serve or help?</button>
            <button type="button" data-v2-goose="harmony">Compete with Harmony</button>
          </div>
          <div class="pbi-builder-v2-goose-reply" data-v2-goose-reply>Goose is ready when you need a second pair of eyes.</div>
        </article>

        <article class="pbi-builder-v2-card pbi-builder-v2-agent-mode">
          <h2>Goose action mode</h2>
          <p>Use these when you want the builder to behave more like a launch agent than a blank editor.</p>
          <div class="pbi-builder-v2-command-list">
            <button type="button" data-v2-command="autopilot"><strong>Make launch-ready</strong><span>Business system, SEO pages, mobile, proof and publish prep.</span></button>
            <button type="button" data-v2-command="business-system"><strong>Add business system</strong><span>Quote, booking, shop, course or service-area flow.</span></button>
            <button type="button" data-v2-command="feature"><strong>Build feature from prompt</strong><span>Turn the Goose brief into the closest business module.</span></button>
            <button type="button" data-v2-command="local-seo"><strong>Add local SEO pages</strong><span>Service area and questions pages with enquiry route.</span></button>
            <button type="button" data-v2-command="responsive"><strong>Fix responsive risk</strong><span>Shorten text, tame motion and protect mobile layout.</span></button>
            <button type="button" data-v2-command="accessibility"><strong>Accessibility pass</strong><span>Fill alt text, labels and heading metadata.</span></button>
          </div>
        </article>

        <article class="pbi-builder-v2-card">
          <h2>One-click launch sections</h2>
          <p>Competitor-grade builders make common launch gaps easy to fix. These add existing PBI blocks straight to the current page.</p>
          <div class="pbi-builder-v2-section-grid">
            ${SECTION_GROUPS.map((section) => `
              <button type="button" data-v2-add="${esc(section.type)}">
                <strong>${esc(section.label)}</strong>
                <span>${esc(section.note)}</span>
              </button>
            `).join('')}
          </div>
        </article>

        <article class="pbi-builder-v2-card">
          <h2>Launch path</h2>
          <p>Keep the commercial path close without being pushy: template, domain, readiness, publish, Assisted Setup or custom build.</p>
          <div class="pbi-builder-v2-launch-actions">
            <button type="button" data-v2-tab="templates">Templates</button>
            <button type="button" data-v2-tab="domain">Domain checker</button>
            <button type="button" data-v2-action="save">Save project</button>
            <button type="button" data-v2-action="publish">Run publish check</button>
            <a href="/custom-build/?type=assisted_setup">Assisted Setup</a>
            <a href="/custom-websites/">Custom build</a>
          </div>
        </article>
      </div>

      <div class="pbi-builder-v2-readiness">
        <div>
          <strong data-v2-next-title>Next best move</strong>
          <span data-v2-next-detail>Checking project state...</span>
        </div>
        <div class="pbi-builder-v2-checks" data-v2-checks></div>
      </div>
    `;
    topbar.after(shell);
    wire(shell);
    refresh(shell);
  }

  function setStatus(message) {
    const status = $('#canvasAutosaveStatus');
    if (status) status.textContent = message;
  }

  function clickBlock(type) {
    const button = $(`[data-block-type="${cssEscape(type)}"]`);
    if (!button) return false;
    button.click();
    setStatus(`${button.querySelector('strong')?.textContent || type} added from Builder V2`);
    return true;
  }

  function openTab(tab) {
    const builder = api();
    if (builder?.openTab) {
      builder.openTab(tab);
      return true;
    }
    if (tab === 'domain') {
      $('#canvasDomainPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setStatus('Domain checker opened');
      return true;
    }
    const button = $(`[data-studio-tab="${cssEscape(tab)}"]`);
    if (!button) return false;
    button.click();
    $('.pbi-studio-left')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return true;
  }

  function runDomAction(action) {
    if (action === 'save') {
      $('#canvasExportBtn')?.click();
      return;
    }
    if (action === 'publish') {
      $('#canvasPublishBtn')?.click();
      return;
    }
  }

  function runNext(check) {
    if (check.block) clickBlock(check.block);
    else if (check.tab) openTab(check.tab);
    else if (check.domAction) runDomAction(check.domAction);
    else if (check.goose) askGoose(check.goose);
    else if (check.command) runGooseCommand(check.command);
  }

  function renderAssessment(shell, state, assessment) {
    $('[data-v2-score]', shell).textContent = `${assessment.score}%`;
    $('[data-v2-score-label]', shell).textContent = `${assessment.passed}/${assessment.total} launch checks`;
    $('[data-v2-next-title]', shell).textContent = assessment.score >= 90 ? 'Ready to run the publish check' : `Next best move: ${assessment.next.label}`;
    $('[data-v2-next-detail]', shell).textContent = assessment.score >= 90
      ? 'Save the project, run the publish check, then choose the domain and payment route.'
      : assessment.next.detail;

    const checks = $('[data-v2-checks]', shell);
    checks.innerHTML = assessment.checks.map((check) => `
      <button type="button" class="${check.ok ? 'done' : ''}" data-v2-check="${esc(check.key)}">
        <span>${check.ok ? 'Done' : 'Fix'}</span>
        <strong>${esc(check.label)}</strong>
      </button>
    `).join('');
    $$('[data-v2-check]', checks).forEach((button) => {
      const check = assessment.checks.find((item) => item.key === button.dataset.v2Check);
      button.addEventListener('click', () => check && runNext(check));
    });
  }

  function refresh(shell = $('#pbiBuilderV2Command')) {
    if (!shell) return;
    const state = readState();
    const assessment = assess(state);
    renderAssessment(shell, state, assessment);
  }

  function buttonLabel(button) {
    return button.querySelector('strong')?.textContent?.trim() || button.textContent.trim();
  }

  async function askGoose(kind) {
    const shell = $('#pbiBuilderV2Command');
    const reply = $('[data-v2-goose-reply]', shell);
    const state = readState();
    const assessment = assess(state);
    const message = GOOSE_PROMPTS[kind] || GOOSE_PROMPTS.missing;
    reply.classList.add('thinking');
    reply.textContent = 'Goose is checking the project context...';

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          project_id: state.project_id || state.id || localStorage.getItem('pbi_active_project_id') || '',
          page: window.location.pathname,
          page_url: window.location.href,
          page_title: document.title,
          page_context: {
            title: document.title,
            path: window.location.pathname,
            headings: $$('h1,h2,h3').map((node) => node.textContent.trim()).filter(Boolean).slice(0, 18),
            buttons: $$('button,a.btn,a.btn-ghost').map(buttonLabel).filter(Boolean).slice(0, 24),
            builder: contextSummary(state, assessment)
          }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `Goose could not answer with status ${response.status}`);
      reply.classList.remove('thinking');
      reply.textContent = data.reply?.answer || 'Goose did not return an answer.';
    } catch (error) {
      reply.classList.remove('thinking');
      reply.textContent = `${error.message || 'Goose could not answer right now.'} If you are logged out, log in and ask again.`;
    }
  }

  function wire(shell) {
    $$('[data-v2-add]', shell).forEach((button) => {
      button.addEventListener('click', () => {
        clickBlock(button.dataset.v2Add);
        window.setTimeout(() => refresh(shell), 120);
      });
    });

    $$('[data-v2-tab]', shell).forEach((button) => {
      button.addEventListener('click', () => openTab(button.dataset.v2Tab));
    });

    $$('[data-v2-action]', shell).forEach((button) => {
      button.addEventListener('click', () => runDomAction(button.dataset.v2Action));
    });

    $$('[data-v2-goose]', shell).forEach((button) => {
      button.addEventListener('click', () => askGoose(button.dataset.v2Goose));
    });

    $$('[data-v2-command]', shell).forEach((button) => {
      button.addEventListener('click', () => runGooseCommand(button.dataset.v2Command));
    });

    document.addEventListener('click', () => window.setTimeout(() => refresh(shell), 150), true);
    document.addEventListener('input', () => window.setTimeout(() => refresh(shell), 220), true);
    window.addEventListener('storage', () => refresh(shell));
    window.addEventListener('pbi:builder-v2-updated', () => refresh(shell));
    window.setInterval(() => refresh(shell), 4500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}());
