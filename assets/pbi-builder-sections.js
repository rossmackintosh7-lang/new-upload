(() => {
  const params = new URLSearchParams(location.search);
  const projectId = params.get('project') || params.get('project_id') || 'draft';
  const storageKey = `pbi_sections_${projectId}`;
  const planRank = { starter: 1, business: 2, plus: 3 };
  const builtInTypes = ['hero', 'splitHero', 'trustBand', 'services', 'process', 'featureGrid', 'stats', 'gallery', 'testimonial', 'faq', 'contact', 'retail', 'cta'];

  function cleanPlan(value) { value = String(value || '').toLowerCase(); return planRank[value] ? value : 'starter'; }
  function activePlan() { return cleanPlan(params.get('plan') || localStorage.getItem('pbiSelectedPlan') || window.PBISelectedPlan || document.body.dataset.plan || 'starter'); }
  function sectionMinPlan(type) {
    return ({ gallery: 'business', featureGrid: 'business', stats: 'business', cta: 'business', testimonial: 'plus', faq: 'plus', retail: 'plus' })[type] || 'starter';
  }
  function planAllows(min) { return planRank[activePlan()] >= planRank[cleanPlan(min)]; }
  function filterSectionsForPlan(input) {
    const plan = activePlan();
    const filtered = (input || []).filter((section) => planAllows(sectionMinPlan(section.section_type || section.type)));
    if (plan === 'starter') filtered.forEach((section) => { if (section.section_type !== 'hero' && section.section_type !== 'splitHero') section.image = ''; });
    return filtered;
  }

  let sections = [];
  let selected = null;
  let dragId = null;
  let saveTimer = null;
  let previewTimer = null;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function uid(prefix = 's') { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }

  function safeJson(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (_) { return {}; }
  }

  function toBodyJson(value) {
    try { return JSON.stringify(value || {}); } catch (_) { return '{}'; }
  }

  function normaliseTemplateKey(key) {
    const value = String(key || '').toLowerCase().trim();
    if (['cafe', 'trades', 'salon', 'consultant', 'shop', 'holiday-let'].includes(value)) return value;
    if (value.includes('holiday')) return 'holiday-let';
    if (value.includes('trade')) return 'trades';
    if (value.includes('retail') || value.includes('shop')) return 'shop';
    if (value.includes('salon') || value.includes('beauty')) return 'salon';
    if (value.includes('cafe') || value.includes('food') || value.includes('restaurant')) return 'cafe';
    return 'consultant';
  }

  function templateKey() {
    const checked = document.querySelector('input[name="templateStyle"]:checked,input[name="template_key"]:checked,input[name="template"]:checked');
    if (checked?.value) return normaliseTemplateKey(checked.value);
    const any = document.querySelector('[name="template_key"],#templateKey,#template');
    if (any?.value) return normaliseTemplateKey(any.value);
    return normaliseTemplateKey(params.get('template') || params.get('template_key') || 'consultant');
  }

  function imageFor(key) {
    return {
      cafe: '/assets/demo-media/cafe-hero.jpg',
      trades: '/assets/demo-media/trades-hero.jpg',
      salon: '/assets/demo-media/salon-hero.jpg',
      consultant: '/assets/demo-media/consultant-hero.jpg',
      shop: '/assets/demo-media/shop-hero.jpg',
      'holiday-let': '/assets/demo-media/holiday-let-hero.jpg'
    }[key] || '/assets/demo-media/consultant-hero.jpg';
  }

  function galleryFor(key) {
    return {
      cafe: ['/assets/demo-media/cafe-1.jpg', '/assets/demo-media/cafe-2.jpg', '/assets/demo-media/cafe-3.jpg'],
      trades: ['/assets/demo-media/trades-1.jpg', '/assets/demo-media/trades-2.jpg', '/assets/demo-media/trades-3.jpg'],
      salon: ['/assets/demo-media/salon-1.jpg', '/assets/demo-media/salon-2.jpg', '/assets/demo-media/salon-3.jpg'],
      consultant: ['/assets/demo-media/consultant-1.jpg', '/assets/demo-media/consultant-2.jpg', '/assets/demo-media/consultant-3.jpg'],
      shop: ['/assets/demo-media/shop-1.jpg', '/assets/demo-media/shop-2.jpg', '/assets/demo-media/shop-3.jpg'],
      'holiday-let': ['/assets/demo-media/holiday-let-1.jpg', '/assets/demo-media/holiday-let-2.jpg', '/assets/demo-media/holiday-let-3.jpg']
    }[key] || [];
  }

  function setLinkedStatus(message) {
    const el = $('pbiLinkedStatus');
    if (el) el.textContent = message || `Linked project: ${projectId}`;
  }

  function status(message, type = 'success') {
    const el = $('pbiSectionEditorStatus');
    if (!el) return;
    el.style.display = 'block';
    el.className = `notice ${type}`;
    el.textContent = message;
    clearTimeout(el.__pbiTimer);
    el.__pbiTimer = setTimeout(() => { if (el.textContent === message) el.style.display = 'none'; }, 3800);
  }

  function saveLocal() { localStorage.setItem(storageKey, JSON.stringify(sections)); }
  function scheduleCloudSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveCloud(true), 850); }
  function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(preview, 20); }

  function applyPresetToForm(key) {
    const api = window.PBITemplatePresets;
    const preset = api?.get ? api.get(key) : null;
    if (!preset) return;
    const pairs = {
      projectName: preset.projectName,
      businessName: preset.businessName,
      pageMainHeading: preset.pageMainHeading,
      subHeading: preset.subHeading,
      accentColor: preset.accent,
      backgroundColor: preset.background,
      textColor: preset.text,
      navColor: preset.nav,
      buttonColor: preset.button,
      ctaButtonText: preset.ctaButtonText,
      ctaButtonAction: preset.ctaButtonAction,
      ctaButtonPage: preset.ctaButtonPage,
      ctaButtonDestination: preset.ctaButtonDestination,
      subdomainSlug: preset.subdomainSlug
    };
    Object.entries(pairs).forEach(([id, value]) => {
      const el = $(id);
      if (el && value !== undefined && value !== null) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    if ($('retailEnabled') && key === 'shop') {
      $('retailEnabled').value = 'true';
      $('retailEnabled').dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function paletteFor(key) {
    const preset = window.PBITemplatePresets?.get?.(key) || {};
    const accent = preset.accent || (key === 'trades' ? '#256b5b' : key === 'holiday-let' ? '#238081' : '#bf5c29');
    const background = preset.background || (key === 'shop' ? '#fff8cf' : '#fff8f1');
    const deep = key === 'trades' ? '#173f35' : key === 'holiday-let' ? '#173f45' : key === 'shop' ? '#261c05' : '#2b1a12';
    return { accent, background, deep, soft: key === 'trades' ? '#f3f7f4' : key === 'holiday-let' ? '#edf6f5' : '#f6efe7' };
  }

  function richSections(key) {
    const preset = window.PBITemplatePresets?.get?.(key) || {};
    const p = paletteFor(key);
    const business = preset.businessName || 'Your business';
    const services = (preset.servicesList?.length ? preset.servicesList : ['Signature service', 'Customer support', 'Easy next step']);
    const features = (preset.featureBullets?.length ? preset.featureBullets : ['Clear message', 'Trust built quickly', 'Mobile-first journey', 'Easy enquiry route']);
    const pages = preset.pages || {};
    const gallery = preset.galleryImages?.length ? preset.galleryImages : galleryFor(key);

    const serviceCards = services.map((title) => ({ title, text: cardTextFor(key, title), icon: iconFor(title) }));
    const featureCards = features.map((title) => ({ title, text: featureTextFor(title), icon: '✓' }));

    const out = [
      normaliseSection({ id: `${key}_hero`, section_type: 'splitHero', type: 'splitHero', title: preset.pageMainHeading || `${business} made clear, useful and easy to choose.`, text: preset.subHeading || 'A polished website that explains the offer, builds trust and gives customers one obvious next step.', button: preset.ctaButtonText || 'Get started', image: preset.heroImage || imageFor(key), layout: 'split', background: p.background, accent: p.accent, padding: 'spacious', align: 'left', body_json: toBodyJson({ eyebrow: preset.tagline || 'Local website preview', visual: 'framed' }) }),
      normaliseSection({ id: `${key}_trust`, section_type: 'trustBand', type: 'trustBand', title: 'Built for quick customer confidence', text: features.slice(0, 4).join('|'), button: '', image: '', layout: 'cards', background: '#ffffff', accent: p.accent, padding: 'compact', align: 'center', body_json: toBodyJson({ stats: trustStatsFor(key) }) }),
      normaliseSection({ id: `${key}_services`, section_type: 'services', type: 'services', title: pages.services?.title || 'What customers can do here', text: serviceCards.map((c) => `${c.title}::${c.text}`).join('|'), button: 'View services', image: '', layout: 'cards', background: p.soft, accent: p.accent, padding: 'comfortable', align: 'left', body_json: toBodyJson({ cards: serviceCards, cardStyle: 'elevated' }) }),
      normaliseSection({ id: `${key}_process`, section_type: 'process', type: 'process', title: 'A simple route from interest to action', text: processFor(key).map((c) => `${c.title}::${c.text}`).join('|'), button: '', image: '', layout: 'cards', background: p.background, accent: p.accent, padding: 'comfortable', align: 'left', body_json: toBodyJson({ steps: processFor(key) }) }),
      normaliseSection({ id: `${key}_features`, section_type: 'featureGrid', type: 'featureGrid', title: 'Why this layout converts better', text: featureCards.map((c) => `${c.title}::${c.text}`).join('|'), button: '', image: '', layout: 'cards', background: '#ffffff', accent: p.accent, padding: 'comfortable', align: 'left', body_json: toBodyJson({ cards: featureCards, cardStyle: 'glass' }) }),
      normaliseSection({ id: `${key}_gallery`, section_type: 'gallery', type: 'gallery', title: pages.gallery?.title || 'A visual feel for the business', text: gallery.join('|'), button: '', image: gallery[0] || imageFor(key), layout: 'cards', background: p.soft, accent: p.accent, padding: 'comfortable', align: 'center', body_json: toBodyJson({ captions: preset.galleryCaptions || ['Real work', 'Customer experience', 'Business detail'] }) }),
      normaliseSection({ id: `${key}_testimonial`, section_type: 'testimonial', type: 'testimonial', title: 'Proof that feels human', text: testimonialFor(key), button: '', image: '', layout: 'centered', background: p.deep, accent: '#f2b66d', padding: 'spacious', align: 'center' }),
      normaliseSection({ id: `${key}_faq`, section_type: 'faq', type: 'faq', title: 'Helpful answers before customers ask', text: faqFor(key).map((f) => `${f.q}|${f.a}`).join('\n'), button: 'Ask a question', image: '', layout: 'standard', background: p.background, accent: p.accent, padding: 'comfortable', align: 'left', body_json: toBodyJson({ items: faqFor(key) }) }),
      normaliseSection({ id: `${key}_contact`, section_type: 'contact', type: 'contact', title: pages.contact?.title || 'Make the next step simple', text: pages.contact?.body || 'Add address, opening hours, phone, email and the best way for customers to make an enquiry.', button: preset.ctaButtonText || 'Contact us', image: preset.heroImage || imageFor(key), layout: 'split', background: '#ffffff', accent: p.accent, padding: 'comfortable', align: 'left' }),
      normaliseSection({ id: `${key}_cta`, section_type: 'cta', type: 'cta', title: 'Ready to launch something customers understand?', text: 'Keep building for free, then choose the right package only when the website is ready to publish.', button: 'Continue to publish', image: '', layout: 'centered', background: p.accent, accent: '#ffffff', padding: 'spacious', align: 'center' })
    ];

    if (key === 'shop') {
      out.splice(3, 0, normaliseSection({ id: `${key}_retail`, section_type: 'retail', type: 'retail', title: 'Featured products customers can understand quickly', text: 'Local favourite - £12::Short product highlight|Gift bundle - £24::Good for gifting or repeat orders|Seasonal pick - £18::Limited or current offer', button: 'Shop now', image: imageFor(key), layout: 'cards', background: '#fff8cf', accent: '#111111', padding: 'comfortable', align: 'left' }));
    }
    return out;
  }

  function cardTextFor(key, title) {
    const lower = String(title || '').toLowerCase();
    if (key === 'cafe') return 'Clear menu detail, opening times and reasons to visit without making people hunt.';
    if (key === 'trades') return 'Explains the service area, common jobs, trust points and how to request a quote.';
    if (key === 'salon') return 'Presents treatments, style, booking route and customer reassurance in one calm card.';
    if (key === 'shop') return 'Highlights what is available, who it suits and why it is worth buying.';
    if (key === 'holiday-let') return 'Shows what guests get, what makes the stay special and how to enquire.';
    if (lower.includes('system')) return 'Shows practical outcomes, not just vague consultancy wording.';
    return 'Turns the offer into a clear customer benefit with an easy next step.';
  }

  function featureTextFor(title) { return `A focused proof point around ${String(title || 'the service').toLowerCase()}, written for scanning on mobile.`; }
  function iconFor(title) { return /coffee|food|pastr|lunch/i.test(title) ? '☕' : /repair|boiler|bath|emergency|install/i.test(title) ? '🔧' : /hair|beauty|wellness/i.test(title) ? '✦' : /product|shop|gift/i.test(title) ? '◈' : '✓'; }
  function trustStatsFor(key) {
    if (key === 'cafe') return [{ value: 'Menu', label: 'easy to scan' }, { value: 'Bookings', label: 'one clear route' }, { value: 'Local', label: 'story built in' }];
    if (key === 'trades') return [{ value: 'Services', label: 'clear from first scroll' }, { value: 'Quotes', label: 'easy to request' }, { value: 'Trust', label: 'front and centre' }];
    if (key === 'shop') return [{ value: 'Products', label: 'cleanly presented' }, { value: 'Checkout', label: 'ready to connect' }, { value: 'Support', label: 'simple contact route' }];
    return [{ value: 'Offer', label: 'clear in seconds' }, { value: 'Proof', label: 'built into the page' }, { value: 'Action', label: 'easy to take' }];
  }
  function processFor(key) {
    if (key === 'shop') return [{ title: 'Browse', text: 'Show products and simple categories.' }, { title: 'Choose', text: 'Explain what suits each customer.' }, { title: 'Buy', text: 'Send them into a clear checkout route.' }];
    if (key === 'holiday-let') return [{ title: 'See the stay', text: 'Lead with the feeling of the place.' }, { title: 'Check the details', text: 'Show amenities, location and suitability.' }, { title: 'Enquire', text: 'Make dates and booking simple.' }];
    return [{ title: 'Understand', text: 'Customers see what you do quickly.' }, { title: 'Trust', text: 'Proof and useful details remove hesitation.' }, { title: 'Act', text: 'The next step is obvious on every device.' }];
  }
  function testimonialFor(key) {
    if (key === 'trades') return '“The website makes it obvious what areas are covered and how to get a quote. It feels professional without overcomplicating things.”';
    if (key === 'cafe') return '“The page feels warm, local and easy to use. The menu, location and booking route are exactly where customers expect them.”';
    if (key === 'shop') return '“Products are easier to understand, and the page gives customers confidence before they buy.”';
    return '“Clear, useful and easy to navigate. The website explains the offer properly and makes the next step simple.”';
  }
  function faqFor(key) {
    if (key === 'shop') return [{ q: 'Can customers buy online?', a: 'Yes, retail sections can connect into the shop and checkout tools when the Plus package is active.' }, { q: 'Can products be changed later?', a: 'Yes, products, wording and sections can be edited as the business changes.' }, { q: 'Do I pay before building?', a: 'No, customers can build first and pay when they are ready to publish.' }];
    return [{ q: 'Can this be edited later?', a: 'Yes, sections can be changed, reordered, hidden or expanded.' }, { q: 'Does the preview work on mobile?', a: 'Yes, the layout is designed for desktop and mobile viewing.' }, { q: 'When do I pay?', a: 'Build free, then choose a package when you are ready to publish.' }];
  }

  function fallbackSections(key) { return richSections(key); }

  async function load(force = false) {
    ensure();
    const key = templateKey();
    setLinkedStatus(`Linked project: ${projectId} · Template: ${key} · Package: ${activePlan()} · Visual edit enabled`);
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (Array.isArray(cached) && cached.length) {
          sections = filterSectionsForPlan(cached.map(normaliseSection));
          selected = sections[0]?.id || null;
          render(); preview(); return;
        }
      } catch (_) {}
    }
    applyPresetToForm(key);
    try {
      const response = await fetch('/api/builder/template-sections', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, template_key: key, force, plan: activePlan(), richness: 'premium' })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.sections)) throw new Error(data.message || data.error || 'Template sections could not load.');
      sections = filterSectionsForPlan(data.sections.map(normaliseSection));
      selected = sections[0]?.id || null;
      saveLocal(); render(); preview();
      status(force ? 'Premium template reloaded into the visual editor.' : 'Premium template loaded into the visual editor.');
    } catch (error) {
      sections = filterSectionsForPlan(fallbackSections(key).map(normaliseSection));
      selected = sections[0]?.id || null;
      saveLocal(); render(); preview();
      status(error.message || 'Using local premium template fallback.', 'info');
    }
  }

  function normaliseSection(section, index = 0) {
    const type = section.section_type || section.type || 'section';
    const bodyJson = safeJson(section.body_json);
    return {
      id: String(section.id || uid('section')),
      section_order: Number.isFinite(Number(section.section_order)) ? Number(section.section_order) : index,
      section_type: type,
      type,
      title: section.title || '',
      text: section.text ?? section.body ?? '',
      button: section.button || '',
      image: section.image || '',
      layout: section.layout || (['services', 'featureGrid', 'retail', 'gallery', 'process', 'trustBand', 'stats'].includes(type) ? 'cards' : 'standard'),
      background: section.background || '#fff8f1',
      accent: section.accent || '#bf5c29',
      padding: section.padding || 'comfortable',
      align: section.align || 'left',
      hidden: Boolean(Number(section.hidden || 0)),
      body_json: toBodyJson(bodyJson)
    };
  }

  async function saveCloud(quiet = false) {
    sections = filterSectionsForPlan(sections);
    saveLocal();
    try {
      const response = await fetch('/api/builder/project-sections', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, plan: activePlan(), sections: filterSectionsForPlan(sections).map((s, i) => ({ ...s, section_order: i })) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.message || data.error || 'Sections could not save.');
      if (!quiet) status(`Saved ${sections.length} visual sections.`);
      return true;
    } catch (error) {
      if (!quiet) status(error.message || 'Sections saved locally, but cloud save failed.', 'error');
      return false;
    }
  }

  async function publish() {
    const saved = await saveCloud(false);
    if (!saved) return;
    try {
      const response = await fetch('/api/builder/publish-sections', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, plan: activePlan() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.message || data.error || 'Publish snapshot failed.');
      status(`Published ${data.sections_published ?? sections.length} sections to the live snapshot.`);
    } catch (error) { status(error.message || 'Publish snapshot failed.', 'error'); }
  }

  function ensure() {
    let box = $('pbiTemplateSectionEditor');
    if (!box) {
      box = document.createElement('section');
      box.id = 'pbiTemplateSectionEditor';
      box.className = 'card pbi-template-section-editor pbi-unified-builder';
      box.innerHTML = '<div class="pbi-section-editor-head"><div><p class="eyebrow">Website setup</p><h2>Build from one connected workspace</h2><p id="pbiLinkedStatus" class="small-note"></p></div><div class="pbi-section-editor-actions"><button class="btn-ghost" id="pbiReloadSections" type="button">Reload template</button><button class="btn-ghost" id="pbiSaveSections" type="button">Save sections</button><button class="btn" id="pbiPublishSections" type="button">Apply & publish sections</button></div></div><div class="pbi-section-editor-grid"><div><h3>Sections</h3><div id="pbiSectionList" class="pbi-section-list"></div><div class="pbi-add-section-row"><select id="pbiAddSectionType"></select><button class="btn-ghost" id="pbiAddSectionBtn" type="button">Add section</button></div></div><div><h3>Selected section</h3><div id="pbiSectionInspector"></div></div></div><div id="pbiSectionEditorStatus" class="notice" style="display:none;margin-top:16px"></div>';
      (document.querySelector('main .container') || document.querySelector('main') || document.body).prepend(box);
    }
    ensurePremiumActions(box);
    syncAddSectionOptions();
    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      $('pbiReloadSections')?.addEventListener('click', () => load(true));
      $('pbiSaveSections')?.addEventListener('click', () => saveCloud(false));
      $('pbiPublishSections')?.addEventListener('click', publish);
      $('pbiAddSectionBtn')?.addEventListener('click', addSection);
    }
  }

  function ensurePremiumActions(box) {
    const actions = box.querySelector('.pbi-section-editor-actions');
    if (!actions || actions.dataset.pbiPremiumBound) return;
    actions.dataset.pbiPremiumBound = '1';
    actions.insertAdjacentHTML('afterbegin', `
      <a class="btn-ghost pbi-canvas-studio-link" href="/canvas-builder/?project=${encodeURIComponent(projectId)}">Open Visual Studio</a>
      <button class="btn-ghost" id="pbiSmartPolishBtn" type="button">Smart polish</button>
      <button class="btn-ghost" id="pbiPremiumPackBtn" type="button">Add premium flow</button>
    `);
    $('pbiSmartPolishBtn')?.addEventListener('click', smartPolish);
    $('pbiPremiumPackBtn')?.addEventListener('click', addPremiumFlow);
  }

  function syncAddSectionOptions() {
    const select = $('pbiAddSectionType');
    if (!select) return;
    const labels = { hero: 'Hero', splitHero: 'Split hero', trustBand: 'Trust band', services: 'Services', process: 'Process', featureGrid: 'Feature grid', stats: 'Stats strip', gallery: 'Gallery', testimonial: 'Testimonial', faq: 'FAQ', contact: 'Contact', retail: 'Retail', cta: 'CTA' };
    const current = select.value;
    select.innerHTML = builtInTypes.map((type) => `<option value="${type}" data-plan-min="${sectionMinPlan(type)}">${labels[type] || type}</option>`).join('');
    if (current && builtInTypes.includes(current)) select.value = current;
  }

  function updatePackageOptions() {
    document.body.dataset.plan = activePlan();
    syncAddSectionOptions();
    const select = $('pbiAddSectionType');
    if (select) {
      [...select.options].forEach((option) => {
        const min = option.dataset.planMin || sectionMinPlan(option.value);
        const allowed = planAllows(min);
        option.disabled = !allowed;
        option.hidden = !allowed;
      });
      if (select.selectedOptions[0]?.disabled) select.value = 'hero';
    }
    document.querySelectorAll('input[name="templateStyle"][value="shop"]').forEach((input) => {
      const label = input.closest('label');
      const allowed = planAllows('plus');
      input.disabled = !allowed;
      if (label) label.classList.toggle('pbi-plan-locked', !allowed);
      if (!allowed && input.checked) {
        const fallback = document.querySelector('input[name="templateStyle"][value="consultant"],input[name="templateStyle"][value="cafe"]');
        if (fallback) fallback.checked = true;
      }
    });
  }

  function render() {
    ensure(); updatePackageOptions();
    const list = $('pbiSectionList');
    if (!list) return;
    list.innerHTML = sections.map((section, index) => `
      <div class="pbi-section-row ${section.id === selected ? 'active' : ''} ${section.hidden ? 'is-hidden' : ''}" draggable="true" data-id="${esc(section.id)}">
        <button type="button" data-select="${esc(section.id)}"><em>${index + 1}</em><strong>${esc(section.title || section.section_type)}</strong><span>${esc(section.section_type)} · ${esc(section.layout || 'standard')}${section.hidden ? ' · hidden' : ''}</span></button>
        <div class="pbi-section-row-actions">
          <button type="button" data-up="${esc(section.id)}">↑</button><button type="button" data-down="${esc(section.id)}">↓</button><button type="button" data-copy="${esc(section.id)}">Copy</button><button type="button" data-hide="${esc(section.id)}">${section.hidden ? 'Show' : 'Hide'}</button><button type="button" data-delete="${esc(section.id)}">Remove</button>
        </div>
      </div>`).join('');
    list.querySelectorAll('[data-select]').forEach((button) => button.addEventListener('click', () => { selected = button.dataset.select; render(); scrollPreviewToSelected(); }));
    list.querySelectorAll('[data-up]').forEach((button) => button.addEventListener('click', () => moveSection(button.dataset.up, -1)));
    list.querySelectorAll('[data-down]').forEach((button) => button.addEventListener('click', () => moveSection(button.dataset.down, 1)));
    list.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', () => copySection(button.dataset.copy)));
    list.querySelectorAll('[data-hide]').forEach((button) => button.addEventListener('click', () => toggleHidden(button.dataset.hide)));
    list.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteSection(button.dataset.delete)));
    list.querySelectorAll('[draggable]').forEach((row) => {
      row.addEventListener('dragstart', () => { dragId = row.dataset.id; row.classList.add('is-dragging'); });
      row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
      row.addEventListener('dragover', (event) => event.preventDefault());
      row.addEventListener('drop', (event) => { event.preventDefault(); reorder(dragId, row.dataset.id); });
    });
    renderInspector();
  }

  function renderInspector() {
    const section = sections.find((item) => item.id === selected);
    const target = $('pbiSectionInspector');
    if (!target) return;
    if (!section) { target.innerHTML = '<p class="small-note muted">Select a section to edit it.</p>'; return; }
    const rich = safeJson(section.body_json);
    const cards = rich.cards || rich.steps || rich.stats || rich.items || cardsFromText(section);
    target.innerHTML = `
      <div class="pbi-inspector-minihead"><strong>${esc(section.section_type)}</strong><span>Live preview edits update as you type.</span></div>
      <label>Title</label><input id="sTitle" class="input" value="${esc(section.title)}">
      <label>Text</label><textarea id="sText" class="textarea" rows="5">${esc(section.text)}</textarea>
      <label>Button</label><input id="sButton" class="input" value="${esc(section.button)}">
      <div class="pbi-rich-card-editor"><label>Cards / steps / FAQs</label>${cards.slice(0, 8).map((card, index) => `<div class="pbi-rich-card-row"><input class="input" data-rich-title="${index}" value="${esc(card.title || card.q || card.value || '')}" placeholder="Title"><textarea class="textarea" data-rich-text="${index}" rows="2" placeholder="Detail">${esc(card.text || card.a || card.label || '')}</textarea></div>`).join('')}</div>
      ${planAllows('business') ? `<label>Image URL</label><input id="sImage" class="input" value="${esc(section.image)}"><label>Upload image</label><input id="sUpload" class="input" type="file" accept="image/*"><div id="sUploadStatus" class="small-note muted"></div>` : `<div class="notice domain-info">Image controls unlock on the Business package.</div>`}
      ${planAllows('plus') ? `<div class="grid-2"><div><label>Layout</label><select id="sLayout" class="select">${['standard', 'split', 'centered', 'cards', 'fullBleed', 'masonry', 'spotlight'].map((value) => `<option value="${value}" ${section.layout === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div><label>Padding</label><select id="sPadding" class="select">${['compact', 'comfortable', 'spacious'].map((value) => `<option value="${value}" ${section.padding === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div></div><div class="grid-2"><div><label>Background</label><input id="sBg" class="input" type="color" value="${esc(section.background || '#fff8f1')}"></div><div><label>Accent</label><input id="sAccent" class="input" type="color" value="${esc(section.accent || '#bf5c29')}"></div></div><label>Alignment</label><select id="sAlign" class="select">${['left', 'center', 'right'].map((value) => `<option value="${value}" ${section.align === value ? 'selected' : ''}>${value}</option>`).join('')}</select>` : `<div class="notice domain-info">Advanced layout, colour and alignment controls unlock on the Plus package.</div>`}
      <button class="btn" id="sApply" type="button">Apply to preview</button>`;
    const fields = [['sTitle', 'title'], ['sText', 'text'], ['sButton', 'button'], ['sImage', 'image'], ['sLayout', 'layout'], ['sPadding', 'padding'], ['sBg', 'background'], ['sAccent', 'accent'], ['sAlign', 'align']];
    fields.forEach(([id, key]) => {
      const input = $(id); if (!input) return;
      ['input', 'change'].forEach((eventName) => input.addEventListener(eventName, () => { section[key] = input.value; saveLocal(); schedulePreview(); scheduleCloudSave(); }));
    });
    target.querySelectorAll('[data-rich-title],[data-rich-text]').forEach((input) => input.addEventListener('input', () => {
      const index = Number(input.dataset.richTitle ?? input.dataset.richText);
      const current = cards[index] || {};
      if (input.dataset.richTitle !== undefined) current.title = current.q = current.value = input.value;
      if (input.dataset.richText !== undefined) current.text = current.a = current.label = input.value;
      cards[index] = current;
      const richNext = safeJson(section.body_json);
      if (section.section_type === 'faq') richNext.items = cards.map((c) => ({ q: c.q || c.title || c.value || '', a: c.a || c.text || c.label || '' }));
      else if (section.section_type === 'trustBand' || section.section_type === 'stats') richNext.stats = cards.map((c) => ({ value: c.value || c.title || c.q || '', label: c.label || c.text || c.a || '' }));
      else if (section.section_type === 'process') richNext.steps = cards.map((c) => ({ title: c.title || c.q || c.value || '', text: c.text || c.a || c.label || '' }));
      else richNext.cards = cards.map((c) => ({ title: c.title || c.q || c.value || '', text: c.text || c.a || c.label || '', icon: c.icon || '✓' }));
      section.body_json = toBodyJson(richNext);
      section.text = cardsToText(section, cards);
      if ($('sText')) $('sText').value = section.text;
      saveLocal(); schedulePreview(); scheduleCloudSave();
    }));
    $('sApply')?.addEventListener('click', () => { saveLocal(); render(); preview(); scheduleCloudSave(); status('Preview updated.'); });
    $('sUpload')?.addEventListener('change', (event) => uploadImage(event.target.files?.[0], section));
  }

  function cardsFromText(section) {
    const raw = String(section.text || '').split(section.section_type === 'faq' ? '\n' : '|').map((value) => value.trim()).filter(Boolean);
    return raw.map((row) => {
      const parts = row.includes('::') ? row.split('::') : row.split('|');
      if (section.section_type === 'faq') return { q: parts[0] || row, a: parts.slice(1).join('|') || '' };
      return { title: parts[0] || row, text: parts.slice(1).join('::') || 'Add a short detail for this item.', icon: '✓' };
    });
  }

  function cardsToText(section, cards) {
    if (section.section_type === 'faq') return cards.map((c) => `${c.q || c.title || ''}|${c.a || c.text || ''}`).join('\n');
    return cards.map((c) => `${c.title || c.value || c.q || ''}::${c.text || c.label || c.a || ''}`).join('|');
  }

  async function uploadImage(file, section) {
    if (!file) return;
    if (!planAllows('business')) { status('Image uploads unlock on the Business package.', 'error'); return; }
    const st = $('sUploadStatus'); if (st) st.textContent = 'Uploading image...';
    try {
      const form = new FormData(); form.append('image', file); form.append('project_id', projectId); form.append('plan', activePlan());
      const response = await fetch('/api/builder/upload-image', { method: 'POST', credentials: 'include', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.message || data.error || 'Upload failed.');
      section.image = data.url; if ($('sImage')) $('sImage').value = data.url; saveLocal(); preview(); scheduleCloudSave();
      if (st) st.textContent = data.mode === 'data-url' ? 'Image added locally. R2 will store uploads when the binding is live.' : 'Image uploaded.';
    } catch (error) { if (st) st.textContent = error.message || 'Upload failed.'; }
  }

  function makeSection(type) {
    const key = templateKey(); const p = paletteFor(key);
    const source = richSections(key).find((section) => section.section_type === type) || { section_type: type, type, title: `New ${type} section`, text: 'Add clear customer-focused wording here.', button: ['hero', 'splitHero', 'cta', 'contact'].includes(type) ? 'Get in touch' : '', image: '', layout: ['services', 'featureGrid', 'retail', 'gallery', 'process', 'trustBand', 'stats'].includes(type) ? 'cards' : 'standard', background: p.background, accent: p.accent, padding: 'comfortable', align: 'left' };
    return normaliseSection({ ...source, id: uid('section') }, sections.length);
  }

  function addSection() {
    const type = $('pbiAddSectionType')?.value || 'featureGrid';
    const min = sectionMinPlan(type);
    if (!planAllows(min)) { status(`${type} sections unlock on the ${min === 'plus' ? 'Plus' : 'Business'} package.`, 'error'); return; }
    const section = makeSection(type);
    sections.push(section); selected = section.id;
    saveLocal(); render(); preview(); scheduleCloudSave();
  }

  function addPremiumFlow() {
    const wanted = ['trustBand', 'process', 'featureGrid', 'testimonial', 'faq', 'cta'].filter((type) => planAllows(sectionMinPlan(type)));
    wanted.forEach((type) => sections.push(makeSection(type)));
    selected = sections[sections.length - 1]?.id || selected;
    saveLocal(); render(); preview(); scheduleCloudSave();
    status('Premium conversion flow added to the page.');
  }

  function smartPolish() {
    const key = templateKey(); const p = paletteFor(key);
    const pattern = [p.background, '#ffffff', p.soft, '#ffffff', p.background, p.deep, p.background, '#ffffff', p.accent];
    sections.forEach((section, index) => {
      section.padding = index === 0 || section.section_type === 'cta' ? 'spacious' : 'comfortable';
      section.background = pattern[index % pattern.length] || p.background;
      section.accent = section.background === p.deep ? '#f2b66d' : section.section_type === 'cta' ? '#ffffff' : p.accent;
      if (['hero', 'splitHero', 'contact'].includes(section.section_type)) section.layout = 'split';
      if (['services', 'featureGrid', 'process', 'trustBand', 'stats', 'retail'].includes(section.section_type)) section.layout = 'cards';
      if (section.section_type === 'testimonial' || section.section_type === 'cta') section.align = 'center';
    });
    saveLocal(); render(); preview(); scheduleCloudSave(); status('Smart polish applied: spacing, colours and layouts tightened.');
  }

  function moveSection(id, direction) { const index = sections.findIndex((section) => section.id === id); const next = index + direction; if (index < 0 || next < 0 || next >= sections.length) return; [sections[index], sections[next]] = [sections[next], sections[index]]; saveLocal(); render(); preview(); scheduleCloudSave(); }
  function copySection(id) { const index = sections.findIndex((section) => section.id === id); if (index < 0) return; const copy = JSON.parse(JSON.stringify(sections[index])); copy.id = uid('copy'); copy.title = `${copy.title || copy.section_type} copy`; sections.splice(index + 1, 0, copy); selected = copy.id; saveLocal(); render(); preview(); scheduleCloudSave(); }
  function toggleHidden(id) { const section = sections.find((item) => item.id === id); if (!section) return; section.hidden = !section.hidden; saveLocal(); render(); preview(); scheduleCloudSave(); }
  function deleteSection(id) { const index = sections.findIndex((section) => section.id === id); if (index < 0) return; sections.splice(index, 1); selected = sections[Math.min(index, sections.length - 1)]?.id || sections[0]?.id || null; saveLocal(); render(); preview(); scheduleCloudSave(); }
  function reorder(fromId, toId) { if (!fromId || fromId === toId) return; const from = sections.findIndex((section) => section.id === fromId); const to = sections.findIndex((section) => section.id === toId); if (from < 0 || to < 0) return; const [section] = sections.splice(from, 1); sections.splice(to, 0, section); selected = section.id; saveLocal(); render(); preview(); scheduleCloudSave(); }

  function sectionStyle(section) {
    const pad = section.padding === 'compact' ? '32px' : section.padding === 'spacious' ? '78px' : '52px';
    return `--pbi-sec-bg:${esc(section.background || '#fff8f1')};--pbi-sec-accent:${esc(section.accent || '#bf5c29')};text-align:${esc(section.align || 'left')};padding:${pad};`;
  }

  function liveText(section, field, value, tag = 'span', extra = '') { return `<${tag} ${extra} contenteditable="true" data-live-section-id="${esc(section.id)}" data-live-field="${field}" spellcheck="true">${esc(value)}</${tag}>`; }
  function cardsFor(section) { const rich = safeJson(section.body_json); return rich.cards || rich.steps || rich.stats || rich.items || cardsFromText(section); }

  function cardGrid(section, label = 'Card') {
    const cards = cardsFor(section).slice(0, 8);
    return `<div class="pbi-live-card-grid">${cards.map((card, index) => `<article><span>${esc(card.icon || index + 1)}</span><h3 contenteditable="true" data-live-section-id="${esc(section.id)}" data-live-card-index="${index}" data-live-card-field="title">${esc(card.title || card.q || card.value || `${label} ${index + 1}`)}</h3><p contenteditable="true" data-live-section-id="${esc(section.id)}" data-live-card-index="${index}" data-live-card-field="text">${esc(card.text || card.a || card.label || 'Add useful detail here.')}</p></article>`).join('')}</div>`;
  }

  function sectionHtml(section) {
    if (section.hidden) return '';
    const st = sectionStyle(section);
    const cls = `pbi-live-sec pbi-live-${section.section_type} layout-${section.layout || 'standard'} ${section.id === selected ? 'is-selected' : ''}`;
    const title = liveText(section, 'title', section.title, section.section_type === 'hero' || section.section_type === 'splitHero' ? 'h1' : 'h2');
    const text = liveText(section, 'text', section.text, 'p');
    const button = section.button ? liveText(section, 'button', section.button, 'a') : '';
    const image = section.image ? `<img src="${esc(section.image)}" alt="">` : '';
    const rich = safeJson(section.body_json);

    if (section.section_type === 'trustBand' || section.section_type === 'stats') {
      const stats = (rich.stats || cardsFor(section)).slice(0, 4);
      return `<section class="${cls}" style="${st}" data-preview-section="${esc(section.id)}"><div class="pbi-live-stat-row">${stats.map((item) => `<article><strong>${esc(item.value || item.title || '✓')}</strong><span>${esc(item.label || item.text || 'Trust point')}</span></article>`).join('')}</div></section>`;
    }
    if (['services', 'featureGrid', 'retail', 'process'].includes(section.section_type)) {
      return `<section class="${cls} pbi-live-cards" style="${st}" data-preview-section="${esc(section.id)}"><div class="pbi-live-section-head"><span>${esc(section.section_type === 'process' ? 'Process' : section.section_type === 'retail' ? 'Shop' : 'Website section')}</span>${title}</div>${cardGrid(section, section.section_type)}${button}</section>`;
    }
    if (section.section_type === 'gallery') {
      const images = String(section.text || '').split('|').map((value) => value.trim()).filter(Boolean);
      const gallery = (images.length ? images : [section.image]).filter(Boolean);
      return `<section class="${cls} pbi-live-gallery" style="${st}" data-preview-section="${esc(section.id)}">${title}<div>${gallery.map((url, index) => `<figure><img src="${esc(url)}" alt=""><figcaption>${esc((rich.captions || [])[index] || 'Gallery image')}</figcaption></figure>`).join('')}</div></section>`;
    }
    if (section.section_type === 'testimonial') {
      return `<section class="${cls} pbi-live-testimonial" style="${st}" data-preview-section="${esc(section.id)}"><div>“</div>${title}${text}</section>`;
    }
    if (section.section_type === 'faq') {
      const items = rich.items || cardsFromText(section);
      return `<section class="${cls} pbi-live-faq" style="${st}" data-preview-section="${esc(section.id)}">${title}<div>${items.slice(0, 6).map((item) => `<details open><summary>${esc(item.q || item.title || 'Question')}</summary><p>${esc(item.a || item.text || 'Answer')}</p></details>`).join('')}</div>${button}</section>`;
    }
    if (section.layout === 'split' || ['hero', 'splitHero', 'contact'].includes(section.section_type)) {
      return `<section class="${cls} pbi-live-split" style="${st}" data-preview-section="${esc(section.id)}"><div><span>${esc(rich.eyebrow || (section.section_type === 'contact' ? 'Contact' : 'Website preview'))}</span>${title}${text}${button}</div><figure>${image || '<span>Upload or paste an image</span>'}</figure></section>`;
    }
    return `<section class="${cls}" style="${st}" data-preview-section="${esc(section.id)}">${title}${text}${button}${image ? `<figure>${image}</figure>` : ''}</section>`;
  }

  function preview() {
    const output = sections.map(sectionHtml).join('');
    const target = document.querySelector('#previewScroll') || document.querySelector('#pbiIntegratedLivePreviewInner') || document.querySelector('#livePreview') || document.querySelector('.live-preview') || document.querySelector('.website-preview') || document.querySelector('.builder-preview') || document.querySelector('[data-live-preview]');
    if (target) { target.innerHTML = output; bindPreviewQuickEdit(target); }
    const pageBody = document.querySelector('#pageBody,textarea[name=body],textarea[name=page_body],textarea[name=content]');
    if (pageBody) { pageBody.value = sections.map((section) => `${section.title}\n${section.text}\n${section.button || ''}`).join('\n\n---\n\n'); pageBody.dispatchEvent(new Event('input', { bubbles: true })); }
    document.dispatchEvent(new CustomEvent('pbi:sections-updated', { detail: { projectId, sections, plan: activePlan() } }));
  }

  function bindPreviewQuickEdit(target) {
    target.querySelectorAll('[data-preview-section]').forEach((sectionEl) => {
      sectionEl.addEventListener('click', () => {
        const id = sectionEl.dataset.previewSection;
        if (id && id !== selected) { selected = id; render(); }
      });
    });
    target.querySelectorAll('[data-live-field]').forEach((field) => {
      field.addEventListener('input', () => {
        const section = sections.find((item) => item.id === field.dataset.liveSectionId);
        if (!section) return;
        section[field.dataset.liveField] = field.textContent.trim();
        saveLocal(); renderInspector(); scheduleCloudSave();
      });
    });
    target.querySelectorAll('[data-live-card-index]').forEach((field) => {
      field.addEventListener('input', () => {
        const section = sections.find((item) => item.id === field.dataset.liveSectionId);
        if (!section) return;
        const index = Number(field.dataset.liveCardIndex);
        const cards = cardsFor(section);
        const card = cards[index] || {};
        if (field.dataset.liveCardField === 'title') card.title = card.q = card.value = field.textContent.trim();
        if (field.dataset.liveCardField === 'text') card.text = card.a = card.label = field.textContent.trim();
        cards[index] = card;
        const rich = safeJson(section.body_json);
        if (section.section_type === 'faq') rich.items = cards.map((c) => ({ q: c.q || c.title || c.value || '', a: c.a || c.text || c.label || '' }));
        else if (section.section_type === 'process') rich.steps = cards.map((c) => ({ title: c.title || c.q || c.value || '', text: c.text || c.a || c.label || '' }));
        else rich.cards = cards.map((c) => ({ title: c.title || c.q || c.value || '', text: c.text || c.a || c.label || '', icon: c.icon || '✓' }));
        section.body_json = toBodyJson(rich);
        section.text = cardsToText(section, cards);
        saveLocal(); renderInspector(); scheduleCloudSave();
      });
    });
  }

  function scrollPreviewToSelected() {
    setTimeout(() => document.querySelector(`[data-preview-section="${CSS.escape(selected || '')}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  function bindTemplateChanges() {
    document.querySelectorAll('input[name="templateStyle"],input[name="template_key"],input[name="template"]').forEach((input) => {
      if (input.dataset.pbiTemplateBound) return;
      input.dataset.pbiTemplateBound = '1';
      input.addEventListener('change', () => load(true));
    });
  }

  function bindGlobalButtons() {
    document.querySelectorAll('button,a').forEach((element) => {
      const text = (element.textContent || '').trim().toLowerCase(); if (!text) return;
      if (!element.dataset.pbiSaveBound && ['save project', 'save sections'].some((match) => text.includes(match))) { element.dataset.pbiSaveBound = '1'; element.addEventListener('click', () => saveCloud(false), { capture: true }); }
      if (!element.dataset.pbiPublishBound && ['publish website', 'publish'].some((match) => text.includes(match))) { element.dataset.pbiPublishBound = '1'; element.addEventListener('click', () => publish(), { capture: true }); }
    });
  }

  function start() {
    if (!location.pathname.includes('/builder')) return;
    ensure(); bindTemplateChanges(); bindGlobalButtons(); load(false);
    setInterval(() => { bindTemplateChanges(); bindGlobalButtons(); }, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
