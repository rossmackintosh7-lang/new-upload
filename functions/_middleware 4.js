<<<<<<< Updated upstream
function escHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(value = "") {
  return escHtml(value).replace(/"/g, "&quot;");
}

function normalisePath(pathname) {
  if (!pathname) return "/";
  if (pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

async function getOverride(env, requestUrl) {
  if (!env.DB) return null;

  const url = new URL(requestUrl);
  const noSlash = url.pathname;
  const slash = normalisePath(url.pathname);
  const candidates = [
    url.href,
    `${url.origin}${noSlash}`,
    `${url.origin}${slash}`,
    noSlash,
    slash
  ];

  for (const candidate of candidates) {
    const row = await env.DB
      .prepare(`SELECT * FROM seo_page_overrides WHERE page_url = ? AND status = 'active' LIMIT 1`)
      .bind(candidate)
      .first();

    if (row) return row;
  }

  return null;
}

function upsertHeadTag(html, regex, tagHtml) {
  if (regex.test(html)) return html.replace(regex, tagHtml);
  return html.replace(/<\/head>/i, `${tagHtml}\n</head>`);
}

function applyTitle(html, title) {
  if (!title) return html;
  const safe = escHtml(title).slice(0, 180);
  return upsertHeadTag(html, /<title[^>]*>[\s\S]*?<\/title>/i, `<title>${safe}</title>`);
}

function applyMetaDescription(html, description) {
  if (!description) return html;
  const safe = escAttr(description).slice(0, 320);
  const tag = `<meta name="description" content="${safe}">`;
  const re = /<meta[^>]+name=["']description["'][^>]*>/i;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function applyRobots(html, robots) {
  if (!robots) return html;
  const safe = escAttr(robots).slice(0, 120);
  const tag = `<meta name="robots" content="${safe}">`;
  const re = /<meta[^>]+name=["']robots["'][^>]*>/i;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function applyCanonical(html, canonical, requestUrl) {
  const href = canonical || requestUrl;
  if (!href) return html;
  const safe = escAttr(href).slice(0, 500);
  const tag = `<link rel="canonical" href="${safe}">`;
  const re = /<link[^>]+rel=["']canonical["'][^>]*>/i;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function applyH1(html, h1) {
  if (!h1) return html;
  const safe = escHtml(h1).slice(0, 180);
  if (/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) {
    return html.replace(/<h1\b([^>]*)>[\s\S]*?<\/h1>/i, `<h1$1>${safe}</h1>`);
  }
  return html.replace(/<main\b[^>]*>/i, (m) => `${m}\n<h1>${safe}</h1>`);
}

function applyJsonLd(html, jsonld) {
  if (!jsonld) return html;
  const safe = String(jsonld).replace(/<\/script/gi, "<\\/script");
  const marker = "data-pbi-seo-agent-schema";
  if (html.includes(marker)) {
    return html.replace(/<script[^>]+data-pbi-seo-agent-schema[^>]*>[\s\S]*?<\/script>/i, `<script type="application/ld+json" ${marker}>${safe}</script>`);
  }
  return html.replace(/<\/head>/i, `<script type="application/ld+json" ${marker}>${safe}</script>\n</head>`);
}

function applyImageAlt(html, altText) {
  if (!altText) return html;
  const safe = escAttr(altText).slice(0, 220);
  return html.replace(/<img\b([^>]*?)>/gi, (tag, attrs) => {
    if (/\salt\s*=\s*["'][^"']{4,}["']/i.test(tag)) return tag;
    if (/\salt\s*=/i.test(tag)) return tag.replace(/\salt\s*=\s*["'][^"']*["']/i, ` alt="${safe}"`);
    return `<img${attrs} alt="${safe}">`;
  });
}

function insertBeforeMainClose(html, block, marker) {
  if (!block || html.includes(marker)) return html;
  if (/<\/main>/i.test(html)) return html.replace(/<\/main>/i, `${block}\n</main>`);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${block}\n</body>`);
  return `${html}\n${block}`;
}

function applyOverride(html, override, requestUrl) {
  let output = html;
  output = applyTitle(output, override.title);
  output = applyMetaDescription(output, override.meta_description);
  output = applyRobots(output, override.robots);
  output = applyCanonical(output, override.canonical, requestUrl);
  output = applyH1(output, override.h1);
  output = applyJsonLd(output, override.schema_jsonld);
  output = applyImageAlt(output, override.image_alt_text);
  output = insertBeforeMainClose(output, override.content_block_html, "data-seo-agent-applied=\"content\"");
  output = insertBeforeMainClose(output, override.internal_links_html, "data-seo-agent-applied=\"internal-links\"");
  return output;
}

export async function onRequest(context) {
  const { request, env } = context;

  const response = await context.next();

  if (request.method !== "GET") return response;

  const url = new URL(request.url);
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/cdn-cgi/") ||
    url.pathname.includes(".")
  ) {
    return response;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  try {
    const override = await getOverride(env, request.url);
    if (!override) return response;

    const original = await response.text();
    const html = applyOverride(original, override, request.url);
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("x-pbi-seo-agent", "override-applied");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (err) {
    console.warn("PBI SEO Agent override skipped:", err);
    return response;
  }
=======
// PBI admin subdomain router
// If visitors open admin.purbeckbusinessinnovations.co.uk, send them straight to the admin command centre.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  if (host === "admin.purbeckbusinessinnovations.co.uk" && (url.pathname === "/" || url.pathname === "")) {
    url.pathname = "/admin/";
    return Response.redirect(url.toString(), 302);
  }

  return context.next();
>>>>>>> Stashed changes
}
