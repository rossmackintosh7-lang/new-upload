(() => {
  const projectId = new URLSearchParams(window.location.search).get('project');

  const pageDefaults = {
    home: { label: 'Home', title: 'Your Business in your local area', body: 'Your website intro will appear here as you build it out.' },
    about: { label: 'About', title: 'About your business', body: 'Tell customers who you are, what you do and what makes your business different.' },
    services: { label: 'Services', title: 'What we offer', body: 'List your main services, products or customer benefits in a clear and simple way.' },
    gallery: { label: 'Gallery', title: 'Gallery', body: 'Show customers your work, products, venue, food, team or finished projects.' },
    contact: { label: 'Contact', title: 'Get in touch', body: 'Add your phone number, email address, opening hours and the best way for customers to contact you.' }
  };

  const templates = {
    service: { label: 'Local Service Pro', description: 'Trust-led layout for trades, consultants and local services.', accent: '#256b5b', background: '#f5f1e9', text: '#19231f', nav: '#ffffff', button: '#256b5b', buttonText: '#ffffff' },
    hospitality: { label: 'Food & Hospitality', description: 'Warm, image-led layout for cafés, restaurants and food businesses.', accent: '#b4512a', background: '#fff3e6', text: '#2d160d', nav: '#2d160d', button: '#b4512a', buttonText: '#fff8f1' },
    retail: { label: 'Boutique Retail', description: 'Bold product-led layout for shops, makers and ecommerce-style sites.', accent: '#efb321', background: '#fff8cf', text: '#111111', nav: '#111111', button: '#111111', buttonText: '#ffffff' },
    studio: { label: 'Premium Studio', description: 'Editorial layout for salons, wellness, photography and creative studios.', accent: '#a1745e', background: '#f4ebe3', text: '#332a25', nav: '#f9f3ed', button: '#a1745e', buttonText: '#ffffff' },
    event: { label: 'Event Launch', description: 'High-energy landing page layout for events, courses and launches.', accent: '#8b5cf6', background: '#080817', text: '#f5f0ff', nav: '#0d0d24', button: '#8b5cf6', buttonText: '#ffffff' }
  };

  const legacyTemplateMap = { fashion: 'retail', restaurant: 'hospitality', calm: 'studio', tech: 'event', minimal: 'studio' };
  const $ = (id) => document.getElementById(id);

  const els = {
    saveBtn: $('saveBtn'), backBtn: $('backBtn'), logoutBtn: $('logoutBtn'), saveStatus: $('builderSaveStatus'),
    projectName: $('projectName'), businessName: $('businessName'), pageMainHeading: $('pageMainHeading'), subHeading: $('subHeading'),
    aiBrief: $('aiBrief'), aiTone: $('aiTone'), aiGenerateBtn: $('aiGenerateBtn'), aiStatus: $('aiStatus'),
    accentColor: $('accentColor'), backgroundColor: $('backgroundColor'), textColor: $('textColor'), navColor: $('navColor'),
    buttonColor: $('buttonColor'), buttonTextColor: $('buttonTextColor'), buttonTransparency: $('buttonTransparency'), buttonTransparencyNote: $('buttonTransparencyNote'),
    pageTabs: $('pageTabs'), pageTitle: $('pageTitle'), pageBody: $('pageBody'),
    logoUpload: $('logoUpload'), galleryUpload: $('galleryUpload'), galleryThumbs: $('galleryThumbs'),
    backgroundUpload: $('backgroundUpload'), backgroundTransparency: $('backgroundTransparency'), backgroundTransparencyNote: $('backgroundTransparencyNote'),
    useCustomDomain: $('useCustomDomain'), httpsEnabled: $('httpsEnabled'), subdomainSlug: $('subdomainSlug'), customDomain: $('customDomain'),
    checkDomainBtn: $('checkDomainBtn'), domainResult: $('domainResult'),
    desktopBtn: $('desktopBtn'), mobileBtn: $('mobileBtn'), previewFrame: $('previewFrame'), previewAddress: $('previewAddress'), previewScroll: $('previewScroll')
  };

  const state = {
    projectName: '', businessName: '', pageMainHeading: '', subHeading: '', aiBrief: '',
    template: 'service',
    accentColor: templates.service.accent, backgroundColor: templates.service.background, textColor: templates.service.text,
    navColor: templates.service.nav, buttonColor: templates.service.button, buttonTextColor: templates.service.buttonText, buttonTransparency: 0,
    pages: JSON.parse(JSON.stringify(pageDefaults)), selectedPages: ['home', 'about', 'services', 'contact'], activePage: 'home',
    logoDataUrl: '', galleryImages: [], backgroundImageDataUrl: '', backgroundTransparency: 25,
    subdomainSlug: '', customDomain: '', useCustomDomain: false, httpsEnabled: true, domainOption: 'pbi_subdomain'
  };

  const escapeHtml = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const normaliseTemplate = (v) => templates[v] ? v : (legacyTemplateMap[v] || 'service');
  const getPage = (k) => state.pages[k] || pageDefaults[k] || pageDefaults.home;
  const getBusinessName = () => state.businessName.trim() || 'Your Business';

  function setSaveMessage(message, type='info') { if (els.saveStatus) { els.saveStatus.textContent = message || ''; els.saveStatus.className = `builder-save-status ${type}`; } }
  function setAiMessage(message, type='info') { if (els.aiStatus) { els.aiStatus.textContent = message || ''; els.aiStatus.className = `ai-status ${type}`; } }
  function setDomainMessage(message, type='info') { if (els.domainResult) { els.domainResult.textContent = message || ''; els.domainResult.className = `notice domain-${type}`; } }

  async function api(path, options={}) {
    const response = await fetch(path, { credentials:'include', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    return data;
  }

  function slugify(value) { return String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60); }
  function readFileAsDataUrl(file) { return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(new Error('Could not read file.')); r.readAsDataURL(file); }); }

  function syncInputsToState() {
    state.projectName = els.projectName?.value || '';
    state.businessName = els.businessName?.value || '';
    state.pageMainHeading = els.pageMainHeading?.value || '';
    state.subHeading = els.subHeading?.value || '';
    state.aiBrief = els.aiBrief?.value || '';
    state.accentColor = els.accentColor?.value || state.accentColor;
    state.backgroundColor = els.backgroundColor?.value || state.backgroundColor;
    state.textColor = els.textColor?.value || state.textColor;
    state.navColor = els.navColor?.value || state.navColor;
    state.buttonColor = els.buttonColor?.value || state.buttonColor;
    state.buttonTextColor = els.buttonTextColor?.value || state.buttonTextColor;
    state.buttonTransparency = Number(els.buttonTransparency?.value || 0);
    state.backgroundTransparency = Math.min(60, Number(els.backgroundTransparency?.value || 25));
    state.subdomainSlug = els.subdomainSlug?.value || '';
    state.customDomain = els.customDomain?.value || '';
    state.useCustomDomain = els.useCustomDomain?.value === 'true';
    state.httpsEnabled = els.httpsEnabled?.value !== 'false';
    state.domainOption = document.querySelector('input[name="launchDomainOption"]:checked')?.value || 'pbi_subdomain';
    state.template = normaliseTemplate(document.querySelector('input[name="templateStyle"]:checked')?.value || state.template);

    const currentPage = getPage(state.activePage);
    currentPage.title = els.pageTitle?.value || '';
    currentPage.body = els.pageBody?.value || '';
    state.pages[state.activePage] = currentPage;

    const selectedPages = Array.from(document.querySelectorAll('.pageToggle')).filter((input)=>input.checked).map((input)=>input.value);
    state.selectedPages = Array.from(new Set(['home', ...selectedPages]));
    if (!state.selectedPages.includes(state.activePage)) state.activePage = 'home';
  }

  function syncStateToInputs() {
    if (els.projectName) els.projectName.value = state.projectName || '';
    if (els.businessName) els.businessName.value = state.businessName || '';
    if (els.pageMainHeading) els.pageMainHeading.value = state.pageMainHeading || '';
    if (els.subHeading) els.subHeading.value = state.subHeading || '';
    if (els.aiBrief) els.aiBrief.value = state.aiBrief || '';
    if (els.accentColor) els.accentColor.value = state.accentColor;
    if (els.backgroundColor) els.backgroundColor.value = state.backgroundColor;
    if (els.textColor) els.textColor.value = state.textColor;
    if (els.navColor) els.navColor.value = state.navColor;
    if (els.buttonColor) els.buttonColor.value = state.buttonColor;
    if (els.buttonTextColor) els.buttonTextColor.value = state.buttonTextColor || '#ffffff';
    if (els.buttonTransparency) els.buttonTransparency.value = state.buttonTransparency;
    if (els.backgroundTransparency) els.backgroundTransparency.value = state.backgroundTransparency;
    if (els.subdomainSlug) els.subdomainSlug.value = state.subdomainSlug || '';
    if (els.customDomain) els.customDomain.value = state.customDomain || '';
    if (els.useCustomDomain) els.useCustomDomain.value = String(Boolean(state.useCustomDomain));
    if (els.httpsEnabled) els.httpsEnabled.value = String(state.httpsEnabled !== false);

    const templateInput = document.querySelector(`input[name="templateStyle"][value="${state.template}"]`);
    if (templateInput) templateInput.checked = true;

    const domainInput = document.querySelector(`input[name="launchDomainOption"][value="${state.domainOption || 'pbi_subdomain'}"]`);
    if (domainInput) domainInput.checked = true;

    document.querySelectorAll('.pageToggle').forEach((input)=>{ input.checked = state.selectedPages.includes(input.value); });
    renderPageEditor();
    updateRangeNotes();
  }

  function updateRangeNotes() {
    if (els.buttonTransparencyNote) els.buttonTransparencyNote.textContent = `${state.buttonTransparency}% transparent`;
    if (els.backgroundTransparencyNote) els.backgroundTransparencyNote.textContent = `${state.backgroundTransparency}% transparent, maximum 60%`;
  }

  function renderPageTabs() {
    if (!els.pageTabs) return;
    els.pageTabs.innerHTML = state.selectedPages.map((pageKey)=> {
      const page = getPage(pageKey);
      return `<button type="button" class="${pageKey === state.activePage ? 'active' : ''}" data-page-tab="${escapeHtml(pageKey)}">${escapeHtml(page.label)}</button>`;
    }).join('');

    els.pageTabs.querySelectorAll('[data-page-tab]').forEach((button)=> {
      button.addEventListener('click', ()=> {
        syncInputsToState();
        state.activePage = button.dataset.pageTab;
        renderAll();
      });
    });
  }

  function renderPageEditor() {
    const page = getPage(state.activePage);
    if (els.pageTitle) els.pageTitle.value = page.title || '';
    if (els.pageBody) els.pageBody.value = page.body || '';
  }

  function renderGalleryThumbs() {
    if (!els.galleryThumbs) return;
    if (!state.galleryImages.length) {
      els.galleryThumbs.innerHTML = '<div class="notice" style="grid-column:1/-1">No pictures uploaded yet.</div>';
      return;
    }
    els.galleryThumbs.innerHTML = state.galleryImages.map((image,index)=>`<div class="thumb-item"><img src="${image}" alt="Uploaded picture"><button type="button" class="thumb-remove" data-remove-image="${index}" aria-label="Remove image">×</button></div>`).join('');
    els.galleryThumbs.querySelectorAll('[data-remove-image]').forEach((button)=>{
      button.addEventListener('click',()=>{ state.galleryImages.splice(Number(button.dataset.removeImage),1); renderAll(); });
    });
  }

  function getPreviewDomain() {
    const customDomain = state.customDomain.trim();
    const subdomain = slugify(state.subdomainSlug || state.businessName || 'your-business');
    return state.useCustomDomain && customDomain ? customDomain.replace(/^https?:\/\//,'') : `${subdomain || 'your-business'}.pbi.dev`;
  }

  function pageButtons() {
    return state.selectedPages.map((pageKey)=>{
      const page = getPage(pageKey);
      return `<button type="button" class="${pageKey === state.activePage ? 'active' : ''}" data-preview-page="${escapeHtml(pageKey)}">${escapeHtml(page.label)}</button>`;
    }).join('');
  }

  function previewNav() { return `<nav class="site-links">${pageButtons()}</nav>`; }
  function previewLogo() {
    const businessName = getBusinessName();
    return state.logoDataUrl ? `<img class="site-logo-img" src="${state.logoDataUrl}" alt="${escapeHtml(businessName)} logo">` : '<div class="site-logo"></div>';
  }
  function previewGallery(limit=6) {
    if (!state.galleryImages.length) return '<div class="drop-hint">Upload pictures to fill this gallery.</div>';
    return `<div class="preview-gallery-grid">${state.galleryImages.slice(0,limit).map((image)=>`<img src="${image}" alt="">`).join('')}</div>`;
  }
  function cta(label='Get in touch') { return `<button class="preview-cta" style="color:var(--site-button-text)">${escapeHtml(label)}</button>`; }
  function activePage() { return getPage(state.activePage); }

  function renderLocalServiceTemplate() {
    const businessName = getBusinessName();
    const page = activePage();
    return `
      <div class="template-bg-layer"></div>
      <header class="tpl-service-header">
        <div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>
        ${previewNav()}
        ${cta('Request a quote')}
      </header>
      <section class="tpl-service-hero">
        <div class="tpl-service-copy">
          <p class="tpl-kicker">Local service pro</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.body)}</p>
          <div class="tpl-service-actions">${cta('Request a quote')}<span>Trusted local support</span></div>
        </div>
        <aside class="tpl-service-panel">
          <h3>How we help</h3>
          <ul><li>Clear information for customers</li><li>Services explained properly</li><li>Simple route to enquiries</li></ul>
        </aside>
      </section>
      <section class="tpl-service-strip">
        <div><strong>Fast response</strong><span>Built into the page flow</span></div>
        <div><strong>Clear pricing</strong><span>Simple customer journey</span></div>
        <div><strong>Local support</strong><span>Easy enquiry route</span></div>
      </section>
      ${state.activePage === 'gallery' ? `<section class="tpl-gallery-section"><h2>Gallery</h2>${previewGallery()}</section>` : ''}
      <footer class="preview-footer">© ${escapeHtml(businessName)} • Crafted with PBI</footer>
    `;
  }

  function renderHospitalityTemplate() {
    const businessName = getBusinessName();
    const page = activePage();
    const heroImage = state.galleryImages[0] || state.backgroundImageDataUrl || '';
    return `
      <div class="template-bg-layer"></div>
      <header class="tpl-hospitality-header"><div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>${previewNav()}</header>
      <section class="tpl-hospitality-hero">
        <div class="tpl-hospitality-image" ${heroImage ? `style="background-image:url('${heroImage}')"` : ''}>${!heroImage ? '<span>Upload a food or venue image</span>' : ''}</div>
        <div class="tpl-hospitality-card">
          <p class="tpl-kicker">Food & hospitality</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.body)}</p>
          <div class="tpl-hours"><strong>Open today</strong><span>Fresh, local and ready to serve</span></div>
          ${cta('Book or enquire')}
        </div>
      </section>
      <section class="tpl-menu-highlights"><div><span>01</span><strong>Fresh favourites</strong></div><div><span>02</span><strong>Local customers</strong></div><div><span>03</span><strong>Easy bookings</strong></div></section>
      ${state.activePage === 'gallery' ? `<section class="tpl-gallery-section"><h2>Gallery</h2>${previewGallery(8)}</section>` : ''}
      <footer class="preview-footer">© ${escapeHtml(businessName)} • Crafted with PBI</footer>
    `;
  }

  function renderRetailTemplate() {
    const businessName = getBusinessName();
    const page = activePage();
    const images = state.galleryImages;
    return `
      <div class="template-bg-layer"></div>
      <div class="tpl-retail-topline">New arrivals • Local favourites • Shop small</div>
      <header class="tpl-retail-header"><div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>${previewNav()}<span class="tpl-bag">Bag</span></header>
      <section class="tpl-retail-hero">
        <div class="tpl-retail-copy"><p class="tpl-kicker">Boutique retail</p><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.body)}</p>${cta('Browse now')}</div>
        <div class="tpl-retail-product-grid">
          ${(images.length ? images.slice(0,4) : ['', '', '', '']).map((image,index)=>`<div class="tpl-product-card">${image ? `<img src="${image}" alt="">` : `<span>Product ${index+1}</span>`}</div>`).join('')}
        </div>
      </section>
      <section class="tpl-retail-promo"><strong>Designed to help customers browse quickly</strong><span>Products, categories and contact routes sit front and centre.</span></section>
      ${state.activePage === 'gallery' ? `<section class="tpl-gallery-section"><h2>Gallery</h2>${previewGallery(8)}</section>` : ''}
      <footer class="preview-footer">© ${escapeHtml(businessName)} • Crafted with PBI</footer>
    `;
  }

  function renderPremiumStudioTemplate() {
    const businessName = getBusinessName();
    const page = activePage();
    const heroImage = state.galleryImages[0] || state.backgroundImageDataUrl || '';
    return `
      <div class="template-bg-layer"></div>
      <header class="tpl-studio2-header"><div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>${previewNav()}</header>
      <section class="tpl-studio2-hero">
        <div class="tpl-studio2-copy"><p class="tpl-kicker">Premium studio</p><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.body)}</p>${cta('Start a conversation')}</div>
        <div class="tpl-studio2-image">${heroImage ? `<img src="${heroImage}" alt="">` : '<span>Upload a calm premium image</span>'}</div>
      </section>
      <section class="tpl-studio2-editorial"><p>Thoughtful design, clear wording and a calm journey for customers who want to understand your offer before making contact.</p></section>
      ${state.activePage === 'gallery' ? `<section class="tpl-gallery-section"><h2>Gallery</h2>${previewGallery(6)}</section>` : ''}
      <footer class="preview-footer">© ${escapeHtml(businessName)} • Crafted with PBI</footer>
    `;
  }

  function renderEventTemplate() {
    const businessName = getBusinessName();
    const page = activePage();
    return `
      <div class="template-bg-layer"></div>
      <header class="tpl-event-header"><div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>${previewNav()}</header>
      <section class="tpl-event-hero">
        <div><p class="tpl-kicker">Event launch</p><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.body)}</p><div class="tpl-event-actions">${cta('Register interest')}<button class="tpl-play-btn">View details</button></div></div>
        <div class="tpl-event-orb"><span>LIVE</span></div>
      </section>
      <section class="tpl-event-panels"><div><strong>01</strong><span>Big message</span></div><div><strong>02</strong><span>Fast action</span></div><div><strong>03</strong><span>Clear signup</span></div></section>
      ${state.activePage === 'gallery' ? `<section class="tpl-gallery-section"><h2>Gallery</h2>${previewGallery(6)}</section>` : ''}
      <footer class="preview-footer">© ${escapeHtml(businessName)} • Crafted with PBI</footer>
    `;
  }

  function renderPreview() {
    if (!els.previewScroll) return;
    if (els.previewAddress) els.previewAddress.textContent = `https://${getPreviewDomain()}`;
    const key = normaliseTemplate(state.template);
    const renderers = { service: renderLocalServiceTemplate, hospitality: renderHospitalityTemplate, retail: renderRetailTemplate, studio: renderPremiumStudioTemplate, event: renderEventTemplate };
    els.previewScroll.className = `preview-scroll pbi-template pbi-template-${key}`;
    els.previewScroll.style.cssText = `--site-accent:${state.accentColor};--site-bg:${state.backgroundColor};--site-text:${state.textColor};--site-nav:${state.navColor};--site-button:${state.buttonColor};--site-button-text:${state.buttonTextColor};--site-bg-image:${state.backgroundImageDataUrl ? `url(${state.backgroundImageDataUrl})` : 'none'};--site-bg-opacity:${1 - (state.backgroundTransparency / 100)};`;
    els.previewScroll.innerHTML = (renderers[key] || renderLocalServiceTemplate)();
    els.previewScroll.querySelectorAll('[data-preview-page]').forEach((button)=> {
      button.addEventListener('click',()=>{ syncInputsToState(); state.activePage = button.dataset.previewPage; renderAll(); });
    });
  }

  function renderAll() { updateRangeNotes(); renderPageTabs(); renderPageEditor(); renderGalleryThumbs(); renderPreview(); }

  function collectProjectData() {
    syncInputsToState();
    return {
      project_name: state.projectName, business_name: state.businessName, page_main_heading: state.pageMainHeading, sub_heading: state.subHeading, ai_brief: state.aiBrief,
      template: normaliseTemplate(state.template),
      accent_color: state.accentColor, background_color: state.backgroundColor, text_color: state.textColor, nav_color: state.navColor, button_color: state.buttonColor, button_text_color: state.buttonTextColor, button_transparency: state.buttonTransparency,
      pages: state.pages, selected_pages: state.selectedPages, active_page: state.activePage,
      logo_data_url: state.logoDataUrl, gallery_images: state.galleryImages, background_image_data_url: state.backgroundImageDataUrl, background_transparency: state.backgroundTransparency,
      subdomain_slug: state.subdomainSlug, custom_domain: state.customDomain, use_custom_domain: state.useCustomDomain, https_enabled: state.httpsEnabled, domain_option: state.domainOption
    };
  }

  async function saveProject() {
    if (!projectId) { setSaveMessage('No project ID found in the URL.', 'error'); return; }
    const data = collectProjectData();
    const name = data.project_name?.trim() || data.business_name?.trim() || 'Untitled website';
    if (els.saveBtn) { els.saveBtn.disabled = true; els.saveBtn.textContent = 'Saving...'; }
    setSaveMessage('Saving project...', 'saving');
    try {
      await api('/api/projects/update', { method:'POST', body: JSON.stringify({ id: projectId, name, data }) });
      setSaveMessage('Project saved successfully.', 'success');
    } catch (error) {
      console.error(error); setSaveMessage(error.message || 'Could not save project.', 'error');
    } finally {
      if (els.saveBtn) { els.saveBtn.disabled = false; els.saveBtn.textContent = 'Save project'; }
    }
  }

  async function generateAiCopy() {
    syncInputsToState();
    if (!state.aiBrief.trim()) { setAiMessage('Write a short brief first so PBI knows what to create.', 'error'); return; }
    if (els.aiGenerateBtn) { els.aiGenerateBtn.disabled = true; els.aiGenerateBtn.textContent = 'Writing...'; }
    setAiMessage('Rewriting and placing your wording across the website...', 'info');
    try {
      const result = await api('/api/ai/rewrite-site', { method:'POST', body: JSON.stringify({ business_name: state.businessName, main_heading: state.pageMainHeading, sub_heading: state.subHeading, brief: state.aiBrief, tone: els.aiTone?.value || 'professional and friendly', selected_pages: state.selectedPages, current_pages: state.pages }) });
      const copy = result.copy || {};
      if (copy.business_name && !state.businessName) state.businessName = copy.business_name;
      if (copy.page_main_heading) state.pageMainHeading = copy.page_main_heading;
      if (copy.sub_heading) state.subHeading = copy.sub_heading;
      if (copy.pages && typeof copy.pages === 'object') {
        for (const pageKey of Object.keys(copy.pages)) {
          if (!state.pages[pageKey]) continue;
          state.pages[pageKey] = { ...state.pages[pageKey], title: copy.pages[pageKey].title || state.pages[pageKey].title, body: copy.pages[pageKey].body || state.pages[pageKey].body };
        }
      }
      syncStateToInputs(); renderAll();
      setAiMessage('Done. The wording has been added to your selected pages. Check each page and save.', 'success');
    } catch (error) {
      console.error(error); setAiMessage(error.message || 'Could not generate wording.', 'error');
    } finally {
      if (els.aiGenerateBtn) { els.aiGenerateBtn.disabled = false; els.aiGenerateBtn.textContent = 'Rewrite and fill pages'; }
    }
  }

  async function loadProject() {
    if (!projectId) { syncStateToInputs(); renderAll(); return; }
    try {
      const result = await api(`/api/projects/get?id=${encodeURIComponent(projectId)}`);
      const project = result.project || result;
      let data = {};
      if (project.data_json) data = typeof project.data_json === 'string' ? JSON.parse(project.data_json || '{}') : project.data_json;

      state.projectName = project.name || data.project_name || '';
      state.businessName = data.business_name || '';
      state.pageMainHeading = data.page_main_heading || data.location || '';
      state.subHeading = data.sub_heading || data.brand_tone || '';
      state.aiBrief = data.ai_brief || '';
      state.template = normaliseTemplate(data.template || 'service');

      const defaults = templates[state.template] || templates.service;
      state.accentColor = data.accent_color || defaults.accent;
      state.backgroundColor = data.background_color || defaults.background;
      state.textColor = data.text_color || defaults.text;
      state.navColor = data.nav_color || defaults.nav;
      state.buttonColor = data.button_color || defaults.button;
      state.buttonTextColor = data.button_text_color || defaults.buttonText || '#ffffff';
      state.buttonTransparency = Number(data.button_transparency || 0);

      state.pages = { ...JSON.parse(JSON.stringify(pageDefaults)), ...(data.pages || {}) };
      state.selectedPages = Array.isArray(data.selected_pages) && data.selected_pages.length ? Array.from(new Set(['home', ...data.selected_pages])) : ['home', 'about', 'services', 'contact'];
      state.activePage = data.active_page && state.selectedPages.includes(data.active_page) ? data.active_page : 'home';
      state.logoDataUrl = data.logo_data_url || '';
      state.galleryImages = Array.isArray(data.gallery_images) ? data.gallery_images : [];
      state.backgroundImageDataUrl = data.background_image_data_url || '';
      state.backgroundTransparency = Number(data.background_transparency || 25);
      state.subdomainSlug = data.subdomain_slug || '';
      state.customDomain = data.custom_domain || '';
      state.useCustomDomain = Boolean(data.use_custom_domain);
      state.httpsEnabled = data.https_enabled !== false;
      state.domainOption = data.domain_option || project.domain_option || 'pbi_subdomain';
    } catch (error) {
      console.error(error); setSaveMessage(error.message || 'Could not load project.', 'error');
    }
    syncStateToInputs(); renderAll();
  }

  async function handleLogoUpload(event) { const file = event.target.files?.[0]; if (!file) return; state.logoDataUrl = await readFileAsDataUrl(file); renderPreview(); }
  async function handleGalleryUpload(event) { const files = Array.from(event.target.files || []); if (!files.length) return; state.galleryImages.push(...await Promise.all(files.map(readFileAsDataUrl))); renderAll(); }
  async function handleBackgroundUpload(event) { const file = event.target.files?.[0]; if (!file) return; state.backgroundImageDataUrl = await readFileAsDataUrl(file); renderPreview(); }

  async function checkDomain() {
    syncInputsToState();
    const domain = state.useCustomDomain && state.customDomain.trim() ? state.customDomain.trim() : `${slugify(state.subdomainSlug || state.businessName || 'your-business')}.dev`;
    if (!domain) { setDomainMessage('Enter a domain or subdomain first.', 'error'); return; }
    setDomainMessage('Checking domain...', 'info');
    try {
      const result = await api('/api/domain/check', { method:'POST', body: JSON.stringify({ domain }) });
      console.log('Domain check result:', result);
      setDomainMessage(`Cloudflare returned a result for ${domain}. Check the console/API response for full detail.`, 'info');
    } catch (error) {
      console.error(error); setDomainMessage(error.message || 'Could not check domain.', 'error');
    }
  }

  function applyTemplateDefaults(templateKey) {
    const key = normaliseTemplate(templateKey);
    const template = templates[key];
    if (!template) return;
    state.template = key;
    state.accentColor = template.accent;
    state.backgroundColor = template.background;
    state.textColor = template.text;
    state.navColor = template.nav;
    state.buttonColor = template.button;
    state.buttonTextColor = template.buttonText || '#ffffff';
    syncStateToInputs(); renderAll();
  }

  function updateTemplateChoiceLabels() {
    const mappedValues = ['service','hospitality','retail','studio','event'];
    document.querySelectorAll('input[name="templateStyle"]').forEach((input, index)=> {
      const key = mappedValues[index] || normaliseTemplate(input.value);
      input.value = key;
      const template = templates[key];
      const strong = input.closest('label')?.querySelector('strong');
      const small = input.closest('label')?.querySelector('small');
      if (strong) strong.textContent = template.label;
      if (small) small.textContent = template.description;
    });
  }

  function bindEvents() {
    updateTemplateChoiceLabels();

    if (els.saveBtn) els.saveBtn.addEventListener('click', saveProject);
    if (els.aiGenerateBtn) els.aiGenerateBtn.addEventListener('click', generateAiCopy);
    if (els.backBtn) els.backBtn.addEventListener('click', ()=>{ window.location.href = '/dashboard/'; });
    if (els.logoutBtn) els.logoutBtn.addEventListener('click', async()=>{ try { await fetch('/api/auth/logout', { method:'POST', credentials:'include' }); } finally { window.location.href = '/login/'; } });
    if (els.logoUpload) els.logoUpload.addEventListener('change', handleLogoUpload);
    if (els.galleryUpload) els.galleryUpload.addEventListener('change', handleGalleryUpload);
    if (els.backgroundUpload) els.backgroundUpload.addEventListener('change', handleBackgroundUpload);
    if (els.checkDomainBtn) els.checkDomainBtn.addEventListener('click', checkDomain);

    document.querySelectorAll('input[name="templateStyle"]').forEach((input)=>{ input.addEventListener('change',()=>applyTemplateDefaults(input.value)); });
    document.querySelectorAll('input[name="launchDomainOption"], .pageToggle').forEach((input)=>{ input.addEventListener('change',()=>{ syncInputsToState(); renderAll(); }); });

    [
      els.projectName, els.businessName, els.pageMainHeading, els.subHeading, els.aiBrief,
      els.accentColor, els.backgroundColor, els.textColor, els.navColor, els.buttonColor, els.buttonTextColor, els.buttonTransparency,
      els.pageTitle, els.pageBody, els.backgroundTransparency, els.useCustomDomain, els.httpsEnabled, els.subdomainSlug, els.customDomain
    ].filter(Boolean).forEach((input)=> {
      input.addEventListener('input',()=>{ syncInputsToState(); renderAll(); });
      input.addEventListener('change',()=>{ syncInputsToState(); renderAll(); });
    });

    if (els.desktopBtn && els.mobileBtn && els.previewFrame) {
      els.desktopBtn.addEventListener('click',()=>{ els.previewFrame.style.maxWidth='100%'; els.previewFrame.style.margin='0'; els.desktopBtn.classList.add('active'); els.mobileBtn.classList.remove('active'); });
      els.mobileBtn.addEventListener('click',()=>{ els.previewFrame.style.maxWidth='390px'; els.previewFrame.style.margin='0 auto'; els.mobileBtn.classList.add('active'); els.desktopBtn.classList.remove('active'); });
    }
  }

  bindEvents();
  syncStateToInputs();
  renderAll();
  loadProject();
})();
