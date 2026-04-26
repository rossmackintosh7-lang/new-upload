(() => {
  const projectId = new URLSearchParams(window.location.search).get('project');

  const els = {
    saveBtn: document.getElementById('saveBtn'),
    backBtn: document.getElementById('backBtn'),
    logoutBtn: document.getElementById('logoutBtn'),

    checkDomainBtn: document.getElementById('checkDomainBtn'),

    projectName: document.getElementById('projectName'),
    businessName: document.getElementById('businessName'),
    location: document.getElementById('location'),
    accentColor: document.getElementById('accentColor'),
    brandTone: document.getElementById('brandTone'),

    useCustomDomain: document.getElementById('useCustomDomain'),
    httpsEnabled: document.getElementById('httpsEnabled'),
    subdomainSlug: document.getElementById('subdomainSlug'),
    customDomain: document.getElementById('customDomain'),
    domainResult: document.getElementById('domainResult'),

    logoUpload: document.getElementById('logoUpload'),
    galleryUpload: document.getElementById('galleryUpload'),
    galleryThumbs: document.getElementById('galleryThumbs'),

    desktopBtn: document.getElementById('desktopBtn'),
    mobileBtn: document.getElementById('mobileBtn'),
    previewFrame: document.getElementById('previewFrame')
  };

  const templates = [
    {
      id: 'warm-classic',
      label: 'Warm classic',
      description: 'Soft, welcoming, rounded and local-business friendly.'
    },
    {
      id: 'clean-local',
      label: 'Clean local',
      description: 'Light, tidy and simple for trades, cafés and services.'
    },
    {
      id: 'bold-trade',
      label: 'Bold trade',
      description: 'Strong headings and confident buttons.'
    },
    {
      id: 'elegant-studio',
      label: 'Elegant studio',
      description: 'Centered, polished and calm.'
    }
  ];

  const pageOptions = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'contact', label: 'Contact' }
  ];

  const state = {
    project: null,
    activePage: 'home',
    selectedPages: ['home', 'gallery'],
    logoDataUrl: '',
    backgroundImageDataUrl: '',
    galleryImages: [],
    data: {
      project_name: '',
      business_name: '',
      page_heading: '',
      sub_heading: '',
      accent_color: '#c86f3d',
      background_color: '#fff8f1',
      text_color: '#2f1b12',
      nav_color: '#8a431d',
      card_color: '#fffaf5',
      button_color: '#c86f3d',
      button_transparency: 100,
      background_image_transparency: 25,
      template: 'warm-classic',
      subdomain_slug: '',
      custom_domain: '',
      use_custom_domain: false,
      https_enabled: true
    }
  };

  function safeText(value, fallback = '') {
    const text = String(value || '').trim();
    return text || fallback;
  }

  function normaliseColour(value, fallback) {
    if (!value || typeof value !== 'string') return fallback;
    return value.startsWith('#') ? value : fallback;
  }

  function hexToRgb(hex) {
    const clean = String(hex || '').replace('#', '').trim();

    if (clean.length !== 6) {
      return { r: 200, g: 111, b: 61 };
    }

    const number = parseInt(clean, 16);

    return {
      r: (number >> 16) & 255,
      g: (number >> 8) & 255,
      b: number & 255
    };
  }

  function rgbaFromHex(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  function uid(prefix = 'id') {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function setMessage(message, type = 'info') {
    const el = document.getElementById('builderSaveStatus');

    if (!el) return;

    if (!message) {
      el.textContent = '';
      el.className = 'builder-save-status';
      return;
    }

    el.textContent = message;
    el.className = `builder-save-status ${type}`;

    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (el.textContent === message) {
          el.textContent = '';
          el.className = 'builder-save-status';
        }
      }, 4200);
    }
  }

  function setDomainMessage(message, type = 'info') {
    if (!els.domainResult) return;

    els.domainResult.textContent = message;
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

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const message = data.error || data.message || `Request failed with ${response.status}`;
      throw new Error(message);
    }

    return data;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });
  }

  function addColourAndTemplateControls() {
    const projectCard = els.projectName?.closest('.card');

    if (!projectCard || document.getElementById('templateChoice')) return;

    const block = document.createElement('div');

    block.innerHTML = `
      <div class="field">
        <label for="templateChoice">Website template</label>
        <select id="templateChoice" class="select">
          ${templates.map((template) => `<option value="${template.id}">${template.label}</option>`).join('')}
        </select>
        <div id="templateDescription" class="small-note muted"></div>
      </div>

      <div class="colour-grid">
        <div class="field">
          <label for="backgroundColor">Background colour</label>
          <input id="backgroundColor" class="input" type="color" value="#fff8f1">
        </div>

        <div class="field">
          <label for="textColor">Text colour</label>
          <input id="textColor" class="input" type="color" value="#2f1b12">
        </div>

        <div class="field">
          <label for="navColor">Navigation colour</label>
          <input id="navColor" class="input" type="color" value="#8a431d">
        </div>

        <div class="field">
          <label for="cardColor">Card colour</label>
          <input id="cardColor" class="input" type="color" value="#fffaf5">
        </div>

        <div class="field">
          <label for="buttonColor">Button colour</label>
          <input id="buttonColor" class="input" type="color" value="#c86f3d">
        </div>
      </div>

      <div class="field">
        <label for="buttonTransparency">Button transparency</label>
        <input id="buttonTransparency" class="range" type="range" min="40" max="100" value="100">
        <div id="buttonTransparencyNote" class="range-note">100% solid</div>
      </div>
    `;

    projectCard.appendChild(block);
  }

  function addPageSelectionControls() {
    const brandCard = els.logoUpload?.closest('.card') || els.galleryUpload?.closest('.card');

    if (!brandCard) return;

    document.querySelectorAll('#pageSelectionCard').forEach((card) => card.remove());

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'pageSelectionCard';

    card.innerHTML = `
      <h3>Pages</h3>
      <p class="muted">Choose which pages your website should include, then select the page you want to edit.</p>

      <div class="combined-page-section">
        <div>
          <h4 class="mini-heading">Pages included</h4>

          <div id="pageChoiceGrid" class="page-choice-grid">
            ${pageOptions.map((page) => `
              <label class="page-choice">
                <input type="checkbox" value="${page.id}" ${state.selectedPages.includes(page.id) ? 'checked' : ''}>
                <span>${page.label}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div>
          <h4 class="mini-heading">Page currently editing</h4>
          <div id="pageTabs" class="page-tabs"></div>
          <p class="muted small-note">Select a page above to preview it. Page-specific text editing will be added cleanly in the next upgrade.</p>
        </div>
      </div>
    `;

    brandCard.parentElement.insertBefore(card, brandCard);
  }

  function upgradeBrandDesignSection() {
    const brandCard = els.logoUpload?.closest('.card') || els.galleryUpload?.closest('.card');

    if (!brandCard || document.getElementById('backgroundImageUpload')) return;

    const heading = brandCard.querySelector('h3');
    if (heading) heading.textContent = 'Brand design';

    const galleryLabel = els.galleryUpload?.closest('.field')?.querySelector('label');
    if (galleryLabel) galleryLabel.textContent = 'Upload pictures';

    const block = document.createElement('div');

    block.innerHTML = `
      <div class="field">
        <label for="backgroundImageUpload">Upload background image</label>
        <input id="backgroundImageUpload" class="input" type="file" accept="image/*">
      </div>

      <div class="field">
        <label for="backgroundTransparency">Background image transparency</label>
        <input id="backgroundTransparency" class="range" type="range" min="0" max="60" value="25">
        <div id="backgroundTransparencyNote" class="range-note">25% transparent, maximum 60%</div>
      </div>
    `;

    brandCard.appendChild(block);
  }

  function getEnhancedEls() {
    return {
      templateChoice: document.getElementById('templateChoice'),
      templateDescription: document.getElementById('templateDescription'),
      backgroundColor: document.getElementById('backgroundColor'),
      textColor: document.getElementById('textColor'),
      navColor: document.getElementById('navColor'),
      cardColor: document.getElementById('cardColor'),
      buttonColor: document.getElementById('buttonColor'),
      buttonTransparency: document.getElementById('buttonTransparency'),
      buttonTransparencyNote: document.getElementById('buttonTransparencyNote'),
      pageChoiceGrid: document.getElementById('pageChoiceGrid'),
      pageTabs: document.getElementById('pageTabs'),
      backgroundImageUpload: document.getElementById('backgroundImageUpload'),
      backgroundTransparency: document.getElementById('backgroundTransparency'),
      backgroundTransparencyNote: document.getElementById('backgroundTransparencyNote')
    };
  }

  function updateRangeNotes() {
    const enhanced = getEnhancedEls();

    if (enhanced.buttonTransparencyNote && enhanced.buttonTransparency) {
      enhanced.buttonTransparencyNote.textContent = `${enhanced.buttonTransparency.value}% solid`;
    }

    if (enhanced.backgroundTransparencyNote && enhanced.backgroundTransparency) {
      const value = Math.min(60, Number(enhanced.backgroundTransparency.value || 25));
      enhanced.backgroundTransparency.value = String(value);
      enhanced.backgroundTransparencyNote.textContent = `${value}% transparent, maximum 60%`;
    }

    if (enhanced.templateDescription && enhanced.templateChoice) {
      const template = templates.find((item) => item.id === enhanced.templateChoice.value);
      enhanced.templateDescription.textContent = template?.description || '';
    }
  }

  function collectFormData() {
    const enhanced = getEnhancedEls();

    const selectedPages = [...document.querySelectorAll('#pageChoiceGrid input[type="checkbox"]:checked')]
      .map((input) => input.value);

    state.selectedPages = selectedPages.length ? selectedPages : ['home'];

    if (!state.selectedPages.includes(state.activePage)) {
      state.activePage = state.selectedPages[0] || 'home';
    }

    state.data = {
      project_name: safeText(els.projectName?.value, 'Untitled website'),
      business_name: safeText(els.businessName?.value, ''),
      page_heading: safeText(els.location?.value, ''),
      sub_heading: safeText(els.brandTone?.value, ''),
      accent_color: normaliseColour(els.accentColor?.value, '#c86f3d'),
      background_color: normaliseColour(enhanced.backgroundColor?.value, '#fff8f1'),
      text_color: normaliseColour(enhanced.textColor?.value, '#2f1b12'),
      nav_color: normaliseColour(enhanced.navColor?.value, '#8a431d'),
      card_color: normaliseColour(enhanced.cardColor?.value, '#fffaf5'),
      button_color: normaliseColour(enhanced.buttonColor?.value, '#c86f3d'),
      button_transparency: Number(enhanced.buttonTransparency?.value || 100),
      background_image_transparency: Math.min(60, Number(enhanced.backgroundTransparency?.value || 25)),
      template: enhanced.templateChoice?.value || 'warm-classic',
      selected_pages: state.selectedPages,
      active_page: state.activePage,
      logo_data_url: state.logoDataUrl,
      background_image_data_url: state.backgroundImageDataUrl,
      gallery_images: state.galleryImages,
      subdomain_slug: safeText(els.subdomainSlug?.value, ''),
      custom_domain: safeText(els.customDomain?.value, ''),
      use_custom_domain: ['true', 'yes', 'Yes'].includes(String(els.useCustomDomain?.value)),
      https_enabled: !['false', 'no', 'No'].includes(String(els.httpsEnabled?.value))
    };

    return state.data;
  }

  function applyFormData(data = {}) {
    state.data = { ...state.data, ...data };

    state.selectedPages = Array.isArray(data.selected_pages) && data.selected_pages.length
      ? data.selected_pages
      : state.selectedPages;

    state.activePage = data.active_page || state.selectedPages[0] || 'home';
    state.logoDataUrl = data.logo_data_url || '';
    state.backgroundImageDataUrl = data.background_image_data_url || '';
    state.galleryImages = Array.isArray(data.gallery_images) ? data.gallery_images : [];

    if (els.projectName) els.projectName.value = data.project_name || state.project?.name || '';
    if (els.businessName) els.businessName.value = data.business_name || '';
    if (els.location) els.location.value = data.page_heading || data.location || '';
    if (els.brandTone) els.brandTone.value = data.sub_heading || data.brand_tone || '';
    if (els.accentColor) els.accentColor.value = normaliseColour(data.accent_color, '#c86f3d');

    if (els.subdomainSlug) els.subdomainSlug.value = data.subdomain_slug || '';
    if (els.customDomain) els.customDomain.value = data.custom_domain || '';
    if (els.useCustomDomain) els.useCustomDomain.value = data.use_custom_domain ? 'true' : 'false';
    if (els.httpsEnabled) els.httpsEnabled.value = data.https_enabled === false ? 'false' : 'true';

    const enhanced = getEnhancedEls();

    if (enhanced.templateChoice) enhanced.templateChoice.value = data.template || 'warm-classic';
    if (enhanced.backgroundColor) enhanced.backgroundColor.value = normaliseColour(data.background_color, '#fff8f1');
    if (enhanced.textColor) enhanced.textColor.value = normaliseColour(data.text_color, '#2f1b12');
    if (enhanced.navColor) enhanced.navColor.value = normaliseColour(data.nav_color, '#8a431d');
    if (enhanced.cardColor) enhanced.cardColor.value = normaliseColour(data.card_color, '#fffaf5');
    if (enhanced.buttonColor) enhanced.buttonColor.value = normaliseColour(data.button_color, '#c86f3d');
    if (enhanced.buttonTransparency) enhanced.buttonTransparency.value = String(data.button_transparency ?? 100);
    if (enhanced.backgroundTransparency) enhanced.backgroundTransparency.value = String(Math.min(60, data.background_image_transparency ?? 25));

    updateRangeNotes();
    renderPageChoices();
    renderGalleryThumbs();
    renderPreview();
  }

  function renderPageChoices() {
    const enhanced = getEnhancedEls();

    if (enhanced.pageChoiceGrid) {
      enhanced.pageChoiceGrid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = state.selectedPages.includes(input.value);
      });
    }

    if (!enhanced.pageTabs) return;

    if (!state.selectedPages.includes(state.activePage)) {
      state.activePage = state.selectedPages[0] || 'home';
    }

    enhanced.pageTabs.innerHTML = state.selectedPages.map((pageId) => {
      const page = pageOptions.find((item) => item.id === pageId);
      const label = page?.label || pageId;

      return `<button type="button" data-page="${pageId}" class="${pageId === state.activePage ? 'active' : ''}">${label}</button>`;
    }).join('');
  }

  function getActivePageContent() {
    const data = collectFormData();
    const page = state.activePage || 'home';

    const businessName = safeText(data.business_name, 'Your Business');
    const mainHeading = safeText(data.page_heading, `${businessName} in your local area`);
    const subHeading = safeText(data.sub_heading, 'Your website intro will appear here as you build it out.');

    const contentByPage = {
      home: {
        title: mainHeading,
        body: subHeading
      },
      about: {
        title: `About ${businessName}`,
        body: subHeading || 'Tell customers who you are, what you do and why your business matters.'
      },
      services: {
        title: `${businessName} services`,
        body: subHeading || 'Show your key services, offers and reasons to choose you.'
      },
      gallery: {
        title: `${businessName} gallery`,
        body: subHeading || 'Show images that help customers understand your work.'
      },
      contact: {
        title: `Contact ${businessName}`,
        body: subHeading || 'Add your contact details, opening hours and location.'
      }
    };

    return contentByPage[page] || contentByPage.home;
  }

  function renderGalleryThumbs() {
    if (!els.galleryThumbs) return;

    els.galleryThumbs.innerHTML = '';

    state.galleryImages.forEach((image, index) => {
      const item = document.createElement('div');
      item.className = 'thumb-item';

      item.innerHTML = `
        <img src="${image.dataUrl}" alt="${image.name || 'Uploaded picture'}">
        <button type="button" class="thumb-remove" aria-label="Remove image">×</button>
      `;

      item.querySelector('button')?.addEventListener('click', () => {
        state.galleryImages.splice(index, 1);
        renderGalleryThumbs();
        renderPreview();
      });

      els.galleryThumbs.appendChild(item);
    });
  }

  function getPreviewRoot() {
    return document.querySelector('.preview-scroll');
  }

  function getPreviewPage() {
    return document.querySelector('.preview-scroll .page');
  }

  function renderPreview() {
    const previewRoot = getPreviewRoot();
    const previewPage = getPreviewPage();

    if (!previewRoot || !previewPage) return;

    const data = collectFormData();
    const content = getActivePageContent();

    const businessName = safeText(data.business_name, 'Your Business');
    const slug = slugify(data.subdomain_slug || businessName || 'your-business') || 'your-business';

    const domain = data.use_custom_domain && data.custom_domain
      ? data.custom_domain
      : `${slug}.pbi.dev`;

    const buttonAlpha = Math.max(0.4, Math.min(1, Number(data.button_transparency || 100) / 100));
    const bgImageAlpha = 1 - Math.min(60, Number(data.background_image_transparency || 25)) / 100;

    const templateClass = `template-${data.template || 'warm-classic'}`;

    previewRoot.className = `preview-scroll ${templateClass}`;
    previewRoot.style.background = data.background_color || '#fff8f1';
    previewRoot.style.color = data.text_color || '#2f1b12';

    let bgLayer = previewRoot.querySelector('.preview-bg-layer');

    if (!bgLayer) {
      bgLayer = document.createElement('div');
      bgLayer.className = 'preview-bg-layer';
      previewRoot.prepend(bgLayer);
    }

    if (state.backgroundImageDataUrl) {
      bgLayer.style.backgroundImage = `url("${state.backgroundImageDataUrl}")`;
      bgLayer.style.opacity = String(bgImageAlpha);
    } else {
      bgLayer.style.backgroundImage = '';
      bgLayer.style.opacity = '0';
    }

    const address = document.querySelector('.address');
    if (address) address.textContent = `https://${domain}`;

    const siteNav = document.querySelector('.site-nav');

    if (siteNav) {
      siteNav.style.background = `linear-gradient(135deg, ${data.nav_color}, ${rgbaFromHex(data.button_color, 0.88)})`;
    }

    const siteLogo = document.querySelector('.site-logo');

    if (siteLogo) {
      if (state.logoDataUrl) {
        siteLogo.style.backgroundImage = `url("${state.logoDataUrl}")`;
        siteLogo.style.backgroundSize = 'contain';
        siteLogo.style.backgroundRepeat = 'no-repeat';
        siteLogo.style.backgroundPosition = 'center';
        siteLogo.style.backgroundColor = 'transparent';
      } else {
        siteLogo.style.backgroundImage = '';
        siteLogo.style.backgroundColor = data.button_color;
      }
    }

    const siteBrand = document.querySelector('.site-brand span');
    if (siteBrand) siteBrand.textContent = businessName;

    const siteLinks = document.querySelector('.site-links');

    if (siteLinks) {
      siteLinks.id = 'previewLinks';

      siteLinks.innerHTML = state.selectedPages.map((pageId) => {
        const page = pageOptions.find((item) => item.id === pageId);
        const label = page?.label || pageId;
        const active = pageId === state.activePage ? 'active' : '';

        return `<button type="button" data-page="${pageId}" class="${active}">${label}</button>`;
      }).join('');
    }

    previewPage.style.background = 'transparent';
    previewPage.style.color = data.text_color || '#2f1b12';

    const heading = previewPage.querySelector('h2');

    if (heading) {
      heading.textContent = content.title;
      heading.style.color = data.text_color || '#2f1b12';
    }

    const paragraph = previewPage.querySelector('p');

    if (paragraph) {
      paragraph.textContent = content.body;
      paragraph.style.color = rgbaFromHex(data.text_color || '#2f1b12', 0.76);
    }

    let templateLabel = previewPage.querySelector('.preview-template-label');

    if (!templateLabel) {
      templateLabel = document.createElement('div');
      templateLabel.className = 'preview-template-label';
      previewPage.insertBefore(templateLabel, previewPage.firstChild);
    }

    const template = templates.find((item) => item.id === data.template);
    templateLabel.textContent = template?.label || 'Warm classic';

    let cta = previewPage.querySelector('.preview-cta');

    if (!cta) {
      cta = document.createElement('button');
      cta.className = 'preview-cta';
      cta.type = 'button';
      previewPage.appendChild(cta);
    }

    cta.textContent = state.activePage === 'contact' ? 'Get in touch' : 'Find out more';
    cta.style.background = rgbaFromHex(data.button_color, buttonAlpha);
    cta.style.color = '#fffaf5';

    if (state.activePage === 'gallery') {
      let galleryPreview = previewPage.querySelector('.preview-gallery-grid');

      if (!galleryPreview) {
        galleryPreview = document.createElement('div');
        galleryPreview.className = 'preview-gallery-grid';
        previewPage.appendChild(galleryPreview);
      }

      galleryPreview.innerHTML = state.galleryImages.length
        ? state.galleryImages.map((image) => `<img src="${image.dataUrl}" alt="${image.name || 'Gallery image'}">`).join('')
        : '<div class="drop-hint">Upload pictures in Brand design to show them here.</div>';
    } else {
      previewPage.querySelector('.preview-gallery-grid')?.remove();
    }

    const footer = document.querySelector('.preview-footer');
    if (footer) footer.textContent = `© ${businessName} • Crafted with PBI`;
  }

  async function loadProject() {
    if (!projectId) {
      setMessage('No project ID found in the URL.', 'error');
      return;
    }

    try {
      const result = await api(`/api/projects/get?id=${encodeURIComponent(projectId)}`);
      const project = result.project;

      if (!project) {
        setMessage('Project not found.', 'error');
        return;
      }

      state.project = project;

      let savedData = {};

      if (project.data_json) {
        savedData = typeof project.data_json === 'string'
          ? JSON.parse(project.data_json)
          : project.data_json;
      }

      applyFormData({
        ...savedData,
        project_name: savedData.project_name || project.name || ''
      });
    } catch (err) {
      console.warn('Project load skipped:', err);
      setMessage(err.message || 'Could not load project.', 'error');
      renderPreview();
    }
  }

  async function saveProject() {
    if (!projectId) {
      setMessage('No project ID found in the URL.', 'error');
      return;
    }

    const data = collectFormData();

    if (els.saveBtn) {
      els.saveBtn.disabled = true;
      els.saveBtn.textContent = 'Saving...';
    }

    setMessage('Saving project...', 'saving');

    try {
      const result = await api('/api/projects/update', {
        method: 'POST',
        body: JSON.stringify({
          id: projectId,
          name: data.project_name || 'Untitled website',
          data
        })
      });

      state.project = result.project || state.project;

      setMessage('Project saved successfully.', 'success');
      console.log('Project saved:', result);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Could not save project.', 'error');
    } finally {
      if (els.saveBtn) {
        els.saveBtn.disabled = false;
        els.saveBtn.textContent = 'Save project';
      }
    }
  }

  function getDomainToCheck() {
    const useCustom = ['true', 'yes', 'Yes'].includes(String(els.useCustomDomain?.value));
    const custom = safeText(els.customDomain?.value, '');
    const slug = slugify(els.subdomainSlug?.value || 'your-business') || 'your-business';

    return useCustom ? custom : `${slug}.dev`;
  }

  async function checkDomain() {
    const domain = getDomainToCheck();

    if (!domain) {
      setDomainMessage('Enter a domain first.', 'error');
      return;
    }

    setDomainMessage(`Checking ${domain}...`, 'info');

    if (els.checkDomainBtn) {
      els.checkDomainBtn.disabled = true;
      els.checkDomainBtn.textContent = 'Checking...';
    }

    try {
      const data = await api('/api/domain/check', {
        method: 'POST',
        body: JSON.stringify({ domain })
      });

      const cloudflareResult = data.result || {};
      const checkedDomain = data.domain || domain;

      const firstDomain =
        Array.isArray(cloudflareResult.domains) && cloudflareResult.domains.length
          ? cloudflareResult.domains[0]
          : null;

      if (firstDomain && firstDomain.registrable === true) {
        const price = firstDomain.pricing?.registration_cost;
        const currency = firstDomain.pricing?.currency || '';

        const priceText = price
          ? ` Registration cost: ${currency} ${price}.`
          : '';

        setDomainMessage(
          `${checkedDomain} appears to be available.${priceText}`,
          'success'
        );
      } else if (firstDomain && firstDomain.registrable === false) {
        setDomainMessage(
          `${checkedDomain} does not appear to be available.`,
          'error'
        );
      } else {
        console.log('Domain check unclear response:', data);

        setDomainMessage(
          `Cloudflare returned a result for ${checkedDomain}, but availability was unclear. Check the console/API response.`,
          'info'
        );
      }
    } catch (err) {
      console.error(err);
      setDomainMessage(err.message || 'Could not check domain.', 'error');
    } finally {
      if (els.checkDomainBtn) {
        els.checkDomainBtn.disabled = false;
        els.checkDomainBtn.textContent = 'Check domain';
      }
    }
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      state.logoDataUrl = await readFileAsDataUrl(file);
      renderPreview();
      setMessage('Logo added. Remember to save your project.', 'info');
    } catch (err) {
      setMessage(err.message || 'Could not upload logo.', 'error');
    }
  }

  async function handleGalleryUpload(event) {
    const files = [...(event.target.files || [])];

    if (!files.length) return;

    try {
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);

        state.galleryImages.push({
          id: uid('image'),
          name: file.name,
          dataUrl
        });
      }

      renderGalleryThumbs();
      renderPreview();
      setMessage('Pictures uploaded. Remember to save your project.', 'info');
    } catch (err) {
      setMessage(err.message || 'Could not upload pictures.', 'error');
    }
  }

  async function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      state.backgroundImageDataUrl = await readFileAsDataUrl(file);
      renderPreview();
      setMessage('Background image added. Remember to save your project.', 'info');
    } catch (err) {
      setMessage(err.message || 'Could not upload background image.', 'error');
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Still redirect.
    }

    window.location.href = '/login/';
  }

  function bindEvents() {
    if (els.saveBtn) els.saveBtn.addEventListener('click', saveProject);

    if (els.backBtn) {
      els.backBtn.addEventListener('click', () => {
        window.location.href = '/dashboard/';
      });
    }

    if (els.logoutBtn) els.logoutBtn.addEventListener('click', logout);

    if (els.checkDomainBtn) els.checkDomainBtn.addEventListener('click', checkDomain);

    if (els.logoUpload) els.logoUpload.addEventListener('change', handleLogoUpload);
    if (els.galleryUpload) els.galleryUpload.addEventListener('change', handleGalleryUpload);

    document.addEventListener('input', (event) => {
      const target = event.target;

      if (
        target.matches(
          '#projectName, #businessName, #location, #brandTone, #accentColor, #backgroundColor, #textColor, #navColor, #cardColor, #buttonColor, #buttonTransparency, #backgroundTransparency, #subdomainSlug, #customDomain'
        )
      ) {
        updateRangeNotes();
        renderPreview();
      }
    });

    document.addEventListener('change', (event) => {
      const target = event.target;

      if (target.matches('#templateChoice, #useCustomDomain, #httpsEnabled')) {
        updateRangeNotes();
        renderPreview();
      }

      if (target.matches('#pageChoiceGrid input[type="checkbox"]')) {
        const selected = [...document.querySelectorAll('#pageChoiceGrid input[type="checkbox"]:checked')]
          .map((input) => input.value);

        state.selectedPages = selected.length ? selected : ['home'];

        if (!state.selectedPages.includes(state.activePage)) {
          state.activePage = state.selectedPages[0];
        }

        renderPageChoices();
        renderPreview();
      }

      if (target.matches('#backgroundImageUpload')) {
        handleBackgroundUpload(event);
      }
    });

    document.addEventListener('click', (event) => {
      const pageButton = event.target.closest('#pageTabs button[data-page], #previewLinks button[data-page]');

      if (pageButton) {
        state.activePage = pageButton.dataset.page;
        renderPageChoices();
        renderPreview();
      }
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

  function bootEnhancements() {
    addColourAndTemplateControls();
    addPageSelectionControls();
    upgradeBrandDesignSection();
    updateRangeNotes();
    renderPageChoices();
  }

  async function boot() {
    bootEnhancements();
    bindEvents();

    await loadProject();

    updateRangeNotes();
    renderPageChoices();
    renderGalleryThumbs();
    renderPreview();

    setTimeout(() => {
      renderPreview();
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
