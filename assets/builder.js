(() => {
  const projectId = new URLSearchParams(window.location.search).get('project');

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
    contact: {
      label: 'Contact',
      title: 'Get in touch',
      body: 'Add your phone number, email address, opening hours and the best way for customers to contact you.'
    }
  };

  const templates = {
    fashion: {
      accent: '#f4b72f',
      background: '#fff7db',
      text: '#111111',
      nav: '#111111',
      button: '#111111',
      label: 'Fresh Retail'
    },
    restaurant: {
      accent: '#b88945',
      background: '#070707',
      text: '#f7f1e7',
      nav: '#050505',
      button: '#b88945',
      label: 'Premium Dining'
    },
    calm: {
      accent: '#0c2b4a',
      background: '#f7f5ef',
      text: '#0c2b4a',
      nav: '#ffffff',
      button: '#0c2b4a',
      label: 'Calm Craft'
    },
    tech: {
      accent: '#9d4dff',
      background: '#070818',
      text: '#f6f2ff',
      nav: '#08091d',
      button: '#9d4dff',
      label: 'Future Event'
    },
    studio: {
      accent: '#b9846b',
      background: '#efe5da',
      text: '#3b332e',
      nav: '#f8f1ea',
      button: '#b9846b',
      label: 'Minimal Studio'
    }
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    saveBtn: $('saveBtn'),
    backBtn: $('backBtn'),
    logoutBtn: $('logoutBtn'),
    saveStatus: $('builderSaveStatus'),

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

    template: 'fashion',

    accentColor: '#c86f3d',
    backgroundColor: '#fff8f1',
    textColor: '#2f1b12',
    navColor: '#8a431d',
    buttonColor: '#c86f3d',
    buttonTextColor: '#fffaf5',
    buttonTransparency: 0,

    pages: JSON.parse(JSON.stringify(pageDefaults)),
    selectedPages: ['home', 'about', 'services', 'contact'],
    activePage: 'home',

    logoDataUrl: '',
    galleryImages: [],
    backgroundImageDataUrl: '',
    backgroundTransparency: 25,

    subdomainSlug: '',
    customDomain: '',
    useCustomDomain: false,
    httpsEnabled: true,
    domainOption: 'pbi_subdomain'
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

    state.backgroundTransparency = Math.min(
      60,
      Number(els.backgroundTransparency?.value || 25)
    );

    state.subdomainSlug = els.subdomainSlug?.value || '';
    state.customDomain = els.customDomain?.value || '';
    state.useCustomDomain = els.useCustomDomain?.value === 'true';
    state.httpsEnabled = els.httpsEnabled?.value !== 'false';

    state.domainOption =
      document.querySelector('input[name="launchDomainOption"]:checked')?.value ||
      'pbi_subdomain';

    state.template =
      document.querySelector('input[name="templateStyle"]:checked')?.value ||
      state.template;

    const currentPage = state.pages[state.activePage] || pageDefaults.home;

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
    if (els.buttonTextColor) els.buttonTextColor.value = state.buttonTextColor || '#fffaf5';
    if (els.buttonTransparency) els.buttonTransparency.value = state.buttonTransparency;

    if (els.backgroundTransparency) {
      els.backgroundTransparency.value = state.backgroundTransparency;
    }

    if (els.subdomainSlug) els.subdomainSlug.value = state.subdomainSlug || '';
    if (els.customDomain) els.customDomain.value = state.customDomain || '';
    if (els.useCustomDomain) els.useCustomDomain.value = String(Boolean(state.useCustomDomain));
    if (els.httpsEnabled) els.httpsEnabled.value = String(state.httpsEnabled !== false);

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
  }

  function updateRangeNotes() {
    if (els.buttonTransparencyNote) {
      els.buttonTransparencyNote.textContent = `${state.buttonTransparency}% transparent`;
    }

    if (els.backgroundTransparencyNote) {
      els.backgroundTransparencyNote.textContent = `${state.backgroundTransparency}% transparent, maximum 60%`;
    }
  }

  function renderPageTabs() {
    if (!els.pageTabs) return;

    els.pageTabs.innerHTML = state.selectedPages.map((pageKey) => {
      const page = state.pages[pageKey] || pageDefaults[pageKey];

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
    const page = state.pages[state.activePage] || pageDefaults.home;

    if (els.pageTitle) els.pageTitle.value = page.title || '';
    if (els.pageBody) els.pageBody.value = page.body || '';
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

  function renderPreview() {
    if (!els.previewScroll) return;

    const businessName = state.businessName.trim() || 'Your Business';
    const page = state.pages[state.activePage] || state.pages.home;

    if (els.previewAddress) {
      els.previewAddress.textContent = `https://${getPreviewDomain()}`;
    }

    const pageButtons = state.selectedPages.map((pageKey) => {
      const selectedPage = state.pages[pageKey] || pageDefaults[pageKey];

      return `
        <button
          type="button"
          class="${pageKey === state.activePage ? 'active' : ''}"
          data-preview-page="${escapeHtml(pageKey)}"
        >
          ${escapeHtml(selectedPage.label)}
        </button>
      `;
    }).join('');

    const logo = state.logoDataUrl
      ? `<img class="site-logo-img" src="${state.logoDataUrl}" alt="${escapeHtml(businessName)} logo">`
      : '<div class="site-logo"></div>';

    const galleryMarkup = state.galleryImages.length
      ? `
        <div class="preview-gallery-grid">
          ${state.galleryImages.slice(0, 6).map((image) => `<img src="${image}" alt="">`).join('')}
        </div>
      `
      : '<div class="drop-hint">Upload pictures to fill this gallery.</div>';

    els.previewScroll.className = `preview-scroll pbi-template pbi-template-${state.template}`;
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

    els.previewScroll.innerHTML = `
      <div class="template-bg-layer"></div>

      <header class="tpl-${state.template}-nav">
        <div class="tpl-logo-wrap">
          ${logo}
          <strong>${escapeHtml(businessName)}</strong>
        </div>

        <nav class="site-links">
          ${pageButtons}
        </nav>
      </header>

      <section class="tpl-${state.template}-hero">
        <div>
          <p class="tpl-kicker">${escapeHtml(templates[state.template]?.label || 'Website')}</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p>${escapeHtml(page.body)}</p>
          <button class="preview-cta" style="color:var(--site-button-text)">Get in touch</button>
        </div>

        ${state.template === 'tech' ? '<div class="tpl-tech-orb"></div>' : ''}
      </section>

      ${
        state.activePage === 'gallery'
          ? `<section class="tpl-gallery-section"><h2>Gallery</h2>${galleryMarkup}</section>`
          : `
            <section class="tpl-feature-strip">
              <div><span>✦</span><strong>Simple setup</strong></div>
              <div><span>✦</span><strong>Mobile friendly</strong></div>
              <div><span>✦</span><strong>Editable content</strong></div>
              <div><span>✦</span><strong>Launch guidance</strong></div>
            </section>
          `
      }

      <footer class="preview-footer">
        © ${escapeHtml(businessName)} • Crafted with PBI
      </footer>
    `;

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
    renderPreview();
  }

  function collectProjectData() {
    syncInputsToState();

    return {
      project_name: state.projectName,
      business_name: state.businessName,
      page_main_heading: state.pageMainHeading,
      sub_heading: state.subHeading,
      ai_brief: state.aiBrief,

      template: state.template,

      accent_color: state.accentColor,
      background_color: state.backgroundColor,
      text_color: state.textColor,
      nav_color: state.navColor,
      button_color: state.buttonColor,
      button_text_color: state.buttonTextColor,
      button_transparency: state.buttonTransparency,

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
      domain_option: state.domainOption
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
      await api('/api/projects/update', {
        method: 'POST',
        body: JSON.stringify({
          id: projectId,
          name,
          data
        })
      });

      setSaveMessage('Project saved successfully.', 'success');
    } catch (error) {
      console.error(error);
      setSaveMessage(error.message || 'Could not save project.', 'error');
    } finally {
      if (els.saveBtn) {
        els.saveBtn.disabled = false;
        els.saveBtn.textContent = 'Save project';
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
      const result = await api(`/api/projects/get?id=${encodeURIComponent(projectId)}`);
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

      state.template = data.template || 'fashion';

      state.accentColor =
        data.accent_color || templates[state.template]?.accent || '#c86f3d';

      state.backgroundColor =
        data.background_color || templates[state.template]?.background || '#fff8f1';

      state.textColor =
        data.text_color || templates[state.template]?.text || '#2f1b12';

      state.navColor =
        data.nav_color || templates[state.template]?.nav || '#8a431d';

      state.buttonColor =
        data.button_color || templates[state.template]?.button || '#c86f3d';

      state.buttonTextColor = data.button_text_color || '#fffaf5';
      state.buttonTransparency = Number(data.button_transparency || 0);

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
      state.galleryImages = Array.isArray(data.gallery_images)
        ? data.gallery_images
        : [];

      state.backgroundImageDataUrl = data.background_image_data_url || '';
      state.backgroundTransparency = Number(data.background_transparency || 25);

      state.subdomainSlug = data.subdomain_slug || '';
      state.customDomain = data.custom_domain || '';
      state.useCustomDomain = Boolean(data.use_custom_domain);
      state.httpsEnabled = data.https_enabled !== false;
      state.domainOption = data.domain_option || project.domain_option || 'pbi_subdomain';
    } catch (error) {
      console.error(error);
      setSaveMessage(error.message || 'Could not load project.', 'error');
    }

    syncStateToInputs();
    renderAll();
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    state.logoDataUrl = await readFileAsDataUrl(file);
    renderPreview();
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

    const domain =
      state.useCustomDomain && state.customDomain.trim()
        ? state.customDomain.trim()
        : `${slugify(state.subdomainSlug || state.businessName || 'your-business')}.dev`;

    if (!domain) {
      setDomainMessage('Enter a domain or subdomain first.', 'error');
      return;
    }

    setDomainMessage('Checking domain...', 'info');

    try {
      const result = await api('/api/domain/check', {
        method: 'POST',
        body: JSON.stringify({ domain })
      });

      console.log('Domain check result:', result);

      setDomainMessage(
        `Cloudflare returned a result for ${domain}. Check the console/API response for full detail.`,
        'info'
      );
    } catch (error) {
      console.error(error);
      setDomainMessage(error.message || 'Could not check domain.', 'error');
    }
  }

  function applyTemplateDefaults(templateKey) {
    const template = templates[templateKey];

    if (!template) return;

    state.template = templateKey;
    state.accentColor = template.accent;
    state.backgroundColor = template.background;
    state.textColor = template.text;
    state.navColor = template.nav;
    state.buttonColor = template.button;

    syncStateToInputs();
    renderAll();
  }

  function bindEvents() {
    if (els.saveBtn) {
      els.saveBtn.addEventListener('click', saveProject);
    }

    if (els.aiGenerateBtn) {
      els.aiGenerateBtn.addEventListener('click', generateAiCopy);
    }

    if (els.backBtn) {
      els.backBtn.addEventListener('click', () => {
        window.location.href = '/dashboard/';
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
        input.addEventListener('input', () => {
          syncInputsToState();
          renderAll();
        });

        input.addEventListener('change', () => {
          syncInputsToState();
          renderAll();
        });
      });

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

  bindEvents();
  syncStateToInputs();
  renderAll();
  loadProject();
})();
