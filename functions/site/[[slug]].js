import { ensureHostingTables, getHostingConfig, isPaymentActive, parseProjectData, sitePublicUrl } from '../_lib/hosting.js';

function htmlResponse(html, status = 200, headers = {}) {
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=60' : 'no-store',
      ...headers
    }
  });
}

function textResponse(body, status = 200, type = 'text/plain; charset=utf-8') {
  return new Response(body, { status, headers: { 'content-type': type, 'cache-control': 'public, max-age=300' } });
}

function parseJson(value, fallback = {}) {
  try { return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback); } catch { return fallback; }
}

function esc(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function plain(value = '') {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function assetUrl(src = '', env = {}) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  const mediaBase = getHostingConfig(env).mediaPublicUrl;
  const siteBase = String(env.PBI_BASE_URL || '').replace(/\/+$/g, '');
  if (value.startsWith('projects/') && mediaBase) return `${mediaBase}/${value}`;
  if (value.startsWith('/assets/')) return siteBase ? `${siteBase}${value}` : value;
  if (value.startsWith('/')) return siteBase ? `${siteBase}${value}` : value;
  return value;
}

function pageKeys(data = {}) {
  const selected = Array.isArray(data.selected_pages) ? data.selected_pages : (Array.isArray(data.selectedPages) ? data.selectedPages : []);
  const keys = selected.length ? selected : Object.keys(data.pages || data.blocksByPage || { home: {} });
  return keys.length ? keys : ['home'];
}

function pageLabel(key = '') {
  if (key === 'home') return 'Home';
  const label = String(key || '').replace(/[-_]+/g, ' ').trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Page';
}

function pagePath(key = '') {
  return String(key || 'home').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'home';
}

function pageForPath(data, path = '') {
  const wanted = String(path || '').replace(/^\/+|\/+$/g, '');
  const keys = pageKeys(data);
  if (!wanted) return keys.find((key) => key === 'home') || keys[0] || 'home';
  return keys.find((key) => pagePath(key) === wanted) || keys.find((key) => key === wanted) || '';
}

function pageBlocks(data = {}, key = 'home') {
  const blocks = data.blocksByPage?.[key] || (key === 'home' ? data.blocks : []);
  return (Array.isArray(blocks) ? blocks : []).filter((block) => block && block.publishable !== false && !block.hiddenOnPublish && !block.packageLocked);
}

function items(block = {}) {
  const raw = block.items || block.services || block.features || block.steps || block.faqs || block.products || block.gallery || block.testimonials || [];
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 16).map((item) => {
    if (typeof item === 'string') return { title: item, text: '', image: '' };
    return {
      title: item.title || item.name || item.question || item.label || '',
      text: item.text || item.description || item.answer || item.copy || item.price || '',
      image: item.image || item.photo || item.url || '',
      button: item.button || item.cta || ''
    };
  }).filter((item) => item.title || item.text || item.image);
}

function blockTitle(block = {}, fallback = '') {
  return plain(block.title || block.heading || block.headline || block.name || fallback);
}

function blockText(block = {}) {
  return plain(block.body || block.copy || block.text || block.description || block.subtitle || block.content || '');
}

function blockImage(block = {}, env = {}) {
  return assetUrl(block.image || block.backgroundImage || block.media?.url || block.photo || '', env);
}

function renderButton(block = {}, fallbackHref = '#contact') {
  const label = plain(block.button || block.buttonText || block.cta || block.ctaText || block.action || '');
  if (!label) return '';
  const href = String(block.href || block.url || block.link || fallbackHref || '#contact').trim() || '#contact';
  return `<a class="pbi-live-btn" href="${esc(href)}">${esc(label)}</a>`;
}

