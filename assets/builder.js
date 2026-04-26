document.addEventListener('DOMContentLoaded', () => {
  const projectId = new URLSearchParams(window.location.search).get('project');

  const saveBtn = document.getElementById('saveBtn');
  const backBtn = document.getElementById('backBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const projectName = document.getElementById('projectName');
  const businessName = document.getElementById('businessName');
  const locationInput = document.getElementById('location');
  const accentColor = document.getElementById('accentColor');
  const brandTone = document.getElementById('brandTone');

  const templateChoice = document.getElementById('templateChoice');
  const backgroundColor = document.getElementById('backgroundColor');
  const textColor = document.getElementById('textColor');
  const navColor = document.getElementById('navColor');
  const cardColor = document.getElementById('cardColor');
  const buttonColor = document.getElementById('buttonColor');
  const buttonTransparency = document.getElementById('buttonTransparency');
  const buttonTransparencyValue = document.getElementById('buttonTransparencyValue');

  const subdomainSlug = document.getElementById('subdomainSlug');
  const customDomain = document.getElementById('customDomain');
  const useCustomDomain = document.getElementById('useCustomDomain');
  const httpsEnabled = document.getElementById('httpsEnabled');
  const domainResult = document.getElementById('domainResult');
  const saveStatus = document.getElementById('saveStatus');

  const pageTabs = document.getElementById('pageTabs');
  const previewLinks = document.getElementById('previewLinks');
  const pageTitle = document.getElementById('pageTitle');
  const pageBody = document.getElementById('pageBody');
  const pageToggles = document.querySelectorAll('.page-toggle');

  const desktopBtn = document.getElementById('desktopBtn');
  const mobileBtn = document.getElementById('mobileBtn');
  const previewFrame = document.getElementById('previewFrame');
  const previewDropZone = document.getElementById('previewDropZone');
  const previewBgLayer = document.getElementById('previewBgLayer');
  const previewImageArea = document.getElementById('previewImageArea');
  const previewTemplateLabel = document.getElementById('previewTemplateLabel');

  const logoUpload = document.getElementById('logoUpload');
  const galleryUpload = document.getElementById('galleryUpload');
  const backgroundUpload = document.getElementById('backgroundUpload');
  const backgroundTransparency = document.getElementById('backgroundTransparency');
  const backgroundTransparencyValue = document.getElementById('backgroundTransparencyValue');
  const galleryThumbs = document.getElementById('galleryThumbs');

  const checkDomainBtn = document.getElementById('checkDomainBtn');
  const onboardDomainBtn = document.getElementById('onboardDomainBtn');

  let activePage = 'home';

  const defaultPages = {
    home: {
      label: 'Home',
      title: 'Your homepage headline',
      body: 'Your website intro will appear here as you build it out.'
    },
    about: {
      label: 'About',
      title: 'About your business',
      body: 'Tell visitors who you are, what you do, and why they should trust you.'
    },
    services: {
      label: 'Services',
      title: 'Your services',
      body: 'List your main services and explain how you help customers.'
    },
    gallery: {
      label: 'Gallery',
      title: 'Gallery',
      body: 'Showcase your best work, products, food, projects, or team.'
    },
    contact: {
      label: 'Contact',
      title: 'Contact',
      body: 'Tell customers how to get in touch.'
    }
  };

  const templateLabels = {
    'warm-classic': 'Warm Classic',
    'clean-local': 'Clean Local',
    'bold-trade': 'Bold Trade',
    'elegant-studio': 'Elegant Studio'
  };

  const state = {
    project_name: '',
    business_name: '',
    page_main_heading: '',
    sub_heading: '',

    template_choice: 'warm-classic',

    background_color: '#fbf3ec',
    accent_color: '#c86f3d',
    text_color: '#2f1b12',
    nav_color: '#7a3f20',
    card_color: '#fffaf5',
    button_color: '#c86f3d',
    button_transparency: 0,

    subdomain_slug: '',
    custom_domain: '',
    use_custom_domain: false,
    https_enabled: true,

    logo_data_url: '',
    gallery_images: [],
    preview_images: [],
    background_image_url: '',
    background_transparency: 25,

    selected_pages: ['home', 'about', 'services', 'gallery', 'contact'],
    pages: structuredClone(defaultPages)
  };

  function structuredCloneFallback(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeClone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return structuredCloneFallback(value);
  }

  function hexToRgb(hex) {
    const cleaned = String(hex || '#000000').replace('#', '');

    const full = cleaned.length === 3
      ? cleaned.split('').map((char) => char + char).join('')
      : cleaned;

    const number = parseInt(full, 16);

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

  function setMessage(message, type = 'info') {
    if (!saveStatus) return;

    saveStatus.textContent = message;
    saveStatus.className = `builder-save-status ${type}`;

    if (message) {
      setTimeout(() => {
        if (saveStatus.textContent === message) {
          saveStatus.textContent = '';
          saveStatus.className = 'builder-save-status';
        }
      }, 3500);
    }
  }

  function showDomainMessage(message, type = 'info') {
    if (!domainResult) return;

    domainResult.textContent = message;
    domainResult.className = `notice domain-${type}`;
    domainResult.style.display = 'block';
  }

  function ensurePages() {
    state.pages = {
      ...safeClone(defaultPages),
      ...(state.pages || {})
    };

    if (!Array.isArray(state.selected_pages) || state.selected_pages.length === 0) {
      state.selected_pages = ['home', 'about', 'services', 'gallery', 'contact'];
    }

    if (!state.selected_pages.includes('home')) {
      state.selected_pages.unshift('home');
    }
  }

  function syncStateFromInputs() {
    ensurePages();

    state.project_name = projectName?.value || '';
    state.business_name = businessName?.value || '';
    state.page_main_heading = locationInput?.value || '';
    state.sub_heading = brandTone?.value || '';

    state.template_choice = templateChoice?.value || 'warm-classic';

    state.background_color = backgroundColor?.value || '#fbf3ec';
    state.accent_color = accentColor?.value || '#c86f3d';
    state.text_color = textColor?.value || '#2f1b12';
    state.nav_color = navColor?.value || '#7a3f20';
    state.card_color = cardColor?.value || '#fffaf5';
    state.button_color = buttonColor?.value || '#c86f3d';
    state.button_transparency = Number(buttonTransparency?.value || 0);

    state.subdomain_slug = subdomainSlug?.value || '';
    state.custom_domain = customDomain?.value || '';
    state.use_custom_domain = useCustomDomain?.value === 'true';
    state.https_enabled = httpsEnabled?.value !== 'false';

    state.background_transparency = Math.min(Number(backgroundTransparency?.value || 0), 60);

    state.selected_pages = Array.from(pageToggles)
      .filter((input) => input.checked)
      .map((input) => input.value);

    if (!state.selected_pages.includes('home')) {
      state.selected_pages.unshift('home');
    }

    if (!state.selected_pages.includes(activePage)) {
      activePage = state.selected_pages[0] || 'home';
    }

    if (!state.pages[activePage]) {
      state.pages[activePage] = {
        label: defaultPages[activePage]?.label || activePage,
        title: '',
        body: ''
      };
    }

    state.pages[activePage].title = pageTitle?.value || '';
    state.pages[activePage].body = pageBody?.value || '';
  }

  function syncInputsFromState() {
    ensurePages();

    if (projectName) projectName.value = state.project_name || '';
    if (businessName) businessName.value = state.business_name || '';
    if (locationInput) locationInput.value = state.page_main_heading || state.location || '';
    if (brandTone) brandTone.value = state.sub_heading || state.brand_tone || '';

    if (templateChoice) templateChoice.value = state.template_choice || 'warm-classic';

    if (backgroundColor) backgroundColor.value = state.background_color || '#fbf3ec';
    if (accentColor) accentColor.value = state.accent_color || '#c86f3d';
    if (textColor) textColor.value = state.text_color || '#2f1b12';
    if (navColor) navColor.value = state.nav_color || '#7a3f20';
    if (cardColor) cardColor.value = state.card_color || '#fffaf5';
    if (buttonColor) buttonColor.value = state.button_color || '#c86f3d';
    if (buttonTransparency) buttonTransparency.value = String(state.button_transparency || 0);
    if (buttonTransparencyValue) buttonTransparencyValue.textContent = `${state.button_transparency || 0}%`;

    if (subdomainSlug) subdomainSlug.value = state.subdomain_slug || '';
    if (customDomain) customDomain.value = state.custom_domain || '';
    if (useCustomDomain) useCustomDomain.value = String(Boolean(state.use_custom_domain));
    if (httpsEnabled) httpsEnabled.value = String(state.https_enabled !== false);

    if (backgroundTransparency) {
      backgroundTransparency.value = String(Math.min(Number(state.background_transparency || 0), 60));
    }

    if (backgroundTransparencyValue) {
      backgroundTransparencyValue.textContent = `${Math.min(Number(state.background_transparency || 0), 60)}%`;
    }

    pageToggles.forEach((input) => {
      input.checked = state.selected_pages.includes(input.value);
    });

    syncPageInputs();
  }

  function syncPageInputs() {
    ensurePages();

    if (!state.selected_pages.includes(activePage)) {
      activePage = state.selected_pages[0] || 'home';
    }

    const page = state.pages[activePage] || {
      title: '',
      body: ''
    };

    if (pageTitle) pageTitle.value = page.title || '';
    if (pageBody) pageBody.value = page.body || '';

    document.querySelectorAll('[data-page]').forEach((button) => {
      const pageName = button.dataset.page;
      const isSelected = state.selected_pages.includes(pageName);

      button.classList.toggle('active', pageName === activePage);
      button.style.display = isSelected ? '' : 'none';
    });
  }

  function renderGallery() {
    if (!galleryThumbs) return;

    galleryThumbs.innerHTML = '';

    state.gallery_images.forEach((image, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'thumb-item';
      wrapper.draggable = true;
      wrapper.dataset.index = String(index);

      const img = document.createElement('img');
      img.src = image;
      img.alt = `Uploaded image ${index + 1}`;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.className = 'thumb-remove';
      remove.addEventListener('click', () => {
        state.gallery_images.splice(index, 1);
        state.preview_images = state.preview_images.filter((previewImage) => previewImage !== image);
        renderGallery();
        renderPreview();
        setMessage('Image removed. Remember to save.', 'info');
      });

      wrapper.appendChild(img);
      wrapper.appendChild(remove);

      wrapper.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', image);
        event.dataTransfer.effectAllowed = 'copy';
      });

      galleryThumbs.appendChild(wrapper);
    });
  }

  function renderPreviewImages() {
    if (!previewImageArea) return;

    previewImageArea.innerHTML = '';

    if (!state.preview_images || state.preview_images.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'drop-hint';
      hint.textContent = 'Drag uploaded pictures here';
      previewImageArea.appendChild(hint);
      return;
    }

    state.preview_images.forEach((image, index) => {
      const tile = document.createElement('div');
      tile.className = 'preview-image-tile';
      tile.draggable = true;
      tile.dataset.index = String(index);

      const img = document.createElement('img');
      img.src = image;
      img.alt = `Preview image ${index + 1}`;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        state.preview_images.splice(index, 1);
        renderPreviewImages();
        setMessage('Preview image removed. Remember to save.', 'info');
      });

      tile.appendChild(img);
      tile.appendChild(remove);
      previewImageArea.appendChild(tile);
    });
  }

  function applyTemplate(previewScroll, pageElement) {
    const template = state.template_choice || 'warm-classic';

    previewScroll.classList.remove(
      'template-warm-classic',
      'template-clean-local',
      'template-bold-trade',
      'template-elegant-studio'
    );

    previewScroll.classList.add(`template-${template}`);

    if (previewTemplateLabel) {
      previewTemplateLabel.textContent = templateLabels[template] || 'Template';
    }

    if (pageElement) {
      pageElement.dataset.template = template;
    }
  }

  function renderPreview() {
    syncStateFromInputs();

    const business = state.business_name || 'Your Business';
    const heading = state.page_main_heading || state.location || 'Your homepage headline';
    const subHeading = state.sub_heading || state.brand_tone || 'Your website intro will appear here as you build it out.';
    const slug = state.subdomain_slug || slugify(business) || 'your-business';
    const page = state.pages[activePage] || state.pages.home;

    const brandText = document.querySelector('.site-brand span');
    const headline = document.querySelector('.page h2');
    const intro = document.querySelector('.page p');
    const footer = document.querySelector('.preview-footer');
    const address = document.querySelector('.address');
    const logo = document.querySelector('.site-logo');
    const previewScroll = document.querySelector('.preview-scroll');
    const siteNav = document.querySelector('.site-nav');
    const pageElement = document.querySelector('.page');
    const previewCta = document.querySelector('.preview-cta');

    if (brandText) brandText.textContent = business.toUpperCase();

    if (headline) {
      headline.textContent = activePage === 'home'
        ? heading
        : page?.title || heading;
    }

    if (intro) {
      intro.textContent = activePage === 'home'
        ? subHeading
        : page?.body || subHeading;
    }

    if (footer) {
      footer.textContent = `© ${business} • Crafted with PBI`;
    }

    if (address) {
      address.textContent = state.use_custom_domain && state.custom_domain
        ? `https://${state.custom_domain}`
        : `https://${slug}.pbi.dev`;
    }

    if (logo) {
      if (state.logo_data_url) {
        logo.style.background = `center / cover no-repeat url("${state.logo_data_url}")`;
      } else {
        logo.style.background = state.accent_color;
      }
    }

    if (previewScroll) {
      previewScroll.style.background = `linear-gradient(180deg, ${rgbaFromHex(state.accent_color, 0.28)}, ${state.background_color} 88%)`;
      applyTemplate(previewScroll, pageElement);
    }

    if (siteNav) {
      siteNav.style.background = `linear-gradient(90deg, ${state.nav_color}, ${state.accent_color})`;
    }

    if (pageElement) {
      pageElement.style.color = state.text_color;
    }

    if (headline) headline.style.color = state.text_color;
    if (intro) intro.style.color = rgbaFromHex(state.text_color, 0.78);

    if (previewCta) {
      const alpha = Math.max(0.3, 1 - Number(state.button_transparency || 0) / 100);
      previewCta.style.background = rgbaFromHex(state.button_color, alpha);
      previewCta.style.color = '#fffaf5';
      previewCta.style.borderColor = rgbaFromHex(state.button_color, 0.25);
    }

    if (previewBgLayer) {
      const transparency = Math.min(Number(state.background_transparency || 0), 60);
      const opacity = 1 - transparency / 100;

      if (state.background_image_url) {
        previewBgLayer.style.backgroundImage = `url("${state.background_image_url}")`;
        previewBgLayer.style.opacity = String(opacity);
      } else {
        previewBgLayer.style.backgroundImage = '';
        previewBgLayer.style.opacity = '0';
      }
    }

    if (buttonTransparencyValue) {
      buttonTransparencyValue.textContent = `${state.button_transparency || 0}%`;
    }

    if (backgroundTransparencyValue) {
      backgroundTransparencyValue.textContent = `${Math.min(Number(state.background_transparency || 0), 60)}%`;
    }

    syncPageInputs();
    renderPreviewImages();
  }

  async function saveProject() {
    syncStateFromInputs();

    if (!projectId) {
      setMessage('No project ID found in the URL.', 'error');
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    setMessage('Saving project...', 'saving');

    try {
      const response = await fetch('/api/projects/update', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: projectId,
          name: state.project_name || state.business_name || 'Untitled website',
          data: state
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || result.message || `Save failed with status ${response.status}`);
      }

      setMessage('Project saved successfully.', 'success');
    } catch (err) {
      setMessage(err.message || 'Save failed.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save project';
      }
    }
  }

  async function loadProject() {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/projects/get?id=${encodeURIComponent(projectId)}`, {
        credentials: 'include'
      });

      if (!response.ok) return;

      const result = await response.json();

      if (!result.project) return;

      const project = result.project;
      let savedData = {};

      if (project.data_json) {
        savedData = typeof project.data_json === 'string'
          ? JSON.parse(project.data_json)
          : project.data_json;
      }

      Object.assign(state, savedData);

      state.project_name = project.name || savedData.project_name || '';
      state.page_main_heading = savedData.page_main_heading || savedData.location || '';
      state.sub_heading = savedData.sub_heading || savedData.brand_tone || '';
      state.pages = {
        ...safeClone(defaultPages),
        ...(savedData.pages || {})
      };

      ensurePages();
      syncInputsFromState();
      renderGallery();
      renderPreview();
    } catch (err) {
      console.warn('Could not load project:', err);
    }
  }

  function switchPage(pageName) {
    syncStateFromInputs();

    if (!state.selected_pages.includes(pageName)) return;

    activePage = pageName;

    if (!state.pages[activePage]) {
      state.pages[activePage] = safeClone(defaultPages[activePage] || {
        label: pageName,
        title: '',
        body: ''
      });
    }

    syncPageInputs();
    renderPreview();
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      state.logo_data_url = await fileToDataUrl(file);
      renderPreview();
      setMessage('Logo added. Remember to save the project.', 'info');
    } catch (err) {
      setMessage(err.message || 'Could not upload logo.', 'error');
    }
  }

  async function handleGalleryUpload(event) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    try {
      const images = [];

      for (const file of files.slice(0, 12)) {
        images.push(await fileToDataUrl(file));
      }

      state.gallery_images = [...state.gallery_images, ...images].slice(0, 24);
      renderGallery();
      setMessage('Pictures added. Drag them into the preview, then save.', 'info');
    } catch (err) {
      setMessage(err.message || 'Could not upload pictures.', 'error');
    }
  }

  async function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      state.background_image_url = await fileToDataUrl(file);
      renderPreview();
      setMessage('Background image added. Remember to save.', 'info');
    } catch (err) {
      setMessage(err.message || 'Could not upload background image.', 'error');
    }
  }

  async function checkDomain() {
    syncStateFromInputs();

    const domain = state.use_custom_domain
      ? state.custom_domain.trim()
      : `${state.subdomain_slug || slugify(state.business_name) || 'your-business'}.dev`;

    if (!domain || !domain.includes('.')) {
      showDomainMessage('Enter a full domain name first, for example yourbusiness.co.uk.', 'error');
      return;
    }

    showDomainMessage(`Checking ${domain} with Cloudflare...`, 'info');

    try {
      const response = await fetch('/api/domain/check', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || result.message || `Domain check failed with status ${response.status}`);
      }

      const checked = result.result?.[0] || result.result || result.domain || result;

      const available = checked.available ?? checked.registrable ?? checked.is_available;
      const reason = checked.reason || checked.status || '';

      if (available === true) {
        showDomainMessage(`${domain} looks available.`, 'success');
      } else if (available === false) {
        showDomainMessage(`${domain} is not available${reason ? `: ${reason}` : '.'}`, 'error');
      } else {
        showDomainMessage(`Cloudflare returned a result for ${domain}, but availability was unclear. Check the console/API response.`, 'info');
        console.log('Domain check result:', result);
      }
    } catch (err) {
      showDomainMessage(err.message || 'Could not check domain.', 'error');
    }
  }

  function onboardDomain() {
    syncStateFromInputs();

    const domain = state.custom_domain || state.subdomain_slug || '';

    showDomainMessage(
      domain
        ? `Custom hostname onboarding placeholder for ${domain}. Next step is wiring this to Cloudflare for SaaS.`
        : 'Add a custom domain or subdomain first.',
      'info'
    );
  }

  if (saveBtn) saveBtn.addEventListener('click', saveProject);

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard/';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      }).catch(() => {});

      window.location.href = '/login/';
    });
  }

  if (desktopBtn && mobileBtn && previewFrame) {
    desktopBtn.addEventListener('click', () => {
      previewFrame.style.maxWidth = '100%';
      previewFrame.style.margin = '0';
      desktopBtn.classList.add('active');
      mobileBtn.classList.remove('active');
    });

    mobileBtn.addEventListener('click', () => {
      previewFrame.style.maxWidth = '390px';
      previewFrame.style.margin = '0 auto';
      mobileBtn.classList.add('active');
      desktopBtn.classList.remove('active');
    });
  }

  if (pageTabs) {
    pageTabs.querySelectorAll('[data-page]').forEach((button) => {
      button.addEventListener('click', () => switchPage(button.dataset.page));
    });
  }

  if (previewLinks) {
    previewLinks.querySelectorAll('[data-page]').forEach((button) => {
      button.addEventListener('click', () => switchPage(button.dataset.page));
    });
  }

  pageToggles.forEach((input) => {
    input.addEventListener('change', () => {
      syncStateFromInputs();
      syncPageInputs();
      renderPreview();
      setMessage('Page selection updated. Remember to save.', 'info');
    });
  });

  if (checkDomainBtn) checkDomainBtn.addEventListener('click', checkDomain);
  if (onboardDomainBtn) onboardDomainBtn.addEventListener('click', onboardDomain);

  if (logoUpload) logoUpload.addEventListener('change', handleLogoUpload);
  if (galleryUpload) galleryUpload.addEventListener('change', handleGalleryUpload);
  if (backgroundUpload) backgroundUpload.addEventListener('change', handleBackgroundUpload);

  if (previewImageArea) {
    previewImageArea.addEventListener('dragover', (event) => {
      event.preventDefault();
      previewImageArea.classList.add('drag-over');
    });

    previewImageArea.addEventListener('dragleave', () => {
      previewImageArea.classList.remove('drag-over');
    });

    previewImageArea.addEventListener('drop', (event) => {
      event.preventDefault();
      previewImageArea.classList.remove('drag-over');

      const image = event.dataTransfer.getData('text/plain');

      if (!image) return;

      state.preview_images.push(image);
      renderPreviewImages();
      setMessage('Image added to preview. Remember to save.', 'info');
    });
  }

  [
    projectName,
    businessName,
    locationInput,
    accentColor,
    brandTone,
    templateChoice,
    backgroundColor,
    textColor,
    navColor,
    cardColor,
    buttonColor,
    buttonTransparency,
    subdomainSlug,
    customDomain,
    useCustomDomain,
    httpsEnabled,
    pageTitle,
    pageBody,
    backgroundTransparency
  ].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', renderPreview);
    input.addEventListener('change', renderPreview);
  });

  ensurePages();
  loadProject();
  renderPreview();
});
