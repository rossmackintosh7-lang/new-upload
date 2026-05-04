(() => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project") || "draft";
  const requestedPreset = params.get("preset") || params.get("template") || localStorage.getItem("pbi_selected_template") || "";
  const preset = requestedPreset;
  const canvasKey = `pbi_canvas_${projectId}`;
  const versionsKey = `pbi_canvas_versions_${projectId}`;
  const cmsKey = `pbi_cms_${projectId}`;
  const collabKey = `pbi_collab_${projectId}`;

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const defaultTheme = {
    background: "#fff8f1",
    accent: "#bf5c29",
    text: "#26160f",
    font: "warm",
    density: "airy"
  };

  const palettes = {
    cafe: { bg: "#fff4eb", soft: "#f6efe7", accent: "#b85f32", deep: "#2d160d", image: "/assets/demo-media/cafe-hero.jpg", gallery: ["/assets/demo-media/cafe-1.jpg", "/assets/demo-media/cafe-2.jpg", "/assets/demo-media/cafe-3.jpg"] },
    trades: { bg: "#f3f7f4", soft: "#edf3ef", accent: "#256b5b", deep: "#173f35", image: "/assets/demo-media/trades-hero.jpg", gallery: ["/assets/demo-media/trades-1.jpg", "/assets/demo-media/trades-2.jpg", "/assets/demo-media/trades-3.jpg"] },
    salon: { bg: "#fff0ed", soft: "#f7eceb", accent: "#b85f70", deep: "#402027", image: "/assets/demo-media/salon-hero.jpg", gallery: ["/assets/demo-media/salon-1.jpg", "/assets/demo-media/salon-2.jpg", "/assets/demo-media/salon-3.jpg"] },
    shop: { bg: "#fff8cf", soft: "#fff4df", accent: "#111111", deep: "#261c05", image: "/assets/demo-media/shop-hero.jpg", gallery: ["/assets/demo-media/shop-1.jpg", "/assets/demo-media/shop-2.jpg", "/assets/demo-media/shop-3.jpg"] },
    holiday: { bg: "#edf6f5", soft: "#fff8f1", accent: "#238081", deep: "#173f45", image: "/assets/demo-media/holiday-let-hero.jpg", gallery: ["/assets/demo-media/holiday-let-1.jpg", "/assets/demo-media/holiday-let-2.jpg", "/assets/demo-media/holiday-let-3.jpg"] },
    consultant: { bg: "#fff8f1", soft: "#f6efe7", accent: "#24556c", deep: "#1e3d4d", image: "/assets/demo-media/consultant-hero.jpg", gallery: ["/assets/demo-media/consultant-1.jpg", "/assets/demo-media/consultant-2.jpg", "/assets/demo-media/consultant-3.jpg"] }
  };

  const labels = {
    navBar: "Navigation",
    hero: "Hero",
    splitHero: "Split Hero",
    floatingCard: "Floating Card",
    trustBand: "Trust Band",
    logoCloud: "Logo Cloud",
    services: "Services",
    process: "Process",
    stats: "Stats",
    featureGrid: "Feature Grid",
    gallery: "Gallery",
    testimonial: "Testimonial",
    pricing: "Pricing",
    productGrid: "Product Grid",
    cmsList: "CMS List",
    faq: "FAQ",
    map: "Map / Area",
    booking: "Booking",
    contact: "Contact",
    retail: "Retail",
    cta: "CTA",
    spacer: "Spacer"
  };

  const blockDefaults = {
    navBar: baseBlock("navBar", "PBI Preview", "Home|Services|About|Contact", "Get started", { image: "/assets/pbi-header-logo-no-bg-20260502c.png?v=20260502c", layout: "standard", background: "#fffdf8", padding: "compact", radius: "pill", animation: "none" }),
    hero: baseBlock("hero", "A website that feels designed, not assembled.", "Create a premium first impression with a clear offer, helpful proof and an obvious next step.", "Start building", { layout: "centered", align: "center", animation: "rise", padding: "spacious" }),
    splitHero: baseBlock("splitHero", "A strong first impression with real business focus.", "Use this section for your offer, service area, proof and the most important customer action.", "Request a quote", { image: "/assets/demo-media/trades-hero.jpg", layout: "split", background: "#f4efe7", accent: "#256b5b", padding: "spacious" }),
    floatingCard: baseBlock("floatingCard", "Limited offer", "A freeform layer for badges, notes, mini CTAs or decorative proof cards.", "Claim it", { layout: "spotlight", background: "#ffffff", accent: "#bf5c29", padding: "compact", animation: "float", positionMode: "free", x: 72, y: 120, width: 330, rotate: -2, z: 20 }),
    trustBand: baseBlock("trustBand", "Customer confidence at a glance.", "Clear offer::Visitors understand what you do quickly|Proof built in::Trust appears before hesitation|Easy next step::The call-to-action is always obvious", "", { layout: "cards", background: "#ffffff", align: "center", animation: "stagger", padding: "compact" }),
    logoCloud: baseBlock("logoCloud", "Trusted by local teams and independents.", "Cafés|Trades|Salons|Retail|Holiday lets", "", { layout: "centered", background: "#fffdf8", align: "center", animation: "marquee", padding: "compact" }),
    services: baseBlock("services", "Services that are easy to understand.", "Core service::Explain the value in plain English|Practical support::Show how customers are helped|Ongoing care::Make follow-up and support obvious", "View services", { layout: "cards", background: "#fffaf4", animation: "rise" }),
    process: baseBlock("process", "A simple route from interest to action.", "Understand::Customers see the offer quickly|Trust::Proof and details remove doubt|Act::The next step is obvious", "", { layout: "cards", background: "#fff8f1", accent: "#256b5b", animation: "slide" }),
    stats: baseBlock("stats", "Useful numbers and proof points.", "Clear::Offer|Fast::Next step|Mobile::Ready|SEO::Structured", "", { layout: "cards", background: "#ffffff", align: "center", animation: "stagger", padding: "compact" }),
    featureGrid: baseBlock("featureGrid", "Why this page feels premium.", "Richer sections::Proof, process and answers included|Better rhythm::Image, cards and CTA sections alternate|Mobile-first flow::Every section is easy to scan|Publish-ready::The customer journey ends cleanly", "", { layout: "bento", background: "#ffffff", animation: "rise" }),
    gallery: baseBlock("gallery", "A visual feel for the business.", "/assets/demo-media/cafe-1.jpg|/assets/demo-media/cafe-2.jpg|/assets/demo-media/cafe-3.jpg", "", { layout: "masonry", background: "#fff8f1", align: "center", animation: "scale" }),
    testimonial: baseBlock("testimonial", "Proof that feels human.", "“Clear, useful and easy to navigate. The website explains the offer properly and makes the next step simple.”", "", { layout: "centered", background: "#2b1a12", accent: "#f2b66d", align: "center", padding: "spacious", animation: "fade" }),
    pricing: baseBlock("pricing", "Pick the publishing package that fits.", "Starter::£12.99/month::Simple launch tools|Business::£24.99/month::More sections, images and SEO support|Plus::£39.99/month::Retail, AI support and premium controls", "Compare packages", { layout: "cards", background: "#fffdf8", animation: "stagger" }),
    productGrid: baseBlock("productGrid", "Products that are easy to scan.", "Local favourite::£12::Short product highlight|Gift bundle::£24::Ideal for repeat orders|Seasonal pick::£18::Limited or current offer", "Shop now", { image: "/assets/demo-media/shop-hero.jpg", layout: "cards", background: "#fff8cf", accent: "#111111", animation: "rise" }),
    cmsList: baseBlock("cmsList", "Latest updates and useful content.", "Case study::How the business helped a customer|Guide::What to know before getting started|Update::A useful piece of local news", "Read more", { layout: "cards", background: "#f6efe7", accent: "#24556c", animation: "rise" }),
    faq: baseBlock("faq", "Helpful answers before customers ask.", "Can this be edited later?|Yes, sections can be changed, reordered, hidden or expanded.\nIs it mobile-friendly?|Yes, the layout is designed for phone and desktop viewing.\nWhen does payment happen?|Customers build free and pay only when ready to publish.", "Ask a question", { background: "#fff8f1", animation: "fade" }),
    map: baseBlock("map", "Local area and service coverage.", "Serving Purbeck, Dorset and nearby areas. Use this section to explain where the business works, delivers or welcomes customers.", "Check coverage", { layout: "split", background: "#edf6f5", accent: "#238081", animation: "fade" }),
    booking: baseBlock("booking", "Make bookings feel simple.", "Ask customers to choose a time, request availability or send the details needed before a call.", "Book a call", { layout: "spotlight", background: "#fff4eb", accent: "#b85f32", align: "center", animation: "scale" }),
    contact: baseBlock("contact", "Ready to talk?", "Tell customers how to contact you, when you are open and what information to include.", "Send enquiry", { layout: "split", background: "#f4efe7", accent: "#256b5b", animation: "fade" }),
    retail: baseBlock("retail", "Featured products.", "Product one - £12|Product two - £18|Product three - £24", "Shop now", { image: "/assets/demo-media/shop-hero.jpg", layout: "cards", background: "#fff8cf", accent: "#111111", animation: "rise" }),
    cta: baseBlock("cta", "Ready to take the next step?", "Make it easy for customers to contact, book, buy or ask a question.", "Get in touch", { layout: "centered", background: "#bf5c29", accent: "#ffffff", align: "center", padding: "spacious", animation: "scale" }),
    spacer: baseBlock("spacer", "", "", "", { background: "#fff8f1", animation: "none", padding: "comfortable" })
  };

  function baseBlock(type, title, text, button, overrides = {}) {
    return {
      type,
      title,
      text,
      button,
      image: "",
      layout: "standard",
      background: "#fff8f1",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "left",
      animation: "none",
      radius: "soft",
      visibility: "all",
      positionMode: "flow",
      x: 40,
      y: 40,
      width: 520,
      rotate: 0,
      z: 10,
      duration: 650,
      delay: 0,
      easing: "cubic-bezier(.2,.9,.2,1)",
      ...overrides
    };
  }

  let history = [];
  let future = [];
  let autosaveTimer = null;
  let renderTimer = null;
  let dragSourceId = null;
  let previewMode = false;
  let selectedId = null;
  let cmsItems = loadLocalJson(cmsKey, fallbackCms());
  let collab = loadLocalJson(collabKey, { invites: [], notes: [], presence: [] });
  let state = loadState();
  selectedId = currentBlocks()[0]?.id || null;

  const editorId = getEditorId();
  const channel = "BroadcastChannel" in window ? new BroadcastChannel(`pbi-canvas-${projectId}`) : null;
  if (channel) {
    channel.addEventListener("message", (event) => {
      const data = event.data || {};
      if (data.editorId === editorId) return;
      if (data.type === "presence") {
        upsertPresence(data.presence, false);
        renderCollab();
      }
      if (data.type === "state" && data.updatedAt && data.updatedAt > (state.updatedAt || "")) {
        syncActivePage();
        state = normaliseState(data.state);
        selectedId = currentBlocks()[0]?.id || null;
        saveState(false);
        render();
      }
    });
  }

  function uid(prefix = "block") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(value) {
    return String(value || "page")
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page";
  }

  function loadLocalJson(key, fallback) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved !== null) return saved;
    } catch (_) {}
    return clone(fallback);
  }

  function setValue(id, value) {
    const el = $(id);
    if (el) el.value = value ?? "";
  }

  function fallbackCms() {
    return [
      { id: uid("cms"), type: "case-study", title: "Example case study", slug: "example-case-study", status: "draft", text: "A short proof-led story that can feed the CMS list section.", updated_at: new Date().toISOString() },
      { id: uid("cms"), type: "service", title: "Featured service", slug: "featured-service", status: "draft", text: "A reusable service entry for future collection pages.", updated_at: new Date().toISOString() }
    ];
  }

  function block(type, overrides = {}) {
    return normaliseBlock({ id: uid(), ...clone(blockDefaults[type] || blockDefaults.hero), ...overrides });
  }

  function normaliseBlock(item = {}) {
    const base = blockDefaults[item?.type] || blockDefaults[item?.section_type] || blockDefaults.services;
    return {
      ...clone(base),
      ...item,
      id: item?.id || uid(),
      type: item?.type || item?.section_type || base.type,
      animation: item?.animation || base.animation || "none",
      radius: item?.radius || base.radius || "soft",
      visibility: item?.visibility || base.visibility || "all",
      positionMode: item?.positionMode || item?.position_mode || base.positionMode || "flow",
      x: Number.isFinite(Number(item?.x)) ? Number(item.x) : base.x,
      y: Number.isFinite(Number(item?.y)) ? Number(item.y) : base.y,
      width: Number.isFinite(Number(item?.width)) ? Number(item.width) : base.width,
      rotate: Number.isFinite(Number(item?.rotate)) ? Number(item.rotate) : base.rotate,
      z: Number.isFinite(Number(item?.z)) ? Number(item.z) : base.z,
      duration: Number.isFinite(Number(item?.duration)) ? Number(item.duration) : base.duration,
      delay: Number.isFinite(Number(item?.delay)) ? Number(item.delay) : base.delay,
      easing: item?.easing || base.easing || "ease"
    };
  }

  function templateBlocks(name = "local-service") {
    const map = {"premium-cafe":"cafe","local-service":"trades","salon-signature":"salon","consultant-authority":"consultant","holiday-stay":"holiday-let","retail-launch":"shop","mobile-mechanic":"mobile-mechanic","dog-groomer":"dog-groomer","cleaner":"cleaner","personal-trainer":"personal-trainer","restaurant-signature":"restaurant"};
    const key = map[name] || "trades";
    const presets = (window.PBITemplatePresets && window.PBITemplatePresets.presets) || {};
    const presetData = presets[key] || presets.cafe || {};
    const p = { accent: presetData.accent || "#bf5c29", bg: presetData.background || "#fff8f1", deep: presetData.text || "#2b1b14", soft: "#ffffff", image: presetData.heroImage || "", gallery: Array.isArray(presetData.galleryImages) && presetData.galleryImages.length ? presetData.galleryImages : [presetData.heroImage || ""] };
    const business = presetData.subHeading || "A premium starting point with stronger structure and more personality.";
    const base = [block("navBar", { title: presetData.businessName || "PBI Preview", background: "#fffdf8", accent: p.accent }), block("splitHero", { title: presetData.pageMainHeading || business, text: business, image: p.image, background: p.bg, accent: p.accent }), block("floatingCard", { title: "Drag me", text: "Freeform card. Move this on desktop to create a less rigid hero composition.", button: "See proof", background: "#ffffff", accent: p.accent, x: 72, y: 210, width: 310, rotate: -2 }), block("trustBand", { background: "#ffffff", accent: p.accent }), block("services", { background: p.soft, accent: p.accent }), block("process", { background: p.bg, accent: p.accent }), block("featureGrid", { background: "#ffffff", accent: p.accent }), block("gallery", { text: p.gallery.join("|"), background: p.soft, accent: p.accent }), block("testimonial", { background: p.deep }), block("faq", { background: p.bg, accent: p.accent }), block("cta", { background: p.accent, accent: "#ffffff" })];
    if (key === "shop") base.splice(7, 0, block("productGrid", { background: p.bg, accent: p.accent, image: p.image }));
    if (["cafe", "restaurant"].includes(key)) base.splice(9, 0, block("booking", { background: p.bg, accent: p.accent }));
    if (key === "holiday-let") base.splice(8, 0, block("map", { background: p.bg, accent: p.accent }));
    if (key === "consultant") base.splice(8, 0, block("cmsList", { background: p.soft, accent: p.accent }));
    return base;
  }

  function initialBlocksForPreset() {
    const map = {shop:"retail-launch", cafe:"premium-cafe", salon:"salon-signature", consultant:"consultant-authority", "holiday-let":"holiday-stay", trades:"local-service", "mobile-mechanic":"mobile-mechanic", "dog-groomer":"dog-groomer", cleaner:"cleaner", "personal-trainer":"personal-trainer", restaurant:"restaurant-signature"};
    return templateBlocks(map[preset] || "local-service");
  }

  function initialPages() {
    return [
      page("Home", "home", initialBlocksForPreset()),
      page("Services", "services", [block("navBar"), block("hero", { title: "Services built around the customer journey." }), block("services"), block("process"), block("faq"), block("cta")]),
      page("Contact", "contact", [block("navBar"), block("contact"), block("map"), block("cta")])
    ];
  }

  function page(title, slug, blocks) {
    return { id: uid("page"), title, slug: slugify(slug || title), blocks: (blocks || []).map(normaliseBlock), updatedAt: new Date().toISOString() };
  }

  function freshState() {
    return normaliseState({
      projectId,
      title: "Untitled PBI visual site",
      theme: { ...defaultTheme },
      pages: initialPages(),
      activePageId: "",
      selectedTemplate: preset || "",
      updatedAt: new Date().toISOString()
    });
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(canvasKey) || "null");
      if (saved) {
        const forcedTemplate = params.get("preset") || params.get("template") || localStorage.getItem("pbi_selected_template") || "";
        if (projectId === "draft" && forcedTemplate && saved.selectedTemplate !== forcedTemplate) {
          return freshState();
        }
        return normaliseState(saved);
      }
    } catch (_) {}
    return freshState();
  }

  function normaliseState(input = {}) {
    const existingBlocks = Array.isArray(input.blocks) ? input.blocks.map(normaliseBlock) : [];
    let pages = Array.isArray(input.pages) && input.pages.length
      ? input.pages.map((p, index) => ({
          id: p.id || uid("page"),
          title: p.title || `Page ${index + 1}`,
          slug: slugify(p.slug || p.title || `page-${index + 1}`),
          blocks: Array.isArray(p.blocks) && p.blocks.length ? p.blocks.map(normaliseBlock) : (index === 0 && existingBlocks.length ? existingBlocks : [block("navBar"), block("hero"), block("cta")]),
          updatedAt: p.updatedAt || p.updated_at || new Date().toISOString()
        }))
      : [page("Home", "home", existingBlocks.length ? existingBlocks : initialBlocksForPreset())];

    const activePageId = input.activePageId && pages.some((p) => p.id === input.activePageId) ? input.activePageId : pages[0].id;
    const active = pages.find((p) => p.id === activePageId) || pages[0];
    return {
      projectId: input.projectId || projectId,
      title: input.title || "Untitled PBI visual site",
      theme: { ...defaultTheme, ...(input.theme || {}) },
      pages,
      activePageId,
      blocks: active.blocks,
      selectedTemplate: input.selectedTemplate || preset || "",
      updatedAt: input.updatedAt || new Date().toISOString()
    };
  }

  function currentPage() {
    let p = state.pages.find((item) => item.id === state.activePageId);
    if (!p) {
      p = state.pages[0];
      state.activePageId = p?.id || "";
    }
    return p;
  }

  function currentBlocks() {
    const p = currentPage();
    if (!p) return [];
    if (!Array.isArray(p.blocks)) p.blocks = [];
    state.blocks = p.blocks;
    return p.blocks;
  }

  function setCurrentBlocks(blocks) {
    const p = currentPage();
    if (!p) return;
    p.blocks = (blocks || []).map(normaliseBlock);
    p.updatedAt = new Date().toISOString();
    state.blocks = p.blocks;
  }

  function syncActivePage() {
    const p = currentPage();
    if (p) {
      p.blocks = (state.blocks || p.blocks || []).map(normaliseBlock);
      p.updatedAt = new Date().toISOString();
    }
  }

  function selectedBlock() {
    return currentBlocks().find((item) => item.id === selectedId) || null;
  }

  function pushHistory() {
    syncActivePage();
    history.push(clone(state));
    if (history.length > 90) history.shift();
    future = [];
  }

  function scheduleSave(broadcast = true) {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => saveState(broadcast), 450);
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 90);
  }

  function updateAutosaveStatus(text = "Autosave ready") {
    const el = $("canvasAutosaveStatus");
    if (el) el.textContent = `${text} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  function saveState(broadcast = true) {
    syncActivePage();
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(canvasKey, JSON.stringify(state));
    updateAutosaveStatus("Autosaved");
    clearTimeout(window.__pbiCanvasCloudTimer);
    window.__pbiCanvasCloudTimer = setTimeout(() => cloudSaveCanvas(), 900);
    if (broadcast && channel) channel.postMessage({ type: "state", editorId, updatedAt: state.updatedAt, state: clone(state) });
  }

  function paddingClass(value) {
    return `pad-${value || "comfortable"}`;
  }

  function parseCards(item) {
    return String(item.text || "")
      .split("|")
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row, index) => {
        const parts = row.includes("::") ? row.split("::") : row.split(" - ");
        return { title: (parts[0] || `Item ${index + 1}`).trim(), text: (parts.slice(1).join("::") || "Use this card to explain a benefit, product or proof point.").trim(), index: index + 1 };
      });
  }

  function writeCards(item, cards) {
    item.text = cards.map((card) => `${card.title || ""}::${card.text || ""}`).join("|");
  }

  function faqRows(item) {
    return String(item.text || "")
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean)
      .slice(0, 8)
      .map((row) => {
        const [question, answer] = row.split("|");
        return { question: question || "Question", answer: answer || "Answer goes here." };
      });
  }

  function controls(item) {
    return `<div class="canvas-block-controls">
      <button type="button" data-action="select" data-id="${item.id}">Edit</button>
      <button type="button" data-action="free" data-id="${item.id}">${item.positionMode === "free" ? "Flow" : "Free"}</button>
      <button type="button" data-action="up" data-id="${item.id}">↑</button>
      <button type="button" data-action="down" data-id="${item.id}">↓</button>
      <button type="button" data-action="duplicate" data-id="${item.id}">Duplicate</button>
      <button type="button" data-action="delete" data-id="${item.id}">Delete</button>
    </div>`;
  }

  function blockStyle(item) {
    const common = [`--block-bg:${item.background || "#fff8f1"}`, `--block-accent:${item.accent || "#bf5c29"}`, `--block-align:${item.align || "left"}`, `--motion-duration:${Number(item.duration || 650)}ms`, `--motion-delay:${Number(item.delay || 0)}ms`, `--motion-easing:${item.easing || "ease"}`];
    if (item.positionMode === "free") {
      common.push(`left:${Number(item.x || 0)}px`, `top:${Number(item.y || 0)}px`, `width:${Math.max(180, Number(item.width || 420))}px`, `z-index:${Number(item.z || 10)}`, `--free-rotate:${Number(item.rotate || 0)}deg`);
    }
    return common.join(";");
  }

  function blockShell(item, extraClass, inner) {
    const selected = item.id === selectedId ? "selected" : "";
    const hiddenClass = `show-${item.visibility || "all"}`;
    const freeClass = item.positionMode === "free" ? "is-freeform" : "is-flow";
    return `<section draggable="${item.positionMode === "free" ? "false" : "true"}" class="canvas-block ${extraClass} ${selected} ${freeClass} ${paddingClass(item.padding)} layout-${item.layout || "standard"} radius-${item.radius || "soft"} motion-${item.animation || "none"} ${hiddenClass}" data-block-id="${item.id}" style="${blockStyle(item)}">
      ${controls(item)}
      ${item.positionMode === "free" ? `<span class="canvas-freeform-handle" data-free-handle="${item.id}">Move</span>` : ""}
      ${inner}
    </section>`;
  }

  function editable(tag, item, field, value, extra = "") {
    return `<${tag} ${extra} contenteditable="true" data-inline-field="${field}" data-block-id="${item.id}">${escapeHtml(value)}</${tag}>`;
  }

  function renderBlock(item) {
    item = normaliseBlock(item);
    const button = escapeHtml(item.button);
    const img = item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : `<div class="canvas-image-placeholder">Image</div>`;

    if (item.type === "spacer") return blockShell(item, "canvas-spacer", `<span>Spacer</span>`);

    if (item.type === "floatingCard") {
      return blockShell(item, "canvas-floating-card", `<p class="canvas-kicker">Floating layer</p>${editable("h3", item, "title", item.title || "Floating card")} ${editable("p", item, "text", item.text || "Freeform card text")} ${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}`);
    }

    if (item.type === "navBar") {
      const links = String(item.text || "Home|Services|About|Contact").split("|").filter(Boolean).slice(0, 6);
      return blockShell(item, "canvas-navbar", `<div class="canvas-nav-logo">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : ""}${editable("strong", item, "title", item.title || "Brand")}</div><nav>${links.map((link) => `<a>${escapeHtml(link)}</a>`).join("")}</nav>${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}`);
    }

    if (item.type === "logoCloud") {
      const logos = String(item.text || "").split("|").filter(Boolean).slice(0, 8);
      return blockShell(item, "canvas-logo-cloud", `<p class="canvas-kicker">Proof</p>${editable("h2", item, "title", item.title || "Trusted by")}<div>${logos.map((logo) => `<span>${escapeHtml(logo)}</span>`).join("")}</div>`);
    }

    if (["services", "featureGrid", "process", "trustBand", "stats", "pricing", "productGrid", "cmsList", "retail"].includes(item.type)) {
      const cards = item.type === "cmsList" && cmsItems.length ? cmsItems.slice(0, 9).map((entry) => ({ title: entry.title, text: entry.text, index: entry.type })) : parseCards(item).slice(0, 9);
      return blockShell(item, `canvas-cards canvas-${item.type}`, `<div class="canvas-block-copy"><p class="canvas-kicker">${escapeHtml(labels[item.type] || item.type)}</p>${editable("h2", item, "title", item.title || "Section title")}</div><div class="canvas-card-grid">${cards.map((card, index) => `<article><span>${escapeHtml(card.index || index + 1)}</span><h3 contenteditable="true" data-card-field="title" data-card-index="${index}" data-block-id="${item.id}">${escapeHtml(card.title)}</h3><p contenteditable="true" data-card-field="text" data-card-index="${index}" data-block-id="${item.id}">${escapeHtml(card.text)}</p></article>`).join("")}</div>${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}`);
    }

    if (item.type === "gallery") {
      const images = String(item.text || "").split("|").filter(Boolean).slice(0, 8);
      return blockShell(item, "canvas-gallery", `${editable("h2", item, "title", item.title || "Gallery")}<div class="canvas-gallery-grid">${images.map((src, index) => `<figure><img src="${escapeHtml(src.trim())}" alt=""><figcaption>Image ${index + 1}</figcaption></figure>`).join("")}</div>`);
    }

    if (item.type === "faq") {
      return blockShell(item, "canvas-faq", `${editable("h2", item, "title", item.title || "FAQ")}<div>${faqRows(item).map((row) => `<details open><summary>${escapeHtml(row.question)}</summary><p>${escapeHtml(row.answer)}</p></details>`).join("")}</div>${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}`);
    }

    if (item.type === "map") {
      return blockShell(item, "canvas-map canvas-split", `<div><p class="canvas-kicker">Local coverage</p>${editable("h2", item, "title", item.title || "Service area")}${editable("p", item, "text", item.text || "Area description")}${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}</div><figure><div class="canvas-map-card"><span>📍</span><strong>Purbeck / Dorset</strong><small>Edit this section for real service areas or map embed later.</small></div></figure>`);
    }

    if (item.type === "booking") {
      return blockShell(item, "canvas-booking", `<div class="canvas-booking-card"><p class="canvas-kicker">Booking</p>${editable("h2", item, "title", item.title || "Book a time")}${editable("p", item, "text", item.text || "Booking text")}<div class="canvas-booking-slots"><span>Today</span><span>Tomorrow</span><span>This week</span></div>${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}</div>`);
    }

    if (item.type === "splitHero" || item.layout === "split") {
      return blockShell(item, "canvas-split", `<div><p class="canvas-kicker">${escapeHtml(labels[item.type] || "Section")}</p>${editable("h1", item, "title", item.title || "Heading")}${editable("p", item, "text", item.text || "Text")}${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}</div><figure>${img}</figure>`);
    }

    return blockShell(item, "canvas-standard", `<p class="canvas-kicker">${escapeHtml(labels[item.type] || "Section")}</p>${editable("h1", item, "title", item.title || "Heading")}${editable("p", item, "text", item.text || "Text")} ${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}`);
  }

  function render() {
    const dropzone = $("canvasDropzone");
    const empty = $("canvasEmpty");
    if (!dropzone) return;

    document.body.classList.toggle("pbi-preview-mode", previewMode);
    document.documentElement.style.setProperty("--studio-page-bg", state.theme?.background || defaultTheme.background);
    document.documentElement.style.setProperty("--studio-accent", state.theme?.accent || defaultTheme.accent);
    document.documentElement.style.setProperty("--studio-text", state.theme?.text || defaultTheme.text);

    const p = currentPage();
    const titleEl = $("canvasProjectTitle");
    if (titleEl) titleEl.textContent = `${state.title || "Untitled PBI visual site"} / ${p?.title || "Page"}`;

    dropzone.querySelectorAll(".canvas-block").forEach((node) => node.remove());
    currentBlocks().forEach((item) => dropzone.insertAdjacentHTML("beforeend", renderBlock(item)));
    if (empty) empty.style.display = currentBlocks().length ? "none" : "";

    bindCanvasEvents();
    renderInspector();
    renderLayers();
    renderPages();
    renderVersions();
    renderCms();
    renderCollab();
  }

  function renderPages() {
    const list = $("canvasPagesList");
    if (!list) return;
    list.innerHTML = state.pages.map((p, index) => `<button type="button" class="${p.id === state.activePageId ? "active" : ""}" data-page-id="${p.id}"><span>${index + 1}</span><strong>${escapeHtml(p.title)}</strong><small>/${escapeHtml(p.slug)}</small></button>`).join("");
    $$('[data-page-id]', list).forEach((button) => button.addEventListener("click", () => switchPage(button.dataset.pageId)));
  }

  function switchPage(pageId) {
    if (!state.pages.some((p) => p.id === pageId)) return;
    pushHistory();
    syncActivePage();
    state.activePageId = pageId;
    state.blocks = currentPage().blocks;
    selectedId = currentBlocks()[0]?.id || null;
    saveState();
    render();
  }

  function addPage() {
    const input = $("canvasNewPageTitle");
    const title = input?.value.trim() || "New page";
    pushHistory();
    const newPage = page(title, title, [block("navBar"), block("hero", { title: `${title} page` }), block("cta")]);
    state.pages.push(newPage);
    state.activePageId = newPage.id;
    state.blocks = newPage.blocks;
    selectedId = state.blocks[0]?.id || null;
    if (input) input.value = "";
    saveState();
    render();
  }

  function duplicatePage() {
    const p = currentPage();
    if (!p) return;
    pushHistory();
    const copy = page(`${p.title} copy`, `${p.slug}-copy`, p.blocks.map((item) => ({ ...clone(item), id: uid() })));
    state.pages.push(copy);
    state.activePageId = copy.id;
    state.blocks = copy.blocks;
    selectedId = copy.blocks[0]?.id || null;
    saveState();
    render();
  }

  function deletePage() {
    if (state.pages.length <= 1) return alert("Keep at least one page in the project.");
    pushHistory();
    state.pages = state.pages.filter((p) => p.id !== state.activePageId);
    state.activePageId = state.pages[0].id;
    state.blocks = state.pages[0].blocks;
    selectedId = state.blocks[0]?.id || null;
    saveState();
    render();
  }

  function renderLayers() {
    const list = $("canvasLayersList");
    if (!list) return;
    list.innerHTML = currentBlocks().map((item, index) => `<button type="button" class="${item.id === selectedId ? "active" : ""}" data-layer-id="${item.id}"><span>${index + 1}</span><strong>${escapeHtml(labels[item.type] || item.type)}</strong><small>${escapeHtml(item.title || "Untitled")}${item.positionMode === "free" ? " • freeform" : ""}</small></button>`).join("");
    $$('[data-layer-id]', list).forEach((button) => button.addEventListener("click", () => { selectedId = button.dataset.layerId; render(); }));
  }

  function renderCms() {
    const list = $("cmsItemsList");
    if (!list) return;
    list.innerHTML = cmsItems.length ? cmsItems.map((entry) => `<article><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.type)} • ${escapeHtml(entry.status || "draft")} • /${escapeHtml(entry.slug || slugify(entry.title))}</small><p>${escapeHtml(entry.text)}</p><button type="button" data-cms-edit="${entry.id}">Edit</button><button type="button" data-cms-remove="${entry.id}">Remove</button></article>`).join("") : '<p class="small-note muted">No CMS entries yet.</p>';
    $$('[data-cms-remove]', list).forEach((button) => button.addEventListener("click", () => {
      cmsItems = cmsItems.filter((entry) => entry.id !== button.dataset.cmsRemove);
      saveCms();
      cloudSaveCms();
      render();
    }));
    $$('[data-cms-edit]', list).forEach((button) => button.addEventListener("click", () => {
      const entry = cmsItems.find((item) => item.id === button.dataset.cmsEdit);
      if (!entry) return;
      setValue("cmsItemTitle", entry.title || "");
      setValue("cmsItemType", entry.type || "blog");
      setValue("cmsItemSlug", entry.slug || slugify(entry.title));
      setValue("cmsItemStatus", entry.status || "draft");
      setValue("cmsItemText", entry.text || "");
    }));
  }

  function renderCollab() {
    const presence = $("collabPresenceList");
    const feed = $("collabFeed");
    if (presence) {
      const recent = (collab.presence || []).filter((p) => Date.now() - new Date(p.seen_at || 0).getTime() < 120000);
      presence.innerHTML = recent.length ? recent.map((p) => `<span>${escapeHtml(p.name || p.email || "Editor")} editing ${escapeHtml(p.page || "canvas")}</span>`).join("") : '<span>No other active editors yet</span>';
    }
    if (feed) {
      const rows = [...(collab.notes || []), ...(collab.invites || []).map((invite) => ({ id: invite.id, type: "invite", text: `Invited ${invite.email} as ${invite.role}`, created_at: invite.created_at }))]
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
        .slice(0, 20);
      feed.innerHTML = rows.length ? rows.map((row) => `<article><small>${escapeHtml(row.type || "note")} • ${new Date(row.created_at || Date.now()).toLocaleString()}</small><p>${escapeHtml(row.text || "")}</p></article>`).join("") : '<p class="small-note muted">No collaboration notes yet.</p>';
    }
  }

  function renderInspector() {
    const item = selectedBlock();
    const form = $("canvasInspectorForm");
    const empty = $("canvasInspectorEmpty");
    if (!form || !empty) return;

    if (!item) {
      form.style.display = "none";
      empty.style.display = "";
      return;
    }

    form.style.display = "";
    empty.style.display = "none";
    setValue("inspectorTitle", item.title || "");
    setValue("inspectorText", item.text || "");
    setValue("inspectorButton", item.button || "");
    setValue("inspectorImage", item.image || "");
    setValue("inspectorLayout", item.layout || "standard");
    setValue("inspectorAnimation", item.animation || "none");
    setValue("inspectorBg", item.background || "#fff8f1");
    setValue("inspectorAccent", item.accent || "#bf5c29");
    setValue("inspectorPadding", item.padding || "comfortable");
    setValue("inspectorAlign", item.align || "left");
    setValue("inspectorRadius", item.radius || "soft");
    setValue("inspectorVisibility", item.visibility || "all");
    setValue("inspectorPositionMode", item.positionMode || "flow");
    setValue("inspectorX", item.x || 0);
    setValue("inspectorY", item.y || 0);
    setValue("inspectorWidth", item.width || 520);
    setValue("inspectorRotate", item.rotate || 0);
    setValue("inspectorZ", item.z || 10);
    setValue("inspectorDuration", item.duration || 650);
    setValue("inspectorDelay", item.delay || 0);
    setValue("inspectorEasing", item.easing || "ease");
    setValue("themeBg", state.theme?.background || defaultTheme.background);
    setValue("themeAccent", state.theme?.accent || defaultTheme.accent);
    setValue("themeFont", state.theme?.font || defaultTheme.font);
    setValue("themeDensity", state.theme?.density || defaultTheme.density);
  }

  function applyInspector() {
    const item = selectedBlock();
    if (!item) return;
    pushHistory();
    updateItemFromInspector(item);
    scheduleSave();
    render();
  }

  function updateItemFromInspector(item) {
    item.title = $("inspectorTitle")?.value || "";
    item.text = $("inspectorText")?.value || "";
    item.button = $("inspectorButton")?.value || "";
    item.image = $("inspectorImage")?.value || "";
    item.layout = $("inspectorLayout")?.value || "standard";
    item.animation = $("inspectorAnimation")?.value || "none";
    item.background = $("inspectorBg")?.value || "#fff8f1";
    item.accent = $("inspectorAccent")?.value || "#bf5c29";
    item.padding = $("inspectorPadding")?.value || "comfortable";
    item.align = $("inspectorAlign")?.value || "left";
    item.radius = $("inspectorRadius")?.value || "soft";
    item.visibility = $("inspectorVisibility")?.value || "all";
    item.positionMode = $("inspectorPositionMode")?.value || "flow";
    item.x = Number($("inspectorX")?.value || item.x || 0);
    item.y = Number($("inspectorY")?.value || item.y || 0);
    item.width = Math.max(180, Number($("inspectorWidth")?.value || item.width || 520));
    item.rotate = Number($("inspectorRotate")?.value || item.rotate || 0);
    item.z = Number($("inspectorZ")?.value || item.z || 10);
    item.duration = Number($("inspectorDuration")?.value || item.duration || 650);
    item.delay = Number($("inspectorDelay")?.value || item.delay || 0);
    item.easing = $("inspectorEasing")?.value || item.easing || "ease";
  }

  function bindCanvasEvents() {
    $$(".canvas-block").forEach((el) => {
      el.addEventListener("click", (event) => {
        if (event.target.closest(".canvas-block-controls")) return;
        selectedId = el.dataset.blockId;
        render();
      });
      if (el.classList.contains("is-flow")) {
        el.addEventListener("dragstart", (event) => {
          dragSourceId = el.dataset.blockId;
          event.dataTransfer.setData("block/id", dragSourceId);
          el.classList.add("dragging");
        });
        el.addEventListener("dragend", () => el.classList.remove("dragging"));
        el.addEventListener("dragover", (event) => event.preventDefault());
        el.addEventListener("drop", (event) => {
          event.preventDefault();
          const targetId = el.dataset.blockId;
          const newType = event.dataTransfer.getData("block/type");
          if (newType) insertBlockBefore(newType, targetId);
          else if (dragSourceId && dragSourceId !== targetId) reorderBlocks(dragSourceId, targetId);
        });
      }
      bindFreeformDrag(el);
    });

    $$('[data-inline-field]').forEach((field) => {
      field.addEventListener("input", () => {
        const item = currentBlocks().find((candidate) => candidate.id === field.dataset.blockId);
        if (!item) return;
        item[field.dataset.inlineField] = field.textContent.trim();
        renderInspector();
        scheduleSave();
      });
    });

    $$('[data-card-field]').forEach((field) => {
      field.addEventListener("input", () => {
        const item = currentBlocks().find((candidate) => candidate.id === field.dataset.blockId);
        if (!item) return;
        const cards = parseCards(item);
        const card = cards[Number(field.dataset.cardIndex)] || { title: "", text: "" };
        card[field.dataset.cardField] = field.textContent.trim();
        cards[Number(field.dataset.cardIndex)] = card;
        writeCards(item, cards);
        renderInspector();
        scheduleSave();
      });
    });

    $$('[data-action]').forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        handleAction(button.dataset.action, button.dataset.id);
      });
    });
  }

  function bindFreeformDrag(el) {
    if (!el.classList.contains("is-freeform")) return;
    let start = null;
    const begin = (event) => {
      if (event.target.closest("[contenteditable], a, button")) return;
      const item = currentBlocks().find((candidate) => candidate.id === el.dataset.blockId);
      if (!item) return;
      selectedId = item.id;
      start = { pointer: event.pointerId, x: event.clientX, y: event.clientY, itemX: Number(item.x || 0), itemY: Number(item.y || 0) };
      el.setPointerCapture(event.pointerId);
      el.classList.add("freeform-moving");
      event.preventDefault();
    };
    const move = (event) => {
      if (!start || event.pointerId !== start.pointer) return;
      const item = currentBlocks().find((candidate) => candidate.id === el.dataset.blockId);
      if (!item) return;
      item.x = Math.max(0, Math.round(start.itemX + event.clientX - start.x));
      item.y = Math.max(0, Math.round(start.itemY + event.clientY - start.y));
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      renderInspector();
      scheduleSave();
    };
    const end = (event) => {
      if (!start || event.pointerId !== start.pointer) return;
      start = null;
      el.classList.remove("freeform-moving");
    };
    el.addEventListener("pointerdown", begin);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  function handleAction(action, id) {
    const blocks = currentBlocks();
    const index = blocks.findIndex((item) => item.id === id);
    if (index < 0) return;
    selectedId = id;
    if (action === "select") return render();
    pushHistory();
    if (action === "free") {
      blocks[index].positionMode = blocks[index].positionMode === "free" ? "flow" : "free";
      if (blocks[index].positionMode === "free") {
        blocks[index].x = blocks[index].x || 50;
        blocks[index].y = blocks[index].y || 80;
        blocks[index].width = blocks[index].width || 520;
        blocks[index].z = blocks[index].z || 10;
      }
    }
    if (action === "up" && index > 0) [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
    if (action === "down" && index < blocks.length - 1) [blocks[index + 1], blocks[index]] = [blocks[index], blocks[index + 1]];
    if (action === "duplicate") {
      const copy = clone(blocks[index]);
      copy.id = uid();
      copy.title = `${copy.title || labels[copy.type] || "Block"} copy`;
      copy.x = Number(copy.x || 0) + 28;
      copy.y = Number(copy.y || 0) + 28;
      blocks.splice(index + 1, 0, copy);
      selectedId = copy.id;
    }
    if (action === "delete") {
      blocks.splice(index, 1);
      selectedId = blocks[Math.min(index, blocks.length - 1)]?.id || null;
    }
    setCurrentBlocks(blocks);
    scheduleSave();
    render();
  }

  function insertBlockBefore(type, targetId = null) {
    pushHistory();
    const newBlock = block(type);
    const blocks = currentBlocks();
    const index = blocks.findIndex((item) => item.id === targetId);
    if (index >= 0) blocks.splice(index, 0, newBlock);
    else blocks.push(newBlock);
    setCurrentBlocks(blocks);
    selectedId = newBlock.id;
    scheduleSave();
    render();
  }

  function reorderBlocks(sourceId, targetId) {
    const blocks = currentBlocks();
    const from = blocks.findIndex((item) => item.id === sourceId);
    const to = blocks.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    pushHistory();
    const [item] = blocks.splice(from, 1);
    blocks.splice(to, 0, item);
    setCurrentBlocks(blocks);
    selectedId = item.id;
    scheduleSave();
    render();
  }

  function undo() {
    if (!history.length) return;
    syncActivePage();
    future.push(clone(state));
    state = normaliseState(history.pop());
    selectedId = currentBlocks()[0]?.id || null;
    saveState();
    render();
  }

  function redo() {
    if (!future.length) return;
    syncActivePage();
    history.push(clone(state));
    state = normaliseState(future.pop());
    selectedId = currentBlocks()[0]?.id || null;
    saveState();
    render();
  }

  function saveVersion(reason = "Manual visual studio version") {
    syncActivePage();
    const versions = loadLocalJson(versionsKey, []);
    versions.unshift({ id: uid("version"), reason, createdAt: new Date().toISOString(), state: clone(state), cmsItems: clone(cmsItems), collab: clone(collab) });
    localStorage.setItem(versionsKey, JSON.stringify(versions.slice(0, 18)));
    renderVersions();
  }

  function renderVersions() {
    const list = $("canvasVersionsList");
    if (!list) return;
    const versions = loadLocalJson(versionsKey, []);
    list.innerHTML = versions.length ? versions.slice(0, 8).map((v, index) => `<button type="button" data-restore-version="${index}"><strong>${escapeHtml(v.reason || "Version")}</strong><span>${new Date(v.createdAt || Date.now()).toLocaleString()}</span></button>`).join("") : '<p class="small-note muted">No versions saved yet.</p>';
    $$('[data-restore-version]', list).forEach((button) => button.addEventListener("click", () => {
      const v = versions[Number(button.dataset.restoreVersion)];
      if (!v) return;
      pushHistory();
      state = normaliseState(v.state);
      cmsItems = Array.isArray(v.cmsItems) ? v.cmsItems : cmsItems;
      collab = v.collab || collab;
      selectedId = currentBlocks()[0]?.id || null;
      saveState();
      saveCms(false);
      render();
    }));
  }

  function applyThemeToBlocks() {
    pushHistory();
    const p = currentPage();
    currentBlocks().forEach((item, index) => {
      if (item.type !== "testimonial" && item.type !== "cta") item.background = index % 2 ? "#ffffff" : state.theme.background;
      if (!item.accent || item.accent === "#bf5c29") item.accent = state.theme.accent;
    });
    if (p) p.updatedAt = new Date().toISOString();
    saveState();
    render();
  }

  function saveCms(renderAfter = true) {
    localStorage.setItem(cmsKey, JSON.stringify(cmsItems));
    if (renderAfter) renderCms();
  }

  function addOrUpdateCmsItem() {
    const title = $("cmsItemTitle")?.value.trim();
    const text = $("cmsItemText")?.value.trim();
    if (!title && !text) return;
    const slug = slugify($("cmsItemSlug")?.value || title);
    const type = $("cmsItemType")?.value || "blog";
    const status = $("cmsItemStatus")?.value || "draft";
    const existing = cmsItems.find((item) => item.slug === slug && item.type === type);
    if (existing) {
      existing.title = title || existing.title;
      existing.text = text || existing.text;
      existing.status = status;
      existing.updated_at = new Date().toISOString();
    } else {
      cmsItems.unshift({ id: uid("cms"), type, title: title || "Untitled entry", slug, status, text: text || "Short summary", updated_at: new Date().toISOString() });
    }
    ["cmsItemTitle", "cmsItemSlug", "cmsItemText"].forEach((id) => { const el = $(id); if (el) el.value = ""; });
    saveCms();
    cloudSaveCms();
    render();
  }

  async function cloudLoadCms() {
    if (!projectId || projectId === "draft") return;
    try {
      const response = await fetch(`/api/cms?project_id=${encodeURIComponent(projectId)}`, { credentials: "include" });
      const result = await response.json().catch(() => null);
      if (Array.isArray(result?.items)) {
        cmsItems = result.items.length ? result.items : cmsItems;
        saveCms(false);
        render();
      }
    } catch (_) {}
  }

  async function cloudSaveCms() {
    if (!projectId || projectId === "draft") return;
    try {
      await fetch("/api/cms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, items: cmsItems })
      });
    } catch (_) {}
  }

  function getEditorId() {
    const key = "pbi_editor_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = uid("editor");
      localStorage.setItem(key, id);
    }
    return id;
  }

  function upsertPresence(presence, save = true) {
    if (!presence) return;
    collab.presence = (collab.presence || []).filter((item) => item.editorId !== presence.editorId);
    collab.presence.unshift(presence);
    collab.presence = collab.presence.slice(0, 12);
    if (save) localStorage.setItem(collabKey, JSON.stringify(collab));
  }

  function broadcastPresence() {
    const p = currentPage();
    const presence = { editorId, name: "You", page: p?.title || "canvas", block: selectedBlock()?.title || "", seen_at: new Date().toISOString() };
    upsertPresence(presence);
    if (channel) channel.postMessage({ type: "presence", editorId, presence });
    cloudCollab("presence", { presence });
    renderCollab();
  }

  async function cloudLoadCollab() {
    if (!projectId || projectId === "draft") return;
    try {
      const response = await fetch(`/api/collaboration?project_id=${encodeURIComponent(projectId)}`, { credentials: "include" });
      const result = await response.json().catch(() => null);
      if (result?.ok) {
        collab.invites = result.collaborators || collab.invites || [];
        collab.presence = result.presence || collab.presence || [];
        collab.notes = result.notes || collab.notes || [];
        localStorage.setItem(collabKey, JSON.stringify(collab));
        renderCollab();
      }
    } catch (_) {}
  }

  async function cloudCollab(action, payload = {}) {
    if (!projectId || projectId === "draft") return;
    try {
      await fetch("/api/collaboration", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, action, ...payload })
      });
    } catch (_) {}
  }

  function inviteCollaborator() {
    const email = $("collabInviteEmail")?.value.trim();
    const role = $("collabInviteRole")?.value || "editor";
    if (!email) return;
    const invite = { id: uid("invite"), email, role, status: "invited", created_at: new Date().toISOString() };
    collab.invites = collab.invites || [];
    collab.invites.unshift(invite);
    localStorage.setItem(collabKey, JSON.stringify(collab));
    cloudCollab("invite", { email, role });
    const input = $("collabInviteEmail");
    if (input) input.value = "";
    renderCollab();
  }

  function addCollabNote() {
    const note = $("collabNote")?.value.trim();
    if (!note) return;
    const entry = { id: uid("note"), type: "note", text: note, created_at: new Date().toISOString(), page: currentPage()?.title || "" };
    collab.notes = collab.notes || [];
    collab.notes.unshift(entry);
    localStorage.setItem(collabKey, JSON.stringify(collab));
    cloudCollab("comment", { text: note, page: entry.page });
    const area = $("collabNote");
    if (area) area.value = "";
    renderCollab();
  }

  function localAiRewriteText(mode, text) {
    let output = String(text || "");
    if (mode === "shorter") output = output.split(/\s+/).slice(0, 75).join(" ");
    else if (mode === "seo") output = `${output}\n\nDesigned for local search, clear customer intent and a simple next step.`;
    else if (mode === "premium") output = `${output}\n\nThis section now has a stronger premium rhythm: proof, clarity and action are easier to spot.`;
    else output = output.replace(/welcome to our website/gi, "Here is what we do").replace(/we are passionate about/gi, "we help customers with");
    return output;
  }

  async function rewriteSelected(mode) {
    const item = selectedBlock();
    if (!item) return;
    if (!(await aiRewriteBlock(mode))) {
      pushHistory();
      item.text = localAiRewriteText(mode, item.text);
      saveVersion(`Local rewrite: ${mode}`);
      saveState();
      render();
    }
  }

  async function aiRewriteBlock(mode) {
    const item = selectedBlock();
    if (!item) return false;
    try {
      const response = await fetch("/api/ai/rewrite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, mode, text: item.text || "" })
      });
      const result = await response.json().catch(() => null);
      if (result?.text) {
        pushHistory();
        item.text = result.text;
        saveState();
        await cloudSaveCanvas();
        render();
        return true;
      }
    } catch (_) {}
    return false;
  }

  async function aiBuildFromBrief() {
    const brief = $("canvasAiBrief")?.value || "";
    const style = $("canvasStyleDirection")?.value || "premium";
    const ok = await fetchAiCanvas(brief, style);
    if (!ok) {
      const key = kindFromText(`${brief} ${style}`);
      pushHistory();
      state.title = brief.trim() ? brief.trim().slice(0, 80) : "AI generated PBI site";
      const home = currentPage();
      if (home) {
        home.title = "Home";
        home.slug = "home";
        home.blocks = templateBlocks(key === "cafe" ? "premium-cafe" : key === "shop" ? "retail-launch" : key === "holiday" ? "holiday-stay" : key === "consultant" ? "consultant-authority" : "local-service");
      }
      selectedId = currentBlocks()[0]?.id || null;
      saveVersion("Fallback full-site AI canvas");
      saveState();
      render();
    }
  }

  function kindFromText(value) {
    const lower = String(value || "").toLowerCase();
    if (/shop|retail|product|sell|ecommerce/.test(lower)) return "shop";
    if (/cafe|restaurant|coffee|food|bakery|brunch/.test(lower)) return "cafe";
    if (/plumb|electric|trade|builder|landscap|heating|roof|carpenter/.test(lower)) return "trades";
    if (/salon|beauty|hair|wellness|spa|massage/.test(lower)) return "salon";
    if (/holiday|glamping|let|stay|accommodation|bnb|guest/.test(lower)) return "holiday";
    return "consultant";
  }

  async function fetchAiCanvas(brief, style) {
    try {
      const response = await fetch("/api/ai/generate-site", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, brief, style, mode: "visual_studio_pages" })
      });
      const result = await response.json().catch(() => null);
      if (result?.canvas?.blocks?.length || result?.canvas?.pages?.length) {
        pushHistory();
        const incoming = normaliseState({ ...state, ...result.canvas, pages: result.canvas.pages || state.pages });
        state = incoming;
        if (!result.canvas.pages && result.canvas.blocks?.length) setCurrentBlocks(result.canvas.blocks);
        selectedId = currentBlocks()[0]?.id || null;
        saveVersion(result.mode === "responses" ? "AI generated premium multi-page canvas" : "Fallback premium canvas");
        saveState();
        await cloudSaveCanvas();
        await saveCanvasSectionsToBuilder();
        render();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function exportText() {
    return state.pages.map((p) => `# ${p.title}\n\n${p.blocks.map((item) => [item.title, item.text, item.button ? `CTA: ${item.button}` : ""].filter(Boolean).join("\n")).join("\n\n---\n\n")}`).join("\n\n===PAGE===\n\n");
  }

  function canvasSections() {
    return currentBlocks().map((item, index) => ({
      id: item.id,
      section_order: index,
      section_type: item.type || item.section_type || "section",
      type: item.type || item.section_type || "section",
      title: item.title || "",
      text: item.text || "",
      button: item.button || "",
      image: item.image || "",
      layout: item.layout || "standard",
      background: item.background || "#fff8f1",
      accent: item.accent || "#bf5c29",
      padding: item.padding || "comfortable",
      align: item.align || "left",
      body_json: JSON.stringify({ ...item, cmsItems, theme: state.theme, page: currentPage() })
    }));
  }

  async function saveCanvasSectionsToBuilder() {
    if (!projectId || projectId === "draft" || !currentBlocks().length) return;
    try {
      await fetch("/api/builder/project-sections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, sections: canvasSections() })
      });
    } catch (_) {}
  }

  async function cloudSaveCanvas() {
    if (!projectId || projectId === "draft") return { ok: false, skipped: true };
    syncActivePage();
    try {
      const response = await fetch("/api/canvas", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, canvas: state, cms_items: cmsItems, collaboration: collab })
      });
      return await response.json().catch(() => ({ ok: false }));
    } catch (_) {
      return { ok: false };
    }
  }

  async function cloudLoadCanvas() {
    if (!projectId || projectId === "draft") return;
    try {
      const response = await fetch(`/api/canvas?project_id=${encodeURIComponent(projectId)}`, { credentials: "include" });
      const result = await response.json().catch(() => null);
      const saved = result?.canvas?.canvas;
      if (saved?.pages?.length || saved?.blocks?.length) {
        state = normaliseState(saved);
        selectedId = currentBlocks()[0]?.id || selectedId;
        if (Array.isArray(result.canvas.cms_items) && result.canvas.cms_items.length) cmsItems = result.canvas.cms_items;
        if (result.canvas.collaboration) collab = result.canvas.collaboration;
        saveCms(false);
        localStorage.setItem(collabKey, JSON.stringify(collab));
        render();
      }
    } catch (_) {}
  }

  async function cloudPublishCanvas() {
    if (!projectId || projectId === "draft") return { ok: false, skipped: true };
    await cloudSaveCanvas();
    await cloudSaveCms();
    try {
      const response = await fetch("/api/canvas/publish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId })
      });
      const result = await response.json().catch(() => ({ ok: false }));
      if (!response.ok && !result.error) result.error = "Publish could not be completed.";
      return result;
    } catch (err) {
      return { ok: false, error: err?.message || "Publish could not be completed." };
    }
  }

  async function exportToProject() {
    saveVersion("Saved from Visual Studio");
    saveState();
    saveCms();
    await cloudSaveCanvas();
    await cloudSaveCms();
    await saveCanvasSectionsToBuilder();
    localStorage.setItem(`pbi_canvas_export_${projectId}`, JSON.stringify({ projectId, exportedAt: new Date().toISOString(), canvas: state, cmsItems, collab, pageBody: exportText() }));
    try {
      await fetch("/api/versions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, label: "Visual Studio save", snapshot: { canvas: state, cmsItems, collab } })
      });
    } catch (_) {}
    window.location.href = `/builder/?project=${encodeURIComponent(projectId)}&canvas_saved=1`;
  }

  async function publishLive() {
    saveVersion("Before live publish");
    saveState();
    saveCms();
    const result = await cloudPublishCanvas();

    if (result?.payment_required && result.payment_url) {
      localStorage.setItem(`pbi_canvas_publish_pending_${projectId}`, JSON.stringify({ projectId, requestedAt: new Date().toISOString() }));
      window.location.href = result.payment_url;
      return;
    }

    if (result?.published) {
      const liveUrl = result.live_url || `/site/canvas/${encodeURIComponent(result.public_slug || projectId)}/`;
      localStorage.setItem(`pbi_canvas_site_url_${projectId}`, liveUrl);
      window.location.href = liveUrl;
      return;
    }

    alert(result?.error || result?.message || "Publish could not be completed. Check payment, ownership and project setup.");
  }

  async function loadProjectTemplateSectionsForCanvas() {
    if (!projectId || projectId === "draft") return;
    try {
      const response = await fetch(`/api/builder/project-sections?project_id=${encodeURIComponent(projectId)}`, { credentials: "include" });
      const data = await response.json();
      if (data?.sections?.length && !currentBlocks().some((b) => b.__loadedFromCloud)) {
        setCurrentBlocks(data.sections.map((s) => normaliseBlock({
          id: s.id,
          type: s.section_type || s.type || "section",
          title: s.title || "",
          text: s.text || "",
          button: s.button || "",
          image: s.image || "",
          layout: s.layout || "standard",
          background: s.background || "#fff8f1",
          accent: s.accent || "#bf5c29",
          padding: s.padding || "comfortable",
          align: s.align || "left",
          __loadedFromCloud: true
        })));
        selectedId = currentBlocks()[0]?.id || null;
        saveState(false);
        render();
      }
    } catch (_) {}
  }

  function bindTabs() {
    $$('[data-studio-tab]').forEach((button) => {
      button.addEventListener("click", () => {
        $$('[data-studio-tab]').forEach((item) => item.classList.toggle("active", item === button));
        $$('[data-studio-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.studioPanel === button.dataset.studioTab));
      });
    });
  }

  function bind() {
    render();
    bindTabs();

    $$('[data-block-type]').forEach((button) => {
      button.addEventListener("dragstart", (event) => event.dataTransfer.setData("block/type", button.dataset.blockType));
      button.addEventListener("click", () => insertBlockBefore(button.dataset.blockType));
    });

    $$('[data-template-pack]').forEach((button) => {
      button.addEventListener("click", () => {
        pushHistory();
        const title = button.querySelector("strong")?.textContent || "PBI premium visual site";
        state.title = title;
        state.selectedTemplate = button.dataset.templatePack || "";
        localStorage.setItem("pbi_selected_template", state.selectedTemplate);
        setCurrentBlocks(templateBlocks(button.dataset.templatePack));
        selectedId = currentBlocks()[0]?.id || null;
        saveVersion(`Loaded ${title}`);
        saveState();
        render();
      });
    });

    const dropzone = $("canvasDropzone");
    if (dropzone) {
      dropzone.addEventListener("dragover", (event) => event.preventDefault());
      dropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData("block/type");
        if (type) insertBlockBefore(type);
      });
    }

    $("canvasApplyInspectorBtn")?.addEventListener("click", applyInspector);
    const inspectorIds = ["inspectorTitle", "inspectorText", "inspectorButton", "inspectorImage", "inspectorLayout", "inspectorAnimation", "inspectorBg", "inspectorAccent", "inspectorPadding", "inspectorAlign", "inspectorRadius", "inspectorVisibility", "inspectorPositionMode", "inspectorX", "inspectorY", "inspectorWidth", "inspectorRotate", "inspectorZ", "inspectorDuration", "inspectorDelay", "inspectorEasing"];
    inspectorIds.forEach((id) => {
      const input = $(id);
      if (!input) return;
      input.addEventListener("input", () => {
        const item = selectedBlock();
        if (!item) return;
        updateItemFromInspector(item);
        scheduleSave();
        scheduleRender();
      });
    });

    ["themeBg", "themeAccent", "themeFont", "themeDensity"].forEach((id) => {
      $(id)?.addEventListener("input", () => {
        state.theme = { ...state.theme, background: $("themeBg")?.value || state.theme.background, accent: $("themeAccent")?.value || state.theme.accent, font: $("themeFont")?.value || state.theme.font, density: $("themeDensity")?.value || state.theme.density };
        scheduleSave();
        scheduleRender();
      });
    });

    $("canvasDuplicateBtn")?.addEventListener("click", () => selectedId && handleAction("duplicate", selectedId));
    $("canvasDeleteBtn")?.addEventListener("click", () => selectedId && handleAction("delete", selectedId));
    $("canvasUndoBtn")?.addEventListener("click", undo);
    $("canvasRedoBtn")?.addEventListener("click", redo);
    $("canvasSaveVersionBtn")?.addEventListener("click", () => saveVersion("Manual visual studio version"));
    $("canvasPreviewBtn")?.addEventListener("click", () => { previewMode = !previewMode; render(); });
    $("canvasExportBtn")?.addEventListener("click", exportToProject);
    $("canvasPublishBtn")?.addEventListener("click", publishLive);
    $("canvasAiBuildBtn")?.addEventListener("click", aiBuildFromBrief);
    $("canvasThemeBtn")?.addEventListener("click", applyThemeToBlocks);
    $("canvasFreeformGuideBtn")?.addEventListener("click", () => alert("Freeform mode: select any block, set Mode to Freeform in the Inspector, then drag the block on the desktop canvas. Use X/Y/Width/Rotate/Z for precise control. Use Flow mode for normal responsive sections."));
    $("canvasAddPageBtn")?.addEventListener("click", addPage);
    $("canvasDuplicatePageBtn")?.addEventListener("click", duplicatePage);
    $("canvasDeletePageBtn")?.addEventListener("click", deletePage);
    $("cmsAddItemBtn")?.addEventListener("click", addOrUpdateCmsItem);
    $("cmsCloudSaveBtn")?.addEventListener("click", cloudSaveCms);
    $("cmsCloudLoadBtn")?.addEventListener("click", cloudLoadCms);
    $("collabInviteBtn")?.addEventListener("click", inviteCollaborator);
    $("collabCommentBtn")?.addEventListener("click", addCollabNote);

    $$('[data-device]').forEach((button) => {
      button.addEventListener("click", () => {
        $$('[data-device]').forEach((btn) => btn.classList.toggle("active", btn === button));
        const canvasDevice = $("canvasDevice");
        if (canvasDevice) canvasDevice.className = `pbi-canvas-device ${button.dataset.device}`;
      });
    });

    $$('[data-canvas-ai]').forEach((button) => button.addEventListener("click", () => rewriteSelected(button.dataset.canvasAi)));

    const back = $("canvasBackToBuilder");
    if (back) back.href = `/builder/?project=${encodeURIComponent(projectId)}`;

    setInterval(saveState, 30000);
    setInterval(broadcastPresence, 20000);
    setInterval(cloudLoadCollab, 45000);
    updateAutosaveStatus();
    cloudLoadCanvas().then(() => loadProjectTemplateSectionsForCanvas());
    cloudLoadCms();
    cloudLoadCollab();
    broadcastPresence();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
