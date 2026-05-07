(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));

  function api() {
    return window.PBIBuilderV2 || null;
  }

  function readState() {
    try {
      return api()?.getState?.() || JSON.parse(localStorage.getItem('pbi_canvas_state') || '{}') || {};
    } catch {
      return {};
    }
  }

  function activePage(state) {
    return api()?.getActivePage?.() || state.activePage || state.active_page || state.selected_pages?.[0] || 'home';
  }

  function blocks(state) {
    const page = activePage(state);
    return state.blocksByPage?.[page] || [];
  }

  function businessName(state) {
    return state.business_name || state.project_name || 'this business';
  }

  function cleanSlug(value) {
    return String(value || 'my-business')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42) || 'my-business';
  }

  function hasBlock(type) {
    return blocks(readState()).some((block) => block.type === type);
  }

  function ensureBlock(type) {
    if (!hasBlock(type)) api()?.addBlock?.(type);
  }

  function update(mutator, status) {
    const builder = api();
    if (!builder?.updateState) return;
    builder.updateState(mutator, status);
  }

  function briefValues() {
    return {
      business: $('#pbiActionBusiness')?.value.trim() || '',
      location: $('#pbiActionLocation')?.value.trim() || '',
      goal: $('#pbiActionGoal')?.value || 'enquiries',
      tone: $('#pbiActionTone')?.value || 'practical'
    };
  }

  function goalCopy(goal) {
    if (goal === 'bookings') return { action: 'book', noun: 'booking', cta: 'Book now' };
    if (goal === 'calls') return { action: 'call', noun: 'call', cta: 'Call today' };
    if (goal === 'shop') return { action: 'buy', noun: 'order', cta: 'Shop now' };
    return { action: 'enquire', noun: 'enquiry', cta: 'Enquire today' };
  }

  function applyBrief() {
    const brief = briefValues();
    update((state, context) => {
      const name = brief.business || businessName(state);
      const goal = goalCopy(brief.goal);
      state.business_name = name;
      state.project_name = `${name} Website`;
      state.location = brief.location || state.location || '';
      state.launch_goal = brief.goal;
      state.brand_tone = brief.tone;
      state.subdomain_slug = cleanSlug([name, brief.location].filter(Boolean).join(' '));
      state.domain_lookup_input = `${state.subdomain_slug}.co.uk`;
      state.seo = state.seo || {};
      state.seo.title = `${name}${brief.location ? ` in ${brief.location}` : ''} | Website`;
      state.seo.description = `${name} helps local customers ${goal.action} with confidence. Clear services, proof, FAQs and a simple ${goal.noun} route.`;

      const current = context.activeBlocks || [];
      const hero = current.find((block) => ['hero', 'splitHero'].includes(block.type));
      if (hero) {
        hero.eyebrow = brief.location ? `${brief.location} local website` : 'Local business website';
        hero.title = `${name} made easier to trust, choose and ${goal.action}.`;
        hero.text = `A clearer website flow with services, proof, FAQs and a direct ${goal.noun} route for customers who are ready to act.`;
        hero.button = goal.cta;
      }
      const contact = current.find((block) => ['contact', 'booking', 'cta'].includes(block.type));
      if (contact) {
        contact.title = brief.goal === 'shop' ? 'Ready to order?' : `Ready to ${goal.action}?`;
        contact.text = brief.location
          ? `Send a ${goal.noun} from ${brief.location} or the surrounding area and get a clear next step.`
          : `Send a ${goal.noun} and get a clear next step.`;
        contact.button = goal.cta;
      }
    }, 'Site brief applied');
    flash('Site brief applied. The hero, SEO basics and domain suggestion now follow that direction.');
  }

  function prepareHomepage() {
    ['trustBand', 'process', 'testimonial', 'faq', 'booking'].forEach(ensureBlock);
    update((state, context) => {
      const name = businessName(state);
      const current = context.activeBlocks || [];
      const trust = current.find((block) => block.type === 'trustBand');
      if (trust) {
        trust.title = 'Why customers feel safe choosing us';
        trust.text = 'Clear next steps | Local, practical support | Proof before pressure';
      }
      const process = current.find((block) => block.type === 'process');
      if (process) {
        process.title = 'A simple route from interest to action';
        process.text = 'Choose what you need | Send the enquiry | Get a clear reply';
      }
      const testimonial = current.find((block) => block.type === 'testimonial');
      if (testimonial) {
        testimonial.title = 'A calmer way to choose';
        testimonial.text = `"${name} made it easy to understand the offer and take the next step."`;
      }
      const faq = current.find((block) => block.type === 'faq');
      if (faq) {
        faq.title = 'Helpful questions before you enquire';
        faq.text = 'What areas do you cover? | How quickly do you reply? | What happens after I send an enquiry?';
      }
      const booking = current.find((block) => block.type === 'booking');
      if (booking) {
        booking.title = 'Ready for the next step?';
        booking.text = 'Use this section for a booking link, quote request, call button or contact route.';
        booking.button = 'Start enquiry';
      }
    }, 'Homepage launch sections prepared');
    flash('Homepage prepared with trust, process, testimonial, FAQ and booking sections.');
  }

  function writeSeoBasics() {
    update((state, context) => {
      const name = businessName(state);
      const page = state.pages?.[context.activePage] || {};
      const hero = (context.activeBlocks || []).find((block) => ['hero', 'splitHero'].includes(block.type));
      const title = hero?.title || page.title || state.page_main_heading || name;
      const description = hero?.text || page.body || state.sub_heading || 'Clear local services, proof and a simple enquiry route.';
      state.seo = state.seo || {};
      state.seo.title = `${name} | ${String(title).replace(/\.$/, '').slice(0, 58)}`;
      state.seo.description = String(description).replace(/\s+/g, ' ').slice(0, 155);
      state.seo.indexable = true;
      state.seo.ogTitle = state.seo.title;
      state.seo.ogDescription = state.seo.description;
    }, 'SEO basics written');
    flash('SEO title, description and share text have been written from the current page.');
  }

  function addFaq() {
    ensureBlock('faq');
    update((state, context) => {
      const faq = (context.activeBlocks || []).find((block) => block.type === 'faq');
      if (!faq) return;
      faq.title = 'Questions customers usually ask';
      faq.text = 'How do I get started? | Send an enquiry and we will confirm the best next step. | Do you work locally? | Yes, this page can be tailored around your service area. | Can I ask for help? | Yes, PBI Assisted Setup or custom build support is available.';
    }, 'FAQ added');
    flash('FAQ added with useful customer questions and answers.');
  }

  function preparePublish() {
    prepareHomepage();
    writeSeoBasics();
    update((state) => {
      if (!state.domain_option) state.domain_option = 'pbi_subdomain';
      if (!state.subdomain_slug) state.subdomain_slug = cleanSlug(businessName(state));
      state.launch_prepared_at = new Date().toISOString();
    }, 'Publish preparation applied');
    api()?.saveProject?.();
    flash('Publish preparation applied and the project save route has been triggered.');
  }

  function flash(message) {
    const box = $('[data-v2-action-result]');
    if (!box) return;
    box.textContent = message;
    box.classList.add('active');
  }

  function mount() {
    const command = $('#pbiBuilderV2Command');
    if (!command || $('#pbiBuilderV2Actions')) return;
    const state = readState();
    const panel = document.createElement('section');
    panel.id = 'pbiBuilderV2Actions';
    panel.className = 'pbi-builder-v2-action-engine';
    panel.innerHTML = `
      <div class="pbi-builder-v2-action-head">
        <div>
          <p class="eyebrow">Action Engine</p>
          <h2>Goose can now apply the obvious fixes</h2>
          <p>Turn the launch checklist into actual builder changes: stronger homepage flow, SEO basics, FAQs, publish prep and a sharper site brief.</p>
        </div>
        <button type="button" class="pbi-builder-v2-primary-action" data-v2-apply="publish">Prepare publish</button>
      </div>
      <div class="pbi-builder-v2-brief">
        <input id="pbiActionBusiness" class="input" placeholder="Business name" value="${esc(businessName(state) === 'this business' ? '' : businessName(state))}">
        <input id="pbiActionLocation" class="input" placeholder="Town or area" value="${esc(state.location || '')}">
        <select id="pbiActionGoal" class="select">
          <option value="enquiries">Enquiries</option>
          <option value="bookings">Bookings</option>
          <option value="calls">Phone calls</option>
          <option value="shop">Shop orders</option>
        </select>
        <select id="pbiActionTone" class="select">
          <option value="practical">Practical</option>
          <option value="premium">Premium</option>
          <option value="friendly">Friendly</option>
          <option value="direct">Direct</option>
        </select>
        <button type="button" data-v2-apply="brief">Apply brief</button>
      </div>
      <div class="pbi-builder-v2-apply-grid">
        <button type="button" data-v2-apply="homepage"><strong>Prepare homepage</strong><span>Adds trust, process, testimonial, FAQ and booking sections.</span></button>
        <button type="button" data-v2-apply="seo"><strong>Write SEO basics</strong><span>Creates title, description and share copy from the current page.</span></button>
        <button type="button" data-v2-apply="faq"><strong>Add useful FAQ</strong><span>Handles common customer hesitation before enquiry.</span></button>
        <a href="/custom-build/?type=assisted_setup"><strong>Assisted Setup</strong><span>Subtle human-help route when the project needs polishing.</span></a>
      </div>
      <div class="pbi-builder-v2-action-result" data-v2-action-result>Ready to apply fixes.</div>
    `;
    command.appendChild(panel);
    wire(panel);
  }

  function wire(panel) {
    $$('[data-v2-apply]', panel).forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.v2Apply;
        if (action === 'brief') applyBrief();
        if (action === 'homepage') prepareHomepage();
        if (action === 'seo') writeSeoBasics();
        if (action === 'faq') addFaq();
        if (action === 'publish') preparePublish();
        window.dispatchEvent(new CustomEvent('pbi:builder-v2-action', { detail: { action } }));
      });
    });
  }

  function ready() {
    if (api()) mount();
    else window.setTimeout(ready, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
}());
