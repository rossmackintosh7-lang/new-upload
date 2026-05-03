
(() => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project") || "draft";

  function $(id) { return document.getElementById(id); }

  function show(message, type = "info") {
    const el = $("canvasImportStatus");
    if (!el) return;
    el.style.display = "block";
    el.className = `notice ${type}`;
    el.textContent = message;
  }

  function setCanvasLink() {
    const link = $("openCanvasBuilderBtn");
    if (link) link.href = `/canvas-builder/?project=${encodeURIComponent(projectId)}`;
  }

  function importLatestCanvas() {
    try {
      const raw = localStorage.getItem(`pbi_canvas_export_${projectId}`);
      if (!raw) {
        show("No canvas export found for this project yet. Open the canvas builder first, then apply it to the project.", "error");
        return;
      }

      const exportData = JSON.parse(raw);
      const body = document.getElementById("pageBody");
      const title = document.getElementById("pageTitle");
      const heading = document.getElementById("pageMainHeading");
      const sub = document.getElementById("subHeading");

      if (body && exportData.pageBody) {
        body.value = exportData.pageBody;
        body.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const first = exportData.canvas?.blocks?.[0];
      if (first) {
        if (title) {
          title.value = first.title || title.value;
          title.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (heading) {
          heading.value = first.title || heading.value;
          heading.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (sub) {
          sub.value = first.text || sub.value;
          sub.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }

      show("Canvas export imported into this page. Review the preview, then save the project.", "success");
    } catch (err) {
      show("Could not import the canvas export.", "error");
    }
  }

  function bind() {
    setCanvasLink();
    $("importCanvasExportBtn")?.addEventListener("click", importLatestCanvas);

    if (params.get("canvas_export") === "1") {
      setTimeout(importLatestCanvas, 600);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
