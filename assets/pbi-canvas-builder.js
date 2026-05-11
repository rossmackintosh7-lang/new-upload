(function(){
  const qs = new URLSearchParams(location.search);
  const presetApi = window.PBITemplatePresets || {};
  const rules = window.PBIPackageRules || {
    cleanPlan: (p) => ['starter','business','plus'].includes(String(p||'starter').toLowerCase()) ? String(p||'starter').toLowerCase() : 'starter',
    enforce: (state) => state,
    checklist: (state) => ({ ok:true, issues:[], warnings:[], score:100, checked:state }),
    blockAllowed: () => true
  };

  const packAliases = {
    "premium-cafe":"cafe","cafe":"cafe","restaurant":"restaurant","food":"restaurant",
    "trades-pro":"trades","trades":"trades","tradesperson":"trades",
    "salon-luxe":"salon","salon":"salon","beauty":"salon",
    "consultant-authority":"consultant","consultant":"consultant",
    "holiday-stay":"holiday-let","holiday-let":"holiday-let","holiday":"holiday-let",
    "retail-launch":"shop","shop":"shop","mobile-mechanic":"mobile-mechanic","mechanic":"mobile-mechanic",
    "dog-groomer":"dog-groomer","dog":"dog-groomer","cleaning-pro":"cleaner","cleaner":"cleaner",
    "personal-trainer":"personal-trainer","trainer":"personal-trainer"
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const uid = (prefix="block") => `${prefix}-${Math.random().toString(36).slice(2,9)}-${Date.now().toString(36)}`;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  const attr = (value) => esc(value).replace(/`/g, "&#96;");
  const normalise = (key) => packAliases[String(key || "").toLowerCase()] || String(key || "cafe").toLowerCase();
  const domainSlug = (value) => String(value || "my-business").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "my-business";
  const cleanDomainText = (value) => String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\s+/g, "");
  const clone = (value, fallback = null) => {
    try { return JSON.parse(JSON.stringify(value ?? fallback)); } catch { return fallback; }
  };
  const classToken = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "standard";

  function getPreset(key){
    const id = normalise(key);
    return presetApi.get?.(id) || presetApi.get?.("cafe") || {};
  }

  function getProjectId(){
    return state.project_id || state.id || qs.get("project") || localStorage.getItem("pbi_active_project_id") || `local-${Date.now()}`;
  }

  function currentPlan(){
    return rules.cleanPlan(qs.get("plan") || state.plan || state.package || localStorage.getItem("pbi_plan") || "starter");
  }

  function isPremium(){ return ["business","plus"].includes(currentPlan()); }
  function isPlus(){ return currentPlan() === "plus"; }

  function projectFromPreset(key){
    const p = getPreset(key);
    const project = presetApi.toProjectData?.(p.id || normalise(key)) || {};
    project.business_name = project.business_name || p.businessName || "New PBI Website";
    project.page_main_heading = project.page_main_heading || p.pageMainHeading || "Your premium website starts here";
    project.sub_heading = project.sub_heading || p.subHeading || "Edit the canvas, save the project, then publish when ready.";
    project.tagline = project.tagline || p.tagline || "Built with PBI";
    project.heroImage = project.heroImage || p.heroImage || "/assets/demo-media/cafe-hero.jpg";
    project.selected_pages = project.selected_pages || project.selectedPages || ["home","about","services","gallery","contact"];
    project.pages = project.pages || p.pages || {
      home:{ label:"Home", title: project.page_main_heading, body: project.sub_heading },
      about:{ label:"About", title:"About " + project.business_name, body:"Tell visitors what makes this business trustworthy." },
      services:{ label:"Services", title:"Services", body:"Show the main offers clearly." },
      gallery:{ label:"Gallery", title:"Gallery", body:"Show proof, atmosphere and examples." },
      contact:{ label:"Contact", title:"Contact", body:"Make the next step easy." }
    };
    project.activePage = project.activePage || "home";
    project.templateId = p.id || normalise(key);
    project.plan = rules.cleanPlan(qs.get("plan") || localStorage.getItem("pbi_plan") || "starter");
    project.project_id = qs.get("project") || localStorage.getItem("pbi_active_project_id") || `local-${Date.now()}`;
    project.seo = project.seo || {
      title: `${project.business_name} | ${p.label || "Website"}`,
      description: project.sub_heading,
      indexable: true,
      ogTitle: `${project.business_name}`,
      ogDescription: project.sub_heading
    };
    project.analytics = project.analytics || { enabled: true, events: [] };
    project.cmsItems = project.cmsItems || [];
    project.leadForms = project.leadForms || [];
    project.domain_option = project.domain_option || "pbi_subdomain";
    project.custom_domain = project.custom_domain || "";
    project.domain_registration = project.domain_registration || null;
    project.pending_domain_registration = project.pending_domain_registration || null;
    return project;
  }

  let history = [];
  let future = [];
  let selectedId = null;
  let previewMode = false;

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem("pbi_canvas_state") || "null"); } catch { return null; }
  })();

  const requestedTemplate = normalise(qs.get("preset") || qs.get("template") || localStorage.getItem("pbi_selected_template") || saved?.templateId || "cafe");
  const requestedProject = qs.get("project") || "";
  const shouldStartFromRequestedTemplate = !saved ||
    (Boolean(qs.get("preset") || qs.get("template")) && normalise(saved.templateId || saved.template || "") !== requestedTemplate) ||
    (Boolean(requestedProject) && saved.project_id && saved.project_id !== requestedProject);
  let state = shouldStartFromRequestedTemplate ? projectFromPreset(requestedTemplate) : saved;
  state.templateId = requestedTemplate || normalise(state.templateId || "cafe");
  state.plan = rules.cleanPlan(qs.get("plan") || state.plan || state.package || localStorage.getItem("pbi_plan") || "starter");
  state.project_id = state.project_id || qs.get("project") || localStorage.getItem("pbi_active_project_id") || `local-${Date.now()}`;
  state.selected_pages = state.selected_pages || state.selectedPages || Object.keys(state.pages || { home:{} });
  state.pages = state.pages || projectFromPreset(state.templateId).pages;
  state.domain_option = state.domain_option || state.domainOption || "pbi_subdomain";
  state.custom_domain = state.custom_domain || state.customDomain || "";
  state.domain_registration = state.domain_registration || state.domainRegistration || null;
  state.pending_domain_registration = state.pending_domain_registration || null;
  state.use_custom_domain = Boolean(state.use_custom_domain || state.useCustomDomain || state.custom_domain || state.domain_registration?.name);
  let activePage = state.activePage || state.active_page || state.selected_pages[0] || "home";
  state.blocksByPage = state.blocksByPage || {};

  function createBlock(type, preset, pageKey){
    const p = preset || getPreset(state.templateId);
    const page = state?.pages?.[pageKey || activePage] || {};
    const services = state?.servicesList || state?.services_list || p.servicesList || ["Service one","Service two","Service three"];
    const gallery = p.galleryImages || [p.heroImage || "/assets/demo-media/cafe-hero.jpg"];
    const common = {
      id: uid(type),
      type,
      layout:"standard",
      animation:"rise",
      background:"#fffaf4",
      accent: state?.accent_color || p.accent || "#bf5c29",
      positionMode:"flow",
      x:40,
      y:40,
      width:760,
      rotate:0,
      z:5,
      publishable:true
    };
    const defaults = {
      navBar: { title: state?.business_name || p.businessName || "Business name", text:"Home | Services | Gallery | Contact", button:"Enquire" },
      hero: { eyebrow: state?.tagline || p.tagline || "Built with PBI", title: page.title || state?.page_main_heading || p.pageMainHeading || "Your website headline", text: page.body || state?.sub_heading || p.subHeading || "Your website introduction.", image: state?.heroImage || p.heroImage || "/assets/demo-media/cafe-hero.jpg", button: state?.cta_button_text || p.ctaButtonText || "Get started", layout:"split" },
      splitHero: { eyebrow:"Featured", title:"A stronger first impression", text:"Use image and copy together to make the page feel premium.", image: state?.heroImage || p.heroImage || "/assets/demo-media/cafe-hero.jpg", button:"Learn more", layout:"split" },
      floatingCard: { title:"Highlight", text:"Use this as a floating proof point, offer, review or announcement.", button:"", layout:"spotlight", positionMode:"free", x:80, y:120, width:420 },
      trustBand: { title:"Trusted locally", text:"Fast replies | Clear pricing | Built around your business", layout:"cards" },
      logoCloud: { title:"Featured proof", text:"Local clients | Reviews | Partners | Press", layout:"cards" },
      services: { title:(p.label || "Services") + " built clearly", text: services.join(" | "), layout:"cards" },
      process: { title:"How it works", text:"Choose a service | Send an enquiry | Get booked in", layout:"cards" },
      stats: { title:"Proof in numbers", text:"4.8★ rating | 48hr response | Local team", layout:"cards" },
      featureGrid: { title:"Why customers choose us", text:"Clear offer | Friendly service | Reliable follow-up", layout:"bento" },
      gallery: { title:"Gallery", text:"Show real work, atmosphere and customer-facing visuals.", image: gallery[0] || p.heroImage || "/assets/demo-media/cafe-hero.jpg", layout:"masonry" },
      testimonial: { title:"What customers say", text:"“Exactly what we needed. Clear, simple and easy to use.”", layout:"spotlight" },
      reviews: { title:"Recent customer reviews", text:"Friendly and clear from the first message | The result felt polished and easy to use | We knew exactly what to do next", layout:"cards" },
      team: { title:"Meet the people behind the service", text:"Owner-led | Local team | Helpful support", layout:"cards" },
      hours: { title:"Opening and response times", text:"Monday to Friday 9am-5pm | Saturday by appointment | Fast replies for urgent enquiries", layout:"cards" },
      salesBanner: { title:"Ready this week", text:"A timely offer, announcement or availability message can sit here without taking over the page.", button:"Claim this offer", layout:"strip" },
      video: { title:"See how it works", text:"Use this section for a short intro video, customer walkthrough or service explanation.", button:"Watch preview", layout:"spotlight" },
      beforeAfter: { title:"Before and after", text:"Before: confusing next steps | After: clearer offer, stronger proof and an easier route to enquire", image: gallery[1] || gallery[0] || p.heroImage || "/assets/demo-media/cafe-hero.jpg", layout:"split" },
      quoteForm: { title:"Request a quote", text:"Tell us what you need, where you are and when you would like help.", button:"Send quote request", layout:"spotlight" },
      courseList: { title:"Programmes and sessions", text:"Starter session | Progress plan | Ongoing support", layout:"cards" },
      pricing: { title:"Packages", text:"Starter | Business | Plus", layout:"cards" },
      productGrid: { title:"Featured products", text:"Product one | Product two | Product three", layout:"cards" },
      retail: { title:"Shop highlights", text:"Collections | Gift cards | Best sellers", layout:"cards" },
      cmsList: { title:"Latest updates", text:"Blog posts, case studies or service updates can appear here.", layout:"cards" },
      faq: { title:"Questions answered", text:"How quickly can I book? | What areas do you cover? | How do I pay?", layout:"cards" },
      map: { title:"Areas covered", text:"Add your location, service area and local search wording.", layout:"spotlight" },
      booking: { title:"Book your appointment", text:"Connect a booking link, enquiry form or calendar route.", button:"Book now", layout:"spotlight" },
      contact: { title:"Ready to enquire?", text:"Add your phone, email, booking link or contact form here.", button:"Contact", layout:"spotlight" },
      cta: { title:"Ready to get started?", text:"Give visitors one clear next step.", button:"Enquire today", layout:"centered" },
      spacer: { title:"Spacer", text:"Breathing room between sections.", layout:"standard" },
      customCode: { title:"Custom embed", text:"Plus-only custom code/embed block.", layout:"standard" },
      localizedSection: { title:"Localized section", text:"Plus-only localized content variant.", layout:"standard" },
      analyticsPanel: { title:"Analytics panel", text:"Plus-only conversion tracking block.", layout:"cards" },
      automationFlow: { title:"Automation flow", text:"Plus-only follow-up automation block.", layout:"cards" }
    };
    return { ...common, ...(defaults[type] || defaults.hero) };
  }

  function blocksForPreset(project, pageKey){
    const p = getPreset(project.templateId || "cafe");
    const page = project.pages?.[pageKey] || {};
    const presetBlocks = Array.isArray(p.blocksByPage?.[pageKey]) ? p.blocksByPage[pageKey] : null;
    if (presetBlocks?.length) {
      return presetBlocks.map((presetBlock, idx) => {
        const type = presetBlock.type || "hero";
        const base = createBlock(type, p, pageKey);
        return {
          ...base,
          ...clone(presetBlock, {}),
          id: uid(type),
          type,
          accent: presetBlock.accent || base.accent,
          background: presetBlock.background || base.background,
          z: idx + 1
        };
      });
    }
    const blocks = [
      createBlock("hero", p, pageKey),
      createBlock("services", p, pageKey),
      createBlock("gallery", p, pageKey),
      createBlock("contact", p, pageKey)
    ];
    blocks[0].title = page.title || project.page_main_heading || p.pageMainHeading || blocks[0].title;
    blocks[0].text = page.body || project.sub_heading || p.subHeading || blocks[0].text;
    blocks[0].eyebrow = project.tagline || p.tagline || blocks[0].eyebrow;
    blocks[0].image = project.heroImage || p.heroImage || blocks[0].image;
    return blocks.map((block, idx) => ({ ...block, id: block.id || uid(block.type), z: idx + 1 }));
  }

  for (const page of state.selected_pages) {
    const current = state.blocksByPage[page] || [];
    if (!current.length || current.some((block) => !block.id)) {
      state.blocksByPage[page] = blocksForPreset(state, page);
    }
  }

  const drop = $("#canvasDropzone");
  const empty = $("#canvasEmpty");
  const titleEl = $("#canvasProjectTitle");
  const statusEl = $("#canvasAutosaveStatus");

  function setStatus(text){ if(statusEl) statusEl.textContent = text; }

  function snapshot(){
    history.push(JSON.stringify(state));
    if (history.length > 50) history.shift();
    future = [];
  }

  function persist(){
    state.activePage = activePage;
    state.plan = currentPlan();
    state.package = currentPlan();
    localStorage.setItem("pbi_plan", currentPlan());
    localStorage.setItem("pbi_selected_template", state.templateId || "cafe");
    localStorage.setItem("pbi_active_project_id", getProjectId());
    localStorage.setItem("pbi_canvas_state", JSON.stringify(state));
  }

  function activeBlocks(){
    state.blocksByPage = state.blocksByPage || {};
    state.blocksByPage[activePage] = state.blocksByPage[activePage] || [];
    return state.blocksByPage[activePage];
  }

  function pageData(){
    return state.pages?.[activePage] || Object.values(state.pages || {})[0] || {};
  }

  function enforcePlan(options = {}){
    state.plan = currentPlan();
    state = rules.enforce ? rules.enforce(state, state.plan, options) : state;
    if (!state.selected_pages.includes(activePage)) activePage = state.selected_pages[0] || "home";
    return state;
  }

  function blockStyle(block){
    const accent = block.accent || state.accent_color || getPreset(state.templateId).accent || "#bf5c29";
    let style = `--preview-accent:${esc(accent)};`;
    if (block.background) style += `background:${esc(block.background)};`;
    if (block.positionMode === "free" && isPremium() && !block.packageLocked) {
      style += `position:absolute;left:${Number(block.x)||40}px;top:${Number(block.y)||40}px;width:${Number(block.width)||520}px;z-index:${Number(block.z)||5};transform:rotate(${Number(block.rotate)||0}deg);`;
    }
    return style;
  }

  function editableAttr(block, field){
    return block.packageLocked || previewMode ? "" : `contenteditable="true" data-inline-field="${field}" spellcheck="true"`;
  }

  function lockedOverlay(block){
    if (!block.packageLocked) return "";
    return `<div class="pbi-package-lock-overlay"><strong>Locked on ${esc(currentPlan())}</strong><span>${esc(block.lockedReason || "Upgrade package to edit or publish this feature.")}</span></div>`;
  }

  function renderBlock(block){
    const accent = block.accent || state.accent_color || getPreset(state.templateId).accent || "#bf5c29";
    const selectedClass = block.id === selectedId ? " selected" : "";
    const freeClass = block.positionMode === "free" && isPremium() && !block.packageLocked ? " freeform" : "";
    const lockedClass = block.packageLocked ? " package-locked" : "";
    const layoutClass = ` layout-${classToken(block.layout)}`;
    const visibilityClass = ` visibility-${classToken(block.visibility || "all")}`;
    const attrs = `class="pbi-canvas-render-block${selectedClass}${freeClass}${lockedClass}${layoutClass}${visibilityClass}" draggable="${previewMode || freeClass ? "false" : "true"}" data-block-id="${esc(block.id)}" data-kind="${esc(block.type)}" data-layout="${esc(block.layout || "standard")}" data-visibility="${esc(block.visibility || "all")}" tabindex="0" style="${blockStyle(block)}"`;
    const title = esc(block.title);
    const text = esc(block.text);
    const button = esc(block.button || "");
    const buttonAria = block.buttonAriaLabel ? ` aria-label="${esc(block.buttonAriaLabel)}"` : "";
    const eyebrow = esc(block.eyebrow || block.type);
    const image = esc(block.image || state.heroImage || getPreset(state.templateId).heroImage || "/assets/demo-media/cafe-hero.jpg");
    const imageAlt = esc(block.imageAlt || block.title || "Website preview image");
    const galleryImages = [
      block.image,
      ...(Array.isArray(block.images) ? block.images : [])
    ].filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index).slice(0, 6);

    if (block.type === "navBar") {
      return `<section ${attrs}><div class="pbi-live-nav"><strong ${editableAttr(block,'title')}>${title}</strong><span ${editableAttr(block,'text')}>${text}</span>${button ? `<a class="btn" style="background:${accent}" href="#contact"${buttonAria}>${button}</a>` : ""}</div>${lockedOverlay(block)}</section>`;
    }
    if (["hero","splitHero"].includes(block.type)) {
      return `<section ${attrs}><div class="pbi-live-hero"><div><p class="eyebrow" ${editableAttr(block,'eyebrow')}>${eyebrow}</p><h1 ${editableAttr(block,'title')}>${title}</h1><p ${editableAttr(block,'text')}>${text}</p>${button ? `<a class="btn" style="background:${accent}" href="#contact"${buttonAria}>${button}</a>` : ""}</div><img src="${image}" alt="${imageAlt}"></div>${lockedOverlay(block)}</section>`;
    }
    if (["services","process","stats","featureGrid","pricing","productGrid","retail","trustBand","logoCloud","cmsList","analyticsPanel","automationFlow","reviews","team","hours","courseList"].includes(block.type)) {
      const items = String(block.text || "").split("|").map(x => x.trim()).filter(Boolean);
      return `<section ${attrs}><div class="pbi-live-section"><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><div class="pbi-live-card-grid">${items.map(item => `<article><h3>${esc(item)}</h3><p>Edit this item from the inspector.</p></article>`).join("") || `<article><h3>Add item</h3><p>Use | between items.</p></article>`}</div></div>${lockedOverlay(block)}</section>`;
    }
    if (block.type === "salesBanner") {
      return `<section ${attrs}><div class="pbi-live-sales-banner"><div><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><p ${editableAttr(block,'text')}>${text}</p></div>${button ? `<a class="btn" style="background:${accent}" href="#contact"${buttonAria}>${button}</a>` : ""}</div>${lockedOverlay(block)}</section>`;
    }
    if (block.type === "video") {
      return `<section ${attrs}><div class="pbi-live-section pbi-live-video"><div><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><p ${editableAttr(block,'text')}>${text}</p>${button ? `<a class="btn" style="background:${accent}" href="#contact"${buttonAria}>${button}</a>` : ""}</div><div class="pbi-live-video-frame" aria-label="Video placeholder"><span>Play</span></div></div>${lockedOverlay(block)}</section>`;
    }
    if (block.type === "beforeAfter") {
      const items = String(block.text || "").split("|").map(x => x.trim()).filter(Boolean);
      return `<section ${attrs}><div class="pbi-live-section pbi-live-before-after"><div><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><div class="pbi-live-card-grid">${items.map((item, index) => `<article><small>${index === 0 ? "Before" : "After"}</small><h3>${esc(item)}</h3></article>`).join("")}</div></div><img class="pbi-live-wide-image" src="${image}" alt="${imageAlt}"></div>${lockedOverlay(block)}</section>`;
    }
    if (block.type === "quoteForm") {
      return `<section ${attrs}><div class="pbi-live-section pbi-live-quote-form" id="contact"><div><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><p ${editableAttr(block,'text')}>${text}</p></div><div class="pbi-live-form-preview"><span>Name</span><span>Email</span><span>What do you need?</span>${button ? `<a class="btn" style="background:${accent}" href="/contact/"${buttonAria}>${button}</a>` : ""}</div></div>${lockedOverlay(block)}</section>`;
    }
    if (block.type === "gallery") {
      const galleryMarkup = galleryImages.length > 1
        ? `<div class="pbi-live-gallery-grid">${galleryImages.map((src, index) => `<img src="${esc(src)}" alt="${esc(block.imageAlts?.[index] || block.imageAlt || `${block.title || 'Gallery'} image ${index + 1}`)}">`).join("")}</div>`
        : `<img class="pbi-live-wide-image" src="${image}" alt="${imageAlt}">`;
      return `<section ${attrs}><div class="pbi-live-section"><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><p ${editableAttr(block,'text')}>${text}</p>${galleryMarkup}</div>${lockedOverlay(block)}</section>`;
    }
    if (block.type === "spacer") {
      return `<section ${attrs}><div class="pbi-live-spacer"><span ${editableAttr(block,'title')}>${title}</span></div>${lockedOverlay(block)}</section>`;
    }
    return `<section ${attrs}><div class="pbi-live-section" id="${block.type === "contact" ? "contact" : ""}"><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><p ${editableAttr(block,'text')}>${text}</p>${button ? `<a class="btn" style="background:${accent}" href="/contact/"${buttonAria}>${button}</a>` : ""}</div>${lockedOverlay(block)}</section>`;
  }

  function renderPages(){
    const list = $("#canvasPagesList");
    const locked = state.lockedPages || [];
    if (list) {
      list.innerHTML = [
        ...state.selected_pages.map(key => `<button type="button" class="${key===activePage ? "active" : ""}" data-page="${esc(key)}">${esc(state.pages?.[key]?.label || key)}</button>`),
        ...locked.map(key => `<button type="button" class="pbi-locked" title="Upgrade package to unlock this page">${esc(state.pages?.[key]?.label || key)} locked</button>`)
      ].join("");
      $$("button[data-page]", list).forEach(btn => {
        btn.addEventListener("click", () => {
          activePage = btn.dataset.page;
          selectedId = null;
          render();
        });
      });
    }
    syncEditorPageSelect();
  }

  function renderLayers(){
    const list = $("#canvasLayersList");
    if (!list) return;
    const blocks = activeBlocks();
    if (!blocks.length) {
      list.innerHTML = `<p class="muted">No layers yet. Add a block or choose a template.</p>`;
      return;
    }
    list.innerHTML = blocks.map((block, index) => `
      <article class="pbi-layer-row ${block.id === selectedId ? "active" : ""} ${block.packageLocked ? "locked" : ""}" data-layer-id="${esc(block.id)}">
        <button type="button" data-layer-select="${esc(block.id)}"><strong>${esc(block.title || block.type)}${block.packageLocked ? " 🔒" : ""}</strong><span>${esc(block.type)} · ${block.positionMode === "free" ? "Freeform" : "Flow"}</span></button>
        <div class="pbi-layer-actions">
          <button type="button" data-layer-up="${esc(block.id)}" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-layer-down="${esc(block.id)}" ${index === blocks.length-1 ? "disabled" : ""}>↓</button>
          <button type="button" data-layer-delete="${esc(block.id)}">×</button>
        </div>
      </article>
    `).join("");
    $$("[data-layer-select]", list).forEach(btn => btn.addEventListener("click", () => selectBlock(btn.dataset.layerSelect)));
    $$("[data-layer-up]", list).forEach(btn => btn.addEventListener("click", () => moveBlock(btn.dataset.layerUp, -1)));
    $$("[data-layer-down]", list).forEach(btn => btn.addEventListener("click", () => moveBlock(btn.dataset.layerDown, 1)));
    $$("[data-layer-delete]", list).forEach(btn => btn.addEventListener("click", () => deleteBlock(btn.dataset.layerDelete)));
  }

  function renderVersions(){
    const list = $("#canvasVersionsList");
    if (!list) return;
    const versions = JSON.parse(localStorage.getItem("pbi_canvas_versions") || "[]");
    if (!versions.length) {
      list.innerHTML = `<p class="muted">No saved versions yet.</p>`;
      return;
    }
    list.innerHTML = versions.map((v, i) => `<article class="pbi-version-row"><span>${new Date(v.saved_at).toLocaleString()}</span><button class="btn-ghost" type="button" data-restore-version="${i}">Restore</button></article>`).join("");
    $$("[data-restore-version]", list).forEach(btn => btn.addEventListener("click", () => {
      snapshot();
      const v = versions[Number(btn.dataset.restoreVersion)];
      if (v?.state) {
        state = v.state;
        activePage = state.activePage || state.selected_pages?.[0] || "home";
        selectedId = null;
        render();
        setStatus("Version restored locally");
      }
    }));
  }

  function renderPlanControl(){
    let control = $("#pbiPlanControl");
    if (!control) {
      control = document.createElement("div");
      control.id = "pbiPlanControl";
      control.className = "pbi-plan-control";
      control.innerHTML = `
        <span>Package:</span>
        <button type="button" data-plan-select="starter">Starter</button>
        <button type="button" data-plan-select="business">Business</button>
        <button type="button" data-plan-select="plus">Plus</button>
      `;
      $(".pbi-canvas-top-actions")?.prepend(control);
      const newBtn = document.createElement("button");
      newBtn.id = "pbiNewProjectBtn";
      newBtn.className = "btn-ghost";
      newBtn.type = "button";
      newBtn.textContent = "New project";
      newBtn.addEventListener("click", () => {
        snapshot();
        localStorage.removeItem("pbi_canvas_state");
        const plan = currentPlan();
      state = projectFromPreset("cafe");
      state.plan = plan;
      state.project_id = `local-${Date.now()}`;
      state.blocksByPage = {};
        for (const page of state.selected_pages) state.blocksByPage[page] = blocksForPreset(state, page);
        activePage = "home";
        selectedId = null;
        render();
        setStatus("New project started");
      });
      control.after(newBtn);
    }

    $$("[data-plan-select]", control).forEach(btn => {
      btn.classList.toggle("active", btn.dataset.planSelect === currentPlan());
      btn.onclick = () => {
        const oldPlan = currentPlan();
        const newPlan = rules.cleanPlan(btn.dataset.planSelect);
        snapshot();
        state.plan = newPlan;
        state.package = newPlan;
        localStorage.setItem("pbi_plan", newPlan);
        enforcePlan({ downgrade: oldPlan !== newPlan });
        render();
        if (oldPlan !== newPlan) showPackageChangeNotice(oldPlan, newPlan);
        setStatus(`Package set to ${newPlan}. Package rules applied.`);
      };
    });
  }

  function renderReadiness(){
    let box = $("#pbiReadinessBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "pbiReadinessBox";
      box.className = "pbi-readiness-box";
      $(".pbi-studio-toolbar")?.after(box);
    }
    const result = rules.checklist ? rules.checklist(state) : { ok:true, issues:[], warnings:[], score:100 };
    box.innerHTML = `
      <div><strong>Launch readiness: ${result.score || 100}%</strong><span>${result.ok ? "Ready for payment check" : "Needs attention before publish"}</span></div>
      <button type="button" class="btn-ghost" id="pbiRunChecklistBtn">Run checklist</button>
    `;
    $("#pbiRunChecklistBtn")?.addEventListener("click", () => showChecklist(result));
  }

  function suggestedDomainInput(){
    if (state.domain_lookup_input) return state.domain_lookup_input;
    if (state.domain_registration?.name) return state.domain_registration.name;
    if (state.custom_domain) return state.custom_domain;
    return `${domainSlug(state.business_name || state.project_name || state.templateId || "my-business")}.co.uk`;
  }

  function domainModeLabel(mode){
    if (mode === "register_new") return "Register new domain";
    if (mode === "connect_existing") return "Connect owned domain";
    return "PBI subdomain";
  }

  function domainPriceLabel(domain){
    const pricing = domain?.pricing || {};
    const cost = pricing.registration_cost || "";
    const currency = pricing.currency || "GBP";
    return cost ? `${currency} ${cost} year one` : "Price confirmed at checkout";
  }

  function domainStatusLabel(domain){
    if (domain?.available === true) return domain?.source === "cloudflare_registrar" ? "Registrar checked" : "Auto checked";
    if (domain?.available === false) return "Unavailable";
    if (domain?.status === "invalid") return "Invalid";
    return "Auto final check";
  }

  function domainStatusClass(domain){
    if (domain?.available === true) return "available";
    if (domain?.available === false) return "taken";
    if (domain?.status === "invalid") return "invalid";
    return "available";
  }

  function domainCanBeSaved(domain){
    if (!domain?.name) return false;
    if (domain.available === true) return true;
    if (domain.available === false || domain.status === "invalid") return false;
    return true;
  }

  function normaliseSelectedDomain(domain){
    const status = String(domain.status || "").toLowerCase();
    const blocked = domain.available === false || ["invalid", "registered", "taken", "unavailable"].includes(status);
    return {
      ...domain,
      available: blocked ? false : true,
      status: blocked ? (domain.status || "invalid") : (status === "manual_review" ? "saved_for_registration" : (domain.status || "saved_for_registration")),
      requires_manual_review: false,
      message: blocked
        ? (domain.message || "This domain cannot be registered.")
        : (domain.message || "Saved for automatic registrar check after checkout.")
    };
  }

  function domainCardMessage(domain){
    if (domain?.available === true) return domain.message || "Automatic pre-check passed. Save it to add the domain price at checkout.";
    if (domain?.available === false) return "Already registered or unavailable.";
    if (domain?.status === "invalid") return domain.message || "Enter a valid domain name.";
    return "Save this domain for automatic registrar confirmation after checkout.";
  }

  function domainConfidenceLabel(domain){
    const confidence = String(domain?.confidence || "").toLowerCase();
    if (confidence === "high") return "high confidence";
    if (confidence === "medium") return "medium confidence";
    if (confidence === "low") return "low confidence";
    return "registrar final check";
  }

  function renderDomainCard(domain, featured=false){
    if (!domain?.name) return "";
    const selectable = domainCanBeSaved(domain);
    const payload = attr(JSON.stringify(domain));
    const chosen = state.pending_domain_registration?.name === domain.name || state.domain_registration?.name === domain.name;
    return `
      <article class="pbi-domain-result-card ${domainStatusClass(domain)} ${featured ? "featured" : ""} ${chosen ? "selected" : ""}">
        <div>
          <strong>${esc(domain.name)}</strong>
          <span>${esc(domainCardMessage(domain))}</span>
          <small>${esc(domainPriceLabel(domain))} · ${esc(domainConfidenceLabel(domain))}</small>
        </div>
        <div class="pbi-domain-card-actions">
          <span class="pbi-domain-state">${esc(domainStatusLabel(domain))}</span>
          ${selectable ? `<button class="btn-ghost pbiDomainSelectBtn" type="button" data-domain-json="${payload}">${chosen ? "Chosen" : "Choose domain"}</button>` : ""}
        </div>
      </article>
    `;
  }

  function activeDomainSelection(){
    return state.pending_domain_registration || state.domain_registration || null;
  }

  function renderDomainPanel(){
    const input = $("#canvasDomainInput");
    const current = $("#canvasDomainCurrent");
    const results = $("#canvasDomainResults");
    const mode = state.domain_option || "pbi_subdomain";
    const activeDomain = activeDomainSelection();
    const selectedName = activeDomain?.name || state.custom_domain || "";

    if (input && document.activeElement !== input) input.value = suggestedDomainInput();

    $$("[data-domain-mode]").forEach((button) => {
      const active = button.dataset.domainMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    if (current) {
      const pending = Boolean(state.pending_domain_registration?.name);
      const saved = Boolean(state.domain_registration?.name);
      current.innerHTML = `
        <strong>${esc(domainModeLabel(mode))}</strong>
        <span>${selectedName ? esc(selectedName) : "No custom domain selected yet"}</span>
        ${activeDomain?.name ? `<small>${esc(domainPriceLabel(activeDomain))} · automatic registrar check after payment</small>` : ""}
        <div class="pbi-domain-current-actions">
          ${pending ? `<button class="btn" id="canvasDomainSaveBtn" type="button">Save selected domain</button>` : ""}
          ${saved && !pending ? `<span class="pbi-domain-saved-note">Saved to project</span>` : ""}
        </div>
      `;
      $("#canvasDomainSaveBtn")?.addEventListener("click", saveSelectedDomain);
    }

    if (!results) return;
    const check = state.domain_check;
    if (!check) {
      results.innerHTML = `<p class="muted">Check a name to see availability and selectable alternatives.</p>`;
      return;
    }

    const suggestions = Array.isArray(check.suggestions) ? check.suggestions : [];
    results.innerHTML = `
      <div class="pbi-domain-results-head">
        <strong>Domain results</strong>
        <span>${esc(check.message || "Final registrar confirmation happens before purchase.")}</span>
      </div>
      <div class="pbi-domain-result-grid">
        ${renderDomainCard(check.requested, true)}
        ${suggestions.map((domain) => renderDomainCard(domain)).join("")}
      </div>
    `;

    $$(".pbiDomainSelectBtn", results).forEach((button) => {
      button.addEventListener("click", () => {
        try {
          selectCheckedDomain(JSON.parse(button.dataset.domainJson || "{}"));
        } catch {
          setStatus("Could not select that domain");
        }
      });
    });
  }

  function setDomainMode(mode){
    snapshot();
    state.domain_option = mode || "pbi_subdomain";
    if (state.domain_option === "pbi_subdomain") {
      state.custom_domain = "";
      state.domain_registration = null;
      state.pending_domain_registration = null;
      state.use_custom_domain = false;
    }
    if (state.domain_option === "connect_existing") {
      state.domain_registration = null;
      state.pending_domain_registration = null;
      state.use_custom_domain = Boolean(state.custom_domain);
    }
    render();
    setStatus(`${domainModeLabel(state.domain_option)} selected`);
  }

  async function checkCanvasDomain(){
    const input = $("#canvasDomainInput");
    const domain = input?.value?.trim() || suggestedDomainInput();
    state.domain_lookup_input = domain;
    const keyword = state.business_name || state.project_name || state.templateId || domain;
    const results = $("#canvasDomainResults");
    if (results) results.innerHTML = `<p class="muted">Checking live availability...</p>`;
    setStatus("Checking domain availability");

    try {
      const response = await fetch("/api/domain/check", {
        method:"POST",
        credentials:"include",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ domain, keyword, business_name: state.business_name || "" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || "Could not check domain");
      state.domain_check = data;
      renderDomainPanel();
      persist();
      setStatus("Domain check complete");
    } catch (err) {
      if (results) results.innerHTML = `<div class="notice domain-error">${esc(err.message || "Could not check domain")}</div>`;
      setStatus("Domain check failed");
    }
  }

  function selectCheckedDomain(domain){
    if (!domainCanBeSaved(domain)) return setStatus("Choose an available domain");
    const selectedDomain = normaliseSelectedDomain(domain);
    snapshot();
    state.pending_domain_registration = selectedDomain;
    state.custom_domain = selectedDomain.name;
    state.use_custom_domain = true;
    state.domain_option = "register_new";
    state.domain_lookup_input = selectedDomain.name;
    render();
    persist();
    setStatus(`${selectedDomain.name} chosen. Press Save selected domain to store it.`);
  }

  function saveSelectedDomain(){
    const selectedDomain = normaliseSelectedDomain(activeDomainSelection() || {});
    if (!selectedDomain?.name) return setStatus("Choose a domain result first");
    snapshot();
    state.domain_registration = selectedDomain;
    state.pending_domain_registration = null;
    state.custom_domain = selectedDomain.name;
    state.use_custom_domain = true;
    state.domain_option = "register_new";
    state.domain_lookup_input = selectedDomain.name;
    render();
    persist();
    setStatus(`Saving ${selectedDomain.name} to project`);
    const saved = saveProject();
    if (saved?.then) {
      saved.then(async (response) => {
        if (response && !response.ok) {
          const body = await response.json().catch(() => ({}));
          setStatus(body.error || body.message || "Could not save domain to account");
          return;
        }
        setStatus(`${selectedDomain.name} saved to project`);
        renderDomainPanel();
      }).catch(() => setStatus("Could not save domain to account"));
    }
  }

  function useExistingDomain(){
    const name = cleanDomainText($("#canvasDomainInput")?.value || state.custom_domain || "");
    if (!name || !name.includes(".")) return setStatus("Enter the owned domain first");
    snapshot();
    state.custom_domain = name;
    state.domain_registration = null;
    state.pending_domain_registration = null;
    state.domain_option = "connect_existing";
    state.use_custom_domain = true;
    state.domain_lookup_input = name;
    render();
    setStatus(`${name} set as owned domain`);
    saveProject()?.then(() => setStatus(`${name} saved to project`));
  }

  function render(){
    enforcePlan();
    const preset = getPreset(state.templateId || "cafe");
    if (titleEl) titleEl.innerHTML = `${esc(state.business_name || preset.businessName || "PBI Website")} <span>${esc(currentPlan())} package</span>`;
    renderPages();
    renderPlanControl();
    renderDomainPanel();

    const bg = state.background_color || preset.background || "#fffaf4";
    const accent = state.accent_color || preset.accent || "#b95624";
    const text = state.text_color || preset.text || "#24130c";

    if (drop) {
      if (empty) empty.hidden = true;
      drop.style.setProperty("--preview-accent", accent);
      drop.style.background = bg;
      drop.style.color = text;
      drop.classList.toggle("has-freeform", activeBlocks().some(block => block.positionMode === "free" && isPremium() && !block.packageLocked));
      drop.classList.toggle("preview-mode", previewMode);
      drop.innerHTML = activeBlocks().map(renderBlock).join("") || `<div class="pbi-canvas-empty"><h2>Add a block or choose a template</h2><p>Your canvas will appear here.</p></div>`;
      wireCanvasBlocks();
    }

    renderLayers();
    renderVersions();
    renderReadiness();
    refreshTemplateButtons();
    applyGate();
    syncEditorPageSelect();
    const selectedBlock = activeBlocks().find(x => x.id === selectedId);
    if (selectedBlock) refreshFloatingToolbar(selectedBlock); else hideFloatingToolbar();
    persist();
    setStatus("Autosaved locally");
  }

  function wireCanvasBlocks(){
    $$("[data-block-id]", drop).forEach(el => {
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        selectBlock(el.dataset.blockId);
      });
      el.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("application/x-pbi-block-id", el.dataset.blockId);
      });
      el.addEventListener("dragover", (event) => event.preventDefault());
      el.addEventListener("drop", (event) => {
        event.preventDefault();
        const dragged = event.dataTransfer?.getData("application/x-pbi-block-id");
        if (dragged && dragged !== el.dataset.blockId) reorderBlockBefore(dragged, el.dataset.blockId);
      });
      const block = activeBlocks().find(x => x.id === el.dataset.blockId);
      if (block?.positionMode === "free" && isPremium() && !block.packageLocked) {
        el.addEventListener("pointerdown", (event) => {
          if (previewMode || event.button !== 0) return;
          if (event.target.closest('[contenteditable="true"], a, button, input, textarea, select')) return;
          event.preventDefault();
          selectBlock(el.dataset.blockId);
          snapshot();
          const startX = event.clientX;
          const startY = event.clientY;
          const originX = Number(block.x) || 40;
          const originY = Number(block.y) || 40;
          el.setPointerCapture?.(event.pointerId);
          const onMove = (moveEvent) => {
            const nextX = Math.max(0, Math.round(originX + moveEvent.clientX - startX));
            const nextY = Math.max(0, Math.round(originY + moveEvent.clientY - startY));
            block.x = nextX;
            block.y = nextY;
            el.style.left = `${nextX}px`;
            el.style.top = `${nextY}px`;
            $("#inspectorX") && ($("#inspectorX").value = nextX);
            $("#inspectorY") && ($("#inspectorY").value = nextY);
          };
          const onUp = () => {
            el.releasePointerCapture?.(event.pointerId);
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", onUp);
            persist();
            renderLayers();
            setStatus("Freeform position updated");
          };
          el.addEventListener("pointermove", onMove);
          el.addEventListener("pointerup", onUp, { once:true });
        });
      }
    });

    $$("[data-inline-field]", drop).forEach(el => {
      el.addEventListener("blur", () => {
        const blockEl = el.closest("[data-block-id]");
        const block = activeBlocks().find(x => x.id === blockEl?.dataset.blockId);
        if (!block || block.packageLocked) return;
        snapshot();
        block[el.dataset.inlineField] = el.textContent.trim();
        persist();
        renderLayers();
        setStatus("Inline edit saved locally");
      });
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey && !["P","DIV"].includes(el.tagName)) {
          event.preventDefault();
          el.blur();
        }
      });
    });
  }

  function selectBlock(id){
    selectedId = id;
    const block = activeBlocks().find(x => x.id === id);
    if (!block) return;
    $$("[data-block-id]").forEach(el => el.classList.toggle("selected", el.dataset.blockId === id));
    const form = $("#canvasInspectorForm");
    const emptyNotice = $("#canvasInspectorEmpty");

    if (block.packageLocked) {
      if (form) form.style.display = "none";
      if (emptyNotice) {
        emptyNotice.style.display = "block";
        emptyNotice.innerHTML = `<strong>Locked by package</strong><p>${esc(block.lockedReason || "Upgrade package to edit this feature.")}</p>`;
      }
      renderLayers();
      return;
    }

    if (form) {
      form.hidden = false;
      form.style.display = "grid";
    }
    if (emptyNotice) emptyNotice.style.display = "none";
    $("#inspectorTitle") && ($("#inspectorTitle").value = block.title || "");
    $("#inspectorText") && ($("#inspectorText").value = block.text || "");
    $("#inspectorButton") && ($("#inspectorButton").value = block.button || "");
    $("#inspectorImage") && ($("#inspectorImage").value = block.image || "");
    $("#inspectorLayout") && ($("#inspectorLayout").value = block.layout || "standard");
    $("#inspectorAnimation") && ($("#inspectorAnimation").value = block.animation || "none");
    $("#inspectorBg") && ($("#inspectorBg").value = block.background || "#fffaf4");
    $("#inspectorAccent") && ($("#inspectorAccent").value = block.accent || state.accent_color || getPreset(state.templateId).accent || "#bf5c29");
    $("#inspectorPositionMode") && ($("#inspectorPositionMode").value = block.positionMode || "flow");
    $("#inspectorWidth") && ($("#inspectorWidth").value = block.width || 760);
    $("#inspectorX") && ($("#inspectorX").value = block.x || 40);
    $("#inspectorY") && ($("#inspectorY").value = block.y || 40);
    $("#inspectorRotate") && ($("#inspectorRotate").value = block.rotate || 0);
    $("#inspectorZ") && ($("#inspectorZ").value = block.z || 5);
    $("#inspectorVisibility") && ($("#inspectorVisibility").value = block.visibility || "all");
    renderLayers();
    refreshFloatingToolbar(block);
    setStatus("Block selected");
  }

  function applyInspector(){
    const block = activeBlocks().find(x => x.id === selectedId);
    if (!block || block.packageLocked) return;
    const wantsFreeform = $("#inspectorPositionMode")?.value === "free";
    if (wantsFreeform && !isPremium()) {
      showFreeformGuide(true);
      $("#inspectorPositionMode").value = "flow";
      return;
    }
    snapshot();
    Object.assign(block, {
      title: $("#inspectorTitle")?.value || block.title,
      text: $("#inspectorText")?.value || block.text,
      button: $("#inspectorButton")?.value || "",
      image: $("#inspectorImage")?.value || block.image,
      layout: $("#inspectorLayout")?.value || block.layout,
      animation: $("#inspectorAnimation")?.value || block.animation,
      background: $("#inspectorBg")?.value || block.background,
      accent: $("#inspectorAccent")?.value || block.accent,
      positionMode: $("#inspectorPositionMode")?.value || block.positionMode,
      width: Number($("#inspectorWidth")?.value || block.width || 760),
      x: Number($("#inspectorX")?.value || block.x || 40),
      y: Number($("#inspectorY")?.value || block.y || 40),
      rotate: Number($("#inspectorRotate")?.value || block.rotate || 0),
      z: Number($("#inspectorZ")?.value || block.z || 5),
      visibility: $("#inspectorVisibility")?.value || block.visibility || "all"
    });
    render();
    selectBlock(block.id);
    setStatus("Changes applied");
  }

  function addBlock(type){
    const block = createBlock(type, getPreset(state.templateId), activePage);
    if (!rules.blockAllowed?.(block, currentPlan())) {
      showPackageChangeNotice(currentPlan(), currentPlan(), `${block.type} is not available on ${currentPlan()}. Upgrade to unlock it.`);
      return;
    }
    snapshot();
    activeBlocks().push(block);
    selectedId = block.id;
    render();
    selectBlock(block.id);
    setStatus(`${type.replace(/([A-Z])/g," $1")} block added`);
  }

  function duplicateSelected(){
    const block = activeBlocks().find(x => x.id === selectedId);
    if (!block || block.packageLocked) return;
    snapshot();
    const copy = JSON.parse(JSON.stringify(block));
    copy.id = uid(block.type);
    copy.title = `${copy.title || block.type} copy`;
    activeBlocks().splice(activeBlocks().findIndex(x => x.id === block.id) + 1, 0, copy);
    selectedId = copy.id;
    render();
    selectBlock(copy.id);
  }

  function moveBlock(id, direction){
    const blocks = activeBlocks();
    const index = blocks.findIndex(x => x.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= blocks.length) return;
    snapshot();
    const [item] = blocks.splice(index,1);
    blocks.splice(next,0,item);
    render();
    selectBlock(id);
  }

  function reorderBlockBefore(draggedId, targetId){
    const blocks = activeBlocks();
    const from = blocks.findIndex(x => x.id === draggedId);
    const to = blocks.findIndex(x => x.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    snapshot();
    const [item] = blocks.splice(from,1);
    blocks.splice(to,0,item);
    render();
    selectBlock(draggedId);
  }

  function deleteBlock(id){
    const blocks = activeBlocks();
    const index = blocks.findIndex(x => x.id === id);
    if (index < 0) return;
    snapshot();
    blocks.splice(index,1);
    selectedId = null;
    render();
    setStatus("Block deleted");
  }

  function refreshTemplateButtons(){
    $$("[data-template-pack]").forEach(btn => {
      const key = normalise(btn.dataset.templatePack);
      btn.classList.toggle("active", key === state.templateId);
    });
  }

  function loadTemplate(pack){
    snapshot();
    const key = normalise(pack);
    const oldPlan = currentPlan();
    const oldProject = getProjectId();
    state = projectFromPreset(key);
    state.templateId = key;
    state.plan = oldPlan;
    state.project_id = oldProject;
    state.blocksByPage = {};
    state.selected_pages = state.selected_pages || ["home","about","services","gallery","contact"];
    for (const page of state.selected_pages) state.blocksByPage[page] = blocksForPreset(state, page);
    activePage = "home";
    selectedId = null;
    render();
    setStatus(`${getPreset(key).label || key} template loaded`);
  }

  function addPage(){
    const raw = ($("#canvasNewPageTitle")?.value || "").trim();
    if (!raw) return;
    const limit = rules.limits?.[currentPlan()]?.maxPages || (currentPlan()==='starter'?5:12);
    if ((state.selected_pages || []).length >= limit) {
      showPackageChangeNotice(currentPlan(), currentPlan(), `${currentPlan()} allows up to ${limit} pages. Upgrade to add more.`);
      return;
    }
    snapshot();
    const key = raw.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || uid("page");
    state.pages = state.pages || {};
    state.selected_pages = state.selected_pages || [];
    if (!state.selected_pages.includes(key)) state.selected_pages.push(key);
    state.pages[key] = { label: raw, title: raw, body:"Add your page content here." };
    state.blocksByPage[key] = blocksForPreset(state, key);
    activePage = key;
    $("#canvasNewPageTitle").value = "";
    render();
  }

  function duplicatePage(){
    if (!isPremium()) return showFreeformGuide(true);
    const limit = rules.limits?.[currentPlan()]?.maxPages || 12;
    if ((state.selected_pages || []).length >= limit) return showPackageChangeNotice(currentPlan(), currentPlan(), `${currentPlan()} allows up to ${limit} pages.`);
    snapshot();
    const sourceKey = activePage;
    const source = state.pages[sourceKey] || { label:"Page", title:"Page", body:"" };
    const key = uid((source.label || "page").toLowerCase().replace(/[^a-z0-9]+/g,"-"));
    state.selected_pages.push(key);
    state.pages[key] = { ...source, label: (source.label || "Page") + " copy" };
    state.blocksByPage[key] = JSON.parse(JSON.stringify(activeBlocks())).map(block => ({ ...block, id: uid(block.type) }));
    activePage = key;
    selectedId = null;
    render();
  }

  function deletePage(){
    if ((state.selected_pages || []).length <= 1) return setStatus("Keep at least one page");
    snapshot();
    const index = state.selected_pages.indexOf(activePage);
    delete state.pages[activePage];
    delete state.blocksByPage[activePage];
    state.selected_pages.splice(index,1);
    activePage = state.selected_pages[Math.max(0,index-1)] || state.selected_pages[0];
    selectedId = null;
    render();
  }

  function showFreeformGuide(upgradeNeeded=false){
    const message = upgradeNeeded
      ? "Freeform positioning, duplicate pages and advanced canvas controls require Business or Plus. Select Business/Plus at the top to unlock them."
      : "Freeform guide: select a block, set Mode to Freeform layer in the Inspector, then adjust X/Y/width/rotate. Use Layers to reorder. Switch back to Flow for normal responsive sections. Starter automatically converts freeform layers back to flow.";
    showFloatingBox(upgradeNeeded ? "Package gate" : "Freeform guide", message);
  }

  function showPackageChangeNotice(fromPlan, toPlan, custom){
    const message = custom || `Package rules applied. ${toPlan === "starter" ? "Freeform, Plus CMS/collab and premium-only blocks are locked or converted before save/publish." : toPlan === "business" ? "Plus-only CMS/collab features are locked. Canvas freedom remains active." : "Plus features unlocked."}`;
    showFloatingBox("Package rules", message);
  }

  function showChecklist(result){
    result = result || rules.checklist(state);
    const body = `
      <p><strong>Score:</strong> ${result.score || 100}% · <strong>Package:</strong> ${esc(result.plan || currentPlan())}</p>
      ${(result.issues || []).length ? `<h4>Fix before publish</h4><ul>${result.issues.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>` : "<p>No blocking issues found.</p>"}
      ${(result.warnings || []).length ? `<h4>Warnings</h4><ul>${result.warnings.slice(0,8).map(i=>`<li>${esc(i)}</li>`).join("")}</ul>` : ""}
    `;
    showFloatingBox("Pre-publish checklist", body, true);
  }

  function showFloatingBox(title, message, html=false){
    let guide = $("#pbiFreeformGuideBox");
    if (!guide) {
      guide = document.createElement("div");
      guide.id = "pbiFreeformGuideBox";
      guide.className = "pbi-freeform-guide-box";
      $(".pbi-studio-toolbar")?.after(guide);
    }
    guide.innerHTML = `<strong>${esc(title)}</strong>${html ? message : `<p>${esc(message)}</p>`}<button type="button" class="btn-ghost" id="pbiCloseFreeformGuide">Got it</button>`;
    $("#pbiCloseFreeformGuide")?.addEventListener("click", () => guide.remove());
  }

  function saveProject(){
    enforcePlan({ forSave:true });
    const local = JSON.parse(localStorage.getItem("pbi_local_projects") || "[]");
    const id = getProjectId();
    state.project_id = id;
    const result = rules.checklist ? rules.checklist(state) : { checked: state, warnings: [] };
    state = result.checked || state;
    const project = {
      id,
      name: state.business_name || getPreset(state.templateId).businessName || "PBI Website",
      status:"draft",
      plan: currentPlan(),
      package: currentPlan(),
      template: state.templateId,
      billing_status:"draft",
      domain_option: state.domain_option || "pbi_subdomain",
      custom_domain: state.custom_domain || state.domain_registration?.name || "",
      readiness_score: result.score || 100,
      package_warnings: result.warnings || [],
      published:0,
      updated_at:new Date().toISOString()
    };
    const existing = local.find(p => p.id === id);
    if (existing) Object.assign(existing, project); else local.unshift(project);
    localStorage.setItem("pbi_local_projects", JSON.stringify(local));
    persist();
    setStatus("Project saved locally");
    return fetch("/api/projects/save", {
      method:"POST",
      credentials:"include",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ project, canvas:state, checklist: result })
    }).catch(() => null);
  }

  function saveVersion(){
    const versions = JSON.parse(localStorage.getItem("pbi_canvas_versions") || "[]");
    versions.unshift({ saved_at:new Date().toISOString(), state: JSON.parse(JSON.stringify(state)), plan: currentPlan() });
    localStorage.setItem("pbi_canvas_versions", JSON.stringify(versions.slice(0,25)));
    renderVersions();
    setStatus("Version saved");
    fetch("/api/projects/save-version", {
      method:"POST",
      credentials:"include",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ project_id:getProjectId(), state, plan: currentPlan() })
    }).catch(()=>{});
  }

  function undo(){
    if (!history.length) return setStatus("Nothing to undo");
    future.push(JSON.stringify(state));
    state = JSON.parse(history.pop());
    activePage = state.activePage || state.selected_pages?.[0] || "home";
    selectedId = null;
    render();
    setStatus("Undo");
  }

  function redo(){
    if (!future.length) return setStatus("Nothing to redo");
    history.push(JSON.stringify(state));
    state = JSON.parse(future.pop());
    activePage = state.activePage || state.selected_pages?.[0] || "home";
    selectedId = null;
    render();
    setStatus("Redo");
  }

  function applyGate(){
    const plus = isPlus();
    $$('[data-studio-tab="cms"], [data-studio-tab="collab"]').forEach(tab => {
      tab.classList.toggle("pbi-locked", !plus);
      tab.title = plus ? "" : "Plus required";
    });
    $("#canvasSaveVersionBtn")?.classList.toggle("pbi-locked", false);
    $("#canvasFreeformGuideBtn")?.classList.remove("pbi-locked");
    const note = $("#canvasInspectorEmpty");
    if (note && !selectedId) {
      note.innerHTML = isPremium()
        ? "Select a block to edit text, layout, freeform position, motion and responsive behaviour."
        : "Select a block to edit. Freeform positioning unlocks on Business and Plus.";
    }
  }

  function addCmsItem(){
    if (!isPlus()) return showPackageChangeNotice(currentPlan(), currentPlan(), "CMS collections are included in Plus.");
    const item = {
      id: uid("cms"),
      title: $("#cmsItemTitle")?.value || "Untitled",
      slug: $("#cmsItemSlug")?.value || uid("entry"),
      type: $("#cmsItemType")?.value || "blog",
      status: $("#cmsItemStatus")?.value || "draft",
      body: $("#cmsItemText")?.value || "",
      excerpt: $("#cmsItemExcerpt")?.value || "",
      seoTitle: $("#cmsItemSeoTitle")?.value || "",
      seoDescription: $("#cmsItemSeoDescription")?.value || "",
      updated_at: new Date().toISOString()
    };
    state.cmsItems = state.cmsItems || [];
    state.cmsItems.unshift(item);
    renderCmsList();
    persist();
  }

  function renderCmsList(){
    const list = $("#cmsItemsList");
    if (!list) return;
    const items = state.cmsItems || [];
    list.innerHTML = items.length ? items.map(item => `<article class="pbi-cms-row"><strong>${esc(item.title)}</strong><span>${esc(item.type)} · ${esc(item.status)}</span></article>`).join("") : `<p class="muted">No CMS entries yet.</p>`;
  }

  function saveCmsCloud(){
    if (!isPlus()) return showPackageChangeNotice(currentPlan(), currentPlan(), "Cloud CMS is included in Plus.");
    fetch("/api/cms/save", { method:"POST", credentials:"include", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ project_id:getProjectId(), items:state.cmsItems || [] })}).then(()=>setStatus("CMS saved")).catch(()=>setStatus("CMS saved locally only"));
  }

  function loadCmsCloud(){
    fetch(`/api/cms/list?project_id=${encodeURIComponent(getProjectId())}`, { credentials:"include" }).then(r=>r.json()).then(data=>{
      if (data.items) state.cmsItems = data.items;
      renderCmsList();
      persist();
    }).catch(()=>renderCmsList());
  }

  function inviteCollaborator(){
    if (!isPlus()) return showPackageChangeNotice(currentPlan(), currentPlan(), "Collaboration is included in Plus.");
    const email = $("#collabInviteEmail")?.value || "";
    const role = $("#collabInviteRole")?.value || "viewer";
    if (!email.includes("@")) return setStatus("Enter a collaborator email");
    state.collaborators = state.collaborators || [];
    state.collaborators.push({ email, role, invited_at:new Date().toISOString() });
    renderCollab();
    persist();
    setStatus("Collaborator added locally");
  }

  function addCollabNote(){
    if (!isPlus()) return showPackageChangeNotice(currentPlan(), currentPlan(), "Collaboration notes are included in Plus.");
    const note = $("#collabNote")?.value || "";
    if (!note.trim()) return;
    state.collabNotes = state.collabNotes || [];
    state.collabNotes.unshift({ note, created_at:new Date().toISOString() });
    $("#collabNote").value = "";
    renderCollab();
    persist();
  }

  function renderCollab(){
    const presence = $("#collabPresenceList");
    const feed = $("#collabFeed");
    if (presence) presence.innerHTML = (state.collaborators || []).map(c=>`<span>${esc(c.email)} · ${esc(c.role)}</span>`).join("") || `<p class="muted">No collaborators invited.</p>`;
    if (feed) feed.innerHTML = (state.collabNotes || []).map(n=>`<article><p>${esc(n.note)}</p><small>${new Date(n.created_at).toLocaleString()}</small></article>`).join("") || `<p class="muted">No notes yet.</p>`;
  }

  const siteSignals = [
    { key:"mobile-mechanic", words:["mechanic","garage","vehicle","car","van","mot","diagnostic","mobile auto"] },
    { key:"trades", words:["plumber","electrician","builder","roofer","heating","trade","trades","repair","installation"] },
    { key:"cleaner", words:["cleaner","cleaning","housekeeping","domestic","commercial clean"] },
    { key:"personal-trainer", words:["trainer","fitness","gym","coach","workout","programme","program"] },
    { key:"dog-groomer", words:["dog","groomer","grooming","pet","puppy"] },
    { key:"restaurant", words:["restaurant","dining","reservation","menu","kitchen"] },
    { key:"cafe", words:["cafe","coffee","brunch","bakery","cake"] },
    { key:"salon", words:["salon","hair","beauty","wellness","treatment","nails"] },
    { key:"holiday-let", words:["holiday let","stay","cottage","retreat","accommodation","airbnb"] },
    { key:"shop", words:["shop","retail","store","products","ecommerce","e-commerce"] },
    { key:"consultant", words:["consultant","advisor","advisory","coach","agency","professional"] }
  ];

  const siteProfiles = {
    cafe: { generic:"local cafe", services:["Breakfast and brunch","Speciality coffee","Private bookings"], proof:["Fresh daily menu","Friendly local team","Easy table enquiries"], offerLabel:"Menu", app:"booking" },
    restaurant: { generic:"local restaurant", services:["Seasonal menu","Table reservations","Private dining"], proof:["Fresh ingredients","Warm service","Easy booking route"], offerLabel:"Menu", app:"booking" },
    trades: { generic:"local trades business", services:["Repairs and callouts","Installations","Maintenance plans"], proof:["Clear quotes","Trusted local work","Fast response"], offerLabel:"Services", app:"quoteForm" },
    salon: { generic:"hair and beauty studio", services:["Cut and styling","Colour and treatments","Appointment packages"], proof:["Experienced stylists","Relaxed appointments","Clear treatment menu"], offerLabel:"Treatments", app:"booking" },
    consultant: { generic:"consultancy business", services:["Discovery call","Strategy review","Implementation support"], proof:["Clear process","Commercial focus","Practical next steps"], offerLabel:"Services", app:"booking" },
    "holiday-let": { generic:"holiday let", services:["Direct stay enquiries","Local guide","Guest information"], proof:["Comfortable spaces","Great location","Simple booking route"], offerLabel:"Stay", app:"booking" },
    shop: { generic:"local shop", services:["Best sellers","Gift ideas","Click and collect"], proof:["Curated products","Simple checkout path","Friendly support"], offerLabel:"Shop", app:"retail" },
    "mobile-mechanic": { generic:"mobile mechanic", services:["Diagnostics","Emergency callouts","Servicing and repairs"], proof:["Comes to you","Clear quotes","Fast local response"], offerLabel:"Services", app:"quoteForm" },
    "dog-groomer": { generic:"dog groomer", services:["Full groom","Bath and tidy","Puppy intro"], proof:["Calm handling","Clear packages","Easy appointment requests"], offerLabel:"Packages", app:"booking" },
    cleaner: { generic:"cleaning service", services:["Regular cleans","Deep cleans","Commercial cleaning"], proof:["Reliable slots","Clear quote route","Local references"], offerLabel:"Services", app:"quoteForm" },
    "personal-trainer": { generic:"personal trainer", services:["Starter session","Progress programme","Ongoing coaching"], proof:["Structured plans","Progress check-ins","Flexible sessions"], offerLabel:"Programmes", app:"courseList" }
  };

  function inferTemplateFromBrief(brief){
    const lower = String(brief || "").toLowerCase();
    const match = siteSignals.find(signal => signal.words.some(word => lower.includes(word)));
    return match?.key || normalise(state.templateId || "cafe");
  }

  function inferGoalFromBrief(brief, explicit){
    if (explicit && explicit !== "auto") return explicit;
    const lower = String(brief || "").toLowerCase();
    if (/(shop|order|checkout|buy|product|retail)/.test(lower)) return "shop";
    if (/(course|class|programme|program|session|signup|sign up)/.test(lower)) return "courses";
    if (/(book|booking|appointment|reservation|table)/.test(lower)) return "bookings";
    if (/(call|phone|emergency|urgent)/.test(lower)) return "calls";
    return "enquiries";
  }

  function goalCopy(goal){
    if (goal === "bookings") return { cta:"Book now", action:"book", noun:"booking", section:"booking" };
    if (goal === "calls") return { cta:"Call today", action:"call", noun:"call", section:"quoteForm" };
    if (goal === "shop") return { cta:"Shop now", action:"order", noun:"order", section:"retail" };
    if (goal === "courses") return { cta:"Join a programme", action:"sign up", noun:"signup", section:"courseList" };
    return { cta:"Send enquiry", action:"enquire", noun:"enquiry", section:"quoteForm" };
  }

  function inferLocation(brief){
    const text = String(brief || "");
    const match = text.match(/\b(?:in|near|around|across|for)\s+([a-z][a-z .'-]{1,31}?)(?=,|\.|$|\s+(?:called|named|with|and|for|that|who|want|needs?))/i);
    return (match?.[1] || state.location || "").trim();
  }

  function inferBusinessName(brief, key){
    const text = String(brief || "");
    const named = text.match(/\b(?:called|named|for)\s+([A-Z][A-Za-z0-9 &'’.-]{2,42})(?:,|\.|$|\s+(?:in|with|that|who|needs?|wants?))/);
    if (named?.[1]) return named[1].trim();
    if (state.business_name && !/^new pbi website$/i.test(state.business_name)) return state.business_name;
    return getPreset(key).businessName || siteProfiles[key]?.generic || "New PBI Website";
  }

  function generatedBlock(type, pageKey, overrides = {}){
    const block = createBlock(type, getPreset(state.templateId), pageKey);
    return { ...block, ...overrides, id: uid(type), type, publishable:true };
  }

  function pageDef(key, label, title, body){
    return { key, label, title, body };
  }

  function buildFullSiteFromBrief(brief, options = {}){
    const cleanBrief = String(brief || "").trim();
    if (!cleanBrief) return setStatus("Add a brief first");
    snapshot();
    const oldPlan = currentPlan();
    const oldProjectId = getProjectId();
    const key = inferTemplateFromBrief(cleanBrief);
    const profile = siteProfiles[key] || siteProfiles.cafe;
    const goal = inferGoalFromBrief(cleanBrief, options.goal);
    const goalInfo = goalCopy(goal);
    const primarySection = rules.blockAllowed?.({ type: goalInfo.section }, oldPlan) ? goalInfo.section : (goal === "bookings" ? "booking" : "quoteForm");
    const style = options.style || $("#canvasStyleDirection")?.value || "practical, local, trustworthy";
    const location = inferLocation(cleanBrief);
    const name = inferBusinessName(cleanBrief, key);
    const p = getPreset(key);
    const bg = /bold|contrast/i.test(style) ? "#fff8f1" : /soft|editorial/i.test(style) ? "#fbf7f1" : (p.background || "#fffaf4");
    const accent = /bold|contrast/i.test(style) ? "#2b160e" : (p.accent || "#bf5c29");
    const offerKey = goal === "shop" ? "shop" : goal === "courses" ? "programmes" : "services";
    const offerLabel = goal === "shop" ? "Shop" : goal === "courses" ? "Programmes" : profile.offerLabel;
    const offerBlockType = goal === "courses" ? "courseList" : (goal === "shop" && rules.blockAllowed?.({ type:"productGrid" }, oldPlan) ? "productGrid" : "services");
    const pageDefs = [
      pageDef("home", "Home", `${name} helps local customers ${goalInfo.action} with confidence.`, `${cleanBrief.slice(0, 150)}${cleanBrief.length > 150 ? "..." : ""}`),
      pageDef(offerKey, offerLabel, `${offerLabel} designed for clear decisions`, `${profile.services.join(", ")} with proof and a simple next step.`),
      pageDef("about", "About", `A more personal way to choose ${name}`, `Show the story, people and standards behind ${name}.`),
      pageDef("proof", "Reviews", "Proof before pressure", "Reviews, results and trust signals help visitors feel ready to act."),
      pageDef("contact", "Contact", `Ready to ${goalInfo.action}?`, `Make the ${goalInfo.noun} route simple, visible and easy to complete.`)
    ];
    if (oldPlan !== "starter") pageDefs.splice(4, 0, pageDef("faq", "FAQ", "Useful answers before customers act", "Handle the common questions that otherwise slow the enquiry down."));

    state = projectFromPreset(key);
    state.templateId = key;
    state.plan = oldPlan;
    state.package = oldPlan;
    state.project_id = oldProjectId;
    state.business_name = name;
    state.project_name = `${name} Website`;
    state.location = location;
    state.launch_goal = goal;
    state.brand_tone = style;
    state.background_color = bg;
    state.accent_color = accent;
    state.text_color = p.text || "#24130c";
    state.page_main_heading = pageDefs[0].title;
    state.sub_heading = pageDefs[0].body;
    state.tagline = location ? `${location} local website` : (p.tagline || "Built with PBI");
    state.cta_button_text = goalInfo.cta;
    state.heroImage = p.heroImage || state.heroImage || "/assets/demo-media/cafe-hero.jpg";
    state.domain_lookup_input = `${domainSlug([name, location].filter(Boolean).join(" "))}.co.uk`;
    state.subdomain_slug = domainSlug([name, location].filter(Boolean).join(" "));
    state.seo = {
      title: `${name}${location ? ` in ${location}` : ""} | ${offerLabel}`,
      description: `${name} gives customers clear ${offerLabel.toLowerCase()}, proof, answers and a simple ${goalInfo.noun} route.`,
      indexable: true,
      ogTitle: `${name} | ${goalInfo.cta}`,
      ogDescription: `A polished local website built around ${goalInfo.noun}s, proof and clear next steps.`
    };
    state.ai_director = {
      brief: cleanBrief,
      style,
      goal,
      generated_at: new Date().toISOString(),
      template: key
    };
    state.pages = {};
    state.selected_pages = pageDefs.map(page => page.key);
    state.blocksByPage = {};
    pageDefs.forEach(page => {
      state.pages[page.key] = { label: page.label, title: page.title, body: page.body };
    });

    state.blocksByPage.home = [
      generatedBlock("navBar", "home", { title:name, text:`Home | ${offerLabel} | Reviews | Contact`, button:goalInfo.cta }),
      generatedBlock("hero", "home", { eyebrow:state.tagline, title:pageDefs[0].title, text:pageDefs[0].body, button:goalInfo.cta, image:state.heroImage, layout:"split", background:bg, accent }),
      generatedBlock("trustBand", "home", { title:"Confidence signals near the top", text:profile.proof.join(" | "), layout:"strip", background:"#fff" }),
      generatedBlock("services", "home", { title:`Popular ${offerLabel.toLowerCase()}`, text:profile.services.join(" | "), layout:"bento" }),
      generatedBlock("process", "home", { title:`How customers ${goalInfo.action}`, text:`Choose what fits | Send the ${goalInfo.noun} | Get a clear next step`, layout:"timeline" }),
      generatedBlock("reviews", "home", { title:"Reasons people choose us", text:`${profile.proof[0]} | ${profile.proof[1]} | ${profile.proof[2]}`, layout:"cards" }),
      generatedBlock(primarySection, "home", { title:`Ready to ${goalInfo.action}?`, text:`Use this section as the main ${goalInfo.noun} path for ${name}.`, button:goalInfo.cta, layout:"spotlight" })
    ];

    state.blocksByPage[offerKey] = [
      generatedBlock("hero", offerKey, { eyebrow:offerLabel, title:pageDefs[1].title, text:pageDefs[1].body, button:goalInfo.cta, image:state.heroImage, layout:"image-first" }),
      generatedBlock(offerBlockType, offerKey, { title:`${offerLabel} at a glance`, text:profile.services.join(" | "), layout:goal === "shop" ? "product" : "cards" }),
      generatedBlock("pricing", offerKey, { title:"Simple options", text:"Starter option | Recommended option | Bespoke support", layout:"cards" }),
      generatedBlock("faq", offerKey, { title:`Questions about ${offerLabel.toLowerCase()}`, text:`What happens first? | How quickly do you reply? | Can I ask for help before deciding?`, layout:"checklist" }),
      generatedBlock(primarySection, offerKey, { title:`Start with a ${goalInfo.noun}`, text:`Make the next step obvious for visitors who are ready.`, button:goalInfo.cta })
    ];

    state.blocksByPage.about = [
      generatedBlock("hero", "about", { eyebrow:"About", title:pageDefs[2].title, text:pageDefs[2].body, image:state.heroImage, layout:"full-bleed" }),
      generatedBlock("featureGrid", "about", { title:"What makes the service feel different", text:`Clear communication | Useful guidance | Follow-up that helps`, layout:"bento" }),
      generatedBlock("team", "about", { title:"People and standards", text:"Owner-led | Local knowledge | Practical support", layout:"cards" }),
      generatedBlock("gallery", "about", { title:"A more tangible feel", text:"Use real photos, work examples and proof so the page feels specific.", image:state.heroImage, images:p.galleryImages || [], layout:"masonry" })
    ];

    state.blocksByPage.proof = [
      generatedBlock("hero", "proof", { eyebrow:"Proof", title:pageDefs[3].title, text:pageDefs[3].body, image:state.heroImage, layout:"split" }),
      generatedBlock("reviews", "proof", { title:"Customer comments", text:"Clear from the start | Easy to choose | Helpful aftercare", layout:"cards" }),
      generatedBlock("stats", "proof", { title:"Useful numbers", text:"Fast replies | Local service | Clear next steps", layout:"strip" }),
      generatedBlock("beforeAfter", "proof", { title:"Before and after clarity", text:"Before: hard to know what to do next | After: clearer offer, proof and route to act", image:state.heroImage, layout:"split" }),
      generatedBlock("cta", "proof", { title:`Ready to ${goalInfo.action} with confidence?`, text:"Keep the next step close to the proof.", button:goalInfo.cta })
    ];

    if (state.selected_pages.includes("faq")) {
      state.blocksByPage.faq = [
        generatedBlock("hero", "faq", { eyebrow:"FAQ", title:"Useful answers before customers act", text:"Reduce doubt with practical answers, then give one clear next step.", image:state.heroImage, layout:"split" }),
        generatedBlock("faq", "faq", { title:"Common questions", text:"How do I get started? | What areas do you cover? | What happens after I enquire?", layout:"checklist" }),
        generatedBlock("salesBanner", "faq", { title:"Need help deciding?", text:"Assisted setup and custom build support can be offered here without making the page feel pushy.", button:"Ask for help" }),
        generatedBlock(primarySection, "faq", { title:`Send a ${goalInfo.noun}`, text:"Give customers a useful route after the answers.", button:goalInfo.cta })
      ];
    }

    state.blocksByPage.contact = [
      generatedBlock("hero", "contact", { eyebrow:"Contact", title:pageDefs[pageDefs.length - 1].title, text:pageDefs[pageDefs.length - 1].body, button:goalInfo.cta, image:state.heroImage, layout:"split" }),
      generatedBlock("map", "contact", { title:location ? `Serving ${location} and nearby` : "Service area", text:"Add your town, coverage area and local search wording.", layout:"spotlight" }),
      generatedBlock("hours", "contact", { title:"Opening and response times", text:"Monday to Friday | Weekend appointments | Urgent requests by arrangement", layout:"cards" }),
      generatedBlock(primarySection, "contact", { title:`${goalInfo.cta}`, text:`Collect the details needed to handle the ${goalInfo.noun} properly.`, button:goalInfo.cta }),
      generatedBlock("contact", "contact", { title:"Contact details", text:"Phone, email, address and social links can sit here.", button:"Contact" })
    ];

    activePage = "home";
    selectedId = state.blocksByPage.home.find(block => block.type === "hero")?.id || state.blocksByPage.home[0]?.id || null;
    enforcePlan();
    render();
    if (selectedId) selectBlock(selectedId);
    setStatus("Full multi-page site generated from brief");
    window.dispatchEvent(new CustomEvent("pbi:ai-site-generated", { detail: { state: clone(state, {}), brief: cleanBrief } }));
  }

  function aiRewrite(mode){
    const block = activeBlocks().find(x => x.id === selectedId);
    if (!block || block.packageLocked) return setStatus("Select an editable block first");
    snapshot();
    if (mode === "clearer") block.text = String(block.text || "").replace(/\s+/g, " ").trim();
    if (mode === "seo") block.text = `${block.text || ""} Clear local service information, opening details and enquiry routes are included for search visibility.`;
    if (mode === "premium") block.title = block.title ? `${block.title}` : "Premium section";
    if (mode === "shorter") block.text = String(block.text || "").split(".")[0] + ".";
    render();
    selectBlock(block.id);
    setStatus(`AI ${mode} polish applied locally`);
  }

  function syncEditorPageSelect(){
    const select = $("#pbiEditorPageSelect");
    if (!select || !state?.selected_pages) return;
    const markup = state.selected_pages.map((key) => {
      const label = state.pages?.[key]?.label || key;
      return `<option value="${esc(key)}">${esc(label)}</option>`;
    }).join("");
    if (select.dataset.optionsMarkup !== markup) {
      select.innerHTML = markup;
      select.dataset.optionsMarkup = markup;
    }
    select.value = activePage;
  }

  function closeEditorMenus(){
    $$("details.pbi-wix-menu[open]").forEach((menu) => menu.removeAttribute("open"));
  }

  function titleForPanel(key){
    return {
      add:"Add elements",
      pages:"Pages",
      templates:"Templates",
      layers:"Layers",
      cms:"CMS database",
      collab:"Collaboration",
      domain:"Domains",
      inspector:"Inspector",
      goose:"Goose"
    }[key] || "Tools";
  }

  function panelForKey(key){
    if (key === "domain") return $(".pbi-studio-domain-topper");
    if (key === "inspector") return $(".pbi-canvas-inspector");
    if (key === "goose") return $("#pbiBuilderV2Command") || $(".pbi-builder-v2-command");
    return $(".pbi-canvas-palette");
  }

  function tabForPanel(key, explicit){
    return explicit || {
      add:"blocks",
      pages:"pages",
      templates:"templates",
      layers:"layers",
      cms:"cms",
      collab:"collab"
    }[key] || "";
  }

  function makeElementDraggable(el, handle, storageKey){
    if (!el || !handle || handle.dataset.dragReady === "1") return;
    handle.dataset.dragReady = "1";
    handle.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button,a,input,select,textarea")) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = rect.left;
      const originY = rect.top;
      el.style.left = `${originX}px`;
      el.style.top = `${originY}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
      const onMove = (moveEvent) => {
        const nextX = Math.max(8, Math.min(window.innerWidth - 80, originX + moveEvent.clientX - startX));
        const nextY = Math.max(60, Math.min(window.innerHeight - 80, originY + moveEvent.clientY - startY));
        el.style.left = `${nextX}px`;
        el.style.top = `${nextY}px`;
      };
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        try {
          localStorage.setItem(storageKey, JSON.stringify({ left: el.style.left, top: el.style.top }));
        } catch {}
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp, { once:true });
    });
  }

  function prepareFloatingPanel(panel, key){
    if (!panel || panel.dataset.editorPanelReady === "1") return;
    panel.dataset.editorPanelReady = "1";
    panel.classList.add("pbi-editor-floating-panel");
    const head = document.createElement("div");
    head.className = "pbi-editor-floating-panel-head";
    head.innerHTML = `<span class="pbi-editor-floating-panel-title">${esc(titleForPanel(key))}</span><button type="button" class="pbi-editor-floating-panel-close" aria-label="Close panel">x</button>`;
    panel.prepend(head);
    head.querySelector("button")?.addEventListener("click", () => panel.classList.remove("pbi-editor-panel-open"));
    makeElementDraggable(panel, head, `pbi_editor_panel_${key}_position`);
    try {
      const saved = JSON.parse(localStorage.getItem(`pbi_editor_panel_${key}_position`) || "null");
      if (saved?.left && saved?.top) {
        panel.style.left = saved.left;
        panel.style.top = saved.top;
        panel.style.right = "auto";
      }
    } catch {}
  }

  function openEditorPanel(key, options = {}){
    const panel = panelForKey(key);
    if (!panel) return;
    prepareFloatingPanel(panel, key);
    const panelTitle = $(".pbi-editor-floating-panel-title", panel);
    if (panelTitle) panelTitle.textContent = titleForPanel(key);
    const tab = tabForPanel(key, options.tab);
    if (tab) {
      const tabButton = $(`[data-studio-tab="${tab}"]`);
      if (tabButton && !tabButton.classList.contains("pbi-locked")) tabButton.click();
    }
    $$(".pbi-editor-floating-panel").forEach((item) => {
      if (item !== panel && options.keepOthers !== true) item.classList.remove("pbi-editor-panel-open");
    });
    panel.classList.add("pbi-editor-panel-open");
    $$("[data-editor-panel]").forEach((button) => {
      button.classList.toggle("active", button.dataset.editorPanel === key);
      button.setAttribute("aria-expanded", button.dataset.editorPanel === key ? "true" : "false");
    });
    closeEditorMenus();
  }

  function closeAllEditorPanels(){
    $$(".pbi-editor-floating-panel").forEach((panel) => panel.classList.remove("pbi-editor-panel-open"));
    $$("[data-editor-panel]").forEach((button) => {
      button.classList.remove("active");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function ensureFloatingToolbar(){
    let toolbar = $("#pbiWixFloatingToolbar");
    if (toolbar) return toolbar;
    toolbar = document.createElement("div");
    toolbar.id = "pbiWixFloatingToolbar";
    toolbar.className = "pbi-wix-floating-toolbar";
    toolbar.innerHTML = `
      <div class="pbi-wix-floating-handle" aria-label="Move toolbar">::</div>
      <strong class="pbi-wix-floating-title" data-floating-title>Selected block</strong>
      <select data-floating-field="layout" aria-label="Layout">
        <option value="standard">Standard</option>
        <option value="split">Split</option>
        <option value="centered">Centered</option>
        <option value="cards">Cards</option>
        <option value="fullBleed">Full bleed</option>
        <option value="masonry">Masonry</option>
        <option value="spotlight">Spotlight</option>
        <option value="bento">Bento</option>
      </select>
      <select data-floating-field="animation" aria-label="Motion">
        <option value="none">No motion</option>
        <option value="fade">Fade</option>
        <option value="rise">Rise</option>
        <option value="scale">Scale</option>
        <option value="slide">Slide</option>
        <option value="float">Float</option>
        <option value="reveal">Reveal</option>
        <option value="parallax">Parallax</option>
        <option value="stagger">Stagger</option>
      </select>
      <select data-floating-field="positionMode" aria-label="Position mode">
        <option value="flow">Flow</option>
        <option value="free">Freeform</option>
      </select>
      <button type="button" data-floating-action="duplicate">Duplicate</button>
      <button type="button" data-floating-action="inspector">Inspector</button>
      <button type="button" class="danger" data-floating-action="delete">Delete</button>
    `;
    document.body.appendChild(toolbar);
    makeElementDraggable(toolbar, $(".pbi-wix-floating-handle", toolbar), "pbi_editor_selected_toolbar_position");
    try {
      const saved = JSON.parse(localStorage.getItem("pbi_editor_selected_toolbar_position") || "null");
      if (saved?.left && saved?.top) {
        toolbar.style.left = saved.left;
        toolbar.style.top = saved.top;
      }
    } catch {}
    $$("[data-floating-field]", toolbar).forEach((control) => {
      control.addEventListener("change", () => updateSelectedFromFloatingToolbar(control.dataset.floatingField, control.value));
    });
    $$("[data-floating-action]", toolbar).forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.floatingAction === "duplicate") duplicateSelected();
        if (button.dataset.floatingAction === "delete" && selectedId) deleteBlock(selectedId);
        if (button.dataset.floatingAction === "inspector") openEditorPanel("inspector", { keepOthers:true });
      });
    });
    return toolbar;
  }

  function updateSelectedFromFloatingToolbar(field, value){
    const block = activeBlocks().find(x => x.id === selectedId);
    if (!block || block.packageLocked) return;
    if (field === "positionMode" && value === "free" && !isPremium()) {
      showFreeformGuide(true);
      refreshFloatingToolbar(block);
      return;
    }
    snapshot();
    block[field] = value;
    render();
    selectBlock(block.id);
    setStatus(`${field === "positionMode" ? "Position" : field} updated`);
  }

  function refreshFloatingToolbar(block){
    const toolbar = ensureFloatingToolbar();
    if (!block || block.packageLocked || previewMode) {
      toolbar.classList.remove("open");
      return;
    }
    $("[data-floating-title]", toolbar).textContent = block.title || block.type || "Selected block";
    const layout = $('[data-floating-field="layout"]', toolbar);
    const animation = $('[data-floating-field="animation"]', toolbar);
    const positionMode = $('[data-floating-field="positionMode"]', toolbar);
    if (layout) layout.value = block.layout || "standard";
    if (animation) animation.value = block.animation || "none";
    if (positionMode) positionMode.value = block.positionMode || "flow";
    toolbar.classList.add("open");
  }

  function hideFloatingToolbar(){
    $("#pbiWixFloatingToolbar")?.classList.remove("open");
  }

  function setupEditorShell(){
    document.body.classList.add("pbi-wix-editor-ready");
    [
      ["add", $(".pbi-canvas-palette")],
      ["domain", $(".pbi-studio-domain-topper")],
      ["inspector", $(".pbi-canvas-inspector")]
    ].forEach(([key, panel]) => prepareFloatingPanel(panel, key));
    ensureFloatingToolbar();
    syncEditorPageSelect();

    $("#pbiEditorPageSelect")?.addEventListener("change", (event) => {
      if (!event.target.value || event.target.value === activePage) return;
      activePage = event.target.value;
      selectedId = null;
      render();
      setStatus(`${state.pages?.[activePage]?.label || activePage} page selected`);
    });

    $$("[data-editor-panel]").forEach((button) => {
      button.addEventListener("click", () => openEditorPanel(button.dataset.editorPanel, { tab: button.dataset.editorTab }));
    });

    $$("[data-toolbar-add]").forEach((button) => {
      button.addEventListener("click", () => {
        addBlock(button.dataset.toolbarAdd);
        closeEditorMenus();
      });
    });

    $$("[data-toolbar-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.toolbarAction;
        if (action === "duplicate-page") duplicatePage();
        if (action === "delete-page") deletePage();
        if (action === "theme") $("#canvasThemeBtn")?.click();
        if (action === "freeform-guide") showFreeformGuide(false);
        closeEditorMenus();
      });
    });

    $$("[data-toolbar-goose]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.toolbarGoose;
        const target = document.querySelector(`[data-v2-apply="${action}"]`);
        if (target) {
          target.click();
          closeEditorMenus();
          return;
        }
        if (action === "full-site") {
          openEditorPanel("add", { tab:"blocks" });
          $("#canvasAiBrief")?.focus();
          setStatus("Add a brief, then Generate full multi-page site");
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".pbi-wix-menu")) closeEditorMenus();
    });
  }

  function wireEvents(){
    $$("[data-studio-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("pbi-locked")) {
          setStatus("Plus required for this panel");
          return;
        }
        $$("[data-studio-tab]").forEach(b => b.classList.remove("active"));
        $$("[data-studio-panel]").forEach(panel => panel.classList.remove("active"));
        btn.classList.add("active");
        $(`[data-studio-panel="${btn.dataset.studioTab}"]`)?.classList.add("active");
        renderLayers();
        renderCmsList();
        renderCollab();
      });
    });

    $$("[data-template-pack]").forEach(btn => btn.addEventListener("click", () => loadTemplate(btn.dataset.templatePack)));
    $$("[data-block-type]").forEach(btn => {
      btn.addEventListener("click", () => addBlock(btn.dataset.blockType));
      btn.addEventListener("dragstart", event => event.dataTransfer?.setData("text/plain", btn.dataset.blockType));
    });

    drop?.addEventListener("dragover", event => event.preventDefault());
    drop?.addEventListener("drop", event => {
      event.preventDefault();
      const type = event.dataTransfer?.getData("text/plain");
      if (type) addBlock(type);
    });

    $("#canvasUndoBtn")?.addEventListener("click", undo);
    $("#canvasRedoBtn")?.addEventListener("click", redo);
    $("#canvasApplyInspectorBtn")?.addEventListener("click", applyInspector);
    $("#canvasDuplicateBtn")?.addEventListener("click", duplicateSelected);
    $("#canvasDeleteBtn")?.addEventListener("click", () => selectedId && deleteBlock(selectedId));
    $("#canvasExportBtn")?.addEventListener("click", saveProject);
    $("#canvasSaveVersionBtn")?.addEventListener("click", saveVersion);
    $("#canvasPreviewBtn")?.addEventListener("click", () => {
      previewMode = !previewMode;
      document.body.classList.toggle("pbi-preview-mode", previewMode);
      $("#canvasPreviewBtn").textContent = previewMode ? "Edit mode" : "Preview mode";
      render();
    });
    $("#canvasPublishBtn")?.addEventListener("click", async () => {
      enforcePlan({ forPublish:true });
      const result = rules.checklist(state);
      showChecklist(result);
      if (!result.ok) return setStatus("Fix checklist issues before publishing");
      await saveProject();
      location.href = `/payment/?project=${encodeURIComponent(getProjectId())}&plan=${encodeURIComponent(currentPlan())}`;
    });
    $("#canvasBackToBuilder")?.setAttribute("href", "/dashboard/");
    $("#canvasAiBuildBtn")?.addEventListener("click", () => {
      const brief = $("#canvasAiBrief")?.value?.trim();
      buildFullSiteFromBrief(brief, {
        goal: $("#canvasAiGoal")?.value || "enquiries",
        style: $("#canvasStyleDirection")?.value || ""
      });
    });
    $("#canvasAddPageBtn")?.addEventListener("click", addPage);
    $("#canvasDuplicatePageBtn")?.addEventListener("click", duplicatePage);
    $("#canvasDeletePageBtn")?.addEventListener("click", deletePage);
    $("#canvasFreeformGuideBtn")?.addEventListener("click", () => showFreeformGuide(false));
    $("#canvasThemeBtn")?.addEventListener("click", () => {
      snapshot();
      const bg = $("#themeBg")?.value;
      const accent = $("#themeAccent")?.value;
      if (bg) state.background_color = bg;
      if (accent) state.accent_color = accent;
      activeBlocks().forEach(block => { block.accent = accent || block.accent; });
      render();
      setStatus("Brand theme applied");
    });
    $("#themeBg")?.addEventListener("change", () => { snapshot(); state.background_color = $("#themeBg").value; render(); });
    $("#themeAccent")?.addEventListener("change", () => { snapshot(); state.accent_color = $("#themeAccent").value; render(); });
    $("#cmsAddItemBtn")?.addEventListener("click", addCmsItem);
    $("#cmsCloudSaveBtn")?.addEventListener("click", saveCmsCloud);
    $("#cmsCloudLoadBtn")?.addEventListener("click", loadCmsCloud);
    $("#collabInviteBtn")?.addEventListener("click", inviteCollaborator);
    $("#collabCommentBtn")?.addEventListener("click", addCollabNote);
    $("#canvasDomainCheckBtn")?.addEventListener("click", checkCanvasDomain);
    $("#canvasUseExistingDomainBtn")?.addEventListener("click", useExistingDomain);
    $("#canvasDomainInput")?.addEventListener("input", () => { state.domain_lookup_input = $("#canvasDomainInput")?.value || ""; persist(); });
    $$("[data-domain-mode]").forEach(btn => btn.addEventListener("click", () => setDomainMode(btn.dataset.domainMode)));
    $$("[data-canvas-ai]").forEach(btn => btn.addEventListener("click", () => aiRewrite(btn.dataset.canvasAi)));
    $$("[data-device]").forEach(btn => btn.addEventListener("click", () => {
      const device = btn.dataset.device || "desktop";
      $$("[data-device]").forEach(b=>b.classList.toggle("active", b.dataset.device === device));
      $("#canvasDevice")?.classList.remove("desktop","tablet","mobile");
      $("#canvasDevice")?.classList.add(device);
      setStatus(`${device} preview`);
    }));
  }

  window.PBIBuilderV2 = {
    getState() {
      return JSON.parse(JSON.stringify(state));
    },
    getActivePage() {
      return activePage;
    },
    getSelectedBlockId() {
      return selectedId;
    },
    getSelectedBlock() {
      const block = activeBlocks().find((item) => item.id === selectedId);
      return block ? JSON.parse(JSON.stringify(block)) : null;
    },
    addBlock(type) {
      addBlock(type);
      return this.getState();
    },
    generateSiteFromBrief(brief, options = {}) {
      buildFullSiteFromBrief(brief, options);
      return this.getState();
    },
    updateState(mutator, statusText) {
      if (typeof mutator !== "function") return this.getState();
      snapshot();
      const result = mutator(state, {
        activePage,
        activeBlocks: activeBlocks(),
        currentPlan: currentPlan()
      });
      if (result) state = result;
      enforcePlan();
      persist();
      render();
      setStatus(statusText || "Builder updated");
      window.dispatchEvent(new CustomEvent("pbi:builder-v2-updated", { detail: { state: this.getState() } }));
      return this.getState();
    },
    updateSelectedBlock(mutator, statusText) {
      const block = activeBlocks().find((item) => item.id === selectedId);
      if (!block || block.packageLocked || typeof mutator !== "function") return this.getState();
      snapshot();
      const result = mutator(block, state, {
        activePage,
        activeBlocks: activeBlocks(),
        currentPlan: currentPlan()
      });
      if (result) Object.assign(block, result);
      enforcePlan();
      persist();
      render();
      selectBlock(block.id);
      setStatus(statusText || "Selected block updated");
      window.dispatchEvent(new CustomEvent("pbi:builder-v2-updated", { detail: { state: this.getState(), selectedBlock: this.getSelectedBlock() } }));
      return this.getState();
    },
    setDevice(device) {
      const name = ["desktop", "tablet", "mobile"].includes(String(device)) ? String(device) : "desktop";
      document.querySelector(`[data-device="${name}"]`)?.click();
      return name;
    },
    saveProject,
    saveVersion,
    openTab(tab) {
      if (tab === "domain") {
        openEditorPanel("domain");
        return;
      }
      openEditorPanel(tab, { tab });
    }
  };

  wireEvents();
  setupEditorShell();
  render();
})();
