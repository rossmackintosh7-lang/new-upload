export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function blockLabel(type) {
  return {
    navBar: 'Navigation',
    hero: 'Hero',
    splitHero: 'Split Hero',
    floatingCard: 'Floating Card',
    trustBand: 'Trust',
    logoCloud: 'Proof',
    services: 'Services',
    process: 'Process',
    stats: 'Stats',
    featureGrid: 'Feature Grid',
    gallery: 'Gallery',
    testimonial: 'Testimonial',
    pricing: 'Pricing',
    productGrid: 'Products',
    cmsList: 'Updates',
    faq: 'FAQ',
    map: 'Location',
    booking: 'Booking',
    contact: 'Contact',
    retail: 'Retail',
    cta: 'CTA',
    spacer: 'Spacer'
  }[type] || 'Section';
}

function slugify(value) {
  return String(value || 'page')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page';
}

function pageHref(page = {}, context = {}) {
  const slug = slugify(page.slug || page.id || page.title || 'home');
  const basePath = String(context.basePath || '').replace(/\/+$/, '');
  if (basePath) return slug === 'home' ? `${basePath}/` : `${basePath}/${encodeURIComponent(slug)}/`;
  return `?page=${encodeURIComponent(slug)}`;
}

function cmsHref(entry = {}, context = {}) {
  const basePath = String(context.basePath || '').replace(/\/+$/, '');
  const type = slugify(entry.type || 'blog');
  const slug = slugify(entry.slug || entry.title || 'entry');
  return basePath ? `${basePath}/${encodeURIComponent(type)}/${encodeURIComponent(slug)}/` : `?cms=${encodeURIComponent(type)}:${encodeURIComponent(slug)}`;
}

function pad(value) { return `published-pad-${value || 'comfortable'}`; }
function freeVars(block = {}) {
  if (block.positionMode !== 'free') return '';
  return `--free-x:${Number(block.x || 0)}px;--free-y:${Number(block.y || 0)}px;--free-width:${Math.max(180, Number(block.width || 420))}px;--free-z:${Number(block.z || 10)};--free-rotate:${Number(block.rotate || 0)}deg;`;
}
function cls(block = {}) {
  return `published-block published-${escapeHtml(block.type || 'section')} ${block.positionMode === 'free' ? 'is-freeform' : ''} ${pad(block.padding)} layout-${escapeHtml(block.layout || 'standard')} radius-${escapeHtml(block.radius || 'soft')} motion-${escapeHtml(block.animation || 'none')}`;
}
function attrs(block = {}) {
  return `style="--block-bg:${escapeAttr(block.background || '#fff8f1')};--block-accent:${escapeAttr(block.accent || '#bf5c29')};--block-align:${escapeAttr(block.align || 'left')};--motion-duration:${Number(block.duration || 650)}ms;--motion-delay:${Number(block.delay || 0)}ms;--motion-easing:${escapeAttr(block.easing || 'ease')};${freeVars(block)}"`;
}
function parseCards(value = '') {
  return String(value || '').split('|').map((row) => row.trim()).filter(Boolean).map((row, index) => {
    const parts = row.includes('::') ? row.split('::') : row.split(' - ');
    return { title: (parts[0] || `Item ${index + 1}`).trim(), text: (parts.slice(1).join('::') || 'Helpful information that gives visitors a clear reason to take the next step.').trim() };
  });
}
function buttonHtml(button, href = '#contact') { return button ? `<a class="published-btn" href="${escapeAttr(href)}">${escapeHtml(button)}</a>` : ''; }

function renderCardSection(block, limit = 9) {
  const cards = parseCards(block.text).slice(0, limit);
  return `<section class="${cls(block)}" ${attrs(block)}>
    <div class="published-inner">
      <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
      <h2>${escapeHtml(block.title || '')}</h2>
      <div class="published-card-grid">${cards.map((card, index) => `<article><span>${index + 1}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></article>`).join('')}</div>
      ${buttonHtml(block.button)}
    </div>
  </section>`;
}

