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
    navBar: "Navigation",
    hero: "Hero",
    splitHero: "Split Hero",
    floatingCard: "Floating Card",
    trustBand: "Trust",
    logoCloud: "Proof",
    services: "Services",
    process: "Process",
    stats: "Stats",
    featureGrid: "Feature Grid",
    gallery: "Gallery",
    testimonial: "Testimonial",
    pricing: "Pricing",
    productGrid: "Products",
    cmsList: "Updates",
    faq: "FAQ",
    map: "Location",
    booking: "Booking",
    contact: "Contact",
    retail: "Retail",
    cta: "CTA",
    spacer: "Spacer"
  }[type] || "Section";
}

function slugify(value) {
  return String(value || "page").toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
}

function pad(value) { return `published-pad-${value || "comfortable"}`; }
function freeVars(block = {}) {
  if (block.positionMode !== "free") return "";
  return `--free-x:${Number(block.x || 0)}px;--free-y:${Number(block.y || 0)}px;--free-width:${Math.max(180, Number(block.width || 420))}px;--free-z:${Number(block.z || 10)};--free-rotate:${Number(block.rotate || 0)}deg;`;
}
function cls(block = {}) {
  return `published-block published-${escapeHtml(block.type || "section")} ${block.positionMode === "free" ? "is-freeform" : ""} ${pad(block.padding)} layout-${escapeHtml(block.layout || "standard")} radius-${escapeHtml(block.radius || "soft")} motion-${escapeHtml(block.animation || "none")}`;
}
function attrs(block = {}) {
  return `style="--block-bg:${escapeHtml(block.background || "#fff8f1")};--block-accent:${escapeHtml(block.accent || "#bf5c29")};--block-align:${escapeHtml(block.align || "left")};--motion-duration:${Number(block.duration || 650)}ms;--motion-delay:${Number(block.delay || 0)}ms;--motion-easing:${escapeHtml(block.easing || "ease")};${freeVars(block)}"`;
}
function parseCards(value = "") {
  return String(value || "").split("|").map((row) => row.trim()).filter(Boolean).map((row, index) => {
    const parts = row.includes("::") ? row.split("::") : row.split(" - ");
    return { title: (parts[0] || `Item ${index + 1}`).trim(), text: (parts.slice(1).join("::") || "Helpful information that gives visitors a clear reason to take the next step.").trim() };
  });
}
function buttonHtml(button, href = "#contact") { return button ? `<a class="published-btn" href="${href}">${escapeHtml(button)}</a>` : ""; }

function renderCardSection(block, limit = 9) {
  const cards = parseCards(block.text).slice(0, limit);
  return `<section class="${cls(block)}" ${attrs(block)}>
    <div class="published-inner">
      <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
      <h2>${escapeHtml(block.title || "")}</h2>
      <div class="published-card-grid">${cards.map((card, index) => `<article><span>${index + 1}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></article>`).join("")}</div>
      ${buttonHtml(block.button)}
    </div>
  </section>`;
}

