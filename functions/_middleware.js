import { findProjectByCustomDomain, isPbiPlatformHost, renderProjectResponse } from './_lib/site-renderer.js';

const SEO_HOME_SECTION = `
<section class="section pbi-google-seo-section" id="google-seo-ready">
  <div class="container two-column">
    <div class="card readable-card">
      <p class="eyebrow">Google SEO ready</p>
      <h2>Free website builder for small businesses, only pay when you publish.</h2>
      <p>PBI Website Builder helps cafés, trades, salons, shops, consultants, holiday lets and local service businesses create a professional website with AI-assisted setup, editable templates, mobile preview, launch checks and optional custom build support.</p>
      <p>Every PBI site is built around clear page structure, helpful wording, internal links, image alt text prompts, launch readiness checks, sitemap support and search-friendly page titles and descriptions.</p>
      <div class="hero-actions">
        <a class="btn" href="/onboarding/">Start building for free</a>
        <a class="btn-ghost" href="/google-seo/">How PBI helps Google understand your website</a>
      </div>
    </div>
    <div class="card readable-card">
      <p class="eyebrow">Built for crawling</p>
      <h2>Designed to help Google find, understand and index your pages.</h2>
      <ul>
        <li>Automatic sitemap and robots.txt support.</li>
        <li>Clear internal links between templates, pricing, help, contact and custom build pages.</li>
        <li>SEO titles, descriptions and Open Graph previews for stronger search snippets.</li>
        <li>Structured data for the PBI Website Builder application and business information.</li>
        <li>Google Search Console friendly launch checklist for indexing and ongoing improvements.</li>
      </ul>
      <p class="muted small-note">No website builder can guarantee a number-one Google ranking, but PBI is structured to give small-business websites a cleaner crawl path and stronger SEO starting point.</p>
    </div>
  </div>
</section>`;

const SEO_JSON_LD = `
<script type="application/ld+json" id="pbi-seo-home-schema">
{
  "@context":"https://schema.org",
  "@graph":[
    {
      "@type":"WebSite",
      "name":"PBI Website Builder",
      "url":"https://www.purbeckbusinessinnovations.co.uk/",
      "description":"Free small-business website builder. Build for free and only pay when you publish.",
      "publisher":{"@id":"https://www.purbeckbusinessinnovations.co.uk/#organization"},
      "potentialAction":{
        "@type":"SearchAction",
        "target":"https://www.purbeckbusinessinnovations.co.uk/templates/?q={search_term_string}",
        "query-input":"required name=search_term_string"
      }
    },
    {
      "@type":"Organization",
      "@id":"https://www.purbeckbusinessinnovations.co.uk/#organization",
      "name":"Purbeck Business Innovations",
      "url":"https://www.purbeckbusinessinnovations.co.uk/",
      "logo":"https://www.purbeckbusinessinnovations.co.uk/assets/pbi-brand-logo-20260505.png"
    },
    {
      "@type":"FAQPage",
      "mainEntity":[
        {"@type":"Question","name":"Is PBI a free website builder?","acceptedAnswer":{"@type":"Answer","text":"You can start building for free with PBI. Payment is only required when you choose to publish your website live."}},
        {"@type":"Question","name":"Can PBI help small businesses with Google SEO?","acceptedAnswer":{"@type":"Answer","text":"PBI includes search-friendly page structure, metadata, sitemap support, internal links and launch checks to help Google understand and index your website."}},
        {"@type":"Question","name":"Can I request a custom website build?","acceptedAnswer":{"@type":"Answer","text":"Yes. PBI includes a custom build request route for businesses that want hands-on website setup, design and launch support."}}
      ]
    }
  ]
}
</script>`;

const SECRET_AGENT_SCRIPT = '<script src="/assets/pbi-secret-agent.js?v=20260508-launch-qa" defer></script>';

