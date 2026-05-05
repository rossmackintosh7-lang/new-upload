
(function(){
  const qs = new URLSearchParams(location.search);
  const presetApi = window.PBITemplatePresets || {};
  const packAliases = {
    "premium-cafe":"cafe",
    "cafe":"cafe",
    "restaurant":"restaurant",
    "food":"restaurant",
    "trades-pro":"trades",
    "trades":"trades",
    "tradesperson":"trades",
    "salon-luxe":"salon",
    "salon":"salon",
    "beauty":"salon",
    "consultant-authority":"consultant",
    "consultant":"consultant",
    "holiday-stay":"holiday-let",
    "holiday-let":"holiday-let",
    "holiday":"holiday-let",
    "retail-launch":"shop",
    "shop":"shop",
    "mobile-mechanic":"mobile-mechanic",
    "mechanic":"mobile-mechanic",
    "dog-groomer":"dog-groomer",
    "dog":"dog-groomer",
    "cleaning-pro":"cleaner",
    "cleaner":"cleaner",
    "personal-trainer":"personal-trainer",
    "trainer":"personal-trainer"
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const uid = (prefix="block") => prefix + "-" + Math.random().toString(36).slice(2,9) + "-" + Date.now().toString(36);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  const normalise = (key) => packAliases[String(key || "").toLowerCase()] || String(key || "cafe").toLowerCase();

  const presetId = normalise(qs.get("preset") || qs.get("template") || localStorage.getItem("pbi_selected_template") || "cafe");
  function getPreset(key){
    const id = normalise(key);
    return presetApi.get?.(id) || presetApi.get?.("cafe") || {};
  }

  function projectFromPreset(key){
    const p = getPreset(key);
    let project = presetApi.toProjectData?.(p.id || normalise(key)) || {};
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
    project.activePage = project.activePage || project.active_page || "home";
    project.templateId = p.id || normalise(key);
    return project;
  }

  function createBlock(type, preset, pageKey){
    const p = preset || getPreset(state?.templateId || presetId);
    const page = state?.pages?.[pageKey || activePage] || {};
    const services = state?.servicesList || state?.services_list || p.servicesList || ["Service one","Service two","Service three"];
    const gallery = p.galleryImages || [p.heroImage || "/assets/demo-media/cafe-hero.jpg"];
    const common = { id: uid(type), type, layout:"standard", animation:"rise", background:"#fffaf4", accent: state?.accent_color || p.accent || "#bf5c29", positionMode:"flow", x:40, y:40, width:760, rotate:0, z:5 };
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
      cmsList: { title:"Latest updates", text:"Blog posts, case studies or service updates can appear here.", layout:"cards" },
      faq: { title:"Questions answered", text:"How quickly can I book? | What areas do you cover? | How do I pay?", layout:"cards" },
      map: { title:"Areas covered", text:"Add your location, service area and local search wording.", layout:"spotlight" },
      booking: { title:"Book your appointment", text:"Connect a booking link, enquiry form or calendar route.", button:"Book now", layout:"spotlight" },
      contact: { title:"Ready to enquire?", text:"Add your phone, email, booking link or contact form here.", button:"Contact", layout:"spotlight" },
      retail: { title:"Shop highlights", text:"Collections | Gift cards | Best sellers", layout:"cards" },
      cta: { title:"Ready to get started?", text:"Give visitors one clear next step.", button:"Enquire today", layout:"centered" },
      spacer: { title:"Spacer", text:"Breathing room between sections.", layout:"standard" }
    };
    return { ...common, ...(defaults[type] || defaults.hero) };
  }

  function blocksForPreset(project, pageKey){
    const p = getPreset(project.templateId || presetId);
    const page = project.pages?.[pageKey] || {};
    return [
      createBlock("hero", p, pageKey),
      createBlock("services", p, pageKey),
      createBlock("gallery", p, pageKey),
      createBlock("contact", p, pageKey)
    ].map((block, idx) => {
      if(block.type === "hero"){
        block.title = page.title || project.page_main_heading || p.pageMainHeading || block.title;
        block.text = page.body || project.sub_heading || p.subHeading || block.text;
        block.eyebrow = project.tagline || p.tagline || block.eyebrow;
        block.image = project.heroImage || p.heroImage || block.image;
      }
      block.id = block.id || uid(block.type);
      block.z = block.z || idx + 1;
      return block;
    });
  }

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem("pbi_canvas_state") || "null"); } catch { return null; }
  })();

  let state = saved || projectFromPreset(presetId);
  state.templateId = normalise(qs.get("preset") || qs.get("template") || state.templateId || presetId);
  state.plan = (qs.get("plan") || localStorage.getItem("pbi_plan") || state.plan || state.package || "starter").toLowerCase();
  state.selected_pages = state.selected_pages || state.selectedPages || Object.keys(state.pages || { home:{} });
  state.activePage = state.activePage || state.active_page || state.selected_pages[0] || "home";
  state.pages = state.pages || projectFromPreset(state.templateId).pages;
  state.blocksByPage = state.blocksByPage || {};
  for (const page of state.selected_pages) {
    if (!state.blocksByPage[page] || !state.blocksByPage[page].length) {
      state.blocksByPage[page] = blocksForPreset(state, page);
    }
  }

  let activePage = state.activePage;
  let selectedId = null;

  const drop = $("#canvasDropzone");
  const empty = $("#canvasEmpty");
  const titleEl = $("#canvasProjectTitle");
  const statusEl = $("#canvasAutosaveStatus");

  function currentPlan(){ return (state.plan || "starter").toLowerCase(); }
  function isPremium(){ return ["business","plus","pro"].includes(currentPlan()); }
  function isPlus(){ return ["plus","pro"].includes(currentPlan()); }
  function setStatus(text){ if(statusEl) statusEl.textContent = text; }

  function persist(){
    state.activePage = activePage;
    localStorage.setItem("pbi_plan", currentPlan());
    localStorage.setItem("pbi_selected_template", state.templateId || "cafe");
    localStorage.setItem("pbi_canvas_state", JSON.stringify(state));
  }

  function activeBlocks(){
    state.blocksByPage = state.blocksByPage || {};
    state.blocksByPage[activePage] = state.blocksByPage[activePage] || [];
    return state.blocksByPage[activePage];
  }

  function pageData(){ return state.pages?.[activePage] || Object.values(state.pages || {})[0] || {}; }

  function blockStyle(block){
    const accent = block.accent || state.accent_color || getPreset(state.templateId).accent || "#bf5c29";
    let style = `--preview-accent:${escapeHtml(accent)};`;
    if (block.background) style += `background:${escapeHtml(block.background)};`;
    if (block.positionMode === "free" && isPremium()) {
      style += `position:absolute;left:${Number(block.x)||40}px;top:${Number(block.y)||40}px;width:${Number(block.width)||520}px;z-index:${Number(block.z)||5};transform:rotate(${Number(block.rotate)||0}deg);`;
    }
    return style;
  }

  function renderBlock(block){
    const accent = block.accent || state.accent_color || getPreset(state.templateId).accent || "#bf5c29";
    const selectedClass = block.id === selectedId ? " selected" : "";
    const freeClass = block.positionMode === "free" && isPremium() ? " freeform" : "";
    const attrs = `class="pbi-canvas-render-block${selectedClass}${freeClass}" data-block-id="${escapeHtml(block.id)}" data-kind="${escapeHtml(block.type)}" tabindex="0" style="${blockStyle(block)}"`;
    const title = escapeHtml(block.title);
    const text = escapeHtml(block.text);
    const button = escapeHtml(block.button || "");
    const eyebrow = escapeHtml(block.eyebrow || block.type);
    const image = escapeHtml(block.image || state.heroImage || getPreset(state.templateId).heroImage || "/assets/demo-media/cafe-hero.jpg");

    if (block.type === "navBar") {
      return `<section ${attrs}><div class="pbi-live-nav"><strong>${title}</strong><span>${text}</span>${button ? `<a class="btn" style="background:${accent}" href="#contact">${button}</a>` : ""}</div></section>`;
    }
    if (["hero","splitHero"].includes(block.type)) {
      return `<section ${attrs}><div class="pbi-live-hero"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${text}</p>${button ? `<a class="btn" style="background:${accent}" href="#contact">${button}</a>` : ""}</div><img src="${image}" alt="Website preview image"></div></section>`;
    }
    if (["services","process","stats","featureGrid","pricing","productGrid","trustBand","logoCloud"].includes(block.type)) {
      const items = text.split("|").map(x => x.trim()).filter(Boolean);
      return `<section ${attrs}><div class="pbi-live-section"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><div class="pbi-live-card-grid">${items.map(item => `<article><h3>${escapeHtml(item)}</h3><p>Edit this item from the inspector.</p></article>`).join("") || `<article><h3>Add item</h3><p>Use | between items.</p></article>`}</div></div></section>`;
    }
    if (block.type === "gallery") {
      return `<section ${attrs}><div class="pbi-live-section"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p>${text}</p><img class="pbi-live-wide-image" src="${image}" alt="Gallery preview"></div></section>`;
    }
    if (block.type === "spacer") {
      return `<section ${attrs}><div class="pbi-live-spacer"><span>${title}</span></div></section>`;
    }
    return `<section ${attrs}><div class="pbi-live-section" id="${block.type === "contact" ? "contact" : ""}"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p>${text}</p>${button ? `<a class="btn" style="background:${accent}" href="/contact/">${button}</a>` : ""}</div></section>`;
  }

  function renderPages(){
    const list = $("#canvasPagesList");
    if (!list) return;
    list.innerHTML = state.selected_pages.map(key => `<button type="button" class="${key===activePage ? "active" : ""}" data-page="${escapeHtml(key)}">${escapeHtml(state.pages?.[key]?.label || key)}</button>`).join("");
    $$("button[data-page]", list).forEach(btn => {
      btn.addEventListener("click", () => {
        activePage = btn.dataset.page;
        state.activePage = activePage;
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
      <article class="pbi-layer-row ${block.id === selectedId ? "active" : ""}" data-layer-id="${escapeHtml(block.id)}">
        <button type="button" data-layer-select="${escapeHtml(block.id)}"><strong>${escapeHtml(block.title || block.type)}</strong><span>${escapeHtml(block.type)} · ${block.positionMode === "free" ? "Freeform" : "Flow"}</span></button>
        <div class="pbi-layer-actions">
          <button type="button" data-layer-up="${escapeHtml(block.id)}" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-layer-down="${escapeHtml(block.id)}" ${index === blocks.length-1 ? "disabled" : ""}>↓</button>
          <button type="button" data-layer-delete="${escapeHtml(block.id)}">×</button>
        </div>
      </article>
    `).join("");
    $$("[data-layer-select]", list).forEach(btn => btn.addEventListener("click", () => selectBlock(btn.dataset.layerSelect)));
    $$("[data-layer-up]", list).forEach(btn => btn.addEventListener("click", () => moveBlock(btn.dataset.layerUp, -1)));
    $$("[data-layer-down]", list).forEach(btn => btn.addEventListener("click", () => moveBlock(btn.dataset.layerDown, 1)));
    $$("[data-layer-delete]", list).forEach(btn => btn.addEventListener("click", () => deleteBlock(btn.dataset.layerDelete)));
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
    }
    $$("[data-plan-select]", control).forEach(btn => {
      btn.classList.toggle("active", btn.dataset.planSelect === currentPlan());
      btn.onclick = () => {
        state.plan = btn.dataset.planSelect;
        setStatus(`Package set to ${state.plan}. Save project to keep it.`);
        persist();
        render();
      };
    });
  }

  function render(){
    const preset = getPreset(state.templateId || presetId);
    const page = pageData();
    if (titleEl) titleEl.innerHTML = `${escapeHtml(state.business_name || preset.businessName || "PBI Website")} <span>${escapeHtml(currentPlan())} package</span>`;
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
      drop.classList.toggle("has-freeform", activeBlocks().some(block => block.positionMode === "free" && isPremium()));
      drop.innerHTML = activeBlocks().map(renderBlock).join("") || `<div class="pbi-canvas-empty"><h2>Add a block or choose a template</h2><p>Your canvas will appear here.</p></div>`;
      $$("[data-block-id]", drop).forEach(el => {
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          selectBlock(el.dataset.blockId);
        });
      });
    }
    renderLayers();
    applyGate();
    refreshTemplateButtons();
    persist();
    setStatus("Autosaved locally");
  }

  function selectBlock(id){
    selectedId = id;
    const block = activeBlocks().find(x => x.id === id);
    if (!block) return;
    $$("[data-block-id]").forEach(el => el.classList.toggle("selected", el.dataset.blockId === id));
    const form = $("#canvasInspectorForm");
    const emptyNotice = $("#canvasInspectorEmpty");
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
    if (!block) return;
    const wantsFreeform = $("#inspectorPositionMode")?.value === "free";
    if (wantsFreeform && !isPremium()) {
      showFreeformGuide(true);
      $("#inspectorPositionMode").value = "flow";
      return;
    }
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
    activeBlocks().push(block);
    selectedId = block.id;
    render();
    selectBlock(block.id);
    setStatus(`${type.replace(/([A-Z])/g," $1")} block added`);
  }

  function moveBlock(id, direction){
    const blocks = activeBlocks();
    const index = blocks.findIndex(x => x.id === id);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= blocks.length) return;
    const [item] = blocks.splice(index,1);
    blocks.splice(next,0,item);
    render();
    selectBlock(id);
  }

  function deleteBlock(id){
    const blocks = activeBlocks();
    const index = blocks.findIndex(x => x.id === id);
    if (index < 0) return;
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
    const key = normalise(pack);
    const oldPlan = state.plan;
    const oldProject = state.project_id || state.id || qs.get("project") || "";
    state = projectFromPreset(key);
    state.templateId = key;
    state.plan = oldPlan || currentPlan();
    if (oldProject) state.project_id = oldProject;
    state.blocksByPage = {};
    state.selected_pages = state.selected_pages || ["home","about","services","gallery","contact"];
    for (const page of state.selected_pages) state.blocksByPage[page] = blocksForPreset(state, page);
    activePage = "home";
    selectedId = null;
    localStorage.setItem("pbi_selected_template", key);
    render();
    setStatus(`${getPreset(key).label || key} template loaded`);
  }

  function addPage(){
    const raw = ($("#canvasNewPageTitle")?.value || "").trim();
    if (!raw) return;
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
    if ((state.selected_pages || []).length <= 1) {
      setStatus("Keep at least one page");
      return;
    }
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
      ? "Freeform positioning is for Business and Plus. Use the package selector at the top to switch this project to Business or Plus, then select a block, choose Freeform position in the Inspector, and adjust X/Y/width."
      : "Freeform guide: 1) Select a block on the canvas. 2) In the Inspector, change Mode to Freeform layer. 3) Adjust X/Y/width/rotate, or use Layers to reorder it. 4) Use Flow section again for normal responsive sections.";
    let guide = $("#pbiFreeformGuideBox");
    if (!guide) {
      guide = document.createElement("div");
      guide.id = "pbiFreeformGuideBox";
      guide.className = "pbi-freeform-guide-box";
      $(".pbi-studio-toolbar")?.after(guide);
    }
    guide.innerHTML = `<strong>${upgradeNeeded ? "Package gate" : "Freeform guide"}</strong><p>${escapeHtml(message)}</p><button type="button" class="btn-ghost" id="pbiCloseFreeformGuide">Got it</button>`;
    $("#pbiCloseFreeformGuide")?.addEventListener("click", () => guide.remove());
    setStatus(upgradeNeeded ? "Business or Plus required for freeform" : "Freeform guide opened");
  }

  function saveProject(){
    const local = JSON.parse(localStorage.getItem("pbi_local_projects") || "[]");
    const id = state.project_id || qs.get("project") || "local-canvas";
    const project = {
      id,
      name: state.business_name || getPreset(state.templateId).businessName || "PBI Website",
      status:"draft",
      plan: currentPlan(),
      package: currentPlan(),
      template: state.templateId,
      billing_status:"draft",
      published:0,
      updated_at:new Date().toISOString()
    };
    const existing = local.find(p => p.id === id);
    if (existing) Object.assign(existing, project); else local.unshift(project);
    localStorage.setItem("pbi_local_projects", JSON.stringify(local));
    persist();
    setStatus("Project saved locally");
    fetch("/api/projects/save", {
      method:"POST",
      credentials:"include",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ project, canvas:state })
    }).catch(() => {});
  }

  function applyGate(){
    const premium = isPremium();
    const plus = isPlus();
    $$('[data-studio-tab="cms"], [data-studio-tab="collab"]').forEach(tab => {
      tab.classList.toggle("pbi-locked", !plus);
      tab.title = plus ? "" : "Plus required";
    });
    $("#canvasSaveVersionBtn")?.classList.toggle("pbi-locked", !premium);
    $("#canvasDuplicatePageBtn")?.classList.toggle("pbi-locked", !premium);
    if ($("#canvasFreeformGuideBtn")) $("#canvasFreeformGuideBtn").classList.remove("pbi-locked");
    const note = $("#canvasInspectorEmpty");
    if (note && !selectedId) {
      note.innerHTML = premium
        ? "Select a block to edit text, layout, freeform position, motion and responsive behaviour."
        : "Select a block to edit. Freeform positioning unlocks on Business and Plus.";
    }
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

    $("#canvasApplyInspectorBtn")?.addEventListener("click", applyInspector);
    $("#canvasExportBtn")?.addEventListener("click", saveProject);
    $("#canvasSaveVersionBtn")?.addEventListener("click", () => {
      const versions = JSON.parse(localStorage.getItem("pbi_canvas_versions") || "[]");
      versions.unshift({ saved_at:new Date().toISOString(), state });
      localStorage.setItem("pbi_canvas_versions", JSON.stringify(versions.slice(0,10)));
      setStatus("Version saved");
    });
    $("#canvasPublishBtn")?.addEventListener("click", () => location.href = "/pricing/?publish=1&project=" + encodeURIComponent(state.project_id || qs.get("project") || ""));
    $("#canvasBackToBuilder")?.setAttribute("href", "/dashboard/");
    $("#canvasAiBuildBtn")?.addEventListener("click", () => {
      const brief = $("#canvasAiBrief")?.value?.trim();
      if (!brief) return;
      const p = getPreset(state.templateId);
      const target = activeBlocks().find(block => block.type === "hero") || activeBlocks()[0];
      if (target) {
        target.title = brief.length > 56 ? brief.slice(0,56).replace(/\s+\S*$/,"") : brief;
        target.text = `AI draft brief: ${brief}`;
        selectedId = target.id;
      }
      render();
      if (target) selectBlock(target.id);
      setStatus("AI draft applied locally");
    });
    $("#canvasAddPageBtn")?.addEventListener("click", addPage);
    $("#canvasDuplicatePageBtn")?.addEventListener("click", () => isPremium() ? duplicatePage() : showFreeformGuide(true));
    $("#canvasDeletePageBtn")?.addEventListener("click", deletePage);
    $("#canvasFreeformGuideBtn")?.addEventListener("click", () => showFreeformGuide(false));
    $("#canvasThemeBtn")?.addEventListener("click", () => {
      const bg = $("#themeBg")?.value;
      const accent = $("#themeAccent")?.value;
      if (bg) state.background_color = bg;
      if (accent) state.accent_color = accent;
      activeBlocks().forEach(block => { block.accent = accent || block.accent; });
      render();
      setStatus("Brand theme applied");
    });
    $("#themeBg")?.addEventListener("change", () => { state.background_color = $("#themeBg").value; render(); });
    $("#themeAccent")?.addEventListener("change", () => { state.accent_color = $("#themeAccent").value; render(); });
  }

  wireEvents();
  render();
})();
