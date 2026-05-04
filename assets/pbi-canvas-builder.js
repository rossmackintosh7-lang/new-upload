(() => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project") || "draft";
  const preset = params.get("preset") || "";
  const canvasKey = `pbi_canvas_${projectId}`;
  const versionsKey = `pbi_canvas_versions_${projectId}`;
  const cmsKey = `pbi_cms_${projectId}`;

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

  const blockDefaults = {
    navBar: {
      type: "navBar",
      title: "PBI Preview",
      text: "Home|Services|About|Contact",
      button: "Get started",
      image: "/assets/pbi-header-logo-no-bg-20260502c.png?v=20260502c",
      layout: "standard",
      background: "#fffdf8",
      accent: "#bf5c29",
      padding: "compact",
      align: "left",
      animation: "none",
      radius: "pill",
      visibility: "all"
    },
    hero: {
      type: "hero",
      title: "A website that feels designed, not assembled.",
      text: "Create a premium first impression with a clear offer, helpful proof and an obvious next step.",
      button: "Start building",
      image: "",
      layout: "centered",
      background: "#fff8f1",
      accent: "#bf5c29",
      padding: "spacious",
      align: "center",
      animation: "rise",
      radius: "soft",
      visibility: "all"
    },
    splitHero: {
      type: "splitHero",
      title: "A strong first impression with real business focus.",
      text: "Use this section for your offer, service area, proof and the most important customer action.",
      button: "Request a quote",
      image: "/assets/demo-media/trades-hero.jpg",
      layout: "split",
      background: "#f4efe7",
      accent: "#256b5b",
      padding: "spacious",
      align: "left",
      animation: "rise",
      radius: "soft",
      visibility: "all"
    },
    trustBand: {
      type: "trustBand",
      title: "Customer confidence at a glance.",
      text: "Clear offer::Visitors understand what you do quickly|Proof built in::Trust appears before hesitation|Easy next step::The call-to-action is always obvious",
      button: "",
      image: "",
      layout: "cards",
      background: "#ffffff",
      accent: "#bf5c29",
      padding: "compact",
      align: "center",
      animation: "fade",
      radius: "soft",
      visibility: "all"
    },
    logoCloud: {
      type: "logoCloud",
      title: "Trusted by local teams and independents.",
      text: "Cafés|Trades|Salons|Retail|Holiday lets",
      button: "",
      image: "",
      layout: "centered",
      background: "#fffdf8",
      accent: "#bf5c29",
      padding: "compact",
      align: "center",
      animation: "fade",
      radius: "soft",
      visibility: "all"
    },
    services: {
      type: "services",
      title: "Services that are easy to understand.",
      text: "Core service::Explain the value in plain English|Practical support::Show how customers are helped|Ongoing care::Make follow-up and support obvious",
      button: "View services",
      image: "",
      layout: "cards",
      background: "#fffaf4",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "left",
      animation: "rise",
      radius: "soft",
      visibility: "all"
    },
    process: {
      type: "process",
      title: "A simple route from interest to action.",
      text: "Understand::Customers see the offer quickly|Trust::Proof and details remove doubt|Act::The next step is obvious",
      button: "",
      image: "",
      layout: "cards",
      background: "#fff8f1",
      accent: "#256b5b",
      padding: "comfortable",
      align: "left",
      animation: "slide",
      radius: "soft",
      visibility: "all"
    },
    stats: {
      type: "stats",
      title: "Useful numbers and proof points.",
      text: "Clear::Offer|Fast::Next step|Mobile::Ready|SEO::Structured",
      button: "",
      image: "",
      layout: "cards",
      background: "#ffffff",
      accent: "#bf5c29",
      padding: "compact",
      align: "center",
      animation: "fade",
      radius: "soft",
      visibility: "all"
    },
    featureGrid: {
      type: "featureGrid",
      title: "Why this page feels premium.",
      text: "Richer sections::Proof, process and answers included|Better rhythm::Image, cards and CTA sections alternate|Mobile-first flow::Every section is easy to scan|Publish-ready::The customer journey ends cleanly",
      button: "",
      image: "",
      layout: "bento",
      background: "#ffffff",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "left",
      animation: "rise",
      radius: "soft",
      visibility: "all"
    },
    gallery: {
      type: "gallery",
      title: "A visual feel for the business.",
      text: "/assets/demo-media/cafe-1.jpg|/assets/demo-media/cafe-2.jpg|/assets/demo-media/cafe-3.jpg",
      button: "",
      image: "",
      layout: "masonry",
      background: "#fff8f1",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "center",
      animation: "scale",
      radius: "soft",
      visibility: "all"
    },
    testimonial: {
      type: "testimonial",
      title: "Proof that feels human.",
      text: "“Clear, useful and easy to navigate. The website explains the offer properly and makes the next step simple.”",
      button: "",
      image: "",
      layout: "centered",
      background: "#2b1a12",
      accent: "#f2b66d",
      padding: "spacious",
      align: "center",
      animation: "fade",
      radius: "soft",
      visibility: "all"
    },
    pricing: {
      type: "pricing",
      title: "Pick the publishing package that fits.",
      text: "Starter::£12.99/month::Simple launch tools|Business::£24.99/month::More sections, images and SEO support|Plus::£39.99/month::Retail, AI support and premium controls",
      button: "Compare packages",
      image: "",
      layout: "cards",
      background: "#fffdf8",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "left",
      animation: "rise",
      radius: "soft",
      visibility: "all"
    },
    productGrid: {
      type: "productGrid",
      title: "Products that are easy to scan.",
      text: "Local favourite::£12::Short product highlight|Gift bundle::£24::Ideal for repeat orders|Seasonal pick::£18::Limited or current offer",
      button: "Shop now",
      image: "/assets/demo-media/shop-hero.jpg",
      layout: "cards",
      background: "#fff8cf",
      accent: "#111111",
      padding: "comfortable",
      align: "left",
      animation: "rise",
      radius: "soft",
      visibility: "all"
    },
    cmsList: {
      type: "cmsList",
      title: "Latest updates and useful content.",
      text: "Case study::How the business helped a customer|Guide::What to know before getting started|Update::A useful piece of local news",
      button: "Read more",
      image: "",
      layout: "cards",
      background: "#f6efe7",
      accent: "#24556c",
      padding: "comfortable",
      align: "left",
      animation: "rise",
      radius: "soft",
      visibility: "all"
    },
    faq: {
      type: "faq",
      title: "Helpful answers before customers ask.",
      text: "Can this be edited later?|Yes, sections can be changed, reordered, hidden or expanded.\nIs it mobile-friendly?|Yes, the layout is designed for phone and desktop viewing.\nWhen does payment happen?|Customers build free and pay only when ready to publish.",
      button: "Ask a question",
      image: "",
      layout: "standard",
      background: "#fff8f1",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "left",
      animation: "fade",
      radius: "soft",
      visibility: "all"
    },
    map: {
      type: "map",
      title: "Local area and service coverage.",
      text: "Serving Purbeck, Dorset and nearby areas. Use this section to explain where the business works, delivers or welcomes customers.",
      button: "Check coverage",
      image: "",
      layout: "split",
      background: "#edf6f5",
      accent: "#238081",
      padding: "comfortable",
      align: "left",
      animation: "fade",
      radius: "soft",
      visibility: "all"
    },
    booking: {
      type: "booking",
      title: "Make bookings feel simple.",
      text: "Ask customers to choose a time, request availability or send the details needed before a call.",
      button: "Book a call",
      image: "",
      layout: "spotlight",
      background: "#fff4eb",
      accent: "#b85f32",
      padding: "comfortable",
      align: "center",
      animation: "scale",
      radius: "soft",
      visibility: "all"
    },
    contact: {
      type: "contact",
      title: "Ready to talk?",
      text: "Tell customers how to contact you, when you are open and what information to include.",
      button: "Send enquiry",
      image: "",
      layout: "split",
      background: "#f4efe7",
      accent: "#256b5b",
      padding: "comfortable",
      align: "left",
      animation: "fade",
      radius: "soft",
      visibility: "all"
    },
    retail: {
      type: "retail",
      title: "Featured products.",
      text: "Product one - £12|Product two - £18|Product three - £24",
      button: "Shop now",
      image: "/assets/demo-media/shop-hero.jpg",
      layout: "cards",
      background: "#fff8cf",
      accent: "#111111",
      padding: "comfortable",
      align: "left",
      animation: "rise",
      radius: "soft",
      visibility: "all"
    },
    cta: {
      type: "cta",
      title: "Ready to take the next step?",
      text: "Make it easy for customers to contact, book, buy or ask a question.",
      button: "Get in touch",
      image: "",
      layout: "centered",
      background: "#bf5c29",
      accent: "#ffffff",
      padding: "spacious",
      align: "center",
      animation: "scale",
      radius: "soft",
      visibility: "all"
    },
    spacer: {
      type: "spacer",
      title: "",
      text: "",
      button: "",
      image: "",
      layout: "standard",
      background: "#fff8f1",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "center",
      animation: "none",
      radius: "soft",
      visibility: "all"
    }
  };

  const labels = {
    navBar: "Navigation",
    hero: "Hero",
    splitHero: "Split Hero",
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

  let history = [];
  let future = [];
  let autosaveTimer = null;
  let renderTimer = null;
  let dragSourceId = null;
  let previewMode = false;
  let state = loadState();
  let selectedId = state.blocks[0]?.id || null;
  let cmsItems = loadCms();

  function uid() {
    return `block_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

  function block(type, overrides = {}) {
    return { id: uid(), ...clone(blockDefaults[type] || blockDefaults.hero), ...overrides };
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

  function templateBlocks(name = "local-service") {
    const key = name === "premium-cafe" ? "cafe" : name === "retail-launch" ? "shop" : name === "holiday-stay" ? "holiday" : name === "consultant-authority" ? "consultant" : "trades";
    const p = palettes[key] || palettes.consultant;
    const business = {
      cafe: "A warm, image-led café website with bookings and local charm.",
      shop: "A clean retail website with products, proof and a checkout path.",
      holiday: "A visual stay website with amenities, area info and enquiry flow.",
      consultant: "A polished service website that builds authority and enquiries.",
      trades: "A trustworthy local service website that drives quote requests."
    }[key];

    const base = [
      block("navBar", { title: "PBI Preview", background: "#fffdf8", accent: p.accent }),
      block("splitHero", { title: business, text: "A premium starting point with clear structure, visual rhythm and a simple next step.", image: p.image, background: p.bg, accent: p.accent }),
      block("trustBand", { background: "#ffffff", accent: p.accent }),
      block("logoCloud", { background: p.soft, accent: p.accent }),
      block("services", { background: p.soft, accent: p.accent }),
      block("process", { background: p.bg, accent: p.accent }),
      block("featureGrid", { background: "#ffffff", accent: p.accent }),
      block("gallery", { text: p.gallery.join("|"), background: p.soft, accent: p.accent }),
      block("testimonial", { background: p.deep }),
      block("faq", { background: p.bg, accent: p.accent }),
      block("cta", { background: p.accent, accent: "#ffffff" })
    ];

    if (key === "shop") base.splice(7, 0, block("productGrid", { background: p.bg, accent: p.accent, image: p.image }));
    if (key === "cafe") base.splice(9, 0, block("booking", { background: p.bg, accent: p.accent }));
    if (key === "holiday") base.splice(8, 0, block("map", { background: p.bg, accent: p.accent }));
    if (key === "consultant") base.splice(8, 0, block("cmsList", { background: p.soft, accent: p.accent }));

    return base;
  }

  function initialBlocksForPreset() {
    const key = preset === "shop" ? "retail-launch" : preset === "cafe" ? "premium-cafe" : preset === "holiday-let" ? "holiday-stay" : preset === "consultant" ? "consultant-authority" : "local-service";
    return templateBlocks(key);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(canvasKey) || "null");
      if (saved?.blocks?.length) {
        saved.theme = { ...defaultTheme, ...(saved.theme || {}) };
        saved.blocks = saved.blocks.map(normaliseBlock);
        return saved;
      }
    } catch (_) {}

    return {
      projectId,
      title: "Untitled PBI visual site",
      theme: { ...defaultTheme },
      blocks: initialBlocksForPreset(),
      updatedAt: new Date().toISOString()
    };
  }

  function normaliseBlock(item) {
    const base = blockDefaults[item?.type] || blockDefaults.services;
    return {
      ...clone(base),
      ...item,
      id: item?.id || uid(),
      type: item?.type || item?.section_type || base.type,
      animation: item?.animation || base.animation || "none",
      radius: item?.radius || base.radius || "soft",
      visibility: item?.visibility || base.visibility || "all"
    };
  }

  function loadCms() {
    try {
      const saved = JSON.parse(localStorage.getItem(cmsKey) || "[]");
      if (Array.isArray(saved)) return saved;
    } catch (_) {}
    return [
      { id: uid(), type: "case-study", title: "Example case study", text: "A short proof-led story that can feed the CMS list section." },
      { id: uid(), type: "service", title: "Featured service", text: "A reusable service entry for future collection pages." }
    ];
  }

  function saveCms() {
    localStorage.setItem(cmsKey, JSON.stringify(cmsItems));
  }

  function selectedBlock() {
    return state.blocks.find((item) => item.id === selectedId) || null;
  }

  function pushHistory() {
    history.push(clone(state));
    if (history.length > 80) history.shift();
    future = [];
  }

  function scheduleSave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveState, 450);
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 90);
  }

  function updateAutosaveStatus(text = "Autosave ready") {
    const el = $("canvasAutosaveStatus");
    if (el) el.textContent = `${text} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(canvasKey, JSON.stringify(state));
    updateAutosaveStatus("Autosaved");
    clearTimeout(window.__pbiCanvasCloudTimer);
    window.__pbiCanvasCloudTimer = setTimeout(() => cloudSaveCanvas(), 900);
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
        return {
          title: (parts[0] || `Item ${index + 1}`).trim(),
          text: (parts.slice(1).join("::") || "Use this card to explain a benefit, product or proof point.").trim(),
          index: index + 1
        };
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
      <button type="button" data-action="up" data-id="${item.id}">↑</button>
      <button type="button" data-action="down" data-id="${item.id}">↓</button>
      <button type="button" data-action="duplicate" data-id="${item.id}">Duplicate</button>
      <button type="button" data-action="delete" data-id="${item.id}">Delete</button>
    </div>`;
  }

  function blockShell(item, extraClass, inner) {
    const selected = item.id === selectedId ? "selected" : "";
    const hiddenClass = `show-${item.visibility || "all"}`;
    const style = `--block-bg:${item.background || "#fff8f1"};--block-accent:${item.accent || "#bf5c29"};--block-align:${item.align || "left"};`;
    return `<section draggable="true" class="canvas-block ${extraClass} ${selected} ${paddingClass(item.padding)} layout-${item.layout || "standard"} radius-${item.radius || "soft"} motion-${item.animation || "none"} ${hiddenClass}" data-block-id="${item.id}" style="${style}">
      ${controls(item)}
      ${inner}
    </section>`;
  }

  function editable(tag, item, field, value, extra = "") {
    return `<${tag} ${extra} contenteditable="true" data-inline-field="${field}" data-block-id="${item.id}">${escapeHtml(value)}</${tag}>`;
  }

  function renderBlock(item) {
    const title = escapeHtml(item.title);
    const text = escapeHtml(item.text);
    const button = escapeHtml(item.button);
    const img = item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : `<div class="canvas-image-placeholder">Image</div>`;

    if (item.type === "spacer") return blockShell(item, "canvas-spacer", `<span>Spacer</span>`);

    if (item.type === "navBar") {
      const links = String(item.text || "Home|Services|About|Contact").split("|").filter(Boolean).slice(0, 6);
      return blockShell(item, "canvas-navbar", `<div class="canvas-nav-logo">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : ""}${editable("strong", item, "title", item.title || "Brand")}</div><nav>${links.map((link) => `<a>${escapeHtml(link)}</a>`).join("")}</nav>${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}`);
    }

    if (item.type === "logoCloud") {
      const logos = String(item.text || "").split("|").filter(Boolean).slice(0, 8);
      return blockShell(item, "canvas-logo-cloud", `<p class="canvas-kicker">Proof</p>${editable("h2", item, "title", item.title || "Trusted by")}${logos.length ? `<div>${logos.map((logo) => `<span>${escapeHtml(logo)}</span>`).join("")}</div>` : ""}`);
    }

    if (["services", "featureGrid", "process", "trustBand", "stats", "pricing", "productGrid", "cmsList", "retail"].includes(item.type)) {
      const cards = item.type === "cmsList" && cmsItems.length ? cmsItems.slice(0, 6).map((entry) => ({ title: entry.title, text: entry.text, index: entry.type })) : parseCards(item).slice(0, 9);
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

    return blockShell(item, "canvas-standard", `<p class="canvas-kicker">${escapeHtml(labels[item.type] || "Section")}</p>${editable("h1", item, "title", item.title || "Heading")}${editable("p", item, "text", text)}${button ? `<a class="canvas-button" contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}`);
  }

  function render() {
    const dropzone = $("canvasDropzone");
    const empty = $("canvasEmpty");
    if (!dropzone) return;

    document.body.classList.toggle("pbi-preview-mode", previewMode);
    document.documentElement.style.setProperty("--studio-page-bg", state.theme?.background || defaultTheme.background);
    document.documentElement.style.setProperty("--studio-accent", state.theme?.accent || defaultTheme.accent);
    document.documentElement.style.setProperty("--studio-text", state.theme?.text || defaultTheme.text);

    const titleEl = $("canvasProjectTitle");
    if (titleEl) titleEl.textContent = state.title || "Untitled PBI visual site";

    dropzone.querySelectorAll(".canvas-block").forEach((node) => node.remove());
    state.blocks.forEach((item) => dropzone.insertAdjacentHTML("beforeend", renderBlock(normaliseBlock(item))));
    if (empty) empty.style.display = state.blocks.length ? "none" : "";

    bindCanvasEvents();
    renderInspector();
    renderLayers();
    renderVersions();
    renderCms();
  }

  function renderLayers() {
    const list = $("canvasLayersList");
    if (!list) return;
    list.innerHTML = state.blocks.map((item, index) => `<button type="button" class="${item.id === selectedId ? "active" : ""}" data-layer-id="${item.id}"><span>${index + 1}</span><strong>${escapeHtml(labels[item.type] || item.type)}</strong><small>${escapeHtml(item.title || "Untitled")}</small></button>`).join("");
    $$('[data-layer-id]', list).forEach((button) => button.addEventListener("click", () => { selectedId = button.dataset.layerId; render(); }));
  }

  function renderCms() {
    const list = $("cmsItemsList");
    if (!list) return;
    list.innerHTML = cmsItems.length ? cmsItems.map((entry) => `<article><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.type)}</small><p>${escapeHtml(entry.text)}</p><button type="button" data-cms-remove="${entry.id}">Remove</button></article>`).join("") : '<p class="small-note muted">No CMS entries yet.</p>';
    $$('[data-cms-remove]', list).forEach((button) => button.addEventListener("click", () => {
      cmsItems = cmsItems.filter((entry) => entry.id !== button.dataset.cmsRemove);
      saveCms();
      render();
    }));
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

    setValue("themeBg", state.theme?.background || defaultTheme.background);
    setValue("themeAccent", state.theme?.accent || defaultTheme.accent);
    setValue("themeFont", state.theme?.font || defaultTheme.font);
    setValue("themeDensity", state.theme?.density || defaultTheme.density);
  }

  function setValue(id, value) {
    const el = $(id);
    if (el) el.value = value;
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
  }

  function bindCanvasEvents() {
    $$(".canvas-block").forEach((el) => {
      el.addEventListener("click", (event) => {
        if (event.target.closest(".canvas-block-controls")) return;
        selectedId = el.dataset.blockId;
        render();
      });

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
    });

    $$('[data-inline-field]').forEach((field) => {
      field.addEventListener("input", () => {
        const item = state.blocks.find((candidate) => candidate.id === field.dataset.blockId);
        if (!item) return;
        item[field.dataset.inlineField] = field.textContent.trim();
        renderInspector();
        scheduleSave();
      });
    });

    $$('[data-card-field]').forEach((field) => {
      field.addEventListener("input", () => {
        const item = state.blocks.find((candidate) => candidate.id === field.dataset.blockId);
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

  function handleAction(action, id) {
    const index = state.blocks.findIndex((item) => item.id === id);
    if (index < 0) return;
    selectedId = id;
    if (action === "select") return render();
    pushHistory();

    if (action === "up" && index > 0) [state.blocks[index - 1], state.blocks[index]] = [state.blocks[index], state.blocks[index - 1]];
    if (action === "down" && index < state.blocks.length - 1) [state.blocks[index + 1], state.blocks[index]] = [state.blocks[index], state.blocks[index + 1]];
    if (action === "duplicate") {
      const copy = clone(state.blocks[index]);
      copy.id = uid();
      copy.title = `${copy.title || labels[copy.type] || "Block"} copy`;
      state.blocks.splice(index + 1, 0, copy);
      selectedId = copy.id;
    }
    if (action === "delete") {
      state.blocks.splice(index, 1);
      selectedId = state.blocks[Math.min(index, state.blocks.length - 1)]?.id || null;
    }

    scheduleSave();
    render();
  }

  function insertBlockBefore(type, targetId = null) {
    pushHistory();
    const newBlock = block(type);
    const index = state.blocks.findIndex((item) => item.id === targetId);
    if (index >= 0) state.blocks.splice(index, 0, newBlock);
    else state.blocks.push(newBlock);
    selectedId = newBlock.id;
    scheduleSave();
    render();
  }

  function reorderBlocks(sourceId, targetId) {
    pushHistory();
    const from = state.blocks.findIndex((item) => item.id === sourceId);
    const to = state.blocks.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = state.blocks.splice(from, 1);
    state.blocks.splice(to, 0, moved);
    selectedId = moved.id;
    scheduleSave();
    render();
  }

  function undo() {
    if (!history.length) return;
    future.push(clone(state));
    state = history.pop();
    selectedId = state.blocks[0]?.id || null;
    saveState();
    render();
  }

  function redo() {
    if (!future.length) return;
    history.push(clone(state));
    state = future.pop();
    selectedId = state.blocks[0]?.id || null;
    saveState();
    render();
  }

  function saveVersion(label = "Manual canvas version") {
    const versions = JSON.parse(localStorage.getItem(versionsKey) || "[]");
    versions.unshift({ id: uid(), label, createdAt: new Date().toISOString(), state: clone(state), cmsItems: clone(cmsItems) });
    localStorage.setItem(versionsKey, JSON.stringify(versions.slice(0, 16)));
    renderVersions();
    updateAutosaveStatus("Version saved");
  }

  function renderVersions() {
    const list = $("canvasVersionsList");
    if (!list) return;
    const versions = JSON.parse(localStorage.getItem(versionsKey) || "[]");
    if (!versions.length) {
      list.innerHTML = '<p class="muted small-note">No versions saved yet.</p>';
      return;
    }
    list.innerHTML = versions.map((version, index) => `<button type="button" data-restore-version="${index}"><strong>${escapeHtml(version.label || "Version")}</strong><span>${new Date(version.createdAt).toLocaleString()}</span></button>`).join("");
    $$('[data-restore-version]', list).forEach((button) => {
      button.addEventListener("click", () => {
        const version = versions[Number(button.dataset.restoreVersion)];
        if (!version?.state) return;
        pushHistory();
        state = version.state;
        cmsItems = Array.isArray(version.cmsItems) ? version.cmsItems : cmsItems;
        selectedId = state.blocks[0]?.id || null;
        saveState();
        saveCms();
        render();
      });
    });
  }

  function applyThemeToBlocks() {
    pushHistory();
    state.theme = {
      background: $("themeBg")?.value || defaultTheme.background,
      accent: $("themeAccent")?.value || defaultTheme.accent,
      text: defaultTheme.text,
      font: $("themeFont")?.value || defaultTheme.font,
      density: $("themeDensity")?.value || defaultTheme.density
    };
    state.blocks = state.blocks.map((item, index) => ({
      ...item,
      background: index % 2 ? lighten(state.theme.background) : state.theme.background,
      accent: state.theme.accent
    }));
    saveVersion("Applied brand theme");
    saveState();
    render();
  }

  function lighten(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return "#fffdf8";
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + 10);
    const g = Math.min(255, ((n >> 8) & 255) + 10);
    const b = Math.min(255, (n & 255) + 10);
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  }

  async function rewriteSelected(mode) {
    const usedRemote = await aiRewriteBlock(mode);
    if (usedRemote) return;
    const item = selectedBlock();
    if (!item) return;
    pushHistory();
    if (mode === "shorter") item.text = String(item.text || "").split(/\s+/).slice(0, 38).join(" ");
    if (mode === "seo") item.text = `${item.text}\n\nClear local wording, useful services and an easy enquiry route help customers and search engines understand the business.`;
    if (mode === "premium") item.text = String(item.text || "").replace(/good/gi, "useful").trim() + "\n\nThis section now includes stronger proof, clearer rhythm and a more deliberate next step.";
    if (mode === "clearer") item.text = String(item.text || "").replace(/welcome to our website/gi, "Here is what we do").trim() || "Clear, helpful wording goes here.";
    scheduleSave();
    render();
  }

  async function aiBuildFromBrief() {
    const usedRemote = await aiGenerateCanvasFromBrief();
    if (usedRemote) return;
    const brief = $("canvasAiBrief")?.value.trim();
    if (!brief) return;
    pushHistory();
    const kind = kindFromText(brief);
    const p = palettes[kind] || palettes.consultant;
    state.title = "AI generated premium PBI site";
    state.theme = { ...state.theme, background: p.bg, accent: p.accent };
    state.blocks = [
      block("navBar", { accent: p.accent }),
      block("splitHero", { title: "A clear website built around your business.", text: brief, image: p.image, background: p.bg, accent: p.accent }),
      block("trustBand", { background: "#ffffff", accent: p.accent }),
      block("logoCloud", { background: p.soft, accent: p.accent }),
      block("services", { background: p.soft, accent: p.accent }),
      block("process", { background: p.bg, accent: p.accent }),
      block("featureGrid", { background: "#ffffff", accent: p.accent }),
      block(kind === "shop" ? "productGrid" : "gallery", { text: kind === "shop" ? blockDefaults.productGrid.text : p.gallery.join("|"), image: p.image, background: p.soft, accent: p.accent }),
      block("testimonial", { background: p.deep }),
      block("faq", { background: p.bg, accent: p.accent }),
      block(kind === "cafe" || kind === "consultant" ? "booking" : kind === "holiday" ? "map" : "contact", { background: p.soft, accent: p.accent }),
      block("cta", { background: p.accent, accent: "#ffffff" })
    ];
    selectedId = state.blocks[0]?.id || null;
    saveVersion("AI generated premium site");
    saveState();
    render();
  }

  async function aiGenerateCanvasFromBrief() {
    const brief = $("canvasAiBrief")?.value.trim();
    if (!brief) return false;
    try {
      const response = await fetch("/api/ai/generate-site", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          brief,
          generation_type: "canvas",
          business_name: state.title || "",
          business_type: preset || "",
          goals: "premium website, enquiries, SEO, mobile conversion",
          style_direction: $("canvasStyleDirection")?.value || "premium, warm, flowing, not blocky"
        })
      });
      const result = await response.json().catch(() => null);
      if (result?.canvas?.blocks?.length) {
        pushHistory();
        state = {
          ...state,
          title: result.canvas.title || state.title || "AI generated PBI canvas",
          theme: { ...state.theme, ...(result.canvas.theme || {}) },
          blocks: result.canvas.blocks.map(normaliseBlock)
        };
        selectedId = state.blocks[0]?.id || null;
        saveVersion(result.mode === "responses" ? "AI generated premium canvas" : "Fallback premium canvas");
        saveState();
        await cloudSaveCanvas();
        await saveCanvasSectionsToBuilder();
        render();
        return true;
      }
    } catch (_) {}
    return false;
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

  function exportText() {
    return state.blocks.map((item) => [item.title, item.text, item.button ? `CTA: ${item.button}` : ""].filter(Boolean).join("\n")).join("\n\n---\n\n");
  }

  function canvasSections() {
    return state.blocks.map((item, index) => ({
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
      body_json: JSON.stringify({ ...item, cmsItems, theme: state.theme })
    }));
  }

  async function saveCanvasSectionsToBuilder() {
    if (!projectId || projectId === "draft" || !state?.blocks?.length) return;
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
    try {
      const response = await fetch("/api/canvas", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, canvas: state, cms_items: cmsItems })
      });
      return await response.json().catch(() => ({ ok: false }));
    } catch (_) {
      return { ok: false };
    }
  }

  async function cloudPublishCanvas() {
    if (!projectId || projectId === "draft") return { ok: false, skipped: true };
    await cloudSaveCanvas();
    try {
      const response = await fetch("/api/canvas/publish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId })
      });
      return await response.json().catch(() => ({ ok: false }));
    } catch (_) {
      return { ok: false };
    }
  }

  async function exportToProject() {
    saveVersion("Before export to project");
    saveState();
    saveCms();
    await saveCanvasSectionsToBuilder();
    const publishResult = await cloudPublishCanvas();
    if (publishResult?.ok) localStorage.setItem(`pbi_canvas_site_url_${projectId}`, `/site/canvas/${projectId}`);
    localStorage.setItem(`pbi_canvas_export_${projectId}`, JSON.stringify({ projectId, exportedAt: new Date().toISOString(), canvas: state, cmsItems, pageBody: exportText() }));
    try {
      await fetch("/api/versions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, label: "Visual Studio export", snapshot: { canvas: state, cmsItems } })
      });
    } catch (_) {}
    window.location.href = `/builder/?project=${encodeURIComponent(projectId)}&canvas_export=1`;
  }

  async function loadProjectTemplateSectionsForCanvas() {
    if (!projectId || projectId === "draft") return;
    try {
      const response = await fetch(`/api/builder/project-sections?project_id=${encodeURIComponent(projectId)}`, { credentials: "include" });
      const data = await response.json();
      if (data?.sections?.length) {
        state.blocks = data.sections.map((s) => normaliseBlock({
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
          align: s.align || "left"
        }));
        selectedId = state.blocks[0]?.id || null;
        saveState();
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
        state.title = button.querySelector("strong")?.textContent || "PBI premium visual site";
        state.blocks = templateBlocks(button.dataset.templatePack);
        selectedId = state.blocks[0]?.id || null;
        saveVersion(`Loaded ${state.title}`);
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
    ["inspectorTitle", "inspectorText", "inspectorButton", "inspectorImage", "inspectorLayout", "inspectorAnimation", "inspectorBg", "inspectorAccent", "inspectorPadding", "inspectorAlign", "inspectorRadius", "inspectorVisibility"].forEach((id) => {
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
        state.theme = {
          ...state.theme,
          background: $("themeBg")?.value || state.theme.background,
          accent: $("themeAccent")?.value || state.theme.accent,
          font: $("themeFont")?.value || state.theme.font,
          density: $("themeDensity")?.value || state.theme.density
        };
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
    $("canvasAiBuildBtn")?.addEventListener("click", aiBuildFromBrief);
    $("canvasThemeBtn")?.addEventListener("click", applyThemeToBlocks);

    $("cmsAddItemBtn")?.addEventListener("click", () => {
      const title = $("cmsItemTitle")?.value.trim();
      const text = $("cmsItemText")?.value.trim();
      if (!title && !text) return;
      cmsItems.unshift({ id: uid(), type: $("cmsItemType")?.value || "blog", title: title || "Untitled entry", text: text || "Short summary" });
      $("cmsItemTitle").value = "";
      $("cmsItemText").value = "";
      saveCms();
      render();
    });

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
    updateAutosaveStatus();
    loadProjectTemplateSectionsForCanvas();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