function shouldLoadSecretAgent(pathname) {
  return pathname.startsWith('/dashboard/') || pathname.startsWith('/admin/') || pathname.startsWith('/projects/') || pathname.startsWith('/canvas-builder/');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function normalisePathname(pathname) {
  let path = pathname || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
  return path;
}

function preferredBaseUrl(env) {
  return String(env?.PBI_BASE_URL || env?.PBI_SITE_BASE_URL || 'https://www.purbeckbusinessinnovations.co.uk').replace(/\/+$/, '');
}

async function loadSeoOverride(env, url) {
  if (!env?.DB || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) return null;
  const path = normalisePathname(url.pathname);
  const candidates = [
    url.toString(),
    `${url.origin}${path}`,
    `${preferredBaseUrl(env)}${path}`,
    path
  ].filter((value, index, list) => value && list.indexOf(value) === index);

  for (const candidate of candidates) {
    try {
      const row = await env.DB
        .prepare(`SELECT * FROM seo_page_overrides WHERE page_url = ? AND COALESCE(status,'active') = 'active' LIMIT 1`)
        .bind(candidate)
        .first();
      if (row) return row;
    } catch (_) {
      return null;
    }
  }
  return null;
}

function upsertMeta(html, selector, tagHtml) {
  if (selector.test(html)) return html.replace(selector, tagHtml);
  return html.replace('</head>', `${tagHtml}\n</head>`);
}

function insertSeoSchema(html, schemaJsonLd) {
  const trimmed = String(schemaJsonLd || '').trim();
  if (!trimmed || html.includes('id="pbi-seo-agent-schema"')) return html;
  const block = /^<script\b/i.test(trimmed)
    ? trimmed.replace('<script ', '<script id="pbi-seo-agent-schema" ')
    : `<script type="application/ld+json" id="pbi-seo-agent-schema">${trimmed}</script>`;
  return html.replace('</head>', `${block}\n</head>`);
}

function insertSeoBodyBlock(html, id, blockHtml) {
  const trimmed = String(blockHtml || '').trim();
  if (!trimmed || html.includes(`id="${id}"`)) return html;
  const block = /^<section\b/i.test(trimmed)
    ? trimmed.replace('<section ', `<section id="${id}" `)
    : `<section class="section soft-section" id="${id}"><div class="container">${trimmed}</div></section>`;
  if (html.includes('</main>')) return html.replace('</main>', `${block}\n</main>`);
  return html.replace('</body>', `${block}\n</body>`);
}

function applyMissingAltText(html, altText) {
  const alt = String(altText || '').trim();
  if (!alt) return html;
  return html
    .replace(/<img\b((?:(?!\balt=)[^>])*)>/gi, (match, attrs) => {
      const cleanAttrs = String(attrs || '').replace(/\s*\/\s*$/, '');
      return `<img${cleanAttrs} alt="${escapeAttr(alt)}"${/\/\s*>$/.test(match) ? ' />' : '>'}`;
    })
    .replace(/\balt=["']\s*["']/gi, `alt="${escapeAttr(alt)}"`);
}

function applySeoOverride(html, override) {
  if (!override) return html;
  let next = html;
  const title = String(override.title || '').trim();
  const description = String(override.meta_description || '').trim();
  const h1 = String(override.h1 || '').trim();
  const canonical = String(override.canonical || override.page_url || '').trim();
  const robots = String(override.robots || '').trim();

  if (title) {
    next = /<title[\s\S]*?<\/title>/i.test(next)
      ? next.replace(/<title[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
      : next.replace('</head>', `<title>${escapeHtml(title)}</title>\n</head>`);
    next = upsertMeta(next, /<meta[^>]+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapeAttr(title)}">`);
    next = upsertMeta(next, /<meta[^>]+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${escapeAttr(title)}">`);
  }

  if (description) {
    next = upsertMeta(next, /<meta[^>]+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapeAttr(description)}">`);
    next = upsertMeta(next, /<meta[^>]+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeAttr(description)}">`);
    next = upsertMeta(next, /<meta[^>]+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${escapeAttr(description)}">`);
  }

  if (canonical) {
    next = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(next)
      ? next.replace(/<link[^>]+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeAttr(canonical)}">`)
      : next.replace('</head>', `<link rel="canonical" href="${escapeAttr(canonical)}">\n</head>`);
  }

  if (robots) {
    next = upsertMeta(next, /<meta[^>]+name=["']robots["'][^>]*>/i, `<meta name="robots" content="${escapeAttr(robots)}">`);
  }

  if (h1) {
    next = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(next)
      ? next.replace(/<h1\b([^>]*)>[\s\S]*?<\/h1>/i, `<h1$1>${escapeHtml(h1)}</h1>`)
      : next;
  }

  next = insertSeoSchema(next, override.schema_jsonld);
  next = insertSeoBodyBlock(next, 'pbi-seo-agent-content', override.content_block_html);
  next = insertSeoBodyBlock(next, 'pbi-seo-agent-internal-links', override.internal_links_html);
  next = applyMissingAltText(next, override.image_alt_text);
  return next;
}

async function maybeServeCustomerDomain(context, url) {
  if (!context.env?.DB || isPbiPlatformHost(url.hostname)) return null;
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/api/') || url.pathname === '/favicon.ico') return null;

  const project = await findProjectByCustomDomain(context.env, url.hostname);
  if (!project) return null;
  return renderProjectResponse(project, context.env);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const customerDomainResponse = await maybeServeCustomerDomain(context, url);
  if (customerDomainResponse) return customerDomainResponse;

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  let html = await response.text();
  if (url.pathname === '/' && !html.includes('id="google-seo-ready"')) {
    html = html.replace('</main>', `${SEO_HOME_SECTION}\n</main>`);
  }
  if (url.pathname === '/' && !html.includes('id="pbi-seo-home-schema"')) {
    html = html.replace('</head>', `${SEO_JSON_LD}\n</head>`);
  }
  if (shouldLoadSecretAgent(url.pathname) && !html.includes('/assets/pbi-secret-agent.js')) {
    html = html.replace('</body>', `${SECRET_AGENT_SCRIPT}\n</body>`);
  }
  html = applySeoOverride(html, await loadSeoOverride(context.env, url));

  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
