
(() => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project") || "draft";
  const storageKey = `pbi_builder_pro_${projectId}`;
  const autosaveKey = `pbi_autosave_${projectId}`;
  const versionsKey = `pbi_versions_${projectId}`;

  const sectionDefaults = {
    hero: {
      type: "hero",
      title: "A clear first impression",
      body: "Explain what the business does, who it helps and what customers should do next.",
      button: "Get in touch"
    },
    services: {
      type: "services",
      title: "What we offer",
      body: "Service one | Service two | Service three",
      button: "View services"
    },
    trust: {
      type: "trust",
      title: "Why customers choose us",
      body: "Local, reliable and easy to work with.",
      button: "Learn more"
    },
    testimonial: {
      type: "testimonial",
      title: "Customer feedback",
      body: "“A helpful, professional service from start to finish.”",
      button: ""
    },
    faq: {
      type: "faq",
      title: "Common questions",
      body: "How quickly can you help? | What areas do you cover? | How do customers get started?",
      button: "Ask a question"
    },
    cta: {
      type: "cta",
      title: "Ready to start?",
      body: "Send an enquiry and we’ll help you take the next step.",
      button: "Contact us"
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function show(message, type = "info") {
    const el = $("pbiProStatus");
    if (!el) return;
    el.style.display = "block";
    el.className = `notice ${type}`;
    el.textContent = message;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadSections() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved)) return saved;
    } catch (_) {}

    return [
      { ...sectionDefaults.hero },
      { ...sectionDefaults.services },
      { ...sectionDefaults.trust },
      { ...sectionDefaults.cta }
    ];
  }

  let sections = loadSections();

  function saveSections() {
    localStorage.setItem(storageKey, JSON.stringify(sections));
  }

  function renderSections() {
    const list = $("pbiSectionList");
    if (!list) return;

    list.innerHTML = sections.map((section, index) => `
      <article class="pbi-section-editor" data-section-index="${index}">
        <div class="pbi-section-editor-head">
          <strong>${escapeHtml(section.type.toUpperCase())}</strong>
          <div class="pbi-section-actions">
            <button type="button" data-move-section="${index}" data-direction="-1">↑</button>
            <button type="button" data-move-section="${index}" data-direction="1">↓</button>
            <button type="button" data-duplicate-section="${index}">Duplicate</button>
            <button type="button" data-remove-section="${index}">Remove</button>
          </div>
        </div>
        <label>Section title<input class="input" data-section-field="title" data-section-index="${index}" value="${escapeHtml(section.title)}"></label>
        <label>Section text<textarea class="textarea" data-section-field="body" data-section-index="${index}">${escapeHtml(section.body)}</textarea></label>
        <label>Button text<input class="input" data-section-field="button" data-section-index="${index}" value="${escapeHtml(section.button || "")}"></label>
      </article>
    `).join("");
  }

  function sectionText() {
    return sections.map((section) => {
      const title = section.title?.trim();
      const body = section.body?.trim();
      const button = section.button?.trim();
      let text = "";
      if (title) text += `${title}\n`;
      if (body) text += `${body}\n`;
      if (button) text += `Button: ${button}\n`;
      return text.trim();
    }).filter(Boolean).join("\n\n");
  }

  function applySectionsToPage() {
    const body = $("pageBody");
    const title = $("pageTitle");
    const heading = $("pageMainHeading");
    const sub = $("subHeading");

    if (!body) {
      show("Could not find the page content field.", "error");
      return;
    }

    const first = sections[0] || {};
    if (title && first.title) title.value = first.title;
    if (heading && first.title) heading.value = first.title;
    if (sub && first.body) sub.value = first.body;

    body.value = sectionText();

    body.dispatchEvent(new Event("input", { bubbles: true }));
    if (title) title.dispatchEvent(new Event("input", { bubbles: true }));
    if (heading) heading.dispatchEvent(new Event("input", { bubbles: true }));
    if (sub) sub.dispatchEvent(new Event("input", { bubbles: true }));

    saveSections();
    saveVersion("Applied sections");
    show("Sections applied to the selected page and preview refreshed.", "success");
  }

  function moveSection(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= sections.length) return;
    [sections[index], sections[next]] = [sections[next], sections[index]];
    saveSections();
    renderSections();
    applySectionsToPage();
  }

  function duplicateSection(index) {
    const copy = { ...sections[index], title: `${sections[index].title} copy` };
    sections.splice(index + 1, 0, copy);
    saveSections();
    renderSections();
    show("Section duplicated.", "success");
  }

  function removeSection(index) {
    sections.splice(index, 1);
    if (!sections.length) sections.push({ ...sectionDefaults.hero });
    saveSections();
    renderSections();
    applySectionsToPage();
  }

  function addSection(type) {
    sections.push({ ...sectionDefaults[type] });
    saveSections();
    renderSections();
    show(`${type} section added.`, "success");
  }

  function collectCurrentDraft() {
    return {
      createdAt: new Date().toISOString(),
      projectName: $("projectName")?.value || "",
      businessName: $("businessName")?.value || "",
      heading: $("pageMainHeading")?.value || "",
      subHeading: $("subHeading")?.value || "",
      pageTitle: $("pageTitle")?.value || "",
      pageBody: $("pageBody")?.value || "",
      accentColor: $("accentColor")?.value || "",
      backgroundColor: $("backgroundColor")?.value || "",
      textColor: $("textColor")?.value || "",
      sections
    };
  }

  function restoreDraft(draft) {
    if (!draft) return false;
    const map = {
      projectName: "projectName",
      businessName: "businessName",
      heading: "pageMainHeading",
      subHeading: "subHeading",
      pageTitle: "pageTitle",
      pageBody: "pageBody",
      accentColor: "accentColor",
      backgroundColor: "backgroundColor",
      textColor: "textColor"
    };

    Object.entries(map).forEach(([key, id]) => {
      const el = $(id);
      if (el && draft[key] !== undefined) {
        el.value = draft[key];
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    if (Array.isArray(draft.sections)) {
      sections = draft.sections;
      saveSections();
      renderSections();
    }

    return true;
  }

  function saveVersion(reason = "Manual version") {
    const versions = JSON.parse(localStorage.getItem(versionsKey) || "[]");
    versions.unshift({ reason, ...collectCurrentDraft() });
    localStorage.setItem(versionsKey, JSON.stringify(versions.slice(0, 10)));
    show("Version saved locally. The last 10 versions are kept on this device.", "success");
  }

  function restoreLatestVersion() {
    const versions = JSON.parse(localStorage.getItem(versionsKey) || "[]");
    if (!versions.length) {
      show("No saved local versions found yet.", "error");
      return;
    }

    restoreDraft(versions[0]);
    show(`Restored latest local version: ${new Date(versions[0].createdAt).toLocaleString()}`, "success");
  }

  function autosave() {
    const draft = collectCurrentDraft();
    localStorage.setItem(autosaveKey, JSON.stringify(draft));
    const status = $("pbiAutosaveStatus");
    if (status) status.textContent = `Autosaved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  function restoreAutosave() {
    try {
      const draft = JSON.parse(localStorage.getItem(autosaveKey) || "null");
      if (!draft) {
        show("No autosave found yet.", "error");
        return;
      }

      restoreDraft(draft);
      show("Autosave restored.", "success");
    } catch (_) {
      show("Autosave could not be restored.", "error");
    }
  }

  function rewriteText(mode) {
    const title = $("pageTitle");
    const body = $("pageBody");
    if (!body) return;

    const currentTitle = title?.value || "";
    let text = body.value || "";
    if (!text.trim()) {
      show("Add some page content first, then use the AI helper.", "error");
      return;
    }

    const prefixMap = {
      clearer: "Clear version:",
      friendly: "Friendly version:",
      seo: "Search-friendly local version:",
      shorter: "Short version:"
    };

    if (mode === "shorter") {
      text = text.split(/\s+/).slice(0, 90).join(" ");
    } else if (mode === "seo") {
      const business = $("businessName")?.value || "this business";
      text = `${text}\n\n${business} helps local customers with clear services, helpful information and an easy way to get in touch.`;
    } else if (mode === "friendly") {
      text = `${text}\n\nWe keep things simple, helpful and easy to understand, so customers know exactly what to do next.`;
    } else {
      text = text
        .replace(/welcome to our website/gi, "Here is what we do")
        .replace(/we are passionate about/gi, "we help customers with");
    }

    body.value = `${prefixMap[mode] || "Improved version:"}\n${text}`;
    body.dispatchEvent(new Event("input", { bubbles: true }));
    if (title && !currentTitle.trim()) {
      title.value = "Clear, useful support for your customers";
      title.dispatchEvent(new Event("input", { bubbles: true }));
    }

    saveVersion(`AI helper: ${mode}`);
    show("AI helper applied a safe local rewrite. OpenAI-powered rewriting can replace this once the API endpoint is connected.", "success");
  }

  function bind() {
    renderSections();

    document.querySelectorAll("[data-add-section]").forEach((button) => {
      button.addEventListener("click", () => addSection(button.dataset.addSection));
    });

    $("pbiApplySectionsBtn")?.addEventListener("click", applySectionsToPage);
    $("pbiSaveVersionBtn")?.addEventListener("click", () => saveVersion("Manual version"));
    $("pbiRestoreVersionBtn")?.addEventListener("click", restoreLatestVersion);
    $("pbiRestoreAutosaveBtn")?.addEventListener("click", restoreAutosave);

    document.querySelectorAll("[data-ai-rewrite]").forEach((button) => {
      button.addEventListener("click", () => rewriteText(button.dataset.aiRewrite));
    });

    $("pbiSectionList")?.addEventListener("input", (event) => {
      const input = event.target.closest("[data-section-field]");
      if (!input) return;
      const index = Number(input.dataset.sectionIndex);
      const field = input.dataset.sectionField;
      sections[index][field] = input.value;
      saveSections();
      applySectionsToPage();
    });

    $("pbiSectionList")?.addEventListener("click", (event) => {
      const move = event.target.closest("[data-move-section]");
      const duplicate = event.target.closest("[data-duplicate-section]");
      const remove = event.target.closest("[data-remove-section]");

      if (move) moveSection(Number(move.dataset.moveSection), Number(move.dataset.direction));
      if (duplicate) duplicateSection(Number(duplicate.dataset.duplicateSection));
      if (remove) removeSection(Number(remove.dataset.removeSection));
    });

    document.addEventListener("input", (event) => {
      if (event.target.closest("#pbiSectionList")) return;
      if (event.target.matches("input, textarea, select")) {
        clearTimeout(window.__pbiAutosaveTimer);
        window.__pbiAutosaveTimer = setTimeout(autosave, 700);
      }
    }, true);

    setInterval(autosave, 30000);
    setTimeout(autosave, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