function renderCmsList(block, context = {}) {
  const entries = Array.isArray(context.cmsEntries) ? context.cmsEntries.filter((item) => item.status === 'published').slice(0, 9) : [];
  const cards = entries.length ? entries.map((entry) => ({
    title: entry.title,
    text: entry.excerpt || entry.body || entry.text || '',
    href: cmsHref(entry, context),
    type: entry.type || 'blog'
  })) : parseCards(block.text).slice(0, 9).map((card) => ({ ...card, href: '#contact', type: 'update' }));

  return `<section class="${cls(block)}" ${attrs(block)}>
    <div class="published-inner">
      <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
      <h2>${escapeHtml(block.title || 'Latest updates')}</h2>
      <div class="published-card-grid published-cms-grid">${cards.map((card) => `<article><span>${escapeHtml(card.type)}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(String(card.text || '').slice(0, 220))}</p><a href="${escapeAttr(card.href)}">Read more</a></article>`).join('')}</div>
      ${buttonHtml(block.button, cards[0]?.href || '#contact')}
    </div>
  </section>`;
}

export function renderCanvasBlock(block = {}, context = {}) {
  const title = escapeHtml(block.title || '');
  const text = escapeHtml(block.text || '');
  const button = escapeHtml(block.button || '');
  const image = block.image ? `<img src="${escapeAttr(block.image)}" alt="">` : '';

  if (block.visibility === 'hidden') return '';
  if (block.type === 'spacer') return `<section class="${cls(block)} published-spacer" ${attrs(block)} aria-hidden="true"></section>`;

  if (block.type === 'floatingCard') {
    return `<section class="${cls(block)}" ${attrs(block)}><div class="published-inner"><p class="published-kicker">Floating layer</p><h3>${title}</h3><p>${text}</p>${buttonHtml(block.button)}</div></section>`;
  }

  if (block.type === 'navBar') {
    const pages = Array.isArray(context.pages) && context.pages.length ? context.pages : [];
    const fallbackLinks = String(block.text || 'Home|Services|About|Contact').split('|').filter(Boolean).slice(0, 6).map((label) => ({ title: label, slug: slugify(label) }));
    const links = pages.length > 1 ? pages : fallbackLinks;
    return `<header class="published-nav-block" ${attrs(block)}>
      <a class="published-nav-brand" href="${escapeAttr(context.basePath ? `${String(context.basePath).replace(/\/+$/, '')}/` : '#top')}">${image || ''}<strong>${title}</strong></a>
      <nav>${links.map((link) => `<a href="${escapeAttr(pageHref(link, context))}">${escapeHtml(link.title || link.slug || 'Page')}</a>`).join('')}</nav>
      ${button ? `<a class="published-btn" href="#contact">${button}</a>` : ''}
    </header>`;
  }

  if (block.type === 'cmsList') return renderCmsList(block, context);
  if (['services', 'featureGrid', 'process', 'trustBand', 'stats', 'pricing', 'productGrid', 'retail'].includes(block.type)) return renderCardSection(block, 9);

  if (block.type === 'logoCloud') {
    const logos = String(block.text || '').split('|').filter(Boolean).slice(0, 8);
    return `<section class="${cls(block)} published-logo-cloud" ${attrs(block)}>
      <div class="published-inner">
        <p class="published-kicker">${escapeHtml(blockLabel(block.type))}</p>
        <h2>${title}</h2>
        <div>${logos.map((logo) => `<span>${escapeHtml(logo)}</span>`).join('')}</div>
      </div>
    </section>`;
  }

  if (block.type === 'gallery') {
    const images = String(block.text || '').split('|').filter(Boolean).slice(0, 8);
    return `<section class="${cls(block)}" ${attrs(block)}>
      <div class="published-inner">
        <p class="published-kicker">Gallery</p>
        <h2>${title}</h2>
        <div class="published-gallery-grid">${images.map((src, index) => `<figure><img src="${escapeAttr(src.trim())}" alt=""><figcaption>Image ${index + 1}</figcaption></figure>`).join('')}</div>
      </div>
    </section>`;
  }

  if (block.type === 'faq') {
    const rows = String(block.text || '').split('\n').filter(Boolean).slice(0, 8);
    return `<section class="${cls(block)}" ${attrs(block)}>
      <div class="published-inner">
        <p class="published-kicker">FAQs</p>
        <h2>${title}</h2>
        <div class="published-faqs">${rows.map((row) => {
          const [q, a] = row.split('|');
          return `<details open><summary>${escapeHtml(q || 'Question')}</summary><p>${escapeHtml(a || 'Answer goes here.')}</p></details>`;
        }).join('')}</div>
        ${buttonHtml(block.button)}
      </div>
    </section>`;
  }

  if (block.type === 'map') {
    return `<section class="${cls(block)} published-split published-map" ${attrs(block)}>
      <div class="published-inner published-split-inner">
        <div><p class="published-kicker">Local coverage</p><h2>${title}</h2><p>${text}</p>${buttonHtml(block.button)}</div>
        <figure><div class="published-map-card"><span>📍</span><strong>Purbeck / Dorset</strong><small>Service area and location details</small></div></figure>
      </div>
    </section>`;
  }

  if (block.type === 'booking') {
    return `<section class="${cls(block)} published-booking" ${attrs(block)}>
      <div class="published-inner"><div class="published-booking-card"><p class="published-kicker">Booking</p><h2>${title}</h2><p>${text}</p><div class="published-booking-slots"><span>Today</span><span>Tomorrow</span><span>This week</span></div>${buttonHtml(block.button)}</div></div>
    </section>`;
  }

  if (block.type === 'testimonial') {
    return `<section class="${cls(block)} published-testimonial" ${attrs(block)}>
      <div class="published-inner"><p class="published-kicker">Testimonial</p><h2>${title}</h2><blockquote>${text}</blockquote></div>
    </section>`;
  }

  if (block.type === 'contact') {
    return `<section class="${cls(block)} published-contact" ${attrs(block)} id="contact">
      <div class="published-inner published-split-inner">
        <div><p class="published-kicker">Contact</p><h2>${title}</h2><p>${text}</p></div>
        <form class="published-contact-mini"><input placeholder="Your name"><input placeholder="Email or phone"><textarea placeholder="How can we help?"></textarea>${buttonHtml(block.button || 'Send enquiry')}</form>
      </div>
    </section>`;
  }

  if (block.type === 'splitHero' || block.layout === 'split') {
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

function pageNav(pages, activeSlug, context = {}) {
  if (!Array.isArray(pages) || pages.length <= 1) return '';
  return `<nav class="published-page-tabs" aria-label="Website pages">${pages.map((page) => {
    const slug = slugify(page.slug || page.id || page.title || 'home');
    return `<a class="${slug === activeSlug ? 'active' : ''}" href="${escapeAttr(pageHref(page, context))}">${escapeHtml(page.title)}</a>`;
  }).join('')}</nav>`;
}

function renderBlocksWithFreeformLayer(blocks = [], context = {}) {
  const flow = blocks.filter((block) => block.positionMode !== 'free');
  const free = blocks.filter((block) => block.positionMode === 'free');
  const freeLayer = free.length ? `<section class="published-freeform-layer">${free.map((block) => renderCanvasBlock(block, context)).join('\n')}</section>` : '';
  return `${flow.map((block) => renderCanvasBlock(block, context)).join('\n')}${freeLayer}`;
}

function resolveActivePage(pages, canvas, options = {}) {
  const url = new URL(options.url || 'https://example.com');
  const requested = slugify(options.pageSlug || url.searchParams.get('page') || '');
  return pages.find((page) => slugify(page.slug || page.id || page.title) === requested)
    || pages.find((page) => page.id === canvas.activePageId)
    || pages[0];
}

export function renderCanvasPage(canvas = {}, options = {}) {
  const title = escapeHtml(canvas.title || options.title || 'PBI Website');
  const theme = canvas.theme || {};
  const pages = Array.isArray(canvas.pages) && canvas.pages.length ? canvas.pages : [{ id: 'home', title: 'Home', slug: 'home', blocks: Array.isArray(canvas.blocks) ? canvas.blocks : [] }];
  const activePage = resolveActivePage(pages, canvas, options);
  const activeSlug = slugify(activePage.slug || activePage.id || activePage.title || 'home');
  const blocks = Array.isArray(activePage.blocks) ? activePage.blocks : [];
  const cmsEntries = Array.isArray(canvas._cms_entries) ? canvas._cms_entries : [];
  const context = { ...options, pages, activePage, activeSlug, cmsEntries };
  const firstNav = blocks.find((b) => b.type === 'navBar');
  const canonical = options.basePath ? `${String(options.basePath).replace(/\/+$/, '')}/${activeSlug === 'home' ? '' : `${encodeURIComponent(activeSlug)}/`}` : '';

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} • ${escapeHtml(activePage.title || 'Home')}</title>
  <meta name="description" content="${escapeAttr(options.description || 'A premium website created with Purbeck Business Innovations.')}">
  ${canonical ? `<link rel="canonical" href="${escapeAttr(canonical)}">` : ''}
  <link rel="stylesheet" href="/assets/pbi-published-canvas.css">
  <style>:root{--site-bg:${escapeAttr(theme.background || '#fff8f1')};--site-accent:${escapeAttr(theme.accent || '#bf5c29')};--site-text:${escapeAttr(theme.text || '#24140d')};}</style>
</head>
<body id="top">
  ${firstNav ? '' : `<header class="published-site-header"><a href="${escapeAttr(options.basePath ? `${String(options.basePath).replace(/\/+$/, '')}/` : '#top')}">${title}</a><nav><a href="#contact">Contact</a></nav></header>`}
  ${pageNav(pages, activeSlug, context)}
  <main>
    ${renderBlocksWithFreeformLayer(blocks, context)}
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

export function renderCmsEntryPage(entry = {}, canvas = {}, options = {}) {
  const siteTitle = escapeHtml(options.siteTitle || canvas.title || 'PBI Website');
  const title = escapeHtml(entry.title || 'Untitled');
  const type = escapeHtml(entry.type || 'blog');
  const body = String(entry.body || entry.text || '').split('\n').filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
  const basePath = String(options.basePath || '').replace(/\/+$/, '');
  const backHref = `${basePath}/`;
  const image = entry.image ? `<img class="published-cms-hero-image" src="${escapeAttr(entry.image)}" alt="${title}">` : '';
  const canonical = options.url || `${basePath}/${slugify(entry.type)}/${slugify(entry.slug)}/`;

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} • ${siteTitle}</title>
  <meta name="description" content="${escapeAttr(entry.seo_description || entry.excerpt || '')}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <link rel="stylesheet" href="/assets/pbi-published-canvas.css">
</head>
<body>
  <header class="published-site-header"><a href="${escapeAttr(backHref)}">${siteTitle}</a><nav><a href="${escapeAttr(backHref)}">Back to site</a></nav></header>
  <main class="published-cms-entry-page">
    <article class="published-cms-entry">
      <p class="published-kicker">${type}</p>
      <h1>${title}</h1>
      ${entry.excerpt ? `<p class="published-cms-excerpt">${escapeHtml(entry.excerpt)}</p>` : ''}
      ${image}
      <div class="published-cms-body">${body || '<p>This entry is being updated.</p>'}</div>
      <a class="published-btn" href="${escapeAttr(backHref)}">Back to website</a>
    </article>
  </main>
</body>
</html>`;
}
