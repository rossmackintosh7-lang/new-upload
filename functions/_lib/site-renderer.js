import { ensureCoreTables } from './auth.js';

const PBI_HOSTS = new Set([
  'purbeckbusinessinnovations.co.uk',
  'www.purbeckbusinessinnovations.co.uk',
  'admin.purbeckbusinessinnovations.co.uk',
  'assets.purbeckbusinessinnovations.co.uk'
]);

function htmlResponse(html, status = 200, extraHeaders = {}) {
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function parseJson(value, fallback = {}) {
  try {
    return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback);
  } catch {
    return fallback;
  }
}

function esc(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function plainText(value = '') {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function hostCandidates(hostname = '') {
  const host = String(hostname || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  const bare = host.replace(/^www\./, '');
  return [...new Set([host, bare, `www.${bare}`].filter(Boolean))];
}

export function isPbiPlatformHost(hostname = '') {
  const host = String(hostname || '').toLowerCase().split(':')[0];
  return PBI_HOSTS.has(host) || host.endsWith('.pages.dev') || host.endsWith('.workers.dev') || host === 'localhost' || host === '127.0.0.1';
}

async function ensureSiteColumns(env) {
  await ensureCoreTables(env);
  const alters = [
    `ALTER TABLE projects ADD COLUMN unpublished_at TEXT`,
    `ALTER TABLE projects ADD COLUMN published_at TEXT`,
    `ALTER TABLE projects ADD COLUMN domain_option TEXT DEFAULT 'pbi_subdomain'`,
    `ALTER TABLE projects ADD COLUMN custom_domain TEXT`
  ];
  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch (_) {}
  }
}

export async function findProjectByPublicSlug(env, slug = '') {
  if (!env?.DB || !slug) return null;
  await ensureSiteColumns(env);
  return await env.DB.prepare(`
    SELECT id, user_id, name, status, data_json, published, public_slug, plan, billing_status, domain_option, custom_domain, updated_at, published_at, unpublished_at
    FROM projects
    WHERE public_slug = ?
    LIMIT 1
  `).bind(String(slug).trim()).first();
}

export async function findProjectByCustomDomain(env, hostname = '') {
  if (!env?.DB) return null;
  const candidates = hostCandidates(hostname);
  if (!candidates.length) return null;
  await ensureSiteColumns(env);

  const placeholders = candidates.map(() => '?').join(',');
  return await env.DB.prepare(`
    SELECT id, user_id, name, status, data_json, published, public_slug, plan, billing_status, domain_option, custom_domain, updated_at, published_at, unpublished_at
    FROM projects
    WHERE LOWER(COALESCE(custom_domain, '')) IN (${placeholders})
    ORDER BY datetime(COALESCE(updated_at, created_at, '1970-01-01')) DESC
    LIMIT 1
  `).bind(...candidates).first();
}

function businessName(data, project) {
  return plainText(data.business_name || data.businessName || data.site_name || data.name || project?.name || 'Website');
}

function seoTitle(data, project) {
  return plainText(data.seo?.title || data.seo_title || `${businessName(data, project)} website`);
}

function seoDescription(data) {
  return plainText(data.seo?.description || data.seo_description || data.description || 'A PBI-hosted small-business website.');
}

function assetUrl(src = '', env = {}) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  const assetBase = String(env.PBI_ASSETS_PUBLIC_URL || env.PBI_BASE_URL || 'https://www.purbeckbusinessinnovations.co.uk').replace(/\/+$/, '');
  const pbiBase = String(env.PBI_BASE_URL || 'https://www.purbeckbusinessinnovations.co.uk').replace(/\/+$/, '');
  if (value.startsWith('/assets/')) return `${assetBase}${value}`;
  if (value.startsWith('/')) return `${pbiBase}${value}`;
  return value;
}

function pageKeys(data) {
  const selected = Array.isArray(data.selected_pages) ? data.selected_pages : (Array.isArray(data.selectedPages) ? data.selectedPages : []);
  const keys = selected.length ? selected : Object.keys(data.pages || data.blocksByPage || { home: {} });
  return keys.length ? keys : ['home'];
}

function pageLabel(key = '') {
  const cleaned = String(key || 'home').replace(/[-_]+/g, ' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Home';
}

function getHomeBlocks(data) {
  const blocksByPage = data.blocksByPage || {};
  const keys = pageKeys(data);
  const homeKey = keys.find((key) => key === 'home') || keys[0] || 'home';
  const blocks = Array.isArray(blocksByPage[homeKey]) ? blocksByPage[homeKey] : [];
  if (blocks.length) return blocks.filter((block) => block && block.publishable !== false && !block.hiddenOnPublish);
  if (Array.isArray(data.blocks)) return data.blocks.filter((block) => block && block.publishable !== false && !block.hiddenOnPublish);
  return [];
}

function blockTitle(block = {}, fallback = '') {
  return plainText(block.title || block.heading || block.headline || block.name || fallback);
}

function blockText(block = {}) {
  return plainText(block.body || block.copy || block.text || block.description || block.subtitle || block.content || '');
}

function blockImage(block = {}, env = {}) {
  return assetUrl(block.image || block.backgroundImage || block.media?.url || block.photo || '', env);
}

function imageAlt(block = {}, fallback = 'Business image') {
  return plainText(block.imageAlt || block.alt || block.media?.alt || block.title || fallback);
}

function listItems(block = {}) {
  const raw = block.items || block.services || block.features || block.steps || block.faqs || block.products || block.gallery || [];
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8).map((item) => {
    if (typeof item === 'string') return { title: item, text: '' };
    return {
      title: item.title || item.name || item.question || item.label || '',
      text: item.text || item.description || item.answer || item.copy || item.price || '',
      image: item.image || item.photo || ''
    };
  }).filter((item) => item.title || item.text || item.image);
}

function renderButton(block = {}) {
  const label = plainText(block.button || block.buttonText || block.cta || block.ctaText || block.action || '');
  if (!label) return '';
  const href = String(block.href || block.url || block.link || '#contact').trim() || '#contact';
  const aria = block.buttonAriaLabel ? ` aria-label="${esc(plainText(block.buttonAriaLabel))}"` : '';
  return `<a class="pbi-site-btn" href="${esc(href)}"${aria}>${esc(label)}</a>`;
}

function renderCards(items, env) {
  if (!items.length) return '';
  return `<div class="pbi-site-card-grid">${items.map((item) => {
    const image = assetUrl(item.image, env);
    return `<article class="pbi-site-card">
      ${image ? `<img src="${esc(image)}" alt="${esc(plainText(item.title || ''))}" loading="lazy">` : ''}
      ${item.title ? `<h3>${esc(plainText(item.title))}</h3>` : ''}
      ${item.text ? `<p>${esc(plainText(item.text))}</p>` : ''}
    </article>`;
  }).join('')}</div>`;
}

function renderBlock(block = {}, index = 0, env = {}) {
  const type = String(block.type || '').toLowerCase();
  if (type === 'navbar' || type === 'nav') return '';
  if (type === 'spacer') return '<div class="pbi-site-spacer" aria-hidden="true"></div>';

  const title = blockTitle(block, index === 0 ? 'Welcome' : '');
  const text = blockText(block);
  const image = blockImage(block, env);
  const items = listItems(block);
  const kicker = plainText(block.eyebrow || block.kicker || block.label || '');
  const button = renderButton(block);
  const id = type === 'contact' || /contact|enquiry|quote|book/i.test(`${title} ${text}`) ? 'contact' : '';
  const sectionClass = index === 0 || type.includes('hero') ? 'pbi-site-hero' : 'pbi-site-section';

  if (type.includes('hero') || index === 0) {
    return `<section class="${sectionClass}"${id ? ` id="${id}"` : ''}>
      <div class="pbi-site-copy">
        ${kicker ? `<p class="pbi-site-kicker">${esc(kicker)}</p>` : ''}
        ${title ? `<h1>${esc(title)}</h1>` : ''}
        ${text ? `<p class="pbi-site-lede">${esc(text)}</p>` : ''}
        ${button}
      </div>
      ${image ? `<img class="pbi-site-hero-image" src="${esc(image)}" alt="${esc(imageAlt(block, title || 'Business image'))}">` : ''}
    </section>`;
  }

  return `<section class="${sectionClass}"${id ? ` id="${id}"` : ''}>
    <div class="pbi-site-section-head">
      ${kicker ? `<p class="pbi-site-kicker">${esc(kicker)}</p>` : ''}
      ${title ? `<h2>${esc(title)}</h2>` : ''}
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${button}
    </div>
    ${image ? `<img class="pbi-site-wide-image" src="${esc(image)}" alt="${esc(imageAlt(block, title || 'Business image'))}" loading="lazy">` : ''}
    ${renderCards(items, env)}
  </section>`;
}

function renderNav(data, project) {
  const keys = pageKeys(data).slice(0, 6);
  return `<header class="pbi-site-nav">
    <a class="pbi-site-brand" href="/">${esc(businessName(data, project))}</a>
    <nav>${keys.map((key, index) => `<a href="${index === 0 ? '/' : `#${esc(key)}`}">${esc(pageLabel(key))}</a>`).join('')}<a class="pbi-site-pill" href="#contact">Contact</a></nav>
  </header>`;
}

function renderPublishedSite(project, env = {}) {
  const data = parseJson(project.data_json, {});
  const blocks = getHomeBlocks(data);
  const fallbackHero = {
    type: 'hero',
    title: data.page_main_heading || data.hero_title || businessName(data, project),
    text: data.hero_text || data.description || 'A small-business website published with PBI.',
    button: 'Get in touch'
  };
  const renderBlocks = blocks.length ? blocks : [fallbackHero];
  const accent = String(data.accent || data.theme?.accent || data.brand?.accent || '#b9673d').slice(0, 40);
  const background = String(data.background || data.theme?.background || '#fbf7ef').slice(0, 40);
  const title = seoTitle(data, project);
  const description = seoDescription(data);

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <style>
    :root{--accent:${esc(accent)};--bg:${esc(background)};--ink:#2d1c16;--muted:#755f53;--line:rgba(45,28,22,.14);--paper:rgba(255,252,246,.9);}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}a{color:inherit}.pbi-site-nav{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px clamp(18px,4vw,54px);background:rgba(255,252,246,.86);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}.pbi-site-brand{font-weight:900;text-decoration:none;font-size:clamp(20px,2vw,30px);letter-spacing:0}.pbi-site-nav nav{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}.pbi-site-nav nav a{text-decoration:none;font-weight:800;padding:10px 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.62)}.pbi-site-pill,.pbi-site-btn{background:var(--accent)!important;color:#fff!important;border-color:transparent!important}.pbi-site-btn{display:inline-flex;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 20px;margin-top:12px}.pbi-site-shell{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:28px 0 56px}.pbi-site-hero,.pbi-site-section{border-bottom:1px solid var(--line);padding:clamp(38px,7vw,96px) 0}.pbi-site-hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(280px,.95fr);align-items:center;gap:clamp(22px,5vw,64px);min-height:70vh}.pbi-site-copy{max-width:760px}.pbi-site-kicker{text-transform:uppercase;letter-spacing:.18em;font-size:13px;font-weight:900;color:var(--accent);margin:0 0 10px}.pbi-site-hero h1{font-size:clamp(48px,8vw,112px);line-height:.94;margin:0 0 22px;letter-spacing:0}.pbi-site-lede,.pbi-site-section-head p{font-size:clamp(18px,2vw,24px);color:var(--muted);max-width:760px;margin:0}.pbi-site-hero-image,.pbi-site-wide-image{width:100%;display:block;object-fit:cover;border-radius:24px;box-shadow:0 24px 80px rgba(45,28,22,.16)}.pbi-site-hero-image{aspect-ratio:4/5}.pbi-site-wide-image{aspect-ratio:16/8;margin-top:24px}.pbi-site-section h2{font-size:clamp(36px,5vw,72px);line-height:1;margin:0 0 16px}.pbi-site-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:28px}.pbi-site-card{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:18px}.pbi-site-card img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;margin-bottom:14px}.pbi-site-card h3{margin:0 0 8px;font-size:22px}.pbi-site-card p{margin:0;color:var(--muted)}.pbi-site-footer{padding:28px clamp(18px,4vw,54px);border-top:1px solid var(--line);color:var(--muted);background:rgba(255,252,246,.8)}.pbi-site-spacer{height:36px}@media(max-width:820px){.pbi-site-nav{align-items:flex-start;flex-direction:column}.pbi-site-nav nav{justify-content:flex-start}.pbi-site-hero{grid-template-columns:1fr;min-height:auto}.pbi-site-hero h1{font-size:clamp(42px,14vw,72px)}}
  </style>
</head>
<body>
  ${renderNav(data, project)}
  <main class="pbi-site-shell">
    ${renderBlocks.map((block, index) => renderBlock(block, index, env)).join('\n')}
  </main>
  <footer class="pbi-site-footer">Website hosted by PBI.</footer>
</body>
</html>`;
}

function isSuspended(project, data) {
  const billing = String(project?.billing_status || data.website_subscription_status || '').toLowerCase();
  const status = String(project?.status || data.public_site_status || '').toLowerCase();
  return billing === 'cancelled' || billing === 'unsubscribed' || status === 'cancelled' || status === 'suspended' || data.service_stopped === true;
}

export function renderSuspendedLanding(project = {}, env = {}) {
  const data = parseJson(project.data_json, {});
  const name = businessName(data, project);
  const pbiBase = String(env.PBI_BASE_URL || 'https://www.purbeckbusinessinnovations.co.uk').replace(/\/+$/, '');
  const logo = assetUrl('/assets/pbi-brand-logo-20260505.png', env);
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(name)} is temporarily offline</title>
  <meta name="robots" content="noindex,nofollow">
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f1e8;color:#2c1d17;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{width:min(880px,calc(100% - 32px));padding:42px;border:1px solid rgba(44,29,23,.14);border-radius:28px;background:rgba(255,252,247,.92);box-shadow:0 30px 90px rgba(44,29,23,.12)}img{width:86px;height:auto;display:block;margin-bottom:18px}p.kicker{text-transform:uppercase;letter-spacing:.18em;font-weight:900;font-size:13px;color:#9a5834;margin:0 0 12px}h1{font-size:clamp(42px,7vw,82px);line-height:.95;margin:0 0 18px;letter-spacing:0}p{font-size:19px;color:#765f53;max-width:690px;margin:0 0 14px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:13px 18px;border-radius:999px;text-decoration:none;font-weight:900;border:1px solid rgba(44,29,23,.16);color:#2c1d17;background:#fff}.primary{background:#b9673d;color:white;border-color:#b9673d}@media(max-width:680px){.shell{padding:28px;border-radius:20px}h1{font-size:42px}}
  </style>
</head>
<body>
  <main class="shell">
    <img src="${esc(logo)}" alt="PBI">
    <p class="kicker">Website offline</p>
    <h1>${esc(name)} is temporarily unavailable.</h1>
    <p>This website is no longer published through PBI because the active subscription has ended.</p>
    <p>If you own this website, restart your subscription or contact PBI and the site can be put back online.</p>
    <div class="actions">
      <a class="primary" href="${esc(pbiBase)}/contact/">Contact PBI</a>
      <a href="${esc(pbiBase)}/login/">Owner login</a>
    </div>
  </main>
</body>
</html>`;
}

export function renderProjectResponse(project, env = {}) {
  const data = parseJson(project?.data_json, {});
  if (!project || isSuspended(project, data) || Number(project.published || 0) !== 1) {
    return htmlResponse(renderSuspendedLanding(project || {}, env), 402);
  }
  return htmlResponse(renderPublishedSite(project, env), 200);
}