function renderCards(block = {}, env = {}) {
  const list = items(block);
  if (!list.length) return '';
  const type = String(block.type || '').toLowerCase();
  const className = type === 'gallery' ? 'pbi-live-gallery' : 'pbi-live-grid';
  return `<div class="${className}">${list.map((item) => {
    const image = assetUrl(item.image, env);
    return `<article class="pbi-live-card">
      ${image ? `<img src="${esc(image)}" alt="${esc(plain(item.title || 'Business image'))}" loading="lazy">` : ''}
      ${item.title ? `<h3>${esc(plain(item.title))}</h3>` : ''}
      ${item.text ? `<p>${esc(plain(item.text))}</p>` : ''}
    </article>`;
  }).join('')}</div>`;
}

function renderContactForm(site, block = {}) {
  const title = blockTitle(block, 'Send an enquiry');
  const text = blockText(block);
  return `<section class="pbi-live-section pbi-live-contact" id="contact">
    <div class="pbi-live-section-head">
      <p class="pbi-live-kicker">${esc(plain(block.eyebrow || block.kicker || 'Contact'))}</p>
      <h2>${esc(title)}</h2>
      ${text ? `<p>${esc(text)}</p>` : ''}
    </div>
    <form class="pbi-live-form" data-pbi-lead-form>
      <input type="hidden" name="project_id" value="${esc(site.project_id)}">
      <input type="hidden" name="site_id" value="${esc(site.id)}">
      <input class="pbi-live-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label>Your name<input name="name" autocomplete="name"></label>
      <label>Email address<input type="email" name="email" autocomplete="email"></label>
      <label>Phone number<input name="phone" autocomplete="tel"></label>
      <label class="wide">How can we help?<textarea name="message" rows="5"></textarea></label>
      <button class="pbi-live-btn" type="submit">Send enquiry</button>
      <p class="pbi-live-form-status" role="status"></p>
    </form>
  </section>`;
}

function renderBlock(block = {}, index = 0, env = {}, site = {}) {
  const type = String(block.type || '').toLowerCase();
  if (['navbar', 'nav', 'navbarblock'].includes(type)) return '';
  if (type === 'spacer') return `<div class="pbi-live-spacer" aria-hidden="true"></div>`;
  if (['contact', 'booking'].includes(type)) return renderContactForm(site, block);

  const title = blockTitle(block, index === 0 ? 'Welcome' : '');
  const text = blockText(block);
  const kicker = plain(block.eyebrow || block.kicker || block.label || '');
  const image = blockImage(block, env);
  const isHero = index === 0 || type.includes('hero');
  const button = renderButton(block);
  const cardMarkup = renderCards(block, env);

  if (isHero) {
    return `<section class="pbi-live-hero">
      <div class="pbi-live-copy">
        ${kicker ? `<p class="pbi-live-kicker">${esc(kicker)}</p>` : ''}
        ${title ? `<h1>${esc(title)}</h1>` : ''}
        ${text ? `<p class="pbi-live-lede">${esc(text)}</p>` : ''}
        ${button}
      </div>
      ${image ? `<img class="pbi-live-hero-image" src="${esc(image)}" alt="${esc(plain(block.imageAlt || title || 'Business image'))}">` : ''}
    </section>`;
  }

  if (type === 'cta') {
    return `<section class="pbi-live-cta">
      ${kicker ? `<p class="pbi-live-kicker">${esc(kicker)}</p>` : ''}
      ${title ? `<h2>${esc(title)}</h2>` : ''}
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${button}
    </section>`;
  }

  return `<section class="pbi-live-section">
    <div class="pbi-live-section-head">
      ${kicker ? `<p class="pbi-live-kicker">${esc(kicker)}</p>` : ''}
      ${title ? `<h2>${esc(title)}</h2>` : ''}
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${button}
    </div>
    ${image && !cardMarkup ? `<img class="pbi-live-wide-image" src="${esc(image)}" alt="${esc(plain(block.imageAlt || title || 'Business image'))}" loading="lazy">` : ''}
    ${cardMarkup}
  </section>`;
}

function siteName(data = {}, site = {}) {
  return plain(data.business_name || data.site_name || data.name || site.project_name || site.site_slug || 'PBI website');
}

