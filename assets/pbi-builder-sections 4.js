(() => {
  const params = new URLSearchParams(location.search);
  const projectId = params.get('project') || params.get('project_id') || 'draft';
  const storageKey = `pbi_sections_${projectId}`;
  const planRank = { starter: 1, business: 2, plus: 3 };
  function cleanPlan(value) { value = String(value || '').toLowerCase(); return planRank[value] ? value : 'starter'; }
  function activePlan() { return cleanPlan(params.get('plan') || localStorage.getItem('pbiSelectedPlan') || window.PBISelectedPlan || document.body.dataset.plan || 'starter'); }
  function sectionMinPlan(type) { return ({ gallery: 'business', featureGrid: 'business', cta: 'business', testimonial: 'plus', faq: 'plus', retail: 'plus' })[type] || 'starter'; }
  function planAllows(min) { return planRank[activePlan()] >= planRank[cleanPlan(min)]; }
  function filterSectionsForPlan(input) {
    const plan = activePlan();
    const filtered = (input || []).filter((section) => planAllows(sectionMinPlan(section.section_type || section.type)));
    if (plan === 'starter') filtered.forEach((section) => { section.image = ''; });
    return filtered;
  }
  let sections = [];
  let selected = null;
  let dragId = null;
  let saveTimer = null;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function normaliseTemplateKey(key) {
    const value = String(key || '').toLowerCase().trim();
    if (['cafe', 'trades', 'salon', 'consultant', 'shop', 'holiday-let'].includes(value)) return value;
    if (value.includes('holiday')) return 'holiday-let';
    if (value.includes('trade')) return 'trades';
    if (value.includes('retail')) return 'shop';
    return 'consultant';
  }

  function templateKey() {
    const checked = document.querySelector('input[name="templateStyle"]:checked,input[name="template_key"]:checked,input[name="template"]:checked');
    if (checked?.value) return normaliseTemplateKey(checked.value);
    const any = document.querySelector('[name="template_key"],#templateKey,#template');
    if (any?.value) return normaliseTemplateKey(any.value);
    return normaliseTemplateKey(params.get('template') || params.get('template_key') || 'consultant');
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
    el.__pbiTimer = setTimeout(() => {
      if (el.textContent === message) el.style.display = 'none';
    }, 3400);
  }

  function saveLocal() {
    localStorage.setItem(storageKey, JSON.stringify(sections));
  }

  function scheduleCloudSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveCloud(true), 900);
  }

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

  function fallbackSections(key) {
    const api = window.PBITemplatePresets;
    const preset = api?.get ? api.get(key) : null;
    if (preset) {
      const out = [];
      out.push({
        id: `${key}_hero`, section_type: 'hero', type: 'hero',
        title: preset.pageMainHeading || 'Your business headline',
        text: preset.subHeading || 'Explain what you do and why customers should take the next step.',
        button: preset.ctaButtonText || 'Get started', image: preset.heroImage || '', layout: 'split',
        background: preset.background || '#fff8f1', accent: preset.accent || '#bf5c29', padding: 'spacious', align: 'left', hidden: false
      });
      if (preset.servicesList?.length) out.push({
        id: `${key}_services`, section_type: 'services', type: 'services', title: preset.pages?.services?.title || 'Services',
        text: preset.servicesList.join('|'), button: 'View services', image: '', layout: 'cards',
        background: '#fff8f1', accent: preset.accent || '#bf5c29', padding: 'comfortable', align: 'left', hidden: false
      });
      if (preset.featureBullets?.length) out.push({
        id: `${key}_features`, section_type: 'featureGrid', type: 'featureGrid', title: 'Why customers choose this business',
        text: preset.featureBullets.join('|'), button: '', image: '', layout: 'cards',
        background: '#f6efe7', accent: preset.accent || '#bf5c29', padding: 'comfortable', align: 'left', hidden: false
      });
      if (preset.galleryImages?.length) out.push({
        id: `${key}_gallery`, section_type: 'gallery', type: 'gallery', title: preset.pages?.gallery?.title || 'Gallery',
        text: preset.galleryImages.join('|'), button: '', image: preset.galleryImages[0] || '', layout: 'cards',
        background: '#fff8f1', accent: preset.accent || '#bf5c29', padding: 'comfortable', align: 'left', hidden: false
      });
      if (key === 'shop') out.push({
        id: `${key}_retail`, section_type: 'retail', type: 'retail', title: 'Featured products',
        text: 'Product one - £12|Product two - £18|Product three - £24', button: 'Shop now', image: preset.heroImage || '', layout: 'cards',
        background: '#fff8cf', accent: preset.accent || '#111111', padding: 'comfortable', align: 'left', hidden: false
      });
      out.push({
        id: `${key}_contact`, section_type: 'contact', type: 'contact', title: preset.pages?.contact?.title || 'Contact',
        text: preset.pages?.contact?.body || 'Add address, opening hours, phone and email.', button: 'Contact us', image: '', layout: 'split',
        background: '#fff8f1', accent: preset.accent || '#bf5c29', padding: 'comfortable', align: 'left', hidden: false
      });
      return out;
    }
    return [{
      id: 'hero', section_type: 'hero', type: 'hero', title: 'Your business headline',
      text: 'Explain what you do and why customers should take the next step.', button: 'Get started', image: '',
      layout: 'split', background: '#fff8f1', accent: '#bf5c29', padding: 'spacious', align: 'left', hidden: false
    }];
  }

  async function load(force = false) {
    ensure();
    const key = templateKey();
    setLinkedStatus(`Linked project: ${projectId} · Template: ${key} · Package: ${activePlan()}`);
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (Array.isArray(cached) && cached.length) {
          sections = filterSectionsForPlan(cached.map(normaliseSection));
          selected = sections[0]?.id || null;
          render();
          preview();
          return;
        }
      } catch (_) {}
    }
    applyPresetToForm(key);
    try {
      const response = await fetch('/api/builder/template-sections', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, template_key: key, force, plan: activePlan() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.sections)) throw new Error(data.message || data.error || 'Template sections could not load.');
      sections = filterSectionsForPlan(data.sections.map(normaliseSection));
      selected = sections[0]?.id || null;
      saveLocal();
      render();
      preview();
      status(force ? 'Template reloaded into the connected editor.' : 'Template loaded into the connected editor.');
    } catch (error) {
      sections = filterSectionsForPlan(fallbackSections(key).map(normaliseSection));
      selected = sections[0]?.id || null;
      saveLocal();
      render();
      preview();
      status(error.message || 'Using local template fallback.', 'info');
    }
  }

  function normaliseSection(section, index = 0) {
    const type = section.section_type || section.type || 'section';
    return {
      id: String(section.id || `s_${Date.now()}_${index}`),
      section_order: Number.isFinite(Number(section.section_order)) ? Number(section.section_order) : index,
      section_type: type,
      type,
      title: section.title || '',
      text: section.text ?? section.body ?? '',
      button: section.button || '',
      image: section.image || '',
      layout: section.layout || (['services', 'featureGrid', 'retail', 'gallery'].includes(type) ? 'cards' : 'standard'),
      background: section.background || '#fff8f1',
      accent: section.accent || '#bf5c29',
      padding: section.padding || 'comfortable',
      align: section.align || 'left',
      hidden: Boolean(Number(section.hidden || 0)),
      body_json: section.body_json || ''
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
      if (!quiet) status(`Saved ${sections.length} sections.`);
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
    } catch (error) {
      status(error.message || 'Publish snapshot failed.', 'error');
    }
  }

  function ensure() {
    let box = $('pbiTemplateSectionEditor');
    if (!box) {
      box = document.createElement('section');
      box.id = 'pbiTemplateSectionEditor';
      box.className = 'card pbi-template-section-editor pbi-unified-builder';
      box.innerHTML = '<div class="pbi-section-editor-head"><div><p class="eyebrow">Website setup</p><h2>Build from one connected workspace</h2><p id="pbiLinkedStatus" class="small-note"></p></div><div class="pbi-section-editor-actions"><button class="btn-ghost" id="pbiReloadSections" type="button">Reload template</button><button class="btn-ghost" id="pbiSaveSections" type="button">Save sections</button><button class="btn" id="pbiPublishSections" type="button">Apply & publish sections</button></div></div><div class="pbi-section-editor-grid"><div><h3>Sections</h3><div id="pbiSectionList" class="pbi-section-list"></div><div class="pbi-add-section-row"><select id="pbiAddSectionType"><option value="hero">Hero</option><option value="services">Services</option><option value="featureGrid">Feature grid</option><option value="gallery">Gallery</option><option value="testimonial">Testimonial</option><option value="faq">FAQ</option><option value="contact">Contact</option><option value="retail">Retail</option><option value="cta">CTA</option></select><button class="btn-ghost" id="pbiAddSectionBtn" type="button">Add section</button></div></div><div><h3>Selected section</h3><div id="pbiSectionInspector"></div></div></div><div id="pbiSectionEditorStatus" class="notice" style="display:none;margin-top:16px"></div>';
      (document.querySelector('main .container') || document.querySelector('main') || document.body).prepend(box);
    }
    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      $('pbiReloadSections')?.addEventListener('click', () => load(true));
      $('pbiSaveSections')?.addEventListener('click', () => saveCloud(false));
      $('pbiPublishSections')?.addEventListener('click', publish);
      $('pbiAddSectionBtn')?.addEventListener('click', addSection);
    }
  }


  function updatePackageOptions() {
    document.body.dataset.plan = activePlan();
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
    ensure();
    updatePackageOptions();
    const list = $('pbiSectionList');
    if (!list) return;
    list.innerHTML = sections.map((section) => `
      <div class="pbi-section-row ${section.id === selected ? 'active' : ''} ${section.hidden ? 'is-hidden' : ''}" draggable="true" data-id="${esc(section.id)}">
        <button type="button" data-select="${esc(section.id)}"><strong>${esc(section.title || section.section_type)}</strong><span>${esc(section.section_type)} · ${esc(section.layout || 'standard')}${section.hidden ? ' · hidden' : ''}</span></button>
        <div class="pbi-section-row-actions">
          <button type="button" data-up="${esc(section.id)}">↑</button>
          <button type="button" data-down="${esc(section.id)}">↓</button>
          <button type="button" data-copy="${esc(section.id)}">Copy</button>
          <button type="button" data-hide="${esc(section.id)}">${section.hidden ? 'Show' : 'Hide'}</button>
          <button type="button" data-delete="${esc(section.id)}">Remove</button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('[data-select]').forEach((button) => button.addEventListener('click', () => { selected = button.dataset.select; render(); }));
    list.querySelectorAll('[data-up]').forEach((button) => button.addEventListener('click', () => moveSection(button.dataset.up, -1)));
    list.querySelectorAll('[data-down]').forEach((button) => button.addEventListener('click', () => moveSection(button.dataset.down, 1)));
    list.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', () => copySection(button.dataset.copy)));
    list.querySelectorAll('[data-hide]').forEach((button) => button.addEventListener('click', () => toggleHidden(button.dataset.hide)));
    list.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteSection(button.dataset.delete)));
    list.querySelectorAll('[draggable]').forEach((row) => {
      row.addEventListener('dragstart', () => { dragId = row.dataset.id; });
      row.addEventListener('dragover', (event) => event.preventDefault());
      row.addEventListener('drop', (event) => { event.preventDefault(); reorder(dragId, row.dataset.id); });
    });
    renderInspector();
  }

  function renderInspector() {
    const section = sections.find((item) => item.id === selected);
    const target = $('pbiSectionInspector');
    if (!target) return;
    if (!section) {
      target.innerHTML = '<p class="small-note muted">Select a section to edit it.</p>';
      return;
    }
    target.innerHTML = `
      <label>Title</label><input id="sTitle" class="input" value="${esc(section.title)}">
      <label>Text</label><textarea id="sText" class="textarea" rows="5">${esc(section.text)}</textarea>
      <label>Button</label><input id="sButton" class="input" value="${esc(section.button)}">
      ${planAllows('business') ? `<label>Image URL</label><input id="sImage" class="input" value="${esc(section.image)}">
      <label>Upload image</label><input id="sUpload" class="input" type="file" accept="image/*"><div id="sUploadStatus" class="small-note muted"></div>` : `<div class="notice domain-info">Image controls unlock on the Business package.</div>`}
      ${planAllows('plus') ? `<div class="grid-2"><div><label>Layout</label><select id="sLayout" class="select">${['standard', 'split', 'centered', 'cards', 'fullBleed'].map((value) => `<option value="${value}" ${section.layout === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div><label>Padding</label><select id="sPadding" class="select">${['compact', 'comfortable', 'spacious'].map((value) => `<option value="${value}" ${section.padding === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div></div>
      <div class="grid-2"><div><label>Background</label><input id="sBg" class="input" type="color" value="${esc(section.background || '#fff8f1')}"></div><div><label>Accent</label><input id="sAccent" class="input" type="color" value="${esc(section.accent || '#bf5c29')}"></div></div>
      <label>Alignment</label><select id="sAlign" class="select">${['left', 'center', 'right'].map((value) => `<option value="${value}" ${section.align === value ? 'selected' : ''}>${value}</option>`).join('')}</select>
      <button class="btn" id="sApply" type="button">Apply to preview</button>` : `<div class="notice domain-info">Advanced layout, colour and alignment controls unlock on the Plus package.</div><button class="btn" id="sApply" type="button">Apply to preview</button>`}
    `;
    const fields = [['sTitle', 'title'], ['sText', 'text'], ['sButton', 'button'], ['sImage', 'image'], ['sLayout', 'layout'], ['sPadding', 'padding'], ['sBg', 'background'], ['sAccent', 'accent'], ['sAlign', 'align']];
    fields.forEach(([id, key]) => {
      const input = $(id);
      if (!input) return;
      ['input', 'change'].forEach((eventName) => input.addEventListener(eventName, () => {
        section[key] = input.value;
        saveLocal();
        preview();
        scheduleCloudSave();
      }));
    });
    $('sApply')?.addEventListener('click', () => { saveLocal(); render(); preview(); scheduleCloudSave(); status('Preview updated.'); });
    $('sUpload')?.addEventListener('change', (event) => uploadImage(event.target.files?.[0], section));
  }

  async function uploadImage(file, section) {
    if (!file) return;
    if (!planAllows('business')) { status('Image uploads unlock on the Business package.', 'error'); return; }
    const st = $('sUploadStatus');
    if (st) st.textContent = 'Uploading image...';
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('project_id', projectId);
      form.append('plan', activePlan());
      const response = await fetch('/api/builder/upload-image', { method: 'POST', credentials: 'include', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.message || data.error || 'Upload failed.');
      section.image = data.url;
      if ($('sImage')) $('sImage').value = data.url;
      saveLocal();
      preview();
      scheduleCloudSave();
      if (st) st.textContent = data.mode === 'data-url' ? 'Image added locally. R2 will store uploads when the binding is live.' : 'Image uploaded.';
    } catch (error) {
      if (st) st.textContent = error.message || 'Upload failed.';
    }
  }

  function addSection() {
    const type = $('pbiAddSectionType')?.value || 'featureGrid';
    const min = sectionMinPlan(type);
    if (!planAllows(min)) { status(`${type} sections unlock on the ${min === 'plus' ? 'Plus' : 'Business'} package.`, 'error'); return; }
    const section = normaliseSection({
      id: `s_${Date.now()}`, section_type: type, type,
      title: type === 'cta' ? 'Ready to take the next step?' : `New ${type} section`,
      text: type === 'services' ? 'Service one|Service two|Service three' : 'Add clear customer-focused wording here.',
      button: ['hero', 'cta', 'contact'].includes(type) ? 'Get in touch' : '',
      image: '', layout: ['services', 'featureGrid', 'retail', 'gallery'].includes(type) ? 'cards' : 'standard',
      background: '#fff8f1', accent: '#bf5c29', padding: 'comfortable', align: 'left', hidden: false
    }, sections.length);
    sections.push(section);
    selected = section.id;
    saveLocal();
    render();
    preview();
    scheduleCloudSave();
  }

  function moveSection(id, direction) {
    const index = sections.findIndex((section) => section.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= sections.length) return;
    [sections[index], sections[next]] = [sections[next], sections[index]];
    saveLocal();
    render();
    preview();
    scheduleCloudSave();
  }

  function copySection(id) {
    const index = sections.findIndex((section) => section.id === id);
    if (index < 0) return;
    const copy = JSON.parse(JSON.stringify(sections[index]));
    copy.id = `s_${Date.now()}`;
    copy.title = `${copy.title || copy.section_type} copy`;
    sections.splice(index + 1, 0, copy);
    selected = copy.id;
    saveLocal();
    render();
    preview();
    scheduleCloudSave();
  }

  function toggleHidden(id) {
    const section = sections.find((item) => item.id === id);
    if (!section) return;
    section.hidden = !section.hidden;
    saveLocal();
    render();
    preview();
    scheduleCloudSave();
  }

  function deleteSection(id) {
    const index = sections.findIndex((section) => section.id === id);
    if (index < 0) return;
    sections.splice(index, 1);
    selected = sections[0]?.id || null;
    saveLocal();
    render();
    preview();
    scheduleCloudSave();
  }

  function reorder(fromId, toId) {
    if (!fromId || fromId === toId) return;
    const from = sections.findIndex((section) => section.id === fromId);
    const to = sections.findIndex((section) => section.id === toId);
    if (from < 0 || to < 0) return;
    const [section] = sections.splice(from, 1);
    sections.splice(to, 0, section);
    selected = section.id;
    saveLocal();
    render();
    preview();
    scheduleCloudSave();
  }

  function sectionStyle(section) {
    const pad = section.padding === 'compact' ? '28px' : section.padding === 'spacious' ? '68px' : '46px';
    return `--pbi-sec-bg:${esc(section.background || '#fff8f1')};--pbi-sec-accent:${esc(section.accent || '#bf5c29')};text-align:${esc(section.align || 'left')};padding:${pad};`;
  }

  function sectionHtml(section) {
    if (section.hidden) return '';
    const st = sectionStyle(section);
    const title = esc(section.title);
    const text = esc(section.text);
    const button = esc(section.button);
    const image = section.image ? `<img src="${esc(section.image)}" alt="">` : '';
    if (['services', 'featureGrid', 'retail'].includes(section.section_type)) {
      const cards = String(section.text || '').split('|').map((value) => value.trim()).filter(Boolean).slice(0, 10);
      return `<section class="pbi-live-sec pbi-live-cards" style="${st}"><h2>${title}</h2><div>${cards.map((card) => `<article><h3>${esc(card)}</h3><p>Edit this card in the section editor.</p></article>`).join('')}</div>${button ? `<a>${button}</a>` : ''}</section>`;
    }
    if (section.section_type === 'gallery') {
      const images = String(section.text || '').split('|').map((value) => value.trim()).filter(Boolean);
      const gallery = (images.length ? images : [section.image]).filter(Boolean);
      return `<section class="pbi-live-sec pbi-live-gallery" style="${st}"><h2>${title}</h2><div>${gallery.map((url) => `<img src="${esc(url)}" alt="">`).join('')}</div></section>`;
    }
    if (section.layout === 'split' || ['hero', 'contact'].includes(section.section_type)) {
      return `<section class="pbi-live-sec pbi-live-split" style="${st}"><div><h1>${title}</h1><p>${text}</p>${button ? `<a>${button}</a>` : ''}</div><figure>${image || '<span>Upload or paste an image</span>'}</figure></section>`;
    }
    return `<section class="pbi-live-sec" style="${st}"><h1>${title}</h1><p>${text}</p>${button ? `<a>${button}</a>` : ''}${image ? `<figure>${image}</figure>` : ''}</section>`;
  }

  function preview() {
    const output = sections.map(sectionHtml).join('');
    const target = document.querySelector('#previewScroll') || document.querySelector('#pbiIntegratedLivePreviewInner') || document.querySelector('#livePreview') || document.querySelector('.live-preview') || document.querySelector('.website-preview') || document.querySelector('.builder-preview') || document.querySelector('[data-live-preview]');
    if (target) target.innerHTML = output;
    const pageBody = document.querySelector('#pageBody,textarea[name=body],textarea[name=page_body],textarea[name=content]');
    if (pageBody) {
      pageBody.value = sections.map((section) => `${section.title}\n${section.text}\n${section.button || ''}`).join('\n\n---\n\n');
      pageBody.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.dispatchEvent(new CustomEvent('pbi:sections-updated', { detail: { projectId, sections, plan: activePlan() } }));
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
      const text = (element.textContent || '').trim().toLowerCase();
      if (!text) return;
      if (!element.dataset.pbiSaveBound && ['save project', 'save sections'].some((match) => text.includes(match))) {
        element.dataset.pbiSaveBound = '1';
        element.addEventListener('click', () => saveCloud(false), { capture: true });
      }
      if (!element.dataset.pbiPublishBound && ['publish website', 'publish'].some((match) => text.includes(match))) {
        element.dataset.pbiPublishBound = '1';
        element.addEventListener('click', () => publish(), { capture: true });
      }
    });
  }

  function start() {
    if (!location.pathname.includes('/builder')) return;
    ensure();
    bindTemplateChanges();
    bindGlobalButtons();
    load(false);
    setInterval(() => { bindTemplateChanges(); bindGlobalButtons(); }, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
