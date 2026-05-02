(() => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('project');
  const adminMode = params.get('admin') === '1' || params.get('admin') === 'true';

  const pageDefaults = {
    home: {
      label: 'Home',
      title: 'Your Business in your local area',
      body: 'Your website intro will appear here as you build it out.'
    },
    about: {
      label: 'About',
      title: 'About your business',
      body: 'Tell customers who you are, what you do and what makes your business different.'
    },
    services: {
      label: 'Services',
      title: 'What we offer',
      body: 'List your main services, products or customer benefits in a clear and simple way.'
    },
    gallery: {
      label: 'Gallery',
      title: 'Gallery',
      body: 'Show customers your work, products, venue, food, team or finished projects.'
    },
    shop: {
      label: 'Shop',
      title: 'Shop our products',
      body: 'Browse featured products and buy securely through Stripe Checkout.'
    },
    contact: {
      label: 'Contact',
      title: 'Get in touch',
      body: 'Add your phone number, email address, opening hours and the best way for customers to contact you.'
    }
  };

  const templates = {
    service: {
      label: 'Local Service Pro',
      description: 'Trust-led layout for trades, consultants and local services.',
      accent: '#256b5b',
      background: '#f5f1e9',
      text: '#19231f',
      nav: '#ffffff',
      button: '#256b5b',
      buttonText: '#ffffff'
    },
    hospitality: {
      label: 'Food & Hospitality',
      description: 'Warm, image-led layout for cafés, restaurants and food businesses.',
      accent: '#b4512a',
      background: '#fff3e6',
      text: '#2d160d',
      nav: '#2d160d',
      button: '#b4512a',
      buttonText: '#fff8f1'
    },
    retail: {
      label: 'Boutique Retail',
      description: 'Bold product-led layout for shops, makers and ecommerce-style sites.',
      accent: '#efb321',
      background: '#fff8cf',
      text: '#111111',
      nav: '#111111',
      button: '#111111',
      buttonText: '#ffffff'
    },
    studio: {
      label: 'Premium Studio',
      description: 'Editorial layout for salons, wellness, photography and creative studios.',
      accent: '#a1745e',
      background: '#f4ebe3',
      text: '#332a25',
      nav: '#f9f3ed',
      button: '#a1745e',
      buttonText: '#ffffff'
    },
    event: {
      label: 'Event Launch',
      description: 'High-energy landing page layout for events, courses and launches.',
      accent: '#8b5cf6',
      background: '#080817',
      text: '#f5f0ff',
      nav: '#0d0d24',
      button: '#8b5cf6',
      buttonText: '#ffffff'
    }
  };

  const legacyTemplateMap = {
    fashion: 'retail',
    restaurant: 'hospitality',
    calm: 'studio',
    tech: 'event',
    minimal: 'studio'
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    saveBtn: $('saveBtn'),
    publishBtn: $('publishBtn'),
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),
    saveStatus: $('builderSaveStatus'),
    templatePresetBanner: $('builderTemplatePresetBanner'),

    projectName: $('projectName'),
    businessName: $('businessName'),
    pageMainHeading: $('pageMainHeading'),
    subHeading: $('subHeading'),

    aiBrief: $('aiBrief'),
    aiTone: $('aiTone'),
    aiGenerateBtn: $('aiGenerateBtn'),
    aiStatus: $('aiStatus'),

    accentColor: $('accentColor'),
    backgroundColor: $('backgroundColor'),
    textColor: $('textColor'),
    navColor: $('navColor'),
    buttonColor: $('buttonColor'),
    buttonTextColor: $('buttonTextColor'),
    buttonTransparency: $('buttonTransparency'),
    buttonTransparencyNote: $('buttonTransparencyNote'),

    ctaButtonText: $('ctaButtonText'),
    ctaButtonAction: $('ctaButtonAction'),
    ctaButtonPage: $('ctaButtonPage'),
    ctaButtonDestination: $('ctaButtonDestination'),

    pageTabs: $('pageTabs'),
    pageTitle: $('pageTitle'),
    pageBody: $('pageBody'),

    logoUpload: $('logoUpload'),
    galleryUpload: $('galleryUpload'),
    galleryThumbs: $('galleryThumbs'),
    backgroundUpload: $('backgroundUpload'),
    backgroundTransparency: $('backgroundTransparency'),
    backgroundTransparencyNote: $('backgroundTransparencyNote'),

    useCustomDomain: $('useCustomDomain'),
    httpsEnabled: $('httpsEnabled'),
    subdomainSlug: $('subdomainSlug'),
    customDomain: $('customDomain'),
    checkDomainBtn: $('checkDomainBtn'),
    domainResult: $('domainResult'),

    retailEnabled: $('retailEnabled'),
    retailCurrency: $('retailCurrency'),
    retailStripeAccountId: $('retailStripeAccountId'),
    retailConnectBtn: $('retailConnectBtn'),
    retailRefreshConnectBtn: $('retailRefreshConnectBtn'),
    retailConnectStatus: $('retailConnectStatus'),
    retailConnectedAccountView: $('retailConnectedAccountView'),
    retailTaxEnabled: $('retailTaxEnabled'),
    retailShippingLabel: $('retailShippingLabel'),
    retailShippingAmount: $('retailShippingAmount'),
    addRetailProductBtn: $('addRetailProductBtn'),
    retailProductsList: $('retailProductsList'),
    retailProductCount: $('retailProductCount'),

    siteLayoutStyle: $('siteLayoutStyle'),
    sectionShape: $('sectionShape'),
    imageStyle: $('imageStyle'),
    backgroundMode: $('backgroundMode'),
    headingFontStyle: $('headingFontStyle'),
    contentDensity: $('contentDensity'),
    secondaryColor: $('secondaryColor'),
    cardColor: $('cardColor'),
    logoPackage: $('logoPackage'),
    logoBrief: $('logoBrief'),
    logoStyle: $('logoStyle'),
    logoColours: $('logoColours'),
    requestLogoBtn: $('requestLogoBtn'),
    logoRequestStatus: $('logoRequestStatus'),

    desktopBtn: $('desktopBtn'),
    mobileBtn: $('mobileBtn'),
    previewFrame: $('previewFrame'),
    previewAddress: $('previewAddress'),
    previewScroll: $('previewScroll')
  };

  const state = {
    projectName: '',
    businessName: '',
    pageMainHeading: '',
    subHeading: '',
    aiBrief: '',

    templatePreset: '',
    template: 'service',

    accentColor: templates.service.accent,
    backgroundColor: templates.service.background,
    textColor: templates.service.text,
    navColor: templates.service.nav,
    buttonColor: templates.service.button,
    buttonTextColor: templates.service.buttonText,
    buttonTransparency: 0,

    ctaButtonText: 'Get in touch',
    ctaButtonAction: 'contact',
    ctaButtonPage: 'contact',
    ctaButtonDestination: '',

    pages: JSON.parse(JSON.stringify(pageDefaults)),
    selectedPages: ['home', 'about', 'services', 'contact'],
    activePage: 'home',

    logoDataUrl: '',
    galleryImages: [],
    backgroundImageDataUrl: '',
    backgroundTransparency: 20,

    subdomainSlug: '',
    customDomain: '',
    useCustomDomain: false,
    httpsEnabled: true,
    domainOption: 'pbi_subdomain',
    domainRegistration: null,

    retailEnabled: false,
    retailCurrency: 'gbp',
    retailStripeAccountId: '',
    retailTaxEnabled: false,
    retailShippingLabel: 'UK standard delivery',
    retailShippingAmount: '3.99',
    retailProducts: [],

    siteLayoutStyle: 'classic',
    sectionShape: 'soft',
    imageStyle: 'rounded',
    backgroundMode: 'plain',
    headingFontStyle: 'bold',
    contentDensity: 'comfortable',
    secondaryColor: '#f2b66d',
    cardColor: '#fff8f1',
    logoPackage: 'standard',
    logoBrief: '',
    logoStyle: 'clean',
    logoColours: ''
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setSaveMessage(message, type = 'info') {
    if (!els.saveStatus) return;
    els.saveStatus.textContent = message || '';
    els.saveStatus.className = `builder-save-status ${type}`;
  }

  function setAiMessage(message, type = 'info') {
    if (!els.aiStatus) return;
    els.aiStatus.textContent = message || '';
    els.aiStatus.className = `ai-status ${type}`;
  }

  function setDomainMessage(message, type = 'info') {
    if (!els.domainResult) return;
    els.domainResult.textContent = message || '';
    els.domainResult.className = `notice domain-${type}`;
  }

  function setDomainHtml(html, type = 'info') {
    if (!els.domainResult) return;
    els.domainResult.innerHTML = html || '';
    els.domainResult.className = `notice domain-${type}`;
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll('`', '&#096;');
  }

  function formatDomainPrice(domain) {
    const pricing = domain?.pricing || {};
    const currency = pricing.currency || 'GBP';
    const registration = pricing.registration_cost || '';
    if (!registration) return 'Price confirmed at checkout';
    return `${currency} ${registration} for year one, plus PBI registration handling fee`;
  }

  function renderDomainResults(result) {
    const requested = result.requested;
    const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];

    if (!requested && !suggestions.length) {
      setDomainMessage('No domain results were returned. Try a simpler business name or another extension.', 'error');
      return;
    }

    const requestedHtml = requested
      ? `<div class="domain-check-summary"><strong>${escapeHtml(requested.name)}</strong><span>${requested.available ? 'Available' : escapeHtml(requested.message || 'Not available')}</span>${requested.available ? `<button class="btn domainSelectBtn" type="button" data-domain-json="${escapeAttr(JSON.stringify(requested))}">Select this domain</button>` : ''}</div>`
      : '';

    const suggestionsHtml = suggestions.length
      ? `<div class="domain-suggestion-list"><h4>Available suggestions</h4>${suggestions.map((domain) => `<button class="domain-suggestion-card domainSelectBtn" type="button" data-domain-json="${escapeAttr(JSON.stringify(domain))}"><strong>${escapeHtml(domain.name)}</strong><span>${escapeHtml(formatDomainPrice(domain))}</span></button>`).join('')}</div>`
      : '<p class="muted">No automatically registrable suggestions came back. Try another name or extension.</p>';

    setDomainHtml(`${requestedHtml}${suggestionsHtml}<p class="small-note muted">Selecting a domain saves it against this project. The domain charge will be added to the first checkout payment, then PBI will attempt registration after payment if automatic registration is enabled.</p>`, suggestions.length || requested?.available ? 'success' : 'info');

    els.domainResult.querySelectorAll('.domainSelectBtn').forEach((button) => {
      button.addEventListener('click', () => {
        try {
          state.domainRegistration = JSON.parse(button.dataset.domainJson || '{}');
        } catch {
          state.domainRegistration = null;
        }

        if (!state.domainRegistration?.name) return;

        state.customDomain = state.domainRegistration.name;
        state.useCustomDomain = true;
        state.domainOption = 'register_new';

        syncStateToInputs();
        renderPreview();
        setDomainMessage(`${state.domainRegistration.name} selected. Save the project, then continue to payment when ready.`, 'success');
      });
    });
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    }

    return data;
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });
  }

  function normaliseTemplate(value) {
    return templates[value] ? value : (legacyTemplateMap[value] || 'service');
  }


  function getTemplatePreset(key) {
    const api = window.PBITemplatePresets;
    if (!api || !key) return null;
    try {
      return api.get(key);
    } catch {
      return null;
    }
  }

  function projectLooksBlank(data = {}) {
    const pages = data.pages || {};
    const home = pages.home || {};
    return !data.business_name && !data.page_main_heading && (!home.title || home.title === pageDefaults.home.title);
  }

  function showTemplatePresetBanner() {
    if (!els.templatePresetBanner) return;
    const preset = getTemplatePreset(state.templatePreset);
    if (!preset) {
      els.templatePresetBanner.style.display = 'none';
      return;
    }
    els.templatePresetBanner.style.display = 'block';
    els.templatePresetBanner.className = 'notice domain-success';
    els.templatePresetBanner.innerHTML = `<strong>Loaded template demo:</strong> ${escapeHtml(preset.businessName)} (${escapeHtml(preset.label)}). You can now edit the wording, images and colours.`;
  }

  function applyTemplatePreset(presetKey, options = {}) {
    const preset = getTemplatePreset(presetKey);
    if (!preset) return false;

    state.templatePreset = preset.id;
    state.projectName = options.keepProjectName && state.projectName ? state.projectName : (preset.projectName || state.projectName);
    state.businessName = preset.businessName || state.businessName;
    state.pageMainHeading = preset.pageMainHeading || state.pageMainHeading;
    state.subHeading = preset.subHeading || state.subHeading;
    state.template = normaliseTemplate(preset.template || state.template);
    state.accentColor = preset.accent || state.accentColor;
    state.backgroundColor = preset.background || state.backgroundColor;
    state.textColor = preset.text || state.textColor;
    state.navColor = preset.nav || state.navColor;
    state.buttonColor = preset.button || state.buttonColor;
    state.buttonTextColor = preset.buttonText || state.buttonTextColor;
    state.ctaButtonText = preset.ctaButtonText || state.ctaButtonText;
    state.ctaButtonAction = preset.ctaButtonAction || state.ctaButtonAction;
    state.ctaButtonPage = preset.ctaButtonPage || state.ctaButtonPage;
    state.ctaButtonDestination = preset.ctaButtonDestination || '';
    state.pages = JSON.parse(JSON.stringify(preset.pages || state.pages));
    state.selectedPages = Array.isArray(preset.selectedPages) ? preset.selectedPages.slice() : state.selectedPages;
    state.activePage = preset.activePage || 'home';
    state.galleryImages = Array.isArray(preset.galleryImages) ? preset.galleryImages.slice() : state.galleryImages;
    state.backgroundImageDataUrl = preset.backgroundImageDataUrl || '';
    state.backgroundTransparency = typeof preset.backgroundTransparency === 'number' ? preset.backgroundTransparency : state.backgroundTransparency;
    state.subdomainSlug = preset.subdomainSlug || state.subdomainSlug;
    state.customDomain = preset.customDomain || '';
    state.useCustomDomain = Boolean(preset.useCustomDomain);
    state.httpsEnabled = preset.httpsEnabled !== false;
    state.domainOption = preset.domainOption || 'pbi_subdomain';
    return true;
  }

  function getPage(pageKey) {
    return state.pages[pageKey] || pageDefaults[pageKey] || pageDefaults.home;
  }

  function getBusinessName() {
    return state.businessName.trim() || 'Your Business';
  }

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

    state.ctaButtonText = els.ctaButtonText?.value || state.ctaButtonText || 'Get in touch';
    state.ctaButtonAction = els.ctaButtonAction?.value || state.ctaButtonAction || 'contact';
    state.ctaButtonPage = els.ctaButtonPage?.value || state.ctaButtonPage || 'contact';
    state.ctaButtonDestination = els.ctaButtonDestination?.value || '';

    state.backgroundTransparency = Math.min(
      20,
      Number(els.backgroundTransparency?.value || 20)
    );

    state.subdomainSlug = els.subdomainSlug?.value || '';
    state.customDomain = els.customDomain?.value || '';
    state.useCustomDomain = els.useCustomDomain?.value === 'true';
    state.httpsEnabled = els.httpsEnabled?.value !== 'false';

    state.domainOption =
      document.querySelector('input[name="launchDomainOption"]:checked')?.value ||
      'pbi_subdomain';

    syncRetailInputsToState();

    state.siteLayoutStyle = els.siteLayoutStyle?.value || state.siteLayoutStyle || 'classic';
    state.sectionShape = els.sectionShape?.value || state.sectionShape || 'soft';
    state.imageStyle = els.imageStyle?.value || state.imageStyle || 'rounded';
    state.backgroundMode = els.backgroundMode?.value || state.backgroundMode || 'plain';
    state.headingFontStyle = els.headingFontStyle?.value || state.headingFontStyle || 'bold';
    state.contentDensity = els.contentDensity?.value || state.contentDensity || 'comfortable';
    state.secondaryColor = els.secondaryColor?.value || state.secondaryColor || '#f2b66d';
    state.cardColor = els.cardColor?.value || state.cardColor || '#fff8f1';
    state.logoPackage = els.logoPackage?.value || state.logoPackage || 'standard';
    state.logoBrief = els.logoBrief?.value || state.logoBrief || '';
    state.logoStyle = els.logoStyle?.value || state.logoStyle || 'clean';
    state.logoColours = els.logoColours?.value || state.logoColours || '';

    state.template = normaliseTemplate(
      document.querySelector('input[name="templateStyle"]:checked')?.value || state.template
    );

    const currentPage = getPage(state.activePage);
    currentPage.title = els.pageTitle?.value || '';
    currentPage.body = els.pageBody?.value || '';
    state.pages[state.activePage] = currentPage;

    const selectedPages = Array.from(document.querySelectorAll('.pageToggle'))
      .filter((input) => input.checked)
      .map((input) => input.value);

    state.selectedPages = Array.from(new Set(['home', ...selectedPages]));

    if (!state.selectedPages.includes(state.activePage)) {
      state.activePage = 'home';
    }
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
    if (els.ctaButtonText) els.ctaButtonText.value = state.ctaButtonText || 'Get in touch';
    if (els.ctaButtonAction) els.ctaButtonAction.value = state.ctaButtonAction || 'contact';
    if (els.ctaButtonPage) els.ctaButtonPage.value = state.ctaButtonPage || 'contact';
    if (els.ctaButtonDestination) els.ctaButtonDestination.value = state.ctaButtonDestination || '';
    if (els.backgroundTransparency) els.backgroundTransparency.value = state.backgroundTransparency;

    if (els.subdomainSlug) els.subdomainSlug.value = state.subdomainSlug || '';
    if (els.customDomain) els.customDomain.value = state.customDomain || '';
    if (els.useCustomDomain) els.useCustomDomain.value = String(Boolean(state.useCustomDomain));
    if (els.httpsEnabled) els.httpsEnabled.value = String(state.httpsEnabled !== false);

    syncRetailStateToInputs();

    if (els.siteLayoutStyle) els.siteLayoutStyle.value = state.siteLayoutStyle || 'classic';
    if (els.sectionShape) els.sectionShape.value = state.sectionShape || 'soft';
    if (els.imageStyle) els.imageStyle.value = state.imageStyle || 'rounded';
    if (els.backgroundMode) els.backgroundMode.value = state.backgroundMode || 'plain';
    if (els.headingFontStyle) els.headingFontStyle.value = state.headingFontStyle || 'bold';
    if (els.contentDensity) els.contentDensity.value = state.contentDensity || 'comfortable';
    if (els.secondaryColor) els.secondaryColor.value = state.secondaryColor || '#f2b66d';
    if (els.cardColor) els.cardColor.value = state.cardColor || '#fff8f1';
    if (els.logoPackage) els.logoPackage.value = state.logoPackage || 'standard';
    if (els.logoBrief) els.logoBrief.value = state.logoBrief || '';
    if (els.logoStyle) els.logoStyle.value = state.logoStyle || 'clean';
    if (els.logoColours) els.logoColours.value = state.logoColours || '';

    const templateInput = document.querySelector(
      `input[name="templateStyle"][value="${state.template}"]`
    );

    if (templateInput) {
      templateInput.checked = true;
    }

    const domainInput = document.querySelector(
      `input[name="launchDomainOption"][value="${state.domainOption || 'pbi_subdomain'}"]`
    );

    if (domainInput) {
      domainInput.checked = true;
    }

    document.querySelectorAll('.pageToggle').forEach((input) => {
      input.checked = state.selectedPages.includes(input.value);
    });

    renderPageEditor();
    updateRangeNotes();
    showTemplatePresetBanner();
  }

  function updateRangeNotes() {
    if (els.buttonTransparencyNote) {
      els.buttonTransparencyNote.textContent = `${state.buttonTransparency}% transparent`;
    }

    if (els.backgroundTransparencyNote) {
      els.backgroundTransparencyNote.textContent = `${state.backgroundTransparency}% transparent, maximum 20%`;
    }
  }

  function renderPageTabs() {
    if (!els.pageTabs) return;

    els.pageTabs.innerHTML = state.selectedPages.map((pageKey) => {
      const page = getPage(pageKey);

      return `
        <button
          type="button"
          class="${pageKey === state.activePage ? 'active' : ''}"
          data-page-tab="${escapeHtml(pageKey)}"
        >
          ${escapeHtml(page.label)}
        </button>
      `;
    }).join('');

    els.pageTabs.querySelectorAll('[data-page-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        syncInputsToState();
        state.activePage = button.dataset.pageTab;
        renderAll();
      });
    });
  }

  function renderPageEditor() {
    const page = getPage(state.activePage);

    if (els.pageTitle) {
      els.pageTitle.value = page.title || '';
    }

    if (els.pageBody) {
      els.pageBody.value = page.body || '';
    }
  }

  function renderGalleryThumbs() {
    if (!els.galleryThumbs) return;

    if (!state.galleryImages.length) {
      els.galleryThumbs.innerHTML =
        '<div class="notice" style="grid-column:1/-1">No pictures uploaded yet.</div>';
      return;
    }

    els.galleryThumbs.innerHTML = state.galleryImages.map((image, index) => `
      <div class="thumb-item">
        <img src="${image}" alt="Uploaded picture">
        <button
          type="button"
          class="thumb-remove"
          data-remove-image="${index}"
          aria-label="Remove image"
        >
          ×
        </button>
      </div>
    `).join('');

    els.galleryThumbs.querySelectorAll('[data-remove-image]').forEach((button) => {
      button.addEventListener('click', () => {
        state.galleryImages.splice(Number(button.dataset.removeImage), 1);
        renderAll();
      });
    });
  }

  function getPreviewDomain() {
    const customDomain = state.customDomain.trim();
    const subdomain = slugify(state.subdomainSlug || state.businessName || 'your-business');

    if (state.useCustomDomain && customDomain) {
      return customDomain.replace(/^https?:\/\//, '');
    }

    return `${subdomain || 'your-business'}.pbi.dev`;
  }

  function pageButtons() {
    return state.selectedPages.map((pageKey) => {
      const page = getPage(pageKey);

      return `
        <button
          type="button"
          class="${pageKey === state.activePage ? 'active' : ''}"
          data-preview-page="${escapeHtml(pageKey)}"
        >
          ${escapeHtml(page.label)}
        </button>
      `;
    }).join('');
  }

  function previewNav(buttons) {
    return `<nav class="site-links">${buttons}</nav>`;
  }

  function previewLogo() {
    const businessName = getBusinessName();

    return state.logoDataUrl
      ? `<img class="site-logo-img" src="${state.logoDataUrl}" alt="${escapeHtml(businessName)} logo">`
      : '<div class="site-logo"></div>';
  }

  function previewGallery(limit = 6) {
    if (!state.galleryImages.length) {
      return '<div class="drop-hint">Upload pictures to fill this gallery.</div>';
    }

    return `
      <div class="preview-gallery-grid">
        ${state.galleryImages.slice(0, limit).map((image) => `<img src="${image}" alt="">`).join('')}
      </div>
    `;
  }

  function getCtaLabel(fallback = 'Get in touch') {
    return state.ctaButtonText?.trim() || fallback;
  }

  function getCtaHref() {
    const action = state.ctaButtonAction || 'contact';
    const destination = (state.ctaButtonDestination || '').trim();
    const page = state.ctaButtonPage || 'contact';

    if (action === 'none') return '#';
    if (action === 'page') return `#${encodeURIComponent(page)}`;
    if (action === 'external') return destination || '#';
    if (action === 'email') return destination ? `mailto:${destination.replace(/^mailto:/, '')}` : '#contact';
    if (action === 'phone') return destination ? `tel:${destination.replace(/^tel:/, '')}` : '#contact';
    return '#contact';
  }

  function cta(label = 'Get in touch') {
    const href = getCtaHref();
    const disabled = (state.ctaButtonAction || 'contact') === 'none';
    return `<a class="preview-cta" href="${escapeHtml(href)}" ${disabled ? 'aria-disabled="true"' : ''} style="color:var(--site-button-text)">${escapeHtml(getCtaLabel(label))}</a>`;
  }

  function activePage() {
    const page = { ...getPage(state.activePage) };

    // The main heading/subheading controls are the customer's obvious homepage controls.
    // Keep them wired into the live preview so typing there immediately changes the hero.
    if (state.activePage === 'home') {
      const mainHeading = (state.pageMainHeading || '').trim();
      const subHeading = (state.subHeading || '').trim();

      if (mainHeading) page.title = mainHeading;
      if (subHeading) page.body = subHeading;
    }

    return page;
  }

  function renderLocalServiceTemplate() {
    const businessName = getBusinessName();
    const page = activePage();
    const services = ['Fast response', 'Clear pricing', 'Local support'];

    return `
      <div class="template-bg-layer"></div>

      <header class="tpl-service-header">
        <div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>
        ${previewNav(pageButtons())}
        ${cta('Request a quote')}
      </header>

      <section class="tpl-service-hero">
        <div class="tpl-service-copy">
          <p class="tpl-kicker">Local service pro</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.body)}</p>
          <div class="tpl-service-actions">
            ${cta('Request a quote')}
            <span>Trusted local support</span>
          </div>
        </div>

        <aside class="tpl-service-panel">
          <h3>How we help</h3>
          <ul>
            <li>Clear information for customers</li>
            <li>Services explained properly</li>
            <li>Simple route to enquiries</li>
          </ul>
        </aside>
      </section>

      <section class="tpl-service-strip">
        ${services.map((item) => `<div><strong>${escapeHtml(item)}</strong><span>Built into the page flow</span></div>`).join('')}
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

      <header class="tpl-hospitality-header">
        <div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>
        ${previewNav(pageButtons())}
      </header>

      <section class="tpl-hospitality-hero">
        <div class="tpl-hospitality-image" ${heroImage ? `style="background-image:url('${heroImage}')"` : ''}>
          ${!heroImage ? '<span>Upload a food or venue image</span>' : ''}
        </div>

        <div class="tpl-hospitality-card">
          <p class="tpl-kicker">Food & hospitality</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.body)}</p>

          <div class="tpl-hours">
            <strong>Open today</strong>
            <span>Fresh, local and ready to serve</span>
          </div>

          ${cta('Book or enquire')}
        </div>
      </section>

      <section class="tpl-menu-highlights">
        <div><span>01</span><strong>Fresh favourites</strong></div>
        <div><span>02</span><strong>Local customers</strong></div>
        <div><span>03</span><strong>Easy bookings</strong></div>
      </section>

      ${state.activePage === 'gallery' ? `<section class="tpl-gallery-section"><h2>Gallery</h2>${previewGallery(8)}</section>` : ''}
      ${state.activePage === 'shop' || state.retailEnabled ? `<section class="tpl-gallery-section"><h2>Shop products</h2>${renderRetailPreviewProducts(8)}</section>` : ''}
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

      <header class="tpl-retail-header">
        <div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>
        ${previewNav(pageButtons())}
        <span class="tpl-bag">Bag</span>
      </header>

      <section class="tpl-retail-hero">
        <div class="tpl-retail-copy">
          <p class="tpl-kicker">Boutique retail</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.body)}</p>
          ${cta('Browse now')}
        </div>

        ${renderRetailPreviewProducts(4)}
      </section>

      <section class="tpl-retail-promo">
        <strong>Designed to help customers browse quickly</strong>
        <span>Products, categories and contact routes sit front and centre.</span>
      </section>

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

      <header class="tpl-studio2-header">
        <div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>
        ${previewNav(pageButtons())}
      </header>

      <section class="tpl-studio2-hero">
        <div class="tpl-studio2-copy">
          <p class="tpl-kicker">Premium studio</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.body)}</p>
          ${cta('Start a conversation')}
        </div>

        <div class="tpl-studio2-image">
          ${heroImage ? `<img src="${heroImage}" alt="">` : '<span>Upload a calm premium image</span>'}
        </div>
      </section>

      <section class="tpl-studio2-editorial">
        <p>Thoughtful design, clear wording and a calm journey for customers who want to understand your offer before making contact.</p>
      </section>

      ${state.activePage === 'gallery' ? `<section class="tpl-gallery-section"><h2>Gallery</h2>${previewGallery(6)}</section>` : ''}
      <footer class="preview-footer">© ${escapeHtml(businessName)} • Crafted with PBI</footer>
    `;
  }

  function renderEventTemplate() {
    const businessName = getBusinessName();
    const page = activePage();

    return `
      <div class="template-bg-layer"></div>

      <header class="tpl-event-header">
        <div class="tpl-logo-wrap">${previewLogo()}<strong>${escapeHtml(businessName)}</strong></div>
        ${previewNav(pageButtons())}
      </header>

      <section class="tpl-event-hero">
        <div>
          <p class="tpl-kicker">Event launch</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.body)}</p>

          <div class="tpl-event-actions">
            ${cta('Register interest')}
            <button class="tpl-play-btn">View details</button>
          </div>
        </div>

        <div class="tpl-event-orb">
          <span>LIVE</span>
        </div>
      </section>

      <section class="tpl-event-panels">
        <div><strong>01</strong><span>Big message</span></div>
        <div><strong>02</strong><span>Fast action</span></div>
        <div><strong>03</strong><span>Clear signup</span></div>
      </section>

      ${state.activePage === 'gallery' ? `<section class="tpl-gallery-section"><h2>Gallery</h2>${previewGallery(6)}</section>` : ''}
      <footer class="preview-footer">© ${escapeHtml(businessName)} • Crafted with PBI</footer>
    `;
  }



  function formatRetailPrice(product) {
    const currency = (state.retailCurrency || 'gbp').toUpperCase();
    const amount = Number(product?.price || 0);
    if (!Number.isFinite(amount)) return `${currency} 0.00`;
    try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount); }
    catch { return `${currency} ${amount.toFixed(2)}`; }
  }

  function defaultRetailProduct(index = 0) {
    return {
      id: `prod_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      name: `Product ${index + 1}`,
      description: 'Short product description.',
      price: '9.99',
      stock: '10',
      sku: '',
      image: '',
      stripe_price_id: '',
      payment_url: '',
      active: true,
      track_stock: true
    };
  }

  function activeRetailProducts() {
    return (state.retailProducts || []).filter((product) => product && product.active !== false && product.name);
  }


function setRetailConnectMessage(message, type = 'info') {
  if (!els.retailConnectStatus) return;
  els.retailConnectStatus.textContent = message || '';
  els.retailConnectStatus.className = `small-note ${type === 'success' ? 'success-text' : type === 'error' ? 'error-text' : 'muted'}`;
}

function setRetailConnectedAccount(accountId, ready = false) {
  state.retailStripeAccountId = accountId || '';
  if (els.retailStripeAccountId) els.retailStripeAccountId.value = state.retailStripeAccountId;
  if (els.retailConnectedAccountView) {
    els.retailConnectedAccountView.value = accountId
      ? `${accountId}${ready ? ' • ready' : ' • onboarding pending'}`
      : 'Not connected yet';
  }
}

async function loadRetailConnectStatus({ quiet = false } = {}) {
  try {
    const query = projectId ? `?project=${encodeURIComponent(projectId)}` : '';
    const result = await api(`/api/retail/connect/status${query}`);
    const connect = result.connect || {};
    setRetailConnectedAccount(connect.account_id || '', Boolean(connect.ready));

    if (connect.ready) {
      setRetailConnectMessage('Stripe is connected and ready for live retail checkout.', 'success');
    } else if (connect.connected) {
      setRetailConnectMessage('Stripe account created. Finish the Stripe-hosted onboarding before taking live shop payments.', 'info');
    } else if (!quiet) {
      setRetailConnectMessage('Stripe is not connected yet. Click Connect Stripe to start secure onboarding.', 'info');
    }

    return connect;
  } catch (error) {
    if (!quiet) setRetailConnectMessage(error.message || 'Could not check Stripe connection.', 'error');
    return null;
  }
}

async function startRetailConnect() {
  if (!projectId) {
    setRetailConnectMessage('Save/create the project first, then connect Stripe.', 'error');
    return;
  }

  if (els.retailConnectBtn) {
    els.retailConnectBtn.disabled = true;
    els.retailConnectBtn.textContent = 'Opening Stripe...';
  }

  try {
    syncInputsToState();
    await saveProject();
    const result = await api('/api/retail/connect/start', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        country: 'GB',
        business_type: 'company'
      })
    });

    if (result.url) {
      window.location.href = result.url;
      return;
    }

    setRetailConnectMessage('Stripe did not return an onboarding link.', 'error');
  } catch (error) {
    setRetailConnectMessage(error.message || 'Could not start Stripe onboarding.', 'error');
  } finally {
    if (els.retailConnectBtn) {
      els.retailConnectBtn.disabled = false;
      els.retailConnectBtn.textContent = 'Connect Stripe';
    }
  }
}

  function syncRetailInputsToState() {
    if (els.retailEnabled) state.retailEnabled = els.retailEnabled.value === 'true';
    if (els.retailCurrency) state.retailCurrency = (els.retailCurrency.value || 'gbp').toLowerCase();
    if (els.retailStripeAccountId) state.retailStripeAccountId = els.retailStripeAccountId.value || '';
    if (els.retailTaxEnabled) state.retailTaxEnabled = els.retailTaxEnabled.value === 'true';
    if (els.retailShippingLabel) state.retailShippingLabel = els.retailShippingLabel.value || 'UK standard delivery';
    if (els.retailShippingAmount) state.retailShippingAmount = els.retailShippingAmount.value || '0';

    if (!els.retailProductsList) return;

    const cards = Array.from(els.retailProductsList.querySelectorAll('[data-retail-product-index]'));
    if (!cards.length) return;

    const products = cards.map((card) => {
      const index = Number(card.dataset.retailProductIndex || 0);
      const existing = state.retailProducts[index] || defaultRetailProduct(index);
      return {
        ...existing,
        name: card.querySelector('[data-product-field="name"]')?.value || '',
        description: card.querySelector('[data-product-field="description"]')?.value || '',
        price: card.querySelector('[data-product-field="price"]')?.value || '0',
        stock: card.querySelector('[data-product-field="stock"]')?.value || '0',
        sku: card.querySelector('[data-product-field="sku"]')?.value || '',
        stripe_price_id: card.querySelector('[data-product-field="stripe_price_id"]')?.value || '',
        payment_url: card.querySelector('[data-product-field="payment_url"]')?.value || '',
        active: card.querySelector('[data-product-field="active"]')?.value !== 'false',
        track_stock: card.querySelector('[data-product-field="track_stock"]')?.value !== 'false'
      };
    });

    state.retailProducts = products.slice(0, 10);
  }

  function syncRetailStateToInputs() {
    if (els.retailEnabled) els.retailEnabled.value = String(Boolean(state.retailEnabled));
    if (els.retailCurrency) els.retailCurrency.value = (state.retailCurrency || 'gbp').toLowerCase();
    if (els.retailStripeAccountId) els.retailStripeAccountId.value = state.retailStripeAccountId || '';
    if (els.retailConnectedAccountView) els.retailConnectedAccountView.value = state.retailStripeAccountId ? `${state.retailStripeAccountId} • saved` : 'Not connected yet';
    if (els.retailTaxEnabled) els.retailTaxEnabled.value = String(Boolean(state.retailTaxEnabled));
    if (els.retailShippingLabel) els.retailShippingLabel.value = state.retailShippingLabel || 'UK standard delivery';
    if (els.retailShippingAmount) els.retailShippingAmount.value = state.retailShippingAmount || '0';
  }

  function renderRetailProductsEditor() {
    if (!els.retailProductsList) return;
    const products = (state.retailProducts || []).slice(0, 10);
    if (els.retailProductCount) els.retailProductCount.textContent = `${products.length} / 10 products`;

    if (!products.length) {
      els.retailProductsList.innerHTML = '<div class="notice">No products added yet. Click “Add product” to start your retail page.</div>';
      return;
    }

    els.retailProductsList.innerHTML = products.map((product, index) => `
      <article class="retail-product-editor" data-retail-product-index="${index}">
        <div class="retail-product-editor-head">
          <strong>Product ${index + 1}</strong>
          <button type="button" class="btn-ghost" data-remove-retail-product="${index}">Remove</button>
        </div>
        <div class="grid-2">
          <div class="field"><label>Name</label><input class="input" data-product-field="name" value="${escapeAttr(product.name || '')}" placeholder="Product name"></div>
          <div class="field"><label>Price</label><input class="input" data-product-field="price" type="number" min="0" step="0.01" value="${escapeAttr(product.price || '')}" placeholder="14.99"></div>
        </div>
        <div class="field"><label>Description</label><textarea class="textarea" data-product-field="description" placeholder="Short description">${escapeHtml(product.description || '')}</textarea></div>
        <div class="grid-2">
          <div class="field"><label>Stock quantity</label><input class="input" data-product-field="stock" type="number" min="0" step="1" value="${escapeAttr(product.stock ?? '0')}"></div>
          <div class="field"><label>SKU/reference</label><input class="input" data-product-field="sku" value="${escapeAttr(product.sku || '')}" placeholder="SKU-001"></div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Stripe Price ID (optional)</label><input class="input" data-product-field="stripe_price_id" value="${escapeAttr(product.stripe_price_id || '')}" placeholder="price_..."></div>
          <div class="field"><label>Payment Link fallback</label><input class="input" data-product-field="payment_url" value="${escapeAttr(product.payment_url || '')}" placeholder="https://buy.stripe.com/..."></div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Visible</label><select class="select" data-product-field="active"><option value="true" ${product.active !== false ? 'selected' : ''}>Yes</option><option value="false" ${product.active === false ? 'selected' : ''}>No</option></select></div>
          <div class="field"><label>Track stock</label><select class="select" data-product-field="track_stock"><option value="true" ${product.track_stock !== false ? 'selected' : ''}>Yes</option><option value="false" ${product.track_stock === false ? 'selected' : ''}>No</option></select></div>
        </div>
        <div class="field"><label>Product image</label><input class="input" data-product-image="${index}" type="file" accept="image/*"></div>
        ${product.image ? `<img class="retail-product-editor-image" src="${product.image}" alt="${escapeAttr(product.name || 'Product image')}">` : ''}
      </article>
    `).join('');
  }

  function renderRetailPreviewProducts(limit = 4) {
    const products = activeRetailProducts().slice(0, limit);
    if (!products.length) {
      return `
        <div class="retail-products">
          <div class="retail-product">Featured</div>
          <div class="retail-product">New</div>
          <div class="retail-product">Local</div>
          <div class="retail-product">Offers</div>
        </div>
      `;
    }

    return `<div class="retail-products retail-products-live-preview">${products.map((product) => `
      <div class="retail-product retail-product-card-preview">
        ${product.image ? `<img src="${product.image}" alt="${escapeAttr(product.name)}">` : '<span>Product image</span>'}
        <div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(formatRetailPrice(product))}</small></div>
      </div>`).join('')}</div>`;
  }


  function applyAdvancedPreviewClasses() {
    if (!els.previewScroll) return;
    const classes = [
      `layout-${state.siteLayoutStyle || 'classic'}`,
      `shape-${state.sectionShape || 'soft'}`,
      `image-${state.imageStyle || 'rounded'}`,
      `bg-${state.backgroundMode || 'plain'}`,
      `heading-${state.headingFontStyle || 'bold'}`,
      `density-${state.contentDensity || 'comfortable'}`
    ];
    els.previewScroll.classList.remove(
      'layout-classic','layout-split','layout-editorial','layout-cards',
      'shape-soft','shape-square','shape-pill',
      'image-rounded','image-circle','image-polaroid','image-edge',
      'bg-plain','bg-gradient','bg-image','bg-pattern',
      'heading-bold','heading-friendly','heading-editorial',
      'density-comfortable','density-compact','density-spacious'
    );
    els.previewScroll.classList.add(...classes);
    els.previewScroll.style.setProperty('--pbi-secondary', state.secondaryColor || '#f2b66d');
    els.previewScroll.style.setProperty('--pbi-card', state.cardColor || '#fff8f1');
  }

  function renderPreview() {
    if (!els.previewScroll) return;
    applyAdvancedPreviewClasses();

    if (els.previewAddress) {
      els.previewAddress.textContent = `https://${getPreviewDomain()}`;
    }

    const renderers = {
      service: renderLocalServiceTemplate,
      hospitality: renderHospitalityTemplate,
      retail: renderRetailTemplate,
      studio: renderPremiumStudioTemplate,
      event: renderEventTemplate
    };

    const templateKey = normaliseTemplate(state.template);
    const renderTemplate = renderers[templateKey] || renderLocalServiceTemplate;

    els.previewScroll.className = `preview-scroll pbi-template pbi-template-${templateKey}`;
    els.previewScroll.style.cssText = `
      --site-accent:${state.accentColor};
      --site-bg:${state.backgroundColor};
      --site-text:${state.textColor};
      --site-nav:${state.navColor};
      --site-button:${state.buttonColor};
      --site-button-text:${state.buttonTextColor};
      --site-bg-image:${state.backgroundImageDataUrl ? `url(${state.backgroundImageDataUrl})` : 'none'};
      --site-bg-opacity:${1 - (state.backgroundTransparency / 100)};
    `;

    els.previewScroll.innerHTML = renderTemplate();

    els.previewScroll.querySelectorAll('[data-preview-page]').forEach((button) => {
      button.addEventListener('click', () => {
        syncInputsToState();
        state.activePage = button.dataset.previewPage;
        renderAll();
      });
    });
  }

  function renderAll() {
    updateRangeNotes();
    renderPageTabs();
    renderPageEditor();
    renderGalleryThumbs();
    renderRetailProductsEditor();
    renderPreview();
    showTemplatePresetBanner();
  }

  let previewUpdateFrame = null;

  function schedulePreviewUpdate() {
    if (previewUpdateFrame) cancelAnimationFrame(previewUpdateFrame);

    previewUpdateFrame = requestAnimationFrame(() => {
      previewUpdateFrame = null;
      syncInputsToState();
      updateRangeNotes();
      renderPreview();
    });
  }


  function collectProjectData() {
    syncInputsToState();

    return {
      project_name: state.projectName,
      business_name: state.businessName,
      page_main_heading: state.pageMainHeading,
      sub_heading: state.subHeading,
      ai_brief: state.aiBrief,

      template: normaliseTemplate(state.template),
      template_preset: state.templatePreset || '',

      accent_color: state.accentColor,
      background_color: state.backgroundColor,
      text_color: state.textColor,
      nav_color: state.navColor,
      button_color: state.buttonColor,
      button_text_color: state.buttonTextColor,
      button_transparency: state.buttonTransparency,

      cta_button_text: state.ctaButtonText,
      cta_button_action: state.ctaButtonAction,
      cta_button_page: state.ctaButtonPage,
      cta_button_destination: state.ctaButtonDestination,

      pages: state.pages,
      selected_pages: state.selectedPages,
      active_page: state.activePage,

      logo_data_url: state.logoDataUrl,
      gallery_images: state.galleryImages,
      background_image_data_url: state.backgroundImageDataUrl,
      background_transparency: state.backgroundTransparency,

      subdomain_slug: state.subdomainSlug,
      custom_domain: state.customDomain,
      use_custom_domain: state.useCustomDomain,
      https_enabled: state.httpsEnabled,
      domain_option: state.domainOption,
      retail_enabled: state.retailEnabled,
      retail_currency: state.retailCurrency || 'gbp',
      retail_stripe_account_id: state.retailStripeAccountId || '',
      retail_tax_enabled: state.retailTaxEnabled,
      retail_shipping_label: state.retailShippingLabel || 'UK standard delivery',
      retail_shipping_amount: state.retailShippingAmount || '0',
      retail_products: (state.retailProducts || []).slice(0, 10),
      site_layout_style: state.siteLayoutStyle,
      section_shape: state.sectionShape,
      image_style: state.imageStyle,
      background_mode: state.backgroundMode,
      heading_font_style: state.headingFontStyle,
      content_density: state.contentDensity,
      secondary_color: state.secondaryColor,
      card_color: state.cardColor,
      logo_package: state.logoPackage,
      logo_package: state.logoPackage,
          logo_brief: state.logoBrief,
      logo_style: state.logoStyle,
      logo_colours: state.logoColours
    };
  }

  async function saveProject() {
    if (!projectId) {
      setSaveMessage('No project ID found in the URL.', 'error');
      return;
    }

    const data = collectProjectData();
    const name = data.project_name?.trim() || data.business_name?.trim() || 'Untitled website';

    if (els.saveBtn) {
      els.saveBtn.disabled = true;
      els.saveBtn.textContent = 'Saving...';
    }

    setSaveMessage('Saving project...', 'saving');

    try {
      await api(adminMode ? '/api/admin/project' : '/api/projects/update', {
        method: 'POST',
        body: JSON.stringify({
          id: projectId,
          admin_edit: adminMode,
          name,
          data
        })
      });

      setSaveMessage('Project saved successfully.', 'success');
      return true;
    } catch (error) {
      console.error(error);
      setSaveMessage(error.message || 'Could not save project.', 'error');
      return false;
    } finally {
      if (els.saveBtn) {
        els.saveBtn.disabled = false;
        els.saveBtn.textContent = 'Save project';
      }
    }
  }

  async function publishProject() {
    if (!projectId) {
      setSaveMessage('No project ID found in the URL.', 'error');
      return;
    }

    const oldText = els.publishBtn?.textContent || 'Publish website';
    if (els.publishBtn) {
      els.publishBtn.disabled = true;
      els.publishBtn.textContent = 'Publishing...';
    }

    try {
      const saved = await saveProject();
      if (!saved) return;

      setSaveMessage('Publishing website...', 'saving');
      const result = await api('/api/projects/publish', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          domain_option: state.domainOption || 'pbi_subdomain'
        })
      });

      if (result.payment_required && result.payment_url) {
        setSaveMessage('Payment is needed before publishing. Opening checkout...', 'info');
        window.location.href = result.payment_url;
        return;
      }

      if (result.published && result.live_url) {
        setSaveMessage(`Website published successfully. Your live customer link is ready: ${result.live_url}`, 'success');
        const wrap = document.createElement('span');
        wrap.className = 'builder-live-link-wrap';

        const liveButton = document.createElement('a');
        liveButton.href = result.live_url;
        liveButton.target = '_blank';
        liveButton.rel = 'noopener';
        liveButton.className = 'btn-ghost builder-live-link';
        liveButton.textContent = 'View live website';

        const dashboardButton = document.createElement('a');
        dashboardButton.href = '/dashboard/';
        dashboardButton.className = 'btn-ghost builder-live-link';
        dashboardButton.textContent = 'Back to dashboard';

        wrap.appendChild(liveButton);
        wrap.appendChild(dashboardButton);
        els.saveStatus?.appendChild(document.createTextNode(' '));
        els.saveStatus?.appendChild(wrap);
        return;
      }

      setSaveMessage(result.message || 'Publish status is unclear. Check your dashboard.', 'info');
    } catch (error) {
      console.error(error);
      setSaveMessage(error.message || 'Could not publish website.', 'error');
    } finally {
      if (els.publishBtn) {
        els.publishBtn.disabled = false;
        els.publishBtn.textContent = oldText;
      }
    }
  }

  async function generateAiCopy() {
    syncInputsToState();

    if (!state.aiBrief.trim()) {
      setAiMessage('Write a short brief first so PBI knows what to create.', 'error');
      return;
    }

    if (els.aiGenerateBtn) {
      els.aiGenerateBtn.disabled = true;
      els.aiGenerateBtn.textContent = 'Writing...';
    }

    setAiMessage('Rewriting and placing your wording across the website...', 'info');

    try {
      const result = await api('/api/ai/rewrite-site', {
        method: 'POST',
        body: JSON.stringify({
          business_name: state.businessName,
          main_heading: state.pageMainHeading,
          sub_heading: state.subHeading,
          brief: state.aiBrief,
          tone: els.aiTone?.value || 'professional and friendly',
          selected_pages: state.selectedPages,
          current_pages: state.pages
        })
      });

      const copy = result.copy || {};

      if (copy.business_name && !state.businessName) {
        state.businessName = copy.business_name;
      }

      if (copy.page_main_heading) {
        state.pageMainHeading = copy.page_main_heading;
      }

      if (copy.sub_heading) {
        state.subHeading = copy.sub_heading;
      }

      if (copy.pages && typeof copy.pages === 'object') {
        for (const pageKey of Object.keys(copy.pages)) {
          if (!state.pages[pageKey]) continue;

          state.pages[pageKey] = {
            ...state.pages[pageKey],
            title: copy.pages[pageKey].title || state.pages[pageKey].title,
            body: copy.pages[pageKey].body || state.pages[pageKey].body
          };
        }
      }

      syncStateToInputs();
      renderAll();

      setAiMessage(
        'Done. The wording has been added to your selected pages. Check each page and save.',
        'success'
      );
    } catch (error) {
      console.error(error);
      setAiMessage(error.message || 'Could not generate wording.', 'error');
    } finally {
      if (els.aiGenerateBtn) {
        els.aiGenerateBtn.disabled = false;
        els.aiGenerateBtn.textContent = 'Rewrite and fill pages';
      }
    }
  }

  async function loadProject() {
    if (!projectId) {
      syncStateToInputs();
      renderAll();
      return;
    }

    try {
      const result = await api(`${adminMode ? '/api/admin/project' : '/api/projects/get'}?id=${encodeURIComponent(projectId)}`);
      const project = result.project || result;

      let data = {};

      if (project.data_json) {
        data =
          typeof project.data_json === 'string'
            ? JSON.parse(project.data_json || '{}')
            : project.data_json;
      }

      state.projectName = project.name || data.project_name || '';
      state.businessName = data.business_name || '';
      state.pageMainHeading = data.page_main_heading || data.location || '';
      state.subHeading = data.sub_heading || data.brand_tone || '';
      state.aiBrief = data.ai_brief || '';

      state.templatePreset = data.template_preset || '';
      state.template = normaliseTemplate(data.template || 'service');

      const templateDefaults = templates[state.template] || templates.service;

      state.accentColor = data.accent_color || templateDefaults.accent;
      state.backgroundColor = data.background_color || templateDefaults.background;
      state.textColor = data.text_color || templateDefaults.text;
      state.navColor = data.nav_color || templateDefaults.nav;
      state.buttonColor = data.button_color || templateDefaults.button;
      state.buttonTextColor = data.button_text_color || templateDefaults.buttonText || '#ffffff';
      state.buttonTransparency = Number(data.button_transparency || 0);
      state.ctaButtonText = data.cta_button_text || 'Get in touch';
      state.ctaButtonAction = data.cta_button_action || 'contact';
      state.ctaButtonPage = data.cta_button_page || 'contact';
      state.ctaButtonDestination = data.cta_button_destination || '';

      state.pages = {
        ...JSON.parse(JSON.stringify(pageDefaults)),
        ...(data.pages || {})
      };

      state.selectedPages =
        Array.isArray(data.selected_pages) && data.selected_pages.length
          ? Array.from(new Set(['home', ...data.selected_pages]))
          : ['home', 'about', 'services', 'contact'];

      state.activePage =
        data.active_page && state.selectedPages.includes(data.active_page)
          ? data.active_page
          : 'home';

      state.logoDataUrl = data.logo_data_url || '';
      state.galleryImages = Array.isArray(data.gallery_images) ? data.gallery_images : [];
      state.backgroundImageDataUrl = data.background_image_data_url || '';
      state.backgroundTransparency = Math.min(20, Number(data.background_transparency || 20));

      state.subdomainSlug = data.subdomain_slug || '';
      state.customDomain = data.custom_domain || '';
      state.useCustomDomain = Boolean(data.use_custom_domain);
      state.httpsEnabled = data.https_enabled !== false;
      state.domainOption = data.domain_option || project.domain_option || 'pbi_subdomain';
      state.domainRegistration = data.domain_registration || null;

      state.retailEnabled = Boolean(data.retail_enabled || data.template === 'retail' || data.template_preset === 'shop');
      state.retailCurrency = (data.retail_currency || 'gbp').toLowerCase();
      state.retailStripeAccountId = data.retail_stripe_account_id || '';
      state.retailTaxEnabled = Boolean(data.retail_tax_enabled);
      state.retailShippingLabel = data.retail_shipping_label || 'UK standard delivery';
      state.retailShippingAmount = data.retail_shipping_amount || '3.99';
      state.retailProducts = Array.isArray(data.retail_products) ? data.retail_products.slice(0, 10) : [];

      state.siteLayoutStyle = data.site_layout_style || 'classic';
      state.sectionShape = data.section_shape || 'soft';
      state.imageStyle = data.image_style || 'rounded';
      state.backgroundMode = data.background_mode || 'plain';
      state.headingFontStyle = data.heading_font_style || 'bold';
      state.contentDensity = data.content_density || 'comfortable';
      state.secondaryColor = data.secondary_color || '#f2b66d';
      state.cardColor = data.card_color || '#fff8f1';
      state.logoPackage = data.logo_package || 'standard';
      state.logoBrief = data.logo_brief || '';
      state.logoStyle = data.logo_style || 'clean';
      state.logoColours = data.logo_colours || '';

      const urlPreset = params.get('preset') || '';
      const presetToApply = urlPreset || state.templatePreset;
      if (presetToApply && (projectLooksBlank(data) || urlPreset)) {
        applyTemplatePreset(presetToApply, { keepProjectName: Boolean(project.name || data.project_name) });
      }
    } catch (error) {
      console.error(error);
      setSaveMessage(error.message || 'Could not load project.', 'error');
    }

    syncStateToInputs();
    renderAll();

    // Cloudflare preview pages can finish image/layout work just after data load.
    // Trigger a second lightweight preview pass so loaded template data is reflected.
    setTimeout(() => {
      syncInputsToState();
      renderPreview();
    }, 0);
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    state.logoDataUrl = await readFileAsDataUrl(file);
    renderAll();
  }

  async function handleGalleryUpload(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const images = await Promise.all(files.map(readFileAsDataUrl));

    state.galleryImages.push(...images);
    renderAll();
  }

  async function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    state.backgroundImageDataUrl = await readFileAsDataUrl(file);
    renderPreview();
  }

  async function checkDomain() {
    syncInputsToState();

    const requestedDomain = state.customDomain.trim();
    const keyword = state.businessName || state.subdomainSlug || state.projectName || requestedDomain || 'my business';
    const domain = requestedDomain || `${slugify(keyword)}.co.uk`;

    if (!domain && !keyword) {
      setDomainMessage('Enter a business name or domain first.', 'error');
      return;
    }

    setDomainMessage('Checking live domain availability and suggestions...', 'info');

    try {
      const result = await api('/api/domain/check', {
        method: 'POST',
        body: JSON.stringify({
          domain,
          keyword,
          business_name: state.businessName
        })
      });

      console.log('Domain check result:', result);
      renderDomainResults(result);
    } catch (error) {
      console.error(error);
      setDomainMessage(error.message || 'Could not check domain. You can still publish on a PBI subdomain and add a custom domain later.', 'error');
    }
  }

  function applyTemplateDefaults(templateKey) {
    const normalisedKey = normaliseTemplate(templateKey);
    const template = templates[normalisedKey];

    if (!template) return;

    state.template = normalisedKey;
    state.accentColor = template.accent;
    state.backgroundColor = template.background;
    state.textColor = template.text;
    state.navColor = template.nav;
    state.buttonColor = template.button;
    state.buttonTextColor = template.buttonText || '#ffffff';

    syncStateToInputs();
    renderAll();
  }

  function updateTemplateChoiceLabels() {
    document.querySelectorAll('input[name="templateStyle"]').forEach((input) => {
      const mapped = legacyTemplateMap[input.value] || input.value;
      const template = templates[mapped];

      if (!template) return;

      input.value = mapped;

      const strong = input.closest('label')?.querySelector('strong');
      const small = input.closest('label')?.querySelector('small');

      if (strong) strong.textContent = template.label;
      if (small) small.textContent = template.description;
    });
  }


  function setLogoRequestMessage(message, type = 'info') {
    if (!els.logoRequestStatus) return;
    els.logoRequestStatus.style.display = 'block';
    els.logoRequestStatus.className = `notice ${type}`;
    els.logoRequestStatus.textContent = message || '';
  }

  async function requestPaidLogoCreation() {
    syncInputsToState();

    if (!state.logoBrief || state.logoBrief.trim().length < 12) {
      setLogoRequestMessage('Please describe the logo you want before requesting paid logo creation.', 'error');
      return;
    }

    if (els.requestLogoBtn) {
      els.requestLogoBtn.disabled = true;
      els.requestLogoBtn.textContent = 'Preparing logo request...';
    }

    try {
      await saveProject();
      const result = await api('/api/logo/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          business_name: state.businessName,
          logo_brief: state.logoBrief,
          logo_style: state.logoStyle,
          logo_colours: state.logoColours
        })
      });

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      setLogoRequestMessage(result.message || 'Logo request saved. PBI will contact you.', 'success');
    } catch (error) {
      setLogoRequestMessage(error.message || 'Could not start logo creation request.', 'error');
    } finally {
      if (els.requestLogoBtn) {
        els.requestLogoBtn.disabled = false;
        els.requestLogoBtn.textContent = 'Request paid logo creation';
      }
    }
  }

  function bindEvents() {
    updateTemplateChoiceLabels();

    if (els.saveBtn) {
      els.saveBtn.addEventListener('click', saveProject);
    }

    if (els.publishBtn) {
      els.publishBtn.addEventListener('click', publishProject);
    }

    if (els.aiGenerateBtn) {
      els.aiGenerateBtn.addEventListener('click', generateAiCopy);
    }

    if (els.backBtn) {
      els.backBtn.addEventListener('click', () => {
        window.location.href = adminMode ? `/admin/?project=${encodeURIComponent(projectId || '')}` : '/dashboard/';
      });
    }

    if (els.logoutBtn) {
      els.logoutBtn.addEventListener('click', async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
          });
        } finally {
          window.location.href = '/login/';
        }
      });
    }

    if (els.logoUpload) {
      els.logoUpload.addEventListener('change', handleLogoUpload);
    }

    if (els.galleryUpload) {
      els.galleryUpload.addEventListener('change', handleGalleryUpload);
    }

    if (els.backgroundUpload) {
      els.backgroundUpload.addEventListener('change', handleBackgroundUpload);
    }

    if (els.checkDomainBtn) {
      els.checkDomainBtn.addEventListener('click', checkDomain);
    }

    document.querySelectorAll('input[name="templateStyle"]').forEach((input) => {
      input.addEventListener('change', () => {
        applyTemplateDefaults(input.value);
      });
    });



    if (els.addRetailProductBtn) {
      els.addRetailProductBtn.addEventListener('click', () => {
        syncRetailInputsToState();
        if ((state.retailProducts || []).length >= 10) {
          setSaveMessage('You can add up to 10 products on this retail template.', 'error');
          return;
        }
        state.retailEnabled = true;
        state.retailProducts.push(defaultRetailProduct(state.retailProducts.length));
        syncRetailStateToInputs();
        renderAll();
      });
    }

    if (els.retailProductsList) {
      els.retailProductsList.addEventListener('input', (event) => {
        if (event.target.closest('[data-product-field]')) {
          syncRetailInputsToState();
          renderPreview();
        }
      });

      els.retailProductsList.addEventListener('change', async (event) => {
        const imageInput = event.target.closest('[data-product-image]');
        if (imageInput) {
          const index = Number(imageInput.dataset.productImage || 0);
          const file = imageInput.files?.[0];
          if (file) {
            syncRetailInputsToState();
            state.retailProducts[index] = state.retailProducts[index] || defaultRetailProduct(index);
            state.retailProducts[index].image = await readFileAsDataUrl(file);
            renderAll();
          }
          return;
        }

        if (event.target.closest('[data-product-field]')) {
          syncRetailInputsToState();
          renderPreview();
        }
      });

      els.retailProductsList.addEventListener('click', (event) => {
        const remove = event.target.closest('[data-remove-retail-product]');
        if (!remove) return;
        syncRetailInputsToState();
        state.retailProducts.splice(Number(remove.dataset.removeRetailProduct), 1);
        renderAll();
      });
    }

    [els.retailEnabled, els.retailCurrency, els.retailStripeAccountId, els.retailTaxEnabled, els.retailShippingLabel, els.retailShippingAmount]
      .filter(Boolean)
      .forEach((input) => {
        input.addEventListener('input', () => { syncRetailInputsToState(); schedulePreviewUpdate(); });
        input.addEventListener('change', () => { syncRetailInputsToState(); schedulePreviewUpdate(); });
      });

    if (els.retailConnectBtn) els.retailConnectBtn.addEventListener('click', startRetailConnect);
    if (els.retailRefreshConnectBtn) els.retailRefreshConnectBtn.addEventListener('click', () => loadRetailConnectStatus({ quiet: false }));

    if (els.requestLogoBtn) els.requestLogoBtn.addEventListener('click', requestPaidLogoCreation);

    [els.siteLayoutStyle, els.sectionShape, els.imageStyle, els.backgroundMode, els.headingFontStyle, els.contentDensity, els.secondaryColor, els.cardColor, els.logoPackage, els.logoBrief, els.logoStyle, els.logoColours]
      .filter(Boolean)
      .forEach((input) => {
        input.addEventListener('input', schedulePreviewUpdate);
        input.addEventListener('change', schedulePreviewUpdate);
      });

    document
      .querySelectorAll('input[name="launchDomainOption"], .pageToggle')
      .forEach((input) => {
        input.addEventListener('change', () => {
          syncInputsToState();
          renderAll();
        });
      });

    [
      els.projectName,
      els.businessName,
      els.pageMainHeading,
      els.subHeading,
      els.aiBrief,
      els.accentColor,
      els.backgroundColor,
      els.textColor,
      els.navColor,
      els.buttonColor,
      els.buttonTextColor,
      els.buttonTransparency,
      els.ctaButtonText,
      els.ctaButtonAction,
      els.ctaButtonPage,
      els.ctaButtonDestination,
      els.pageTitle,
      els.pageBody,
      els.backgroundTransparency,
      els.useCustomDomain,
      els.httpsEnabled,
      els.subdomainSlug,
      els.customDomain
    ]
      .filter(Boolean)
      .forEach((input) => {
        input.addEventListener('input', schedulePreviewUpdate);
        input.addEventListener('change', schedulePreviewUpdate);
      });

    const builderLeft = document.querySelector('.builder-left');
    if (builderLeft && !builderLeft.dataset.livePreviewBound) {
      builderLeft.dataset.livePreviewBound = 'true';

      builderLeft.addEventListener('input', (event) => {
        const target = event.target;
        if (!target || target.type === 'file') return;
        schedulePreviewUpdate();
      });

      builderLeft.addEventListener('change', (event) => {
        const target = event.target;
        if (!target || target.type === 'file') return;

        if (target.matches('input[name="templateStyle"], input[name="launchDomainOption"], .pageToggle')) {
          return;
        }

        schedulePreviewUpdate();
      });
    }

    if (els.desktopBtn && els.mobileBtn && els.previewFrame) {
      els.desktopBtn.addEventListener('click', () => {
        els.previewFrame.style.maxWidth = '100%';
        els.previewFrame.style.margin = '0';

        els.desktopBtn.classList.add('active');
        els.mobileBtn.classList.remove('active');
      });

      els.mobileBtn.addEventListener('click', () => {
        els.previewFrame.style.maxWidth = '390px';
        els.previewFrame.style.margin = '0 auto';

        els.mobileBtn.classList.add('active');
        els.desktopBtn.classList.remove('active');
      });
    }
  }

  if (adminMode) {
    setSaveMessage('Admin mode: you are editing this customer project from the PBI admin panel.', 'info');
    document.body.classList.add('admin-builder-mode');
  }

  bindEvents();
  syncStateToInputs();
  renderAll();
  loadProject().then(() => loadRetailConnectStatus({ quiet: true }));
})();