export function renderCanvasBlock(block = {}) {
  const title = escapeHtml(block.title || "");
  const text = escapeHtml(block.text || "");
  const button = escapeHtml(block.button || "");
  const image = block.image ? `<img src="${escapeHtml(block.image)}" alt="">` : "";

  if (block.type === "spacer") return `<section class="${cls(block)} published-spacer" ${attrs(block)} aria-hidden="true"></section>`;

  if (block.type === "floatingCard") {
    return `<section class="${cls(block)}" ${attrs(block)}><div class="published-inner"><p class="published-kicker">Floating layer</p><h3>${title}</h3><p>${text}</p>${buttonHtml(block.button)}</div></section>`;
  }

  if (block.type === "navBar") {
    const links = String(block.text || "Home|Services|About|Contact").split("|").filter(Boolean).slice(0, 6);
    return `<header class="published-nav-block" ${attrs(block)}>
      <a class="published-nav-brand" href="#top">${image || ""}<strong>${title}</strong></a>
      <nav>${links.map((link) => `<a href="#${escapeHtml(slugify(link))}">${escapeHtml(link)}</a>`).join("")}</nav>
      ${button ? `<a class="published-btn" href="#contact">${button}</a>` : ""}
    </header>`;
  }

  if (["services", "featureGrid", "process", "trustBand", "stats", "pricing", "productGrid", "cmsList", "retail"].includes(block.type)) return renderCardSection(block, 9);

  if (block.type === "logoCloud") {
    const logos = String(block.text || "").split("|").filter(Boolean).slice(0, 8);
    return `<section class="${cls(block)} published-logo-cloud" ${attrs(block)}>
      <div class="published-inner">
        <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
        <h2>${title}</h2>
        <div>${logos.map((logo) => `<span>${escapeHtml(logo)}</span>`).join("")}</div>
      </div>
    </section>`;
  }

  if (block.type === "gallery") {
    const images = String(block.text || "").split("|").filter(Boolean).slice(0, 8);
    return `<section class="${cls(block)}" ${attrs(block)}>
      <div class="published-inner">
        <p class="published-kicker">Gallery</p>
        <h2>${title}</h2>
        <div class="published-gallery-grid">${images.map((src, index) => `<figure><img src="${escapeHtml(src.trim())}" alt=""><figcaption>Image ${index + 1}</figcaption></figure>`).join("")}</div>
      </div>
    </section>`;
  }

  if (block.type === "faq") {
    const rows = String(block.text || "").split("\n").filter(Boolean).slice(0, 8);
    return `<section class="${cls(block)}" ${attrs(block)}>
      <div class="published-inner">
        <p class="published-kicker">FAQs</p>
        <h2>${title}</h2>
        <div class="published-faqs">${rows.map((row) => {
          const [q, a] = row.split("|");
          return `<details open><summary>${escapeHtml(q || "Question")}</summary><p>${escapeHtml(a || "Answer goes here.")}</p></details>`;
        }).join("")}</div>
        ${buttonHtml(block.button)}
      </div>
    </section>`;
  }

  if (block.type === "map") {
    return `<section class="${cls(block)} published-split published-map" ${attrs(block)}>
      <div class="published-inner published-split-inner">
        <div><p class="published-kicker">Local coverage</p><h2>${title}</h2><p>${text}</p>${buttonHtml(block.button)}</div>
        <figure><div class="published-map-card"><span>📍</span><strong>Purbeck / Dorset</strong><small>Service area and location details</small></div></figure>
      </div>
    </section>`;
  }

  if (block.type === "booking") {
    return `<section class="${cls(block)} published-booking" ${attrs(block)}>
      <div class="published-inner"><div class="published-booking-card"><p class="published-kicker">Booking</p><h2>${title}</h2><p>${text}</p><div class="published-booking-slots"><span>Today</span><span>Tomorrow</span><span>This week</span></div>${buttonHtml(block.button)}</div></div>
    </section>`;
  }

  if (block.type === "testimonial") {
    return `<section class="${cls(block)} published-testimonial" ${attrs(block)}>
      <div class="published-inner"><p class="published-kicker">Testimonial</p><h2>${title}</h2><blockquote>${text}</blockquote></div>
    </section>`;
  }

  if (block.type === "splitHero" || block.layout === "split") {
    return `<section class="${cls(block)} published-split" ${attrs(block)}>
      <div class="published-inner published-split-inner">
        <div>
          <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
          <h1>${title}</h1>
          <p>${text}</p>
          ${buttonHtml(block.button)}
        </div>
        <figure>${image || `<div class="published-placeholder">Image</div>`}</figure>
      </div>
    </section>`;
  }

  return `<section class="${cls(block)}" ${attrs(block)}>
    <div class="published-inner">
      <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
      <h1>${title}</h1>
      <p>${text}</p>
      ${buttonHtml(block.button)}
    </div>
  </section>`;
}

function pageNav(pages, activeSlug) {
  if (!Array.isArray(pages) || pages.length <= 1) return "";
  return `<nav class="published-page-tabs" aria-label="Website pages">${pages.map((page) => `<a class="${page.slug === activeSlug ? "active" : ""}" href="?page=${encodeURIComponent(page.slug)}">${escapeHtml(page.title)}</a>`).join("")}</nav>`;
}

function renderBlocksWithFreeformLayer(blocks = []) {
  const flow = blocks.filter((block) => block.positionMode !== "free");
  const free = blocks.filter((block) => block.positionMode === "free");
  const freeLayer = free.length ? `<section class="published-freeform-layer">${free.map(renderCanvasBlock).join("\n")}</section>` : "";
  return `${flow.map(renderCanvasBlock).join("\n")}${freeLayer}`;
}

export function renderCanvasPage(canvas = {}, options = {}) {
  const title = escapeHtml(canvas.title || options.title || "PBI Website");
  const theme = canvas.theme || {};
  const pages = Array.isArray(canvas.pages) && canvas.pages.length ? canvas.pages : [{ id: "home", title: "Home", slug: "home", blocks: Array.isArray(canvas.blocks) ? canvas.blocks : [] }];
  const url = new URL(options.url || "https://example.com");
  const requested = url.searchParams.get("page");
  const activePage = pages.find((page) => page.slug === requested) || pages.find((page) => page.id === canvas.activePageId) || pages[0];
  const blocks = Array.isArray(activePage.blocks) ? activePage.blocks : [];
  const firstNav = blocks.find((b) => b.type === "navBar");

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} • ${escapeHtml(activePage.title || "Home")}</title>
  <meta name="description" content="${escapeHtml(options.description || "A premium website created with Purbeck Business Innovations.")}">
  <link rel="stylesheet" href="/assets/pbi-published-canvas.css">
  <style>:root{--site-bg:${escapeHtml(theme.background || "#fff8f1")};--site-accent:${escapeHtml(theme.accent || "#bf5c29")};--site-text:${escapeHtml(theme.text || "#24140d")};}</style>
</head>
<body id="top">
  ${firstNav ? "" : `<header class="published-site-header"><a href="#top">${title}</a><nav><a href="#contact">Contact</a></nav></header>`}
  ${pageNav(pages, activePage.slug)}
  <main>
    ${renderBlocksWithFreeformLayer(blocks)}
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
