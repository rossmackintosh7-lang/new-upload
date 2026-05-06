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
  const normalise = (key) => packAliases[String(key || "").toLowerCase()] || String(key || "cafe").toLowerCase();

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
    return project;
  }

  let history = [];
  let future = [];
  let selectedId = null;
  let previewMode = false;

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem("pbi_canvas_state") || "null"); } catch { return null; }
  })();

  let state = saved || projectFromPreset(qs.get("preset") || qs.get("template") || localStorage.getItem("pbi_selected_template") || "cafe");
  state.templateId = normalise(qs.get("preset") || qs.get("template") || state.templateId || "cafe");
  state.plan = rules.cleanPlan(qs.get("plan") || state.plan || state.package || localStorage.getItem("pbi_plan") || "starter");
  state.project_id = state.project_id || qs.get("project") || localStorage.getItem("pbi_active_project_id") || `local-${Date.now()}`;
  state.selected_pages = state.selected_pages || state.selectedPages || Object.keys(state.pages || { home:{} });
  state.pages = state.pages || projectFromPreset(state.templateId).pages;
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
    if (!state.blocksByPage[page] || !state.blocksByPage[page].length) {
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
    const attrs = `class="pbi-canvas-render-block${selectedClass}${freeClass}${lockedClass}" draggable="${previewMode ? "false" : "true"}" data-block-id="${esc(block.id)}" data-kind="${esc(block.type)}" tabindex="0" style="${blockStyle(block)}"`;
    const title = esc(block.title);
    const text = esc(block.text);
    const button = esc(block.button || "");
    const eyebrow = esc(block.eyebrow || block.type);
    const image = esc(block.image || state.heroImage || getPreset(state.templateId).heroImage || "/assets/demo-media/cafe-hero.jpg");

    if (block.type === "navBar") {
      return `<section ${attrs}><div class="pbi-live-nav"><strong ${editableAttr(block,'title')}>${title}</strong><span ${editableAttr(block,'text')}>${text}</span>${button ? `<a class="btn" style="background:${accent}" href="#contact">${button}</a>` : ""}</div>${lockedOverlay(block)}</section>`;
    }
    if (["hero","splitHero"].includes(block.type)) {
      return `<section ${attrs}><div class="pbi-live-hero"><div><p class="eyebrow" ${editableAttr(block,'eyebrow')}>${eyebrow}</p><h1 ${editableAttr(block,'title')}>${title}</h1><p ${editableAttr(block,'text')}>${text}</p>${button ? `<a class="btn" style="background:${accent}" href="#contact">${button}</a>` : ""}</div><img src="${image}" alt="Website preview image"></div>${lockedOverlay(block)}</section>`;
    }
    if (["services","process","stats","featureGrid","pricing","productGrid","retail","trustBand","logoCloud","cmsList","analyticsPanel","automationFlow"].includes(block.type)) {
      const items = String(block.text || "").split("|").map(x => x.trim()).filter(Boolean);
      return `<section ${attrs}><div class="pbi-live-section"><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><div class="pbi-live-card-grid">${items.map(item => `<article><h3>${esc(item)}</h3><p>Edit this item from the inspector.</p></article>`).join("") || `<article><h3>Add item</h3><p>Use | between items.</p></article>`}</div></div>${lockedOverlay(block)}</section>`;
    }
    if (block.type === "gallery") {
      return `<section ${attrs}><div class="pbi-live-section"><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><p ${editableAttr(block,'text')}>${text}</p><img class="pbi-live-wide-image" src="${image}" alt="Gallery preview"></div>${lockedOverlay(block)}</section>`;
    }
    if (block.type === "spacer") {
      return `<section ${attrs}><div class="pbi-live-spacer"><span ${editableAttr(block,'title')}>${title}</span></div>${lockedOverlay(block)}</section>`;
    }
    return `<section ${attrs}><div class="pbi-live-section" id="${block.type === "contact" ? "contact" : ""}"><p class="eyebrow">${eyebrow}</p><h2 ${editableAttr(block,'title')}>${title}</h2><p ${editableAttr(block,'text')}>${text}</p>${button ? `<a class="btn" style="background:${accent}" href="/contact/">${button}</a>` : ""}</div>${lockedOverlay(block)}</section>`;
  }

  function renderPages(){
    const list = $("#canvasPagesList");
    if (!list) return;
    const locked = state.lockedPages || [];
    list.innerHTML = [
      ...state.selected_pages.map(key => `<button type="button" class="${key===activePage ? "active" : ""}" data-page="${esc(key)}">${esc(state.pages?.[key]?.label || key)}</button>`),
      ...locked.map(key => `<button type="button" class="pbi-locked" title="Upgrade package to unlock this page">${esc(state.pages?.[key]?.label || key)} 🔒</button>`)
    ].join("");
    $$("button[data-page]", list).forEach(btn => {
      btn.addEventListener("click", () => {
        activePage = btn.dataset.page;
        selectedId = null;
        render();
      });
    });
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

  function render(){
    enforcePlan();
    const preset = getPreset(state.templateId || "cafe");
    if (titleEl) titleEl.innerHTML = `${esc(state.business_name || preset.businessName || "PBI Website")} <span>${esc(currentPlan())} package</span>`;
    renderPages();
    renderPlanControl();

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
    renderLayers();
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
      z: Number($("#inspectorZ")?.value || block.z || 5)
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
      if (!brief) return;
      const target = activeBlocks().find(block => block.type === "hero") || activeBlocks()[0];
      if (target && !target.packageLocked) {
        snapshot();
        target.title = brief.length > 58 ? brief.slice(0,58).replace(/\s+\S*$/,"") : brief;
        target.text = `AI draft brief: ${brief}`;
        selectedId = target.id;
        render();
        selectBlock(target.id);
        setStatus("AI draft applied locally");
      }
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
    $$("[data-canvas-ai]").forEach(btn => btn.addEventListener("click", () => aiRewrite(btn.dataset.canvasAi)));
    $$("[data-device]").forEach(btn => btn.addEventListener("click", () => {
      $$("[data-device]").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const device = btn.dataset.device || "desktop";
      $("#canvasDevice")?.classList.remove("desktop","tablet","mobile");
      $("#canvasDevice")?.classList.add(device);
      setStatus(`${device} preview`);
    }));
  }

  wireEvents();
  render();
})();