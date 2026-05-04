
(() => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project") || "draft";
  const preset = params.get("preset") || "";
  const canvasKey = `pbi_canvas_${projectId}`;
  const versionsKey = `pbi_canvas_versions_${projectId}`;

  const defaultTheme = {
    background: "#fff8f1",
    accent: "#bf5c29",
    text: "#26160f"
  };

  const blockDefaults = {
    hero: {
      type: "hero",
      title: "Build a website customers understand quickly.",
      text: "A clear, professional website that explains what you do, builds trust and helps people take the next step.",
      button: "Get started",
      image: "",
      layout: "centered",
      background: "#fff8f1",
      accent: "#bf5c29",
      padding: "spacious",
      align: "center"
    },
    splitHero: {
      type: "splitHero",
      title: "A strong first impression with real business focus.",
      text: "Use this section for your main offer, service area and most important customer action.",
      button: "Request a quote",
      image: "/assets/demo-media/trades-hero.jpg",
      layout: "split",
      background: "#f4efe7",
      accent: "#256b5b",
      padding: "spacious",
      align: "left"
    },
    services: {
      type: "services",
      title: "Services that are easy to understand.",
      text: "Service one|Service two|Service three",
      button: "View services",
      image: "",
      layout: "cards",
      background: "#fffaf4",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "left"
    },
    featureGrid: {
      type: "featureGrid",
      title: "Why customers choose us.",
      text: "Clear communication|Helpful service|Reliable follow-up|Easy next steps",
      button: "",
      image: "",
      layout: "cards",
      background: "#f6efe7",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "left"
    },
    gallery: {
      type: "gallery",
      title: "See the work.",
      text: "/assets/demo-media/cafe-1.jpg|/assets/demo-media/cafe-2.jpg|/assets/demo-media/cafe-3.jpg",
      button: "",
      image: "",
      layout: "cards",
      background: "#fff8f1",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "center"
    },
    testimonial: {
      type: "testimonial",
      title: "What customers say.",
      text: "“Professional, clear and easy to work with from start to finish.”",
      button: "",
      image: "",
      layout: "centered",
      background: "#2b1a12",
      accent: "#f2b66d",
      padding: "comfortable",
      align: "center"
    },
    faq: {
      type: "faq",
      title: "Common questions.",
      text: "How do we get started?|Send an enquiry and we’ll guide the next step.\nHow long does it take?|That depends on content, images and the support route you choose.\nCan I update it later?|Yes, the site can be edited and improved over time.",
      button: "Ask a question",
      image: "",
      layout: "standard",
      background: "#fff8f1",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "left"
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
      align: "left"
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
      align: "left"
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
      align: "center"
    },

    trustBand: {
      type: "trustBand",
      title: "Customer confidence at a glance.",
      text: "Clear offer::Visitors understand what you do quickly|Proof built in::Trust points sit near the top|Easy next step::The call-to-action is always obvious",
      button: "",
      image: "",
      layout: "cards",
      background: "#ffffff",
      accent: "#bf5c29",
      padding: "compact",
      align: "center"
    },
    process: {
      type: "process",
      title: "A simple route from interest to action.",
      text: "Understand::Customers see the offer quickly|Trust::Proof and details remove hesitation|Act::The next step is obvious",
      button: "",
      image: "",
      layout: "cards",
      background: "#fff8f1",
      accent: "#256b5b",
      padding: "comfortable",
      align: "left"
    },
    stats: {
      type: "stats",
      title: "Useful numbers and proof points.",
      text: "Clear::Offer|Fast::Next step|Mobile::Ready",
      button: "",
      image: "",
      layout: "cards",
      background: "#ffffff",
      accent: "#bf5c29",
      padding: "compact",
      align: "center"
    },
    comparison: {
      type: "comparison",
      title: "Why choose this approach.",
      text: "Before::Unclear pages, weak proof and vague CTAs|After::A guided page with trust, services, answers and a clear next step",
      button: "",
      image: "",
      layout: "cards",
      background: "#f6efe7",
      accent: "#bf5c29",
      padding: "comfortable",
      align: "left"
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
      align: "center"
    }
  };

  let state = loadState();
  let selectedId = state.blocks[0]?.id || null;
  let dragSourceId = null;
  let history = [];
  let future = [];
  let autosaveTimer = null;
  let renderTimer = null;

  const $ = (id) => document.getElementById(id);

  function uid() {
    return `block_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function block(type) {
    return { id: uid(), ...clone(blockDefaults[type] || blockDefaults.hero) };
  }

  function initialBlocksForPreset() {
    if (preset === "shop") return [block("splitHero"), block("trustBand"), block("retail"), block("process"), block("featureGrid"), block("faq"), block("cta")];
    if (preset === "cafe") return [block("splitHero"), block("trustBand"), block("services"), block("gallery"), block("testimonial"), block("faq"), block("contact")];
    if (preset === "trades") return [block("splitHero"), block("trustBand"), block("services"), block("process"), block("testimonial"), block("faq"), block("contact")];
    return [block("splitHero"), block("trustBand"), block("services"), block("process"), block("featureGrid"), block("faq"), block("cta")];
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(canvasKey) || "null");
      if (saved?.blocks?.length) return saved;
    } catch (_) {}

    return {
      projectId,
      title: "Untitled PBI page",
      theme: defaultTheme,
      blocks: initialBlocksForPreset(),
      updatedAt: new Date().toISOString()
    };
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(canvasKey, JSON.stringify(state));
    updateAutosaveStatus("Autosaved");
    clearTimeout(window.__pbiCanvasCloudTimer);
    window.__pbiCanvasCloudTimer = setTimeout(() => cloudSaveCanvas(), 900);
  }



  async function pbiSaveCanvasSectionsToBuilder() {
    if (!projectId || projectId === "draft" || !state?.blocks?.length) return;
    try {
      const sections = state.blocks.map((b, i) => ({
        id: b.id,
        section_order: i,
        section_type: b.type || b.section_type || "section",
        type: b.type || b.section_type || "section",
        title: b.title || "",
        text: b.text || "",
        button: b.button || "",
        image: b.image || "",
        layout: b.layout || "standard",
        background: b.background || "#fff8f1",
        accent: b.accent || "#bf5c29",
        padding: b.padding || "comfortable",
        align: b.align || "left",
        body_json: b.body_json || "{}"
      }));
      await fetch("/api/builder/project-sections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, sections })
      });
    } catch (_) {}
  }

  function pushHistory() {
    history.push(clone(state));
    if (history.length > 60) history.shift();
    future = [];
  }

  function scheduleSave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveState, 450);
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 140);
  }

  function updateAutosaveStatus(text = "Autosave ready") {
    const el = $("canvasAutosaveStatus");
    if (el) el.textContent = `${text} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function selectedBlock() {
    return state.blocks.find((item) => item.id === selectedId) || null;
  }

  function blockLabel(type) {
    return {
      hero: "Hero",
      splitHero: "Split Hero",
      trustBand: "Trust Band",
      services: "Services",
      process: "Process",
      stats: "Stats",
      comparison: "Comparison",
      featureGrid: "Feature Grid",
      gallery: "Gallery",
      testimonial: "Testimonial",
      faq: "FAQ",
      contact: "Contact",
      retail: "Retail Strip",
      cta: "CTA",
      spacer: "Spacer"
    }[type] || type;
  }

  function paddingClass(value) {
    return `pad-${value || "comfortable"}`;
  }

  function parseCanvasCards(item) {
    return String(item.text || "")
      .split("|")
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row, index) => {
        const parts = row.includes("::") ? row.split("::") : row.split(" - ");
        return {
          title: (parts[0] || `Item ${index + 1}`).trim(),
          text: (parts.slice(1).join("::") || "Use this card to explain a service, benefit or proof point.").trim(),
          icon: index + 1
        };
      });
  }

  function writeCanvasCards(item, cards) {
    item.text = cards.map((card) => `${card.title || ""}::${card.text || ""}`).join("|");
  }

  function renderBlock(item, index) {
    const selected = item.id === selectedId ? "selected" : "";
    const style = `--block-bg:${item.background || "#fff8f1"};--block-accent:${item.accent || "#bf5c29"};--block-align:${item.align || "left"};`;
    const title = escapeHtml(item.title);
    const text = escapeHtml(item.text);
    const button = escapeHtml(item.button);
    const img = item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : "";

    if (item.type === "spacer") {
      return `<section draggable="true" class="canvas-block canvas-spacer ${selected} ${paddingClass(item.padding)}" data-block-id="${item.id}" style="${style}"><span>Spacer</span>${controls(item, index)}</section>`;
    }

    if (["services", "featureGrid", "process", "trustBand", "stats", "comparison", "retail"].includes(item.type)) {
      const cards = parseCanvasCards(item).slice(0, 8);
      return `<section draggable="true" class="canvas-block canvas-cards canvas-${item.type} ${selected} ${paddingClass(item.padding)} layout-${item.layout}" data-block-id="${item.id}" style="${style}">
        ${controls(item, index)}
        <div class="canvas-block-copy"><p class="canvas-kicker">${escapeHtml(blockLabel(item.type))}</p><h2 contenteditable="true" data-inline-field="title" data-block-id="${item.id}">${title}</h2></div>
        <div class="canvas-card-grid">${cards.map((card, cardIndex) => `<article><span>${escapeHtml(card.icon || cardIndex + 1)}</span><h3 contenteditable="true" data-card-field="title" data-card-index="${cardIndex}" data-block-id="${item.id}">${escapeHtml(card.title)}</h3><p contenteditable="true" data-card-field="text" data-card-index="${cardIndex}" data-block-id="${item.id}">${escapeHtml(card.text)}</p></article>`).join("")}</div>
        ${button ? `<a contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}
      </section>`;
    }

    if (item.type === "gallery") {
      const images = String(item.text || "").split("|").filter(Boolean).slice(0, 6);
      return `<section draggable="true" class="canvas-block canvas-gallery ${selected} ${paddingClass(item.padding)}" data-block-id="${item.id}" style="${style}">
        ${controls(item, index)}
        <h2 contenteditable="true" data-inline-field="title" data-block-id="${item.id}">${title}</h2>
        <div class="canvas-gallery-grid">${images.map((src) => `<img src="${escapeHtml(src.trim())}" alt="">`).join("")}</div>
      </section>`;
    }

    if (item.type === "faq") {
      const parts = String(item.text || "").split("\n").filter(Boolean).slice(0, 5);
      return `<section draggable="true" class="canvas-block canvas-faq ${selected} ${paddingClass(item.padding)}" data-block-id="${item.id}" style="${style}">
        ${controls(item, index)}
        <h2 contenteditable="true" data-inline-field="title" data-block-id="${item.id}">${title}</h2>
        <div>${parts.map((row) => {
          const [q, a] = row.split("|");
          return `<details open><summary>${escapeHtml(q || "Question")}</summary><p>${escapeHtml(a || "Answer goes here.")}</p></details>`;
        }).join("")}</div>
      </section>`;
    }

    if (item.type === "splitHero" || item.layout === "split") {
      return `<section draggable="true" class="canvas-block canvas-split ${selected} ${paddingClass(item.padding)}" data-block-id="${item.id}" style="${style}">
        ${controls(item, index)}
        <div><p class="canvas-kicker">${escapeHtml(blockLabel(item.type))}</p><h1 contenteditable="true" data-inline-field="title" data-block-id="${item.id}">${title}</h1><p contenteditable="true" data-inline-field="text" data-block-id="${item.id}">${text}</p>${button ? `<a contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}</div>
        <figure>${img || `<div class="canvas-image-placeholder">Image</div>`}</figure>
      </section>`;
    }

    return `<section draggable="true" class="canvas-block canvas-standard ${selected} ${paddingClass(item.padding)} layout-${item.layout}" data-block-id="${item.id}" style="${style}">
      ${controls(item, index)}
      <p class="canvas-kicker">${escapeHtml(blockLabel(item.type))}</p>
      <h1 contenteditable="true" data-inline-field="title" data-block-id="${item.id}">${title}</h1>
      <p contenteditable="true" data-inline-field="text" data-block-id="${item.id}">${text}</p>
      ${button ? `<a contenteditable="true" data-inline-field="button" data-block-id="${item.id}">${button}</a>` : ""}
    </section>`;
  }

  function controls(item, index) {
    return `<div class="canvas-block-controls">
      <button type="button" data-action="select" data-id="${item.id}">Edit</button>
      <button type="button" data-action="up" data-id="${item.id}">↑</button>
      <button type="button" data-action="down" data-id="${item.id}">↓</button>
      <button type="button" data-action="duplicate" data-id="${item.id}">Duplicate</button>
      <button type="button" data-action="delete" data-id="${item.id}">Delete</button>
    </div>`;
  }

  function render() {
    $("canvasProjectTitle").textContent = state.title || "Untitled PBI page";
    const dropzone = $("canvasDropzone");
    const empty = $("canvasEmpty");

    dropzone.querySelectorAll(".canvas-block").forEach((node) => node.remove());
    state.blocks.forEach((item, index) => {
      dropzone.insertAdjacentHTML("beforeend", renderBlock(item, index));
    });

    if (empty) empty.style.display = state.blocks.length ? "none" : "";
    bindCanvasEvents();
    renderInspector();
    renderVersions();
  }

  function renderInspector() {
    const item = selectedBlock();
    const form = $("canvasInspectorForm");
    const empty = $("canvasInspectorEmpty");

    if (!item) {
      form.style.display = "none";
      empty.style.display = "";
      return;
    }

    form.style.display = "";
    empty.style.display = "none";

    $("inspectorTitle").value = item.title || "";
    $("inspectorText").value = item.text || "";
    $("inspectorButton").value = item.button || "";
    $("inspectorImage").value = item.image || "";
    $("inspectorLayout").value = item.layout || "standard";
    $("inspectorBg").value = item.background || "#fff8f1";
    $("inspectorAccent").value = item.accent || "#bf5c29";
    $("inspectorPadding").value = item.padding || "comfortable";
    $("inspectorAlign").value = item.align || "left";
  }

  function applyInspector() {
    const item = selectedBlock();
    if (!item) return;

    pushHistory();
    item.title = $("inspectorTitle").value;
    item.text = $("inspectorText").value;
    item.button = $("inspectorButton").value;
    item.image = $("inspectorImage").value;
    item.layout = $("inspectorLayout").value;
    item.background = $("inspectorBg").value;
    item.accent = $("inspectorAccent").value;
    item.padding = $("inspectorPadding").value;
    item.align = $("inspectorAlign").value;

    scheduleSave();
    render();
  }

  function bindCanvasEvents() {
    document.querySelectorAll(".canvas-block").forEach((el) => {
      el.addEventListener("click", (event) => {
        if (event.target.closest(".canvas-block-controls")) return;
        selectedId = el.dataset.blockId;
        render();
      });

      el.addEventListener("dragstart", () => {
        dragSourceId = el.dataset.blockId;
        el.classList.add("dragging");
      });

      el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
      });

      el.addEventListener("dragover", (event) => event.preventDefault());

      el.addEventListener("drop", (event) => {
        event.preventDefault();
        const targetId = el.dataset.blockId;
        const newType = event.dataTransfer.getData("block/type");

        if (newType) {
          insertBlockBefore(newType, targetId);
          return;
        }

        if (dragSourceId && dragSourceId !== targetId) reorderBlocks(dragSourceId, targetId);
      });
    });

    document.querySelectorAll("[data-inline-field]").forEach((field) => {
      field.addEventListener("input", () => {
        const item = state.blocks.find((block) => block.id === field.dataset.blockId);
        if (!item) return;
        item[field.dataset.inlineField] = field.textContent.trim();
        renderInspector();
        scheduleSave();
      });
    });

    document.querySelectorAll("[data-card-field]").forEach((field) => {
      field.addEventListener("input", () => {
        const item = state.blocks.find((block) => block.id === field.dataset.blockId);
        if (!item) return;
        const cards = parseCanvasCards(item);
        const card = cards[Number(field.dataset.cardIndex)] || { title: "", text: "" };
        card[field.dataset.cardField] = field.textContent.trim();
        cards[Number(field.dataset.cardIndex)] = card;
        writeCanvasCards(item, cards);
        renderInspector();
        scheduleSave();
      });
    });

    document.querySelectorAll("[data-action]").forEach((button) => {
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

    if (action === "up" && index > 0) {
      [state.blocks[index - 1], state.blocks[index]] = [state.blocks[index], state.blocks[index - 1]];
    }

    if (action === "down" && index < state.blocks.length - 1) {
      [state.blocks[index + 1], state.blocks[index]] = [state.blocks[index], state.blocks[index + 1]];
    }

    if (action === "duplicate") {
      const copy = clone(state.blocks[index]);
      copy.id = uid();
      copy.title = `${copy.title || blockLabel(copy.type)} copy`;
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

  function saveVersion(label = "Manual version") {
    const versions = JSON.parse(localStorage.getItem(versionsKey) || "[]");
    versions.unshift({ id: uid(), label, createdAt: new Date().toISOString(), state: clone(state) });
    localStorage.setItem(versionsKey, JSON.stringify(versions.slice(0, 12)));
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

    list.innerHTML = versions.map((version, index) => `
      <button type="button" data-restore-version="${index}">
        <strong>${escapeHtml(version.label || "Version")}</strong>
        <span>${new Date(version.createdAt).toLocaleString()}</span>
      </button>
    `).join("");

    list.querySelectorAll("[data-restore-version]").forEach((button) => {
      button.addEventListener("click", () => {
        const version = versions[Number(button.dataset.restoreVersion)];
        if (!version?.state) return;
        pushHistory();
        state = version.state;
        selectedId = state.blocks[0]?.id || null;
        saveState();
        render();
      });
    });
  }

  async function rewriteSelected(mode) {
    const usedRemoteRewrite = await aiRewriteBlock(mode);
    if (usedRemoteRewrite) return;

    const item = selectedBlock();
    if (!item) return;

    pushHistory();
    if (mode === "shorter") item.text = String(item.text || "").split(/\s+/).slice(0, 35).join(" ");
    if (mode === "seo") item.text = `${item.text}\n\nClear local wording, useful services and an easy enquiry route help customers and search engines understand the business.`;
    if (mode === "clearer") item.text = String(item.text || "").replace(/welcome to our website/gi, "Here is what we do").trim() || "Clear, helpful wording goes here.";
    scheduleSave();
    render();
  }

  async function aiBuildFromBrief() {
    const usedRemote = await aiGenerateCanvasFromBrief();
    if (usedRemote) return;

    const brief = $("canvasAiBrief").value.trim();
    if (!brief) return;

    pushHistory();
    const lower = brief.toLowerCase();
    let main = "consultant";
    if (/shop|retail|product|sell/.test(lower)) main = "shop";
    if (/cafe|restaurant|food|coffee/.test(lower)) main = "cafe";
    if (/plumb|electric|trade|builder|landscap|heating/.test(lower)) main = "trades";
    if (/salon|beauty|hair|wellness/.test(lower)) main = "salon";
    if (/holiday|glamping|let|stay|accommodation/.test(lower)) main = "holiday";

    state.title = "AI generated premium PBI canvas";
    state.blocks = [
      { ...blockDefaults.splitHero, id: uid(), title: "A clear website built around your business.", text: brief, image: imageFor(main), layout: "split" },
      { ...blockDefaults.trustBand, id: uid() },
      { ...blockDefaults.services, id: uid(), title: "What customers can do here.", text: "Understand your offer::Make the first scroll obvious|Trust your business::Show proof before hesitation appears|Take the next step::Guide customers toward contact, booking or buying" },
      { ...blockDefaults.process, id: uid() },
      { ...blockDefaults.featureGrid, id: uid(), title: "Why this page feels premium.", text: "Richer sections::Proof, process and answers included|Better rhythm::Image, cards and CTA sections alternate|Mobile-first flow::Every section is easy to scan" },
      { ...blockDefaults.gallery, id: uid(), text: galleryFor(main).join("|") },
      { ...blockDefaults.testimonial, id: uid() },
      { ...blockDefaults.faq, id: uid() },
      { ...blockDefaults.cta, id: uid(), title: "Ready to publish when it feels right?", text: "Build free first, then choose the package when the site is ready to go live." }
    ];

    selectedId = state.blocks[0].id;
    saveVersion("AI build from brief");
    saveState();
    render();
  }

  function imageFor(kind) {
    return {
      shop: "/assets/demo-media/shop-hero.jpg",
      cafe: "/assets/demo-media/cafe-hero.jpg",
      trades: "/assets/demo-media/trades-hero.jpg",
      salon: "/assets/demo-media/salon-hero.jpg",
      holiday: "/assets/demo-media/holiday-let-hero.jpg",
      consultant: "/assets/demo-media/consultant-hero.jpg"
    }[kind] || "/assets/demo-media/consultant-hero.jpg";
  }

  function galleryFor(kind) {
    return {
      shop: ["/assets/demo-media/shop-1.jpg", "/assets/demo-media/shop-2.jpg", "/assets/demo-media/shop-3.jpg"],
      cafe: ["/assets/demo-media/cafe-1.jpg", "/assets/demo-media/cafe-2.jpg", "/assets/demo-media/cafe-3.jpg"],
      trades: ["/assets/demo-media/trades-1.jpg", "/assets/demo-media/trades-2.jpg", "/assets/demo-media/trades-3.jpg"],
      salon: ["/assets/demo-media/salon-1.jpg", "/assets/demo-media/salon-2.jpg", "/assets/demo-media/salon-3.jpg"],
      holiday: ["/assets/demo-media/holiday-let-1.jpg", "/assets/demo-media/holiday-let-2.jpg", "/assets/demo-media/holiday-let-3.jpg"],
      consultant: ["/assets/demo-media/consultant-1.jpg", "/assets/demo-media/consultant-2.jpg", "/assets/demo-media/consultant-3.jpg"]
    }[kind] || ["/assets/demo-media/consultant-1.jpg", "/assets/demo-media/consultant-2.jpg", "/assets/demo-media/consultant-3.jpg"];
  }

  function exportText() {
    return state.blocks.map((item) => {
      return [
        item.title,
        item.text,
        item.button ? `CTA: ${item.button}` : ""
      ].filter(Boolean).join("\n");
    }).join("\n\n---\n\n");
  }

  async function exportToProject() {
    saveVersion("Before export to project");
    saveState();
    await pbiSaveCanvasSectionsToBuilder();
    const publishResult = await cloudPublishCanvas();
    if (publishResult?.ok) localStorage.setItem(`pbi_canvas_site_url_${projectId}`, `/site/canvas/${projectId}`);

    localStorage.setItem(`pbi_canvas_export_${projectId}`, JSON.stringify({
      projectId,
      exportedAt: new Date().toISOString(),
      canvas: state,
      pageBody: exportText()
    }));

    try {
      await fetch("/api/versions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          label: "Canvas export",
          snapshot: state
        })
      });
    } catch (_) {}

    const builderUrl = `/builder/?project=${encodeURIComponent(projectId)}&canvas_export=1`;
    window.location.href = builderUrl;
  }


  async function cloudSaveCanvas() {
    if (!projectId || projectId === "draft") return { ok: false, skipped: true };

    try {
      const response = await fetch("/api/canvas", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, canvas: state })
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

  async function aiGenerateCanvasFromBrief() {
    const brief = $("canvasAiBrief").value.trim();
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
          goals: "website, enquiries, SEO",
          style_direction: document.getElementById("canvasStyleDirection")?.value || "premium, warm, flowing, not blocky"
        })
      });

      const result = await response.json().catch(() => null);
      if (result?.canvas?.blocks?.length) {
        pushHistory();
        state = {
          ...state,
          title: result.canvas.title || state.title || "AI generated PBI canvas",
          blocks: result.canvas.blocks
        };
        selectedId = state.blocks[0]?.id || null;
        saveVersion(result.mode === "responses" ? "AI generated premium canvas" : "Fallback premium canvas");
        saveState();
        cloudSaveCanvas();
        pbiSaveCanvasSectionsToBuilder();
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
        body: JSON.stringify({
          project_id: projectId,
          mode,
          text: item.text || ""
        })
      });

      const result = await response.json().catch(() => null);
      if (result?.text) {
        pushHistory();
        item.text = result.text;
        saveState();
        cloudSaveCanvas();
        render();
        return true;
      }
    } catch (_) {}

    return false;
  }



  // project template sections bridge: load chosen template sections into canvas when available.
  async function loadProjectTemplateSectionsForCanvas(){try{const r=await fetch(`/api/builder/project-sections?project_id=${encodeURIComponent(projectId)}`,{credentials:'include'});const d=await r.json();if(d?.sections?.length){state.blocks=d.sections.map(s=>({id:s.id,type:s.section_type||s.type||'section',title:s.title||'',text:s.text||'',button:s.button||'',image:s.image||'',layout:s.layout||'standard',background:s.background||'#fff8f1',accent:s.accent||'#bf5c29',padding:s.padding||'comfortable',align:s.align||'left'}));selectedId=state.blocks[0]?.id||null;saveState();render();}}catch{}}

  function bind() {
    render();

    document.querySelectorAll("[data-block-type]").forEach((button) => {
      button.addEventListener("dragstart", (event) => event.dataTransfer.setData("block/type", button.dataset.blockType));
      button.addEventListener("click", () => insertBlockBefore(button.dataset.blockType));
    });

    const dropzone = $("canvasDropzone");
    dropzone.addEventListener("dragover", (event) => event.preventDefault());
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("block/type");
      if (type) insertBlockBefore(type);
    });

    $("canvasApplyInspectorBtn").addEventListener("click", applyInspector);
    ["inspectorTitle", "inspectorText", "inspectorButton", "inspectorImage", "inspectorLayout", "inspectorBg", "inspectorAccent", "inspectorPadding", "inspectorAlign"].forEach((id) => {
      const input = $(id);
      if (!input) return;
      input.addEventListener("input", () => {
        const item = selectedBlock();
        if (!item) return;
        item.title = $("inspectorTitle").value;
        item.text = $("inspectorText").value;
        item.button = $("inspectorButton").value;
        item.image = $("inspectorImage").value;
        item.layout = $("inspectorLayout").value;
        item.background = $("inspectorBg").value;
        item.accent = $("inspectorAccent").value;
        item.padding = $("inspectorPadding").value;
        item.align = $("inspectorAlign").value;
        scheduleSave();
        scheduleRender();
      });
    });
    $("canvasDuplicateBtn").addEventListener("click", () => selectedId && handleAction("duplicate", selectedId));
    $("canvasDeleteBtn").addEventListener("click", () => selectedId && handleAction("delete", selectedId));
    $("canvasUndoBtn").addEventListener("click", undo);
    $("canvasRedoBtn").addEventListener("click", redo);
    $("canvasSaveVersionBtn").addEventListener("click", () => saveVersion("Manual canvas version"));
    $("canvasExportBtn").addEventListener("click", exportToProject);
    $("canvasAiBuildBtn").addEventListener("click", aiBuildFromBrief);

    document.querySelectorAll("[data-device]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-device]").forEach((btn) => btn.classList.toggle("active", btn === button));
        $("canvasDevice").className = `pbi-canvas-device ${button.dataset.device}`;
      });
    });

    document.querySelectorAll("[data-canvas-ai]").forEach((button) => {
      button.addEventListener("click", () => rewriteSelected(button.dataset.canvasAi));
    });

    const back = $("canvasBackToBuilder");
    back.href = `/builder/?project=${encodeURIComponent(projectId)}`;

    setInterval(saveState, 30000);
    updateAutosaveStatus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
