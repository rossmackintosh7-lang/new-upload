
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function blockLabel(type) {
  return {
    hero: "Hero",
    splitHero: "Split Hero",
    services: "Services",
    featureGrid: "Feature Grid",
    gallery: "Gallery",
    testimonial: "Testimonial",
    faq: "FAQ",
    contact: "Contact",
    retail: "Retail",
    cta: "CTA",
    spacer: "Spacer"
  }[type] || "Section";
}

function pad(value) {
  return `published-pad-${value || "comfortable"}`;
}

function attrs(block) {
  return `style="--block-bg:${escapeHtml(block.background || "#fff8f1")};--block-accent:${escapeHtml(block.accent || "#bf5c29")};--block-align:${escapeHtml(block.align || "left")}"`;
}

export function renderCanvasBlock(block = {}) {
  const title = escapeHtml(block.title || "");
  const text = escapeHtml(block.text || "");
  const button = escapeHtml(block.button || "");
  const image = block.image ? `<img src="${escapeHtml(block.image)}" alt="">` : "";
  const cls = `published-block published-${escapeHtml(block.type || "section")} ${pad(block.padding)} layout-${escapeHtml(block.layout || "standard")}`;

  if (block.type === "spacer") {
    return `<section class="${cls}" ${attrs(block)} aria-hidden="true"></section>`;
  }

  if (block.type === "services" || block.type === "featureGrid") {
    const cards = String(block.text || "").split("|").filter(Boolean).slice(0, 6);
    return `<section class="${cls}" ${attrs(block)}>
      <div class="published-inner">
        <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
        <h2>${title}</h2>
        <div class="published-card-grid">
          ${cards.map((card) => `<article><h3>${escapeHtml(card.trim())}</h3><p>Helpful information that gives visitors a clear reason to take the next step.</p></article>`).join("")}
        </div>
        ${button ? `<a class="published-btn" href="#contact">${button}</a>` : ""}
      </div>
    </section>`;
  }

  if (block.type === "gallery") {
    const images = String(block.text || "").split("|").filter(Boolean).slice(0, 8);
    return `<section class="${cls}" ${attrs(block)}>
      <div class="published-inner">
        <p class="published-kicker">Gallery</p>
        <h2>${title}</h2>
        <div class="published-gallery-grid">${images.map((src) => `<img src="${escapeHtml(src.trim())}" alt="">`).join("")}</div>
      </div>
    </section>`;
  }

  if (block.type === "faq") {
    const rows = String(block.text || "").split("\n").filter(Boolean).slice(0, 8);
    return `<section class="${cls}" ${attrs(block)}>
      <div class="published-inner">
        <p class="published-kicker">FAQs</p>
        <h2>${title}</h2>
        <div class="published-faqs">${rows.map((row) => {
          const [q, a] = row.split("|");
          return `<details><summary>${escapeHtml(q || "Question")}</summary><p>${escapeHtml(a || "Answer goes here.")}</p></details>`;
        }).join("")}</div>
      </div>
    </section>`;
  }

  if (block.type === "splitHero" || block.layout === "split") {
    return `<section class="${cls} published-split" ${attrs(block)}>
      <div class="published-inner published-split-inner">
        <div>
          <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
          <h1>${title}</h1>
          <p>${text}</p>
          ${button ? `<a class="published-btn" href="#contact">${button}</a>` : ""}
        </div>
        <figure>${image || `<div class="published-placeholder">Image</div>`}</figure>
      </div>
    </section>`;
  }

  return `<section class="${cls}" ${attrs(block)}>
    <div class="published-inner">
      <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
      <h1>${title}</h1>
      <p>${text}</p>
      ${button ? `<a class="published-btn" href="#contact">${button}</a>` : ""}
    </div>
  </section>`;
}

export function renderCanvasPage(canvas = {}, options = {}) {
  const title = escapeHtml(canvas.title || options.title || "PBI Website");
  const blocks = Array.isArray(canvas.blocks) ? canvas.blocks : [];

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${escapeHtml(options.description || "A website created with Purbeck Business Innovations.")}">
  <link rel="stylesheet" href="/assets/pbi-published-canvas.css">
</head>
<body>
  <header class="published-site-header">
    <a href="/">${title}</a>
    <nav><a href="#contact">Contact</a></nav>
  </header>
  <main>
    ${blocks.map(renderCanvasBlock).join("\n")}
  </main>
  <footer class="published-site-footer" id="contact">
    <strong>${title}</strong>
    <p>Website created with Purbeck Business Innovations.</p>
    <a class="published-btn" href="/contact/">Send enquiry</a>
  </footer>
  <script src="/assets/pbi-analytics.js" defer></script>
</body>
</html>`;
}
