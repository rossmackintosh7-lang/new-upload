(() => {
  if (window.__PBI_IMAGE_TOOLS_V4__) return;
  window.__PBI_IMAGE_TOOLS_V4__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
  const selectorEscape = (value) => window.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");

  function get() {
    try {
      return JSON.parse(localStorage.getItem("pbi_canvas_state") || "{}");
    } catch {
      return {};
    }
  }

  function save(state) {
    localStorage.setItem("pbi_canvas_state", JSON.stringify(state));
    localStorage.setItem("pbi_plan", String(state.plan || "starter").toLowerCase());
  }

  function liveState() {
    return window.PBIBuilderV2?.getState?.() || get();
  }

  function activePageFor(state, context = {}) {
    return context.activePage || window.PBIBuilderV2?.getActivePage?.() || state.activePage || state.active_page || state.selected_pages?.[0] || "home";
  }

  function mediaState() {
    const state = get();
    state.mediaLibrary = state.mediaLibrary || [];
    state.pageBackgrounds = state.pageBackgrounds || {};
    return state;
  }

  function media(id) {
    return (mediaState().mediaLibrary || []).find((item) => item.id === id);
  }

  function allBlocks(state) {
    return Object.entries(state.blocksByPage || {}).flatMap(([page, blocks]) => (blocks || []).map((block) => ({ page, block })));
  }

  function pageBlocks(state, page = activePageFor(state)) {
    return (state.blocksByPage?.[page] || []).map((block) => ({ page, block }));
  }

  function domSelectedId() {
    return $(".pbi-canvas-render-block.selected,[data-block-id].selected")?.dataset.blockId || null;
  }

  function selectedId() {
    return domSelectedId() || window.PBIBuilderV2?.getSelectedBlockId?.() || null;
  }

  function findBlockId(node) {
    const element = node?.nodeType === 1 ? node : node?.parentElement;
    return element?.closest?.("[data-block-id],.pbi-canvas-render-block")?.dataset?.blockId || null;
  }

  function resolveDropBlockId(dropMeta) {
    const direct = findBlockId(dropMeta?.target || dropMeta);
    if (direct) return direct;
    const path = Array.isArray(dropMeta?.path) ? dropMeta.path : [];
    for (const pathItem of path) {
      const fromPath = findBlockId(pathItem);
      if (fromPath) return fromPath;
    }
    if (Number.isFinite(dropMeta?.x) && Number.isFinite(dropMeta?.y)) {
      const pointElement = document.elementFromPoint(dropMeta.x, dropMeta.y);
      const fromPoint = findBlockId(pointElement);
      if (fromPoint) return fromPoint;
    }
    return selectedId();
  }

  function selectedBlock(state, dropMeta = null) {
    const id = resolveDropBlockId(dropMeta);
    return id ? allBlocks(state).find((item) => item.block.id === id) : null;
  }

  function demoImage(url) {
    return !url || String(url).includes("/assets/demo-media/") || String(url).includes("cafe-hero") || String(url).includes("consultant-hero");
  }

  function imageBlock(data = {}) {
    return {
      id: uid("image"),
      type: "image",
      layout: "image",
      animation: "rise",
      background: "transparent",
      accent: "#bf5c29",
      positionMode: "flow",
      publishable: true,
      ...data
    };
  }

  function isPremiumPlan(state) {
    return ["business", "plus"].includes(String(state.plan || localStorage.getItem("pbi_plan") || "starter").toLowerCase());
  }

  function dropPosition(meta, width = 360, height = 240) {
    const zone = $("#canvasDropzone") || $(".pbi-canvas-dropzone");
    const rect = zone?.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(meta?.x) || !Number.isFinite(meta?.y)) return { x: 70, y: 80, width };
    return {
      x: Math.max(0, Math.round(meta.x - rect.left - (width / 2))),
      y: Math.max(0, Math.round(meta.y - rect.top - (height / 2))),
      width
    };
  }

  function makeImageVisibleDom(state) {
    allBlocks(state).forEach(({ block }) => {
      const safeId = selectorEscape(block.id);
      const element = document.querySelector(`[data-block-id="${safeId}"],.pbi-canvas-render-block[data-block-id="${safeId}"]`);
      if (!element) return;
      const placed = element.querySelector(":scope > .pbi-live-placed-image");
      if (placed && block.image) {
        placed.src = block.image;
        placed.alt = block.imageAlt || block.title || "Block image";
        return;
      }
      let fallback = element.querySelector(":scope > .pbi-universal-block-image");
      if (!block.image || block.type === "image") {
        fallback?.remove();
        return;
      }
      if (!fallback) {
        fallback = document.createElement("img");
        fallback.className = "pbi-universal-block-image";
        element.appendChild(fallback);
      }
      fallback.src = block.image;
      fallback.alt = block.imageAlt || block.title || "Block image";
      fallback.dataset.imagePlacement = block.imagePlacement || "inline";
    });

    const page = activePageFor(state);
    const background = state.pageBackgrounds?.[page] || state.pages?.[page]?.backgroundImage;
    const dropzone = $("#canvasDropzone") || $(".pbi-canvas-dropzone");
    if (dropzone && background) {
      dropzone.style.backgroundImage = `linear-gradient(rgba(255,250,244,.88),rgba(255,250,244,.88)),url(${background})`;
      dropzone.style.backgroundSize = "cover";
      dropzone.style.backgroundPosition = "center";
    }
  }

  function mutateCanvas(status, updater) {
    const local = mediaState();
    let result = { changed: false };

    if (window.PBIBuilderV2?.updateState) {
      window.PBIBuilderV2.updateState((state, context) => {
        state.mediaLibrary = local.mediaLibrary || state.mediaLibrary || [];
        state.pageBackgrounds = state.pageBackgrounds || {};
        result = updater(state, context || {}) || result;
        return state;
      }, status);
      return result;
    }

    const state = local;
    result = updater(state, { activePage: activePageFor(state) }) || result;
    if (result.changed) save(state);
    return result;
  }

  function selectRenderedBlock(id) {
    if (!id) return;
    setTimeout(() => {
      if (window.PBIBuilderV2?.selectBlock) {
        window.PBIBuilderV2.selectBlock(id);
        return;
      }
      document.querySelector(`[data-block-id="${selectorEscape(id)}"]`)?.click();
    }, 80);
  }

  function repaintCanvas(statusText = "") {
    try {
      if (window.PBIBuilderV2?.renderNow) {
        window.PBIBuilderV2.renderNow(statusText);
        return;
      }
      window.dispatchEvent(new CustomEvent("pbi:builder-v2-updated", { detail: { state: liveState() } }));
    } catch {}
  }

  function apply(id, mode = "selected", dropMeta = null) {
    const item = media(id);
    if (!item) {
      alert("Upload or select an image first.");
      return;
    }

    if (mode === "selected" && !selectedBlock(liveState(), dropMeta)) {
      alert('Select a block first, drop the image onto a block, or use "New" to place it as a fresh image.');
      return;
    }

    let newBlockId = "";
    const result = mutateCanvas("Image updated", (state, context) => {
      let changed = false;
      const page = activePageFor(state, context);
      state.blocksByPage = state.blocksByPage || {};
      state.blocksByPage[page] = state.blocksByPage[page] || [];
      state.pages = state.pages || {};
      state.pageBackgrounds = state.pageBackgrounds || {};

      if (mode === "selected") {
        const hit = selectedBlock(state, dropMeta);
        if (!hit) return { changed: false };
        hit.block.image = item.url;
        hit.block.imageAlt = item.alt || item.name || "";
        hit.block.imagePlacement = hit.block.imagePlacement || "inline";
        if (hit.block.type === "hero") state.heroImage = item.url;
        changed = true;
      }

      if (mode === "current") {
        pageBlocks(state, page).forEach(({ block }) => {
          block.image = item.url;
          block.imageAlt = item.alt || item.name || "";
          block.imagePlacement = block.imagePlacement || "inline";
          changed = true;
        });
        state.pages[page] = state.pages[page] || {};
        state.pages[page].updatedImage = item.url;
      }

      if (mode === "all") {
        allBlocks(state).forEach(({ block }) => {
          block.image = item.url;
          block.imageAlt = item.alt || item.name || "";
          block.imagePlacement = block.imagePlacement || "inline";
          changed = true;
        });
        state.heroImage = item.url;
      }

      if (mode === "replaceDemo") {
        state.heroImage = item.url;
        allBlocks(state).forEach(({ block }) => {
          if (demoImage(block.image) || ["hero", "splitHero", "gallery"].includes(block.type)) {
            block.image = item.url;
            block.imageAlt = item.alt || item.name || "";
            block.imagePlacement = block.imagePlacement || "inline";
            changed = true;
          }
        });
      }

      if (mode === "background") {
        state.pageBackgrounds[page] = item.url;
        state.pages[page] = state.pages[page] || {};
        state.pages[page].backgroundImage = item.url;
        changed = true;
      }

      if (mode === "allBackgrounds") {
        (state.selected_pages || Object.keys(state.blocksByPage || {})).forEach((pageKey) => {
          state.pageBackgrounds[pageKey] = item.url;
          state.pages[pageKey] = state.pages[pageKey] || {};
          state.pages[pageKey].backgroundImage = item.url;
        });
        changed = true;
      }

      if (mode === "place" || mode === "free") {
        const position = dropPosition(dropMeta, 360);
        const block = imageBlock({
          title: item.name || "Uploaded image",
          text: "",
          image: item.url,
          imageAlt: item.alt || item.name || "",
          imagePlacement: "canvas"
        });
        if (isPremiumPlan(state)) {
          block.positionMode = "free";
          block.x = position.x;
          block.y = position.y;
          block.width = position.width;
          block.z = (state.blocksByPage[page].length || 0) + 20;
        }
        state.blocksByPage[page].push(block);
        newBlockId = block.id;
        changed = true;
      }

      return { changed };
    });

    if (result.changed) {
      repaintCanvas(newBlockId ? "Image placed on the canvas" : "Image updated");
      render();
      makeImageVisibleDom(liveState());
      selectRenderedBlock(newBlockId);
    }
  }

  function remove(mode = "selected") {
    if (mode === "selected" && !selectedBlock(liveState())) {
      alert("Select a block or image first.");
      return;
    }

    const result = mutateCanvas("Image removed", (state, context) => {
      let changed = false;
      const page = activePageFor(state, context);

      if (mode === "selected") {
        const hit = selectedBlock(state);
        if (!hit) return { changed: false };
        delete hit.block.image;
        delete hit.block.imageAlt;
        delete hit.block.imagePlacement;
        changed = true;
      }

      if (mode === "current") {
        pageBlocks(state, page).forEach(({ block }) => {
          delete block.image;
          delete block.imageAlt;
          delete block.imagePlacement;
          changed = true;
        });
        if (state.pageBackgrounds) delete state.pageBackgrounds[page];
        if (state.pages?.[page]) delete state.pages[page].backgroundImage;
      }

      if (mode === "all") {
        allBlocks(state).forEach(({ block }) => {
          delete block.image;
          delete block.imageAlt;
          delete block.imagePlacement;
          changed = true;
        });
        delete state.heroImage;
        state.pageBackgrounds = {};
        Object.values(state.pages || {}).forEach((pageData) => delete pageData.backgroundImage);
      }

      if (mode === "demo") {
        allBlocks(state).forEach(({ block }) => {
          if (demoImage(block.image)) {
            delete block.image;
            delete block.imageAlt;
            delete block.imagePlacement;
            changed = true;
          }
        });
        if (demoImage(state.heroImage)) {
          delete state.heroImage;
          changed = true;
        }
      }

      return { changed };
    });

    if (result.changed) {
      repaintCanvas("Image removed");
      render();
      makeImageVisibleDom(liveState());
    }
  }

  function load(files) {
    Array.from(files || []).filter((file) => /^image\//.test(file.type)).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const state = mediaState();
        state.mediaLibrary.unshift({
          id: uid("media"),
          name: file.name,
          url: String(reader.result),
          alt: file.name.replace(/\.[^.]+$/, "")
        });
        save(state);
        render();
      };
      reader.readAsDataURL(file);
    });
  }

  function render() {
    const grid = $("#pbiImgGrid");
    if (!grid) return;
    const state = mediaState();
    grid.innerHTML = (state.mediaLibrary || []).map((item) => `
      <article draggable="true" data-mid="${esc(item.id)}">
        <img src="${esc(item.url)}" alt="${esc(item.alt || item.name || "Uploaded image")}" draggable="true" data-mid="${esc(item.id)}">
        <span title="${esc(item.name || "Image")}">${esc(item.name || "Image")}</span>
        <button type="button" data-free="${esc(item.id)}">Place on canvas</button>
        <button type="button" data-use="${esc(item.id)}">Selected</button>
        <button type="button" data-page="${esc(item.id)}">Page</button>
        <button type="button" data-all="${esc(item.id)}">All pages</button>
        <button type="button" data-bg="${esc(item.id)}">Bg</button>
        <button type="button" data-del="${esc(item.id)}">x</button>
      </article>
    `).join("") || '<p class="muted">Upload images to use them on any block or page.</p>';

    $$("[data-mid]", grid).forEach((card) => {
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/x-pbi-media-id", card.dataset.mid);
      });
    });
    $$("[data-use]", grid).forEach((button) => button.addEventListener("click", () => apply(button.dataset.use, "selected")));
    $$("[data-page]", grid).forEach((button) => button.addEventListener("click", () => apply(button.dataset.page, "current")));
    $$("[data-all]", grid).forEach((button) => button.addEventListener("click", () => apply(button.dataset.all, "all")));
    $$("[data-bg]", grid).forEach((button) => button.addEventListener("click", () => apply(button.dataset.bg, "background")));
    $$("[data-free]", grid).forEach((button) => button.addEventListener("click", () => apply(button.dataset.free, "free")));
    $$("[data-del]", grid).forEach((button) => button.addEventListener("click", () => {
      const state = mediaState();
      state.mediaLibrary = state.mediaLibrary.filter((item) => item.id !== button.dataset.del);
      save(state);
      render();
    }));
  }

  function latest() {
    return mediaState().mediaLibrary?.[0];
  }

  function tray() {
    if ($("#pbiImgTools")) return;
    const left = $(".pbi-studio-left") || $(".pbi-canvas-palette");
    if (!left) return;
    const box = document.createElement("section");
    box.id = "pbiImgTools";
    box.className = "pbi-hotfix-media";
    box.innerHTML = `
      <div class="pbi-hotfix-media-head">
        <strong>Images</strong>
        <label>Upload<input id="pbiImgUpload" type="file" accept="image/*" multiple hidden></label>
      </div>
      <div class="pbi-image-tools">
        <button type="button" id="pbiUseLatest">Use on selected</button>
        <button type="button" id="pbiCurrentPage">Use on current page</button>
        <button type="button" id="pbiAllPages">Use on all pages</button>
        <button type="button" id="pbiPageBg">Set page background</button>
        <button type="button" id="pbiRemoveSelected">Remove selected</button>
        <button type="button" id="pbiRemoveCurrent">Remove current page images</button>
        <button type="button" id="pbiRemoveAll">Remove all images</button>
      </div>
      <div id="pbiImgDrop" class="pbi-hotfix-drop">Drop images here</div>
      <div id="pbiImgGrid" class="pbi-hotfix-grid"></div>
    `;
    (($(".pbi-studio-tabs", left)) || left.firstElementChild).after(box);

    $("#pbiImgUpload").addEventListener("change", (event) => load(event.target.files));
    const drop = $("#pbiImgDrop");
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("active");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("active"));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      drop.classList.remove("active");
      load(event.dataTransfer.files);
    });

    $("#pbiUseLatest").addEventListener("click", () => latest() ? apply(latest().id, "selected") : alert("Upload an image first."));
    $("#pbiCurrentPage").addEventListener("click", () => latest() ? apply(latest().id, "current") : alert("Upload an image first."));
    $("#pbiAllPages").addEventListener("click", () => latest() ? apply(latest().id, "all") : alert("Upload an image first."));
    $("#pbiPageBg").addEventListener("click", () => latest() ? apply(latest().id, "background") : alert("Upload an image first."));
    $("#pbiRemoveSelected").addEventListener("click", () => remove("selected"));
    $("#pbiRemoveCurrent").addEventListener("click", () => remove("current"));
    $("#pbiRemoveAll").addEventListener("click", () => confirm("Remove images from all blocks/pages?") && remove("all"));
    render();
  }

  function inspector() {
    if ($("#pbiImgInspector")) return;
    const input = $("#inspectorImage");
    if (!input) return;
    const box = document.createElement("div");
    box.id = "pbiImgInspector";
    box.className = "pbi-image-tools";
    box.innerHTML = `
      <button type="button" id="pbiInsUse">Use latest here</button>
      <button type="button" id="pbiInsPage">Use latest on page</button>
      <button type="button" id="pbiInsClear">Remove selected image</button>
    `;
    input.closest(".field")?.appendChild(box);
    $("#pbiInsUse").addEventListener("click", () => latest() ? apply(latest().id, "selected") : alert("Upload an image first."));
    $("#pbiInsPage").addEventListener("click", () => latest() ? apply(latest().id, "current") : alert("Upload an image first."));
    $("#pbiInsClear").addEventListener("click", () => remove("selected"));
  }

  function drops() {
    document.addEventListener("dragover", (event) => {
      if (event.dataTransfer?.types?.includes("application/x-pbi-media-id")) event.preventDefault();
    });
    document.addEventListener("drop", (event) => {
      const id = event.dataTransfer?.getData("application/x-pbi-media-id");
      if (!id) return;
      const target = event.target?.closest?.("#canvasDropzone,.pbi-canvas-dropzone,[data-block-id],.pbi-canvas-render-block");
      if (!target) return;
      event.preventDefault();
      apply(id, "place", {
        target,
        x: event.clientX,
        y: event.clientY,
        path: event.composedPath?.() || []
      });
    });
  }

  function ai() {
    const old = $("#canvasAiBuildBtn");
    if (!old || old.dataset.v4) return;
    const button = old.cloneNode(true);
    button.dataset.v4 = "1";
    old.replaceWith(button);
    button.addEventListener("click", () => {
      const brief = ($("#canvasAiBrief")?.value || "").trim();
      if (!brief) return alert("Describe the business first.");
      const state = get();
      const title = `Website built around ${brief}`;
      const text = "A clear small-business website with services, proof, FAQs and one enquiry route.";
      Object.assign(state, {
        page_main_heading: title,
        sub_heading: text,
        activePage: "home",
        selected_pages: ["home", "about", "services", "gallery", "faq", "contact"]
      });
      state.pages = { home: { label: "Home", title, body: text } };
      state.blocksByPage = {
        home: [
          imageBlock({ type: "hero", layout: "standard", title, text, image: state.heroImage || "/assets/demo-media/cafe-hero.jpg", button: "Send enquiry" }),
          imageBlock({ type: "services", title: "Services made simple", text: "Main service | Fast enquiry | Local support | Friendly follow-up" }),
          imageBlock({ type: "contact", title: "Ready to get started?", text: "Give visitors one clear route to enquire.", button: "Send enquiry" })
        ]
      };
      save(state);
      location.reload();
    });
  }

  function css() {
    if ($("#pbiImageV4Css")) return;
    const style = document.createElement("style");
    style.id = "pbiImageV4Css";
    style.textContent = `
      .pbi-universal-block-image{width:100%;max-height:260px;object-fit:cover;border-radius:18px;margin-top:14px;display:block}
      .pbi-hotfix-media{margin:14px 0;padding:14px;border:1px solid rgba(70,42,27,.12);border-radius:20px;background:#fffaf4}
      .pbi-hotfix-media-head{display:flex;justify-content:space-between;gap:10px;align-items:center}
      .pbi-hotfix-media-head label{cursor:pointer;border:1px solid rgba(70,42,27,.14);border-radius:999px;padding:8px 12px;background:#fff}
      .pbi-hotfix-drop{border:1px dashed rgba(191,92,41,.45);background:#fff;border-radius:14px;padding:10px;text-align:center;margin:10px 0;color:#75533d}
      .pbi-hotfix-drop.active{background:#fff0e6}
      .pbi-hotfix-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .pbi-hotfix-grid article{border:1px solid rgba(70,42,27,.12);border-radius:14px;background:#fff;overflow:hidden;padding-bottom:5px;cursor:grab}
      .pbi-hotfix-grid article:active{cursor:grabbing}
      .pbi-hotfix-grid img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;user-select:none}
      .pbi-hotfix-grid span{display:block;padding:5px 6px;font-size:.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pbi-hotfix-grid button,.pbi-image-tools button{font-size:.72rem;margin:3px;border:1px solid rgba(70,42,27,.12);border-radius:999px;background:#fffaf4;padding:6px 8px;cursor:pointer}
      .pbi-image-tools{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}
      .pbi-image-tools button:nth-child(3),.pbi-image-tools button:nth-child(4){background:#bf5c29;color:white;border-color:#bf5c29}
    `;
    document.head.appendChild(style);
  }

  function init() {
    css();
    ai();
    tray();
    drops();
    setTimeout(() => {
      inspector();
      makeImageVisibleDom(liveState());
    }, 500);
    document.addEventListener("click", () => setTimeout(() => {
      inspector();
      makeImageVisibleDom(liveState());
    }, 80), true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else setTimeout(init, 0);
})();