function renderNav(data = {}, site = {}, currentKey = 'home', env = {}, origin = '') {
  const keys = pageKeys(data).slice(0, 8);
  return `<header class="pbi-live-nav">
    <a class="pbi-live-brand" href="${esc(sitePublicUrl(env, site.site_slug, '', origin))}">${esc(siteName(data, site))}</a>
    <nav>
      ${keys.map((key) => `<a class="${key === currentKey ? 'active' : ''}" href="${esc(sitePublicUrl(env, site.site_slug, key === 'home' ? '' : pagePath(key), origin))}">${esc(pageLabel(key))}</a>`).join('')}
      <a class="pbi-live-pill" href="#contact">Contact</a>
    </nav>
  </header>`;
}

function renderOffline(site = {}, env = {}, reason = 'This website is temporarily unavailable.') {
  const pbiBase = String(env.PBI_BASE_URL || 'https://www.purbeckbusinessinnovations.co.uk').replace(/\/+$/g, '');
  return `<!doctype html>
<html lang="en-GB">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Website offline</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f1e9;color:#291b16;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.box{width:min(840px,calc(100% - 32px));border:1px solid rgba(41,27,22,.14);border-radius:28px;background:#fffaf3;padding:42px;box-shadow:0 24px 70px rgba(41,27,22,.12)}p.k{font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#b96b3b;margin:0 0 12px}h1{font-size:clamp(42px,7vw,78px);line-height:.96;margin:0 0 18px}p{font-size:19px;color:#725d52}.btn{display:inline-flex;margin-top:18px;padding:14px 20px;border-radius:999px;background:#bf7941;color:white;text-decoration:none;font-weight:900}</style></head>
<body><main class="box"><p class="k">Website offline</p><h1>${esc(site.project_name || site.site_slug || 'This website')} is not currently live.</h1><p>${esc(reason)}</p><a class="btn" href="${esc(pbiBase)}/contact/">Contact PBI</a></main></body></html>`;
}

