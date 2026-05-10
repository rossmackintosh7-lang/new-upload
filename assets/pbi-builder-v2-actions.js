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
    if (goal === 'courses') return { action: 'sign up', noun: 'signup', cta: 'Join a programme' };
    return { action: 'enquire', noun: 'enquiry', cta: 'Enquire today' };
  }

  function allBlocks(state) {
    return Object.values(state.blocksByPage || {}).flatMap((pageBlocks) => Array.isArray(pageBlocks) ? pageBlocks : []);
  }

  function selectedPages(state) {
    const pages = state.selected_pages || state.selectedPages || Object.keys(state.pages || {});
    return Array.isArray(pages) ? pages.filter(Boolean) : [];
  }

  function currentGoal(state) {
    return state.launch_goal || $('#pbiSiteDirectorGoal')?.value || $('#pbiActionGoal')?.value || 'enquiries';
  }

  function maxPageCount(state) {
    const plan = window.PBIPackageRules?.cleanPlan?.(state.plan || state.package || localStorage.getItem('pbi_plan')) || 'starter';
    return window.PBIPackageRules?.limits?.[plan]?.maxPages || 5;
  }

  function pageAllowed(state, key) {
    const pages = selectedPages(state);
    return pages.includes(key) || pages.length < maxPageCount(state);
  }

  function ensurePage(state, key, label, title, body) {
    state.pages = state.pages || {};
    state.blocksByPage = state.blocksByPage || {};
    state.selected_pages = selectedPages(state);
    if (!state.selected_pages.includes(key)) {
      if (!pageAllowed(state, key)) return false;
      state.selected_pages.push(key);
    }
    state.pages[key] = {
      ...(state.pages[key] || {}),
      label,
      title,
      body
    };
    state.blocksByPage[key] = Array.isArray(state.blocksByPage[key]) ? state.blocksByPage[key] : [];
    return true;
  }

  function blockId(type) {
    return `goose-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function actionBlock(type, overrides = {}) {
    return {
      id: blockId(type),
      type,
      title: overrides.title || 'New section',
      text: overrides.text || '',
      button: overrides.button || '',
      layout: overrides.layout || 'cards',
      animation: overrides.animation || 'rise',
      publishable: true,
      visibility: overrides.visibility || 'all',
      created_by_goose: true,
      ...overrides
    };
  }

  function upsertBlock(pageBlocks, type, overrides = {}) {
    let block = pageBlocks.find((item) => item.type === type);
    if (!block) {
      block = actionBlock(type, overrides);
      pageBlocks.push(block);
    } else {
      Object.assign(block, overrides);
    }
    return block;
  }

  function firstImage(state) {
    return state.heroImage || allBlocks(state).find((block) => block.image)?.image || '/assets/demo-media/cafe-hero.jpg';
  }

  function featureFromPrompt(prompt) {
    const lower = String(prompt || '').toLowerCase();
    if (/shop|store|product|checkout|order|buy|retail/.test(lower)) return 'shop';
    if (/book|booking|appointment|reservation|table|calendar|schedule/.test(lower)) return /table|menu|restaurant|cafe|café/.test(lower) ? 'menu' : 'bookings';
    if (/course|class|programme|program|training|session|signup|sign up/.test(lower)) return 'courses';
    if (/area|map|location|nearby|postcode|coverage|town/.test(lower)) return 'service-area';
    if (/review|proof|testimonial|case study|before|after|result/.test(lower)) return 'proof';
    if (/menu|dish|food|drink|coffee|restaurant|cafe|café/.test(lower)) return 'menu';
    return 'quote';
  }

  const SMART_SECTIONS = {
    'service-area': {
      type: 'map',
      title: 'Areas we cover',
      text: 'Local customers | Nearby towns | Clear response expectations',
      button: 'Check availability',
      layout: 'spotlight'
    },
    'social-proof': {
      type: 'reviews',
      title: 'Proof before pressure',
      text: 'Clear communication | Helpful advice | Easy next steps',
      layout: 'cards'
    },
    'comparison': {
      type: 'featureGrid',
      title: 'Why choose this route',
      text: 'Clear offer :: Visitors understand what is available quickly | Useful proof :: Trust is visible before the enquiry | Simple action :: One obvious next step',
      layout: 'bento'
    },
    'offer-strip': {
      type: 'salesBanner',
      title: 'Ready to get started this week?',
      text: 'Use this section for availability, a seasonal offer or a practical next step.',
      button: 'Ask now',
      layout: 'strip'
    },
    'local-seo': {
      type: 'services',
      title: 'Useful local services',
      text: 'Main service near you | Fast enquiry route | Clear local support',
      layout: 'cards'
    },
    'assisted-route': {
      type: 'cta',
      title: 'Need help finishing this properly?',
      text: 'Assisted Setup can polish wording, pages, images, domains and launch readiness before the site goes live.',
      button: 'Ask PBI for help',
      layout: 'centered'
    }
  };

  const APP_PRESETS = {
    quote: {
      blocks: ['quoteForm', 'services', 'faq'],
      title: 'Quote request flow',
      text: 'Collect the job details, location and timing so customers get a clear reply.',
      button: 'Request a quote'
    },
    bookings: {
      blocks: ['booking', 'hours', 'map'],
      title: 'Booking flow',
      text: 'Show availability, opening times and a simple appointment route.',
      button: 'Book now'
    },
    shop: {
      blocks: ['productGrid', 'retail', 'pricing'],
      title: 'Shop starter flow',
      text: 'Feature products, collections and a clear checkout path.',
      button: 'Shop now'
    },
    courses: {
      blocks: ['courseList', 'booking', 'faq'],
      title: 'Programme signup flow',
      text: 'Show sessions, expectations and a consultation or signup route.',
      button: 'Join a programme'
    },
    proof: {
      blocks: ['reviews', 'beforeAfter', 'stats'],
      title: 'Proof stack',
      text: 'Show reviews, results and confidence signals before asking people to enquire.',
      button: 'See proof'
    },
    menu: {
      blocks: ['services', 'hours', 'booking'],
      title: 'Menu and reservation flow',
      text: 'Show popular choices, opening times and an obvious table booking route.',
      button: 'Book a table'
    },
    'service-area': {
      blocks: ['map', 'stats', 'quoteForm'],
      title: 'Service area flow',
      text: 'Make coverage, response expectations and the enquiry route obvious.',
      button: 'Check my area'
    }
  };

  function truncate(value, max) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}.`;
  }

  function selectedBlock() {
    return api()?.getSelectedBlock?.() || null;
  }

  function updateSelected(mutator, status) {
    const builder = api();
    const block = selectedBlock();
    if (!builder?.updateSelectedBlock || !block) {
      flash('Select a section on the canvas first, then run this action.');
      return false;
    }
    builder.updateSelectedBlock(mutator, status);
    return true;
  }

  function selectedSectionLabel(block) {
    if (!block) return 'No section selected';
    return `${block.title || block.type || 'Selected section'} (${block.type || 'section'})`;
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

  function improveSelectedSection() {
    const block = selectedBlock();
    const brief = briefValues();
    const goal = goalCopy($('#pbiSiteDirectorGoal')?.value || brief.goal);
    const ok = updateSelected((target, state) => {
      const name = brief.business || businessName(state);
      const location = brief.location || state.location || '';
      target.animation = target.animation && target.animation !== 'none' ? target.animation : 'rise';
      target.padding = target.padding || 'comfortable';
      target.align = target.align || 'left';

      if (['hero', 'splitHero'].includes(target.type)) {
        target.eyebrow = location ? `${location} local service` : 'Local business website';
        target.title = truncate(`${name} helps customers ${goal.action} with confidence.`, 76);
        target.text = truncate(`A clearer website section with useful proof, simple next steps and a direct ${goal.noun} route.`, 150);
        target.button = goal.cta;
        target.layout = target.layout === 'fullBleed' ? 'fullBleed' : 'split';
      } else if (target.type === 'services') {
        target.title = 'Services made easy to choose';
        target.text = 'Clear main service | Helpful guidance | Simple next step';
        target.layout = 'cards';
      } else if (['quoteForm', 'booking', 'contact', 'cta'].includes(target.type)) {
        target.title = `Ready to ${goal.action}?`;
        target.text = location ? `Send a ${goal.noun} from ${location} and get a clear reply.` : `Send a ${goal.noun} and get a clear reply.`;
        target.button = goal.cta;
        target.layout = 'spotlight';
      } else if (target.type === 'faq') {
        target.title = 'Useful answers before customers act';
        target.text = `How do I get started? | Use the ${goal.noun} route and we will confirm the next step. | What areas do you cover? | This page can be tailored around the service area. | Can I ask for help? | Yes, support is available before launch.`;
        target.layout = 'checklist';
      } else if (['reviews', 'testimonial', 'trustBand', 'stats'].includes(target.type)) {
        target.title = 'Proof before pressure';
        target.text = 'Clear communication | Helpful guidance | Easy next steps';
        target.layout = target.type === 'testimonial' ? 'spotlight' : 'cards';
      } else {
        target.title = truncate(target.title || 'A clearer section', 70);
        target.text = truncate(target.text || `Use this section to help visitors understand the offer and ${goal.action}.`, 170);
      }
      target.ai_improved_at = new Date().toISOString();
    }, 'Selected section improved');
    if (ok) flash(`${selectedSectionLabel(block)} improved with clearer copy, CTA and layout.`);
  }

  function premiumSelectedSection() {
    const block = selectedBlock();
    const ok = updateSelected((target, state) => {
      const accent = state.accent_color || target.accent || '#b76233';
      const bg = state.background_color || '#fffaf4';
      target.accent = accent;
      target.background = ['salesBanner'].includes(target.type) ? accent : (target.background || bg);
      target.padding = 'spacious';
      target.animation = ['services', 'reviews', 'featureGrid', 'productGrid'].includes(target.type) ? 'stagger' : 'rise';
      if (['services', 'featureGrid', 'reviews', 'team', 'productGrid', 'courseList'].includes(target.type)) target.layout = 'bento';
      else if (['hero', 'splitHero'].includes(target.type)) target.layout = 'image-first';
      else if (target.type === 'process') target.layout = 'timeline';
      else if (target.type === 'faq') target.layout = 'checklist';
      else target.layout = target.layout || 'spotlight';
      target.premium_polished_at = new Date().toISOString();
    }, 'Selected section polished');
    if (ok) flash(`${selectedSectionLabel(block)} now has a stronger premium layout, spacing and motion.`);
  }

  function conversionSelectedSection() {
    const block = selectedBlock();
    const goal = goalCopy($('#pbiSiteDirectorGoal')?.value || briefValues().goal);
    const ok = updateSelected((target) => {
      target.title = `Ready to ${goal.action}?`;
      target.text = `Give visitors one obvious ${goal.noun} route, remove doubt, and make the next step easy.`;
      target.button = goal.cta;
      target.layout = ['hero', 'splitHero'].includes(target.type) ? 'split' : 'spotlight';
      target.animation = 'rise';
      target.conversion_tuned_at = new Date().toISOString();
    }, 'Conversion route improved');
    if (ok) flash(`${selectedSectionLabel(block)} tuned around a clearer ${goal.noun} route.`);
  }

  function mobileSelectedSection() {
    const block = selectedBlock();
    const ok = updateSelected((target) => {
      target.title = truncate(target.title, 58);
      target.text = truncate(target.text, 145);
      if (['hero', 'splitHero'].includes(target.type)) target.layout = 'split';
      if (target.animation === 'parallax' || target.animation === 'marquee') target.animation = 'rise';
      target.positionMode = 'flow';
      target.mobile_polished = true;
      target.visibility = target.visibility || 'all';
    }, 'Selected section made mobile-safe');
    if (ok) {
      api()?.setDevice?.('mobile');
      flash(`${selectedSectionLabel(block)} shortened and made safer for mobile preview.`);
    }
  }

  function setSelectedVisibility(value) {
    const block = selectedBlock();
    const ok = updateSelected((target) => {
      target.visibility = value;
    }, value === 'all' ? 'Section visible everywhere' : `Section set to ${value} only`);
    if (ok) flash(`${selectedSectionLabel(block)} visibility set to ${value === 'all' ? 'all devices' : `${value} only`}.`);
  }

  function addSmartSection(key) {
    const section = SMART_SECTIONS[key];
    const builder = api();
    if (!section || !builder?.addBlock) return;
    builder.addBlock(section.type);
    updateSelected((target, state) => {
      const brief = briefValues();
      const name = brief.business || businessName(state);
      target.title = section.title.replace('this route', name);
      target.text = section.text;
      target.button = section.button || target.button || '';
      target.layout = section.layout || target.layout || 'cards';
      target.animation = ['reviews', 'featureGrid', 'services'].includes(target.type) ? 'stagger' : 'rise';
      target.smart_section = key;
      target.created_by_goose = true;
    }, 'Smart section added');
    flash(`${section.title} added to the current page.`);
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

  function directorBrief() {
    const brief = $('#pbiSiteDirectorPrompt')?.value.trim() || '';
    const basic = briefValues();
    const state = readState();
    const parts = [
      brief,
      basic.business ? `Business: ${basic.business}` : `Business: ${businessName(state)}`,
      basic.location ? `Area: ${basic.location}` : (state.location ? `Area: ${state.location}` : ''),
      `Goal: ${$('#pbiSiteDirectorGoal')?.value || basic.goal}`,
      `Tone: ${basic.tone}`
    ].filter(Boolean);
    return parts.join('. ');
  }

  function generateFullSite() {
    const prompt = directorBrief();
    const builder = api();
    if (!prompt || !builder) return flash('Add a short site brief first.');
    if (builder.generateSiteFromBrief) {
      builder.generateSiteFromBrief(prompt, {
        goal: $('#pbiSiteDirectorGoal')?.value || briefValues().goal,
        style: $('#pbiActionTone')?.value || 'practical'
      });
      flash('Full multi-page site generated. Pages, blocks, SEO basics and launch direction have been rebuilt.');
      return;
    }
    applyBrief();
    prepareHomepage();
  }

  function redesignCurrentPage() {
    update((state, context) => {
      const layouts = ['split', 'image-first', 'bento', 'timeline', 'cards', 'spotlight'];
      (context.activeBlocks || []).forEach((block, index) => {
        if (block.packageLocked) return;
        if (['hero', 'splitHero'].includes(block.type)) block.layout = index % 2 ? 'image-first' : 'split';
        else if (['services', 'featureGrid', 'reviews', 'team'].includes(block.type)) block.layout = index % 2 ? 'bento' : 'cards';
        else if (block.type === 'process') block.layout = 'timeline';
        else block.layout = block.layout || layouts[index % layouts.length];
        block.animation = ['rise', 'fade', 'stagger'][index % 3];
      });
      state.page_redesigned_at = new Date().toISOString();
    }, 'Current page redesigned');
    flash('Current page rhythm updated with stronger layouts and motion.');
  }

  function applyBrandEverywhere() {
    const tone = $('#pbiActionTone')?.value || 'practical';
    const palettes = {
      premium: { bg: '#fbf5ec', accent: '#2b160e', text: '#21140f' },
      friendly: { bg: '#fff8ef', accent: '#bf5c29', text: '#2b160e' },
      direct: { bg: '#f7fbf5', accent: '#537744', text: '#172414' },
      practical: { bg: '#fffaf4', accent: '#b76233', text: '#24130c' }
    };
    const palette = palettes[tone] || palettes.practical;
    update((state) => {
      state.background_color = palette.bg;
      state.accent_color = palette.accent;
      state.text_color = palette.text;
      Object.values(state.blocksByPage || {}).flat().forEach((block) => {
        if (!block.packageLocked) {
          block.accent = palette.accent;
          block.background = block.type === 'salesBanner' ? palette.accent : (block.background || palette.bg);
        }
      });
      state.brand_system_applied_at = new Date().toISOString();
    }, 'Brand applied across site');
    flash('Brand colour, accent and block styling applied across every page.');
  }

  function addBusinessApp() {
    const appType = $('#pbiBusinessApp')?.value || 'quote';
    const app = APP_PRESETS[appType] || APP_PRESETS.quote;
    app.blocks.forEach(ensureBlock);
    update((state, context) => {
      state.business_apps = state.business_apps || [];
      if (!state.business_apps.includes(appType)) state.business_apps.push(appType);
      const current = context.activeBlocks || [];
      app.blocks.forEach((type, index) => {
        const block = current.find((item) => item.type === type);
        if (!block) return;
        block.title = index === 0 ? app.title : block.title;
        block.text = index === 0 ? app.text : block.text;
        block.button = block.button || app.button || '';
        block.layout = index === 0 ? 'spotlight' : (block.layout || 'cards');
        block.business_app = appType;
      });
    }, 'Business app inserted');
    flash(`${app.title} inserted with supporting sections.`);
  }

  function tuneMobile() {
    update((state) => {
      Object.values(state.blocksByPage || {}).flat().forEach((block) => {
        if (block.packageLocked) return;
        if (['hero', 'splitHero'].includes(block.type)) block.layout = 'split';
        if (String(block.title || '').length > 72) block.title = truncate(block.title, 72);
        if (String(block.text || '').length > 210) block.text = truncate(block.text, 210);
        if (!block.animation || block.animation === 'parallax') block.animation = 'rise';
        if (block.positionMode === 'free') block.positionMode = 'flow';
        block.visibility = block.visibility || 'all';
        block.mobile_safe = true;
      });
      state.mobile_polish_applied_at = new Date().toISOString();
    }, 'Mobile polish applied');
    api()?.setDevice?.('mobile');
    flash('Mobile polish applied: shorter headings, safer hero layouts and lighter motion.');
  }

  function auditAndFixBasics() {
    ['trustBand', 'reviews', 'faq', 'contact', 'map'].forEach(ensureBlock);
    writeSeoBasics();
    update((state, context) => {
      if (!state.domain_lookup_input) state.domain_lookup_input = `${cleanSlug(businessName(state))}.co.uk`;
      if (!state.launch_goal) state.launch_goal = $('#pbiSiteDirectorGoal')?.value || briefValues().goal;
      const current = context.activeBlocks || [];
      const contact = current.find((block) => ['contact', 'booking', 'quoteForm'].includes(block.type));
      if (contact) {
        const goal = goalCopy(state.launch_goal);
        contact.title = `Ready to ${goal.action}?`;
        contact.button = goal.cta;
        contact.layout = contact.layout || 'spotlight';
      }
      current.forEach((block) => {
        if (!block.visibility) block.visibility = 'all';
        if (!block.animation || block.animation === 'parallax') block.animation = 'rise';
      });
      state.ai_audit_fixed_at = new Date().toISOString();
    }, 'Audit fixes applied');
    flash('Audit fixes applied: proof, FAQ, contact route, service area, SEO and domain suggestion checked.');
  }

  function addLocalSeoPages() {
    update((state) => {
      const name = businessName(state);
      const location = state.location || briefValues().location || 'your area';
      const goal = goalCopy(currentGoal(state));
      const image = firstImage(state);

      if (ensurePage(state, 'local-services', 'Local Services', `${name} services in ${location}`, `Clear local service information, proof and an easy ${goal.noun} route.`)) {
        state.blocksByPage['local-services'] = [
          actionBlock('hero', {
            eyebrow: `${location} local services`,
            title: `${name} services in ${location}`,
            text: `A practical page for people searching locally, with clear services, trust proof and one obvious ${goal.noun} route.`,
            button: goal.cta,
            image,
            layout: 'split'
          }),
          actionBlock('services', {
            title: 'What customers can ask for',
            text: 'Main service | Useful advice | Clear next step',
            layout: 'bento'
          }),
          actionBlock('map', {
            title: `Serving ${location} and nearby`,
            text: 'Local coverage | Nearby towns | Response expectations',
            button: 'Check availability',
            layout: 'spotlight'
          }),
          actionBlock('faq', {
            title: 'Local questions before enquiring',
            text: 'Do you cover my area? | Send your postcode or town and we will confirm. | How quickly do you reply? | Most enquiries get a clear next step quickly. | What happens next? | We confirm fit, timing and the best route.',
            layout: 'checklist'
          }),
          actionBlock('quoteForm', {
            title: `Send a ${goal.noun}`,
            text: `Give ${name} the details needed to reply properly.`,
            button: goal.cta,
            layout: 'spotlight'
          })
        ];
      }

      if (ensurePage(state, 'questions', 'Questions', `Useful questions before customers ${goal.action}`, 'A support-style page that reduces hesitation before enquiry.')) {
        state.blocksByPage.questions = [
          actionBlock('hero', {
            eyebrow: 'Helpful answers',
            title: `Questions before you ${goal.action}`,
            text: 'Give customers a calm route through the things they need to know before acting.',
            button: goal.cta,
            image,
            layout: 'image-first'
          }),
          actionBlock('faq', {
            title: 'Common questions',
            text: 'Is this right for me? | Use the enquiry route and we will confirm the best next step. | Can I speak to someone? | Yes, phone or email options can be added. | Can I get help finishing this site? | PBI Assisted Setup can polish the website before launch.',
            layout: 'checklist'
          }),
          actionBlock('cta', {
            title: 'Still deciding?',
            text: 'Keep Assisted Setup visible for customers who want human help before launch.',
            button: 'Ask PBI for help',
            layout: 'centered'
          })
        ];
      }

      state.local_seo_pages_created_at = new Date().toISOString();
      state.seo = state.seo || {};
      state.seo.localPages = ['local-services', 'questions'].filter((key) => state.selected_pages.includes(key));
    }, 'Local SEO pages created');
    flash('Local SEO pages added with service area, FAQ, proof and enquiry routes.');
  }

  function installBusinessSystem() {
    const appType = $('#pbiBusinessApp')?.value || (currentGoal(readState()) === 'shop' ? 'shop' : currentGoal(readState()) === 'bookings' ? 'bookings' : 'quote');
    const app = APP_PRESETS[appType] || APP_PRESETS.quote;
    app.blocks.forEach(ensureBlock);
    ['reviews', 'faq', 'map'].forEach(ensureBlock);
    update((state, context) => {
      const goal = goalCopy(currentGoal(state));
      const name = businessName(state);
      state.business_apps = state.business_apps || [];
      ['proof', appType, 'service-area'].forEach((item) => {
        if (!state.business_apps.includes(item)) state.business_apps.push(item);
      });
      state.business_os = {
        primary_app: appType,
        goal: currentGoal(state),
        installed_at: new Date().toISOString(),
        modules: ['proof', 'service_area', appType, 'faq', 'follow_up']
      };
      const current = context.activeBlocks || [];
      upsertBlock(current, app.blocks[0], {
        title: app.title,
        text: app.text,
        button: app.button,
        layout: 'spotlight',
        business_app: appType
      });
      upsertBlock(current, 'reviews', {
        title: 'Proof before people commit',
        text: 'Clear communication | Practical guidance | Helpful next steps',
        layout: 'cards',
        business_app: 'proof'
      });
      upsertBlock(current, 'map', {
        title: 'Areas covered',
        text: 'Local area | Nearby towns | Clear response expectations',
        button: 'Check my area',
        layout: 'spotlight',
        business_app: 'service-area'
      });
      upsertBlock(current, 'faq', {
        title: 'Questions customers ask before acting',
        text: `How do I get started? | Use the ${goal.noun} route and ${name} will confirm the next step. | Can I ask for help? | Yes, PBI can support Assisted Setup or custom build routes where needed.`,
        layout: 'checklist',
        business_app: 'faq'
      });
    }, 'Business system installed');
    flash(`${app.title} installed with proof, service area and FAQ support.`);
  }

  function responsiveSweep() {
    tuneMobile();
    update((state) => {
      allBlocks(state).forEach((block) => {
        if (block.packageLocked) return;
        block.visibility = block.visibility || 'all';
        if (block.type === 'salesBanner' && !block.mobile_polished && block.visibility === 'all') block.visibility = 'desktop';
        if (String(block.title || '').length > 78) block.title = truncate(block.title, 78);
        if (String(block.text || '').length > 230) block.text = truncate(block.text, 230);
        if (block.positionMode === 'free') block.positionMode = 'flow';
        if (['marquee', 'parallax'].includes(block.animation)) block.animation = 'rise';
        block.responsive_checked_at = new Date().toISOString();
      });
      state.responsive_system_applied_at = new Date().toISOString();
    }, 'Responsive system applied');
    flash('Responsive sweep completed across all pages: shorter copy, safer motion and flow layouts.');
  }

  function accessibilitySweep() {
    update((state) => {
      const name = businessName(state);
      allBlocks(state).forEach((block) => {
        if (block.packageLocked) return;
        if (block.image && !block.imageAlt) block.imageAlt = `${block.title || name} image`;
        if (Array.isArray(block.images)) {
          block.imageAlts = block.imageAlts || {};
          block.images.forEach((image, index) => {
            if (image && !block.imageAlts[index]) block.imageAlts[index] = `${block.title || name} image ${index + 1}`;
          });
        }
        if (block.button && !block.buttonAriaLabel) block.buttonAriaLabel = `${block.button} - ${block.title || name}`;
        if (!block.headingLevel && ['hero', 'splitHero'].includes(block.type)) block.headingLevel = 1;
        if (!block.headingLevel && block.type !== 'spacer') block.headingLevel = 2;
        block.accessibility_checked_at = new Date().toISOString();
      });
      state.accessibility_checked_at = new Date().toISOString();
      state.seo = state.seo || {};
      state.seo.accessibilityAltText = true;
    }, 'Accessibility pass applied');
    flash('Accessibility pass applied: image alt text, button labels and heading metadata were filled where missing.');
  }

  function buildFeatureFromPrompt() {
    const prompt = directorBrief();
    if (!prompt) return flash('Describe the feature or business need first, then Goose can build the closest PBI module.');
    const appType = featureFromPrompt(prompt);
    const app = APP_PRESETS[appType] || APP_PRESETS.quote;
    app.blocks.forEach(ensureBlock);
    update((state, context) => {
      const name = businessName(state);
      const goal = goalCopy(currentGoal(state));
      state.generated_features = state.generated_features || [];
      state.generated_features.push({
        prompt,
        feature: appType,
        created_at: new Date().toISOString()
      });
      const current = context.activeBlocks || [];
      upsertBlock(current, app.blocks[0], {
        title: app.title,
        text: truncate(prompt, 190) || app.text,
        button: app.button || goal.cta,
        layout: 'spotlight',
        animation: 'rise',
        created_by_goose: true,
        generated_feature: appType
      });
      if (!current.some((block) => block.type === 'cta')) {
        current.push(actionBlock('cta', {
          title: `Need help finishing ${name}?`,
          text: 'Assisted Setup can polish wording, images, SEO and launch details before the site goes live.',
          button: 'Ask PBI for help',
          layout: 'centered'
        }));
      }
    }, 'Feature built from prompt');
    flash(`${app.title} built from the Goose prompt and added to the current page.`);
  }

  function prepareCustomerDashboard() {
    update((state) => {
      const goal = goalCopy(currentGoal(state));
      state.customer_dashboard = {
        status: 'launch_preparation',
        next_actions: [
          'Confirm contact details',
          'Check the domain route',
          `Test the ${goal.noun} route`,
          'Run the publish check',
          'Choose Assisted Setup if extra polish is needed'
        ],
        modules: state.business_apps || [],
        updated_at: new Date().toISOString()
      };
      state.assisted_setup_nudge = {
        label: 'Assisted Setup',
        message: 'Use PBI Assisted Setup if the site needs hands-on wording, images, SEO or launch polish.',
        href: '/custom-build/?type=assisted_setup'
      };
    }, 'Customer dashboard prepared');
    flash('Customer dashboard data prepared with next actions, business modules and Assisted Setup route.');
  }

  function harmonyAutopilot() {
    applyBrief();
    prepareHomepage();
    installBusinessSystem();
    addLocalSeoPages();
    responsiveSweep();
    applyBrandEverywhere();
    auditAndFixBasics();
    accessibilitySweep();
    prepareCustomerDashboard();
    update((state) => {
      state.goose_autopilot = {
        mode: 'harmony_competitor',
        completed_at: new Date().toISOString(),
        summary: 'Generated a launch-focused site system with business modules, local SEO pages, proof, responsive checks, dashboard next actions and publish preparation.'
      };
    }, 'Goose launch autopilot completed');
    api()?.saveProject?.();
    flash('Goose launch autopilot completed and save was triggered.');
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
          <p class="eyebrow">AI Site Director</p>
          <h2>Goose can now change the actual site</h2>
          <p>Generate the full site, tune the current page, add business apps, apply brand direction and fix the launch basics from one control centre.</p>
        </div>
        <button type="button" class="pbi-builder-v2-primary-action" data-v2-apply="publish">Prepare publish</button>
      </div>
      <div class="pbi-builder-v2-harmony-actions" aria-label="Goose action mode">
        <button type="button" data-v2-apply="harmony-autopilot"><strong>Goose launch autopilot</strong><span>Business system, local SEO, mobile, proof and publish prep.</span></button>
        <button type="button" data-v2-apply="business-system"><strong>Install business system</strong><span>Quote, booking, shop or course flow with proof.</span></button>
        <button type="button" data-v2-apply="local-seo-pages"><strong>Create local SEO pages</strong><span>Service area and questions pages for launch.</span></button>
        <button type="button" data-v2-apply="responsive-sweep"><strong>Responsive sweep</strong><span>Fix long text, motion and mobile layout risk.</span></button>
        <button type="button" data-v2-apply="accessibility-sweep"><strong>Accessibility pass</strong><span>Alt text, labels and heading metadata.</span></button>
        <button type="button" data-v2-apply="customer-dashboard"><strong>Prepare customer dashboard</strong><span>Status, next actions and support route.</span></button>
      </div>
      <div class="pbi-builder-v2-director">
        <textarea id="pbiSiteDirectorPrompt" class="textarea" placeholder="Example: mobile mechanic in Poole, urgent callouts, quote requests, trust proof, service area and simple booking route."></textarea>
        <div class="pbi-builder-v2-director-controls">
          <select id="pbiSiteDirectorGoal" class="select">
            <option value="enquiries">Enquiries</option>
            <option value="bookings">Bookings</option>
            <option value="calls">Phone calls</option>
            <option value="shop">Shop orders</option>
            <option value="courses">Course signups</option>
          </select>
          <button type="button" data-v2-apply="full-site">Generate full site</button>
          <button type="button" data-v2-apply="feature-from-prompt">Build feature</button>
          <button type="button" data-v2-apply="redesign">Redesign page</button>
          <button type="button" data-v2-apply="brand">Apply brand everywhere</button>
        </div>
        <div class="pbi-builder-v2-director-controls">
          <select id="pbiBusinessApp" class="select">
            <option value="quote">Quote flow</option>
            <option value="bookings">Booking flow</option>
            <option value="shop">Shop flow</option>
            <option value="courses">Course flow</option>
            <option value="proof">Proof stack</option>
            <option value="menu">Menu / reservations</option>
            <option value="service-area">Service area</option>
          </select>
          <button type="button" data-v2-apply="business-app">Add business app</button>
          <button type="button" data-v2-apply="mobile">Improve mobile</button>
          <button type="button" data-v2-apply="audit">Audit & fix basics</button>
        </div>
      </div>
      <div class="pbi-builder-v2-selected-tools">
        <div>
          <p class="eyebrow">Selected section</p>
          <strong data-v2-selected-label>${esc(selectedSectionLabel(selectedBlock()))}</strong>
        </div>
        <button type="button" data-v2-apply="selected-improve">Improve selected</button>
        <button type="button" data-v2-apply="selected-premium">Premium polish</button>
        <button type="button" data-v2-apply="selected-convert">Sharpen CTA</button>
        <button type="button" data-v2-apply="selected-mobile">Mobile safe</button>
        <button type="button" data-v2-apply="selected-desktop">Desktop only</button>
        <button type="button" data-v2-apply="selected-show-all">Show all</button>
      </div>
      <div class="pbi-builder-v2-smart-sections">
        ${Object.entries(SMART_SECTIONS).map(([key, section]) => `
          <button type="button" data-v2-apply="smart-${esc(key)}">
            <strong>${esc(section.title)}</strong>
            <span>${esc(section.type)}</span>
          </button>
        `).join('')}
      </div>
      <div class="pbi-builder-v2-brief">
        <input id="pbiActionBusiness" class="input" placeholder="Business name" value="${esc(businessName(state) === 'this business' ? '' : businessName(state))}">
        <input id="pbiActionLocation" class="input" placeholder="Town or area" value="${esc(state.location || '')}">
        <select id="pbiActionGoal" class="select">
          <option value="enquiries">Enquiries</option>
          <option value="bookings">Bookings</option>
          <option value="calls">Phone calls</option>
          <option value="shop">Shop orders</option>
          <option value="courses">Course signups</option>
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
    const refreshSelectedLabel = () => {
      const label = $('[data-v2-selected-label]', panel);
      if (label) label.textContent = selectedSectionLabel(selectedBlock());
    };
    $$('[data-v2-apply]', panel).forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.busy === '1') return;
        const action = button.dataset.v2Apply;
        button.dataset.busy = '1';
        button.disabled = true;
        try {
          if (action === 'brief') applyBrief();
          if (action === 'homepage') prepareHomepage();
          if (action === 'seo') writeSeoBasics();
          if (action === 'faq') addFaq();
          if (action === 'publish') preparePublish();
          if (action === 'full-site') generateFullSite();
          if (action === 'redesign') redesignCurrentPage();
          if (action === 'feature-from-prompt') buildFeatureFromPrompt();
          if (action === 'brand') applyBrandEverywhere();
          if (action === 'business-app') addBusinessApp();
          if (action === 'mobile') tuneMobile();
          if (action === 'audit') auditAndFixBasics();
          if (action === 'harmony-autopilot') harmonyAutopilot();
          if (action === 'business-system') installBusinessSystem();
          if (action === 'local-seo-pages') addLocalSeoPages();
          if (action === 'responsive-sweep') responsiveSweep();
          if (action === 'accessibility-sweep') accessibilitySweep();
          if (action === 'customer-dashboard') prepareCustomerDashboard();
          if (action === 'selected-improve') improveSelectedSection();
          if (action === 'selected-premium') premiumSelectedSection();
          if (action === 'selected-convert') conversionSelectedSection();
          if (action === 'selected-mobile') mobileSelectedSection();
          if (action === 'selected-desktop') setSelectedVisibility('desktop');
          if (action === 'selected-show-all') setSelectedVisibility('all');
          if (action.startsWith('smart-')) addSmartSection(action.replace(/^smart-/, ''));
          window.dispatchEvent(new CustomEvent('pbi:builder-v2-action', { detail: { action } }));
          refreshSelectedLabel();
        } catch (err) {
          flash(err?.message || 'That action could not be applied.');
        } finally {
          window.setTimeout(() => {
            button.dataset.busy = '0';
            button.disabled = false;
          }, 350);
        }
      });
    });
    document.addEventListener('click', () => window.setTimeout(refreshSelectedLabel, 100), true);
    window.addEventListener('pbi:builder-v2-updated', refreshSelectedLabel);
    window.addEventListener('pbi:goose-command', (event) => {
      const command = event.detail?.command;
      if (command === 'autopilot') harmonyAutopilot();
      if (command === 'business-system') installBusinessSystem();
      if (command === 'local-seo') addLocalSeoPages();
      if (command === 'responsive') responsiveSweep();
      if (command === 'accessibility') accessibilitySweep();
      if (command === 'feature') buildFeatureFromPrompt();
      if (command === 'dashboard') prepareCustomerDashboard();
      refreshSelectedLabel();
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
