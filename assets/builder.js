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
  const subdomainSlug = document.getElementById('subdomainSlug');
  const customDomain = document.getElementById('customDomain');
  const useCustomDomain = document.getElementById('useCustomDomain');
  const httpsEnabled = document.getElementById('httpsEnabled');
  const domainResult = document.getElementById('domainResult');

  const desktopBtn = document.getElementById('desktopBtn');
  const mobileBtn = document.getElementById('mobileBtn');
  const previewFrame = document.getElementById('previewFrame');

  function showMessage(message) {
    if (domainResult) {
      domainResult.textContent = message;
      domainResult.style.display = 'block';
    } else {
      alert(message);
    }
  }

  function collectData() {
    return {
      project_name: projectName?.value || '',
      business_name: businessName?.value || '',
      location: locationInput?.value || '',
      accent_color: accentColor?.value || '#ff8a1a',
      brand_tone: brandTone?.value || '',
      subdomain_slug: subdomainSlug?.value || '',
      custom_domain: customDomain?.value || '',
      use_custom_domain: useCustomDomain?.value === 'true',
      https_enabled: httpsEnabled?.value !== 'false'
    };
  }

  function renderPreview() {
    const data = collectData();

    const business = data.business_name || 'Your Business';
    const place = data.location || 'Your local area';
    const tone = data.brand_tone || 'Your website intro will appear here as you build it out.';
    const slug = data.subdomain_slug || 'your-business';

    const brandText = document.querySelector('.site-brand span');
    const headline = document.querySelector('.page h2');
    const intro = document.querySelector('.page p');
    const footer = document.querySelector('.preview-footer');
    const address = document.querySelector('.address');
    const logo = document.querySelector('.site-logo');

    if (brandText) brandText.textContent = business.toUpperCase();
    if (headline) headline.textContent = `${business} in ${place}`;
    if (intro) intro.textContent = tone;
    if (footer) footer.textContent = `© ${business} • Crafted with PBI`;
    if (address) {
      address.textContent = data.use_custom_domain && data.custom_domain
        ? `https://${data.custom_domain}`
        : `https://${slug}.pbi.dev`;
    }
    if (logo) logo.style.background = data.accent_color;
  }

  async function saveProject() {
    console.log('Save button clicked');

    if (!projectId) {
      showMessage('No project ID found in the URL.');
      return;
    }

    const data = collectData();

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const response = await fetch('/api/projects/update', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: projectId,
          name: data.project_name || 'Untitled website',
          data
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || result.message || `Save failed with status ${response.status}`);
      }

      showMessage('Project saved successfully.');
      console.log('Project saved:', result);
    } catch (err) {
      console.error('Save failed:', err);
      showMessage(err.message || 'Save failed.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save project';
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

      if (projectName) projectName.value = project.name || savedData.project_name || '';
      if (businessName) businessName.value = savedData.business_name || '';
      if (locationInput) locationInput.value = savedData.location || '';
      if (accentColor) accentColor.value = savedData.accent_color || '#ff8a1a';
      if (brandTone) brandTone.value = savedData.brand_tone || '';
      if (subdomainSlug) subdomainSlug.value = savedData.subdomain_slug || '';
      if (customDomain) customDomain.value = savedData.custom_domain || '';
      if (useCustomDomain) useCustomDomain.value = String(savedData.use_custom_domain || false);
      if (httpsEnabled) httpsEnabled.value = String(savedData.https_enabled !== false);

      renderPreview();
    } catch (err) {
      console.warn('Could not load project:', err);
    }
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveProject);
    console.log('Save button listener attached');
  } else {
    console.error('Save button not found');
  }

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

  [
    projectName,
    businessName,
    locationInput,
    accentColor,
    brandTone,
    subdomainSlug,
    customDomain,
    useCustomDomain,
    httpsEnabled
  ].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', renderPreview);
    input.addEventListener('change', renderPreview);
  });

  loadProject();
  renderPreview();
});