function renderSitePage({ site, project, deployment, data, pageKey, env, request }) {
  const url = new URL(request.url);
  const name = siteName(data, { ...site, project_name: project?.name });
  const seoTitle = plain(data.pages?.[pageKey]?.seo_title || data.seo?.title || data.seo_title || `${name} - ${pageLabel(pageKey)}`);
  const description = plain(data.pages?.[pageKey]?.seo_description || data.seo?.description || data.seo_description || data.description || 'A small-business website hosted by PBI.');
  const blocks = pageBlocks(data, pageKey);
  const fallback = [{ type: 'hero', title: name, text: description, button: 'Contact us' }, { type: 'contact', title: 'Send an enquiry' }];
  const activeBlocks = blocks.length ? blocks : fallback;
  const accent = String(data.accent_color || data.accent || data.theme?.accent || '#bf7941').slice(0, 50);
  const background = String(data.background_color || data.background || data.theme?.background || '#fbf6ee').slice(0, 50);
  const canonical = sitePublicUrl(env, site.site_slug, pageKey === 'home' ? '' : pagePath(pageKey), url.origin);
  const image = activeBlocks.map((block) => blockImage(block, env)).find(Boolean) || assetUrl('/assets/pbi-brand-logo-20260505.png', env);

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(seoTitle)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:title" content="${esc(seoTitle)}">
  <meta property="og:description" content="${esc(description)}">
  ${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
  <style>
    :root{--accent:${esc(accent)};--bg:${esc(background)};--ink:#2b1b15;--muted:#725e52;--line:rgba(43,27,21,.14);--paper:rgba(255,252,246,.9)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}a{color:inherit}.pbi-live-nav{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px clamp(18px,4vw,56px);background:rgba(255,252,246,.88);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}.pbi-live-brand{text-decoration:none;font-weight:950;font-size:clamp(20px,2vw,30px)}.pbi-live-nav nav{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}.pbi-live-nav nav a{text-decoration:none;font-weight:850;border:1px solid var(--line);background:rgba(255,255,255,.66);border-radius:999px;padding:10px 14px}.pbi-live-nav nav a.active{border-color:var(--accent)}.pbi-live-pill,.pbi-live-btn{background:var(--accent)!important;color:white!important;border-color:var(--accent)!important}.pbi-live-shell{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:34px 0 64px}.pbi-live-hero,.pbi-live-section,.pbi-live-cta,.pbi-live-contact{padding:clamp(42px,8vw,96px) 0;border-bottom:1px solid var(--line)}.pbi-live-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.86fr);gap:clamp(24px,5vw,70px);align-items:center;min-height:72vh}.pbi-live-kicker{margin:0 0 12px;text-transform:uppercase;letter-spacing:.18em;font-size:13px;font-weight:950;color:var(--accent)}h1,h2,h3,p{letter-spacing:0}.pbi-live-hero h1{font-size:clamp(48px,8vw,108px);line-height:.94;margin:0 0 20px}.pbi-live-section h2,.pbi-live-cta h2,.pbi-live-contact h2{font-size:clamp(36px,5.2vw,74px);line-height:1;margin:0 0 16px}.pbi-live-lede,.pbi-live-section-head p,.pbi-live-cta p{font-size:clamp(18px,2vw,24px);color:var(--muted);max-width:760px;margin:0}.pbi-live-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:999px;padding:14px 20px;margin-top:18px;font-weight:950}.pbi-live-hero-image,.pbi-live-wide-image{width:100%;display:block;object-fit:cover;border-radius:24px;box-shadow:0 22px 80px rgba(43,27,21,.15)}.pbi-live-hero-image{aspect-ratio:4/5}.pbi-live-wide-image{aspect-ratio:16/8;margin-top:28px}.pbi-live-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:28px}.pbi-live-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:28px}.pbi-live-card{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:18px}.pbi-live-card img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;margin-bottom:14px}.pbi-live-card h3{font-size:22px;line-height:1.08;margin:0 0 8px}.pbi-live-card p{margin:0;color:var(--muted)}.pbi-live-cta{background:var(--paper);border:1px solid var(--line);border-radius:28px;margin:42px 0;padding:clamp(30px,6vw,70px)}.pbi-live-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:26px}.pbi-live-form label{display:grid;gap:8px;font-weight:850}.pbi-live-form input,.pbi-live-form textarea{width:100%;border:1px solid var(--line);border-radius:14px;background:white;color:var(--ink);font:inherit;padding:13px}.pbi-live-form .wide{grid-column:1/-1}.pbi-live-form button{border:0;cursor:pointer;width:max-content}.pbi-live-form-status{grid-column:1/-1;color:var(--muted);font-weight:800}.pbi-live-hp{position:absolute;left:-10000px}.pbi-live-footer{padding:28px clamp(18px,4vw,56px);border-top:1px solid var(--line);background:rgba(255,252,246,.82);color:var(--muted)}.pbi-live-spacer{height:38px}@media(max-width:820px){.pbi-live-nav{align-items:flex-start;flex-direction:column}.pbi-live-nav nav{justify-content:flex-start}.pbi-live-hero{grid-template-columns:1fr;min-height:auto}.pbi-live-hero h1{font-size:clamp(42px,14vw,72px)}.pbi-live-form{grid-template-columns:1fr}}
  </style>
</head>
<body data-site-id="${esc(site.id)}" data-project-id="${esc(site.project_id)}" data-deploy="${esc(deployment?.id || '')}">
  ${renderNav(data, site, pageKey, env, url.origin)}
  <main class="pbi-live-shell">
    ${activeBlocks.map((block, index) => renderBlock(block, index, env, site)).join('\n')}
    ${activeBlocks.some((block) => ['contact', 'booking'].includes(String(block.type || '').toLowerCase())) ? '' : renderContactForm(site, { title: 'Send an enquiry', eyebrow: 'Contact' })}
  </main>
  <footer class="pbi-live-footer">Website hosted and managed by PBI.</footer>
  <script>
    (() => {
      const siteId = document.body.dataset.siteId || '';
      const projectId = document.body.dataset.projectId || '';
      const send = (path, payload) => fetch(path, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) }).catch(() => {});
      send('/api/analytics/track', { site_id:siteId, project_id:projectId, event_name:'page_view', path:location.pathname, referrer:document.referrer });
      document.querySelectorAll('[data-pbi-lead-form]').forEach((form) => {
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const status = form.querySelector('.pbi-live-form-status');
          const payload = Object.fromEntries(new FormData(form).entries());
          payload.site_id = siteId;
          payload.project_id = projectId;
          payload.source = 'published_site';
          if (status) status.textContent = 'Sending...';
          const response = await fetch('/api/leads/submit', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) }).catch(() => null);
          const data = response ? await response.json().catch(() => ({})) : {};
          if (response?.ok && data.ok !== false) {
            form.reset();
            if (status) status.textContent = 'Thanks, your enquiry has been sent.';
          } else if (status) {
            status.textContent = data.error || 'Please check your details and try again.';
          }
        });
      });
    })();
  </script>
</body>
</html>`;
}

async function loadSite(env, slug) {
  await ensureHostingTables(env);
  const site = await env.DB.prepare(`
    SELECT ps.*, p.name AS project_name, p.data_json AS project_data_json
    FROM published_sites ps
    LEFT JOIN projects p ON p.id = ps.project_id
    WHERE ps.site_slug = ?
    LIMIT 1
  `).bind(slug).first();
  if (!site) return {};

  const deployment = site.latest_deployment_id
    ? await env.DB.prepare(`SELECT * FROM site_deployments WHERE id = ? LIMIT 1`).bind(site.latest_deployment_id).first()
    : await env.DB.prepare(`SELECT * FROM site_deployments WHERE site_id = ? ORDER BY datetime(created_at) DESC LIMIT 1`).bind(site.id).first();
  const snapshot = parseJson(deployment?.snapshot_json, null);
  const data = snapshot || parseProjectData({ data_json: site.project_data_json || '{}' });
  return { site, deployment, data };
}

function canRenderSite(site = {}, env = {}) {
  const cfg = getHostingConfig(env);
  const status = String(site.status || '').toLowerCase();
  if (status !== 'live') return { ok: false, reason: 'This website has not been published or has been taken offline.' };
  if (cfg.requirePayment && !isPaymentActive(site.payment_status)) {
    return { ok: false, reason: 'This website is waiting for an active subscription before it can be shown.' };
  }
  return { ok: true };
}

export async function onRequestGet({ request, env, params }) {
  const raw = Array.isArray(params.slug) ? params.slug.join('/') : String(params.slug || '');
  const parts = raw.split('/').filter(Boolean);
  const slug = decodeURIComponent(parts[0] || '');
  const tail = parts.slice(1).join('/');

  if (!slug) return htmlResponse(renderOffline({}, env, 'No site was requested.'), 404);

  const loaded = await loadSite(env, slug);
  if (!loaded.site) return htmlResponse(renderOffline({ site_slug: slug }, env, 'PBI could not find this hosted site.'), 404);

  const renderState = canRenderSite(loaded.site, env);
  if (!renderState.ok) return htmlResponse(renderOffline(loaded.site, env, renderState.reason), 402);

  if (tail === 'robots.txt') {
    return textResponse(`User-agent: *\nAllow: /\nSitemap: ${sitePublicUrl(env, loaded.site.site_slug, 'sitemap.xml', new URL(request.url).origin)}\n`);
  }

  if (tail === 'sitemap.xml') {
    const origin = new URL(request.url).origin;
    const urls = pageKeys(loaded.data).map((key) => sitePublicUrl(env, loaded.site.site_slug, key === 'home' ? '' : pagePath(key), origin));
    return textResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((loc) => `  <url><loc>${esc(loc)}</loc></url>`).join('\n')}\n</urlset>`, 200, 'application/xml; charset=utf-8');
  }

  const pageKey = pageForPath(loaded.data, tail);
  if (!pageKey) return htmlResponse(renderOffline(loaded.site, env, 'That page does not exist on this hosted site.'), 404);

  return htmlResponse(renderSitePage({ ...loaded, pageKey, env, request }), 200);
}
