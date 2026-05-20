import { json, error, requireAdmin } from '../_shared.js';

export { json, error, requireAdmin };

const BASE_PATHS = [
  '/',
  '/ai-website-builder/',
  '/small-business-websites/',
  '/website-design-for-small-businesses/',
  '/website-refurbishment/',
  '/business-automation-tools/',
  '/seo-for-small-businesses/',
  '/affordable-business-websites/',
  '/website-builder-uk/',
  '/ai-business-tools/',
  '/small-business-automation/',
  '/restaurant-website-design/',
  '/cafe-website-builder/',
  '/pub-website-design/',
  '/butcher-shop-websites/',
  '/retail-business-websites/',
  '/tradesperson-websites/',
  '/salon-website-builder/',
  '/hospitality-business-systems/',
  '/dorset-website-design/',
  '/london-small-business-websites/',
  '/manchester-website-design/',
  '/bristol-web-design/',
  '/custom-websites/',
  '/pricing/',
  '/seo-care/',
  '/website-management/',
  '/website-audit/',
  '/templates/',
  '/e-commerce/',
  '/contact/'
];

export const SEO_TASK_IMPACT = {
  missing_title: 'High',
  duplicate_title: 'High',
  missing_meta_description: 'High',
  weak_meta_description: 'Medium',
  weak_h1_structure: 'High',
  missing_alt_tags: 'Medium',
  slow_loading_assets: 'Medium',
  oversized_images: 'Medium',
  broken_internal_links: 'High',
  missing_canonical: 'High',
  poor_internal_linking: 'Medium',
  thin_content: 'High',
  schema_issues: 'Medium',
  mobile_ux_issues: 'High',
  accessibility_issues: 'Medium',
  missing_open_graph: 'Low'
};

function nowIso() {
  return new Date().toISOString();
}

export function baseUrl(env) {
  return String(env.PBI_BASE_URL || env.PBI_SITE_BASE_URL || 'https://www.purbeckbusinessinnovations.co.uk').replace(/\/+$/, '');
}

export function normalisePath(value) {
  try {
    const parsed = new URL(value, 'https://www.purbeckbusinessinnovations.co.uk');
    let path = parsed.pathname || '/';
    if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
    return path;
  } catch {
    let path = String(value || '/').trim() || '/';
    if (!path.startsWith('/')) path = `/${path}`;
    if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
    return path;
  }
}

export function fullUrl(env, pathOrUrl) {
  const value = String(pathOrUrl || '/').trim() || '/';
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl(env)}${normalisePath(value)}`;
}

function textOnly(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(html) {
  const text = textOnly(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function firstMatch(html, regex) {
  const match = String(html || '').match(regex);
  return match ? String(match[1] || '').replace(/\s+/g, ' ').trim() : '';
}

function attr(tag, name) {
  const match = String(tag || '').match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? match[1] : '';
}

function tags(html, name) {
  return String(html || '').match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) || [];
}

function anchors(html) {
  return (String(html || '').match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi) || [])
    .map((tag) => ({ tag, href: attr(tag, 'href'), text: textOnly(tag) }))
    .filter((link) => link.href && !link.href.startsWith('#') && !/^(mailto|tel|javascript):/i.test(link.href));
}

function sameSiteLink(env, href) {
  try {
    const target = new URL(href, baseUrl(env));
    const origin = new URL(baseUrl(env)).origin;
    if (target.origin !== origin) return null;
    return target;
  } catch {
    return null;
  }
}

function issue(type, severity, message, recommendation, fixPayload = {}) {
  return {
    type,
    severity,
    message,
    recommendation,
    estimated_impact: SEO_TASK_IMPACT[type] || 'Medium',
    fix_payload: fixPayload
  };
}

function scoreFromIssues(issues, wordCount) {
  const penalties = { high: 13, medium: 8, low: 4 };
  const issuePenalty = issues.reduce((sum, item) => sum + (penalties[item.severity] || 6), 0);
  const depthPenalty = wordCount < 260 ? 10 : wordCount < 450 ? 4 : 0;
  return Math.max(8, Math.min(100, 100 - issuePenalty - depthPenalty));
}

async function safeFetch(url, init = {}) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PBI-SEO-Agent/1.0' },
      redirect: 'follow',
      ...init
    });
    return { response, load_time_ms: Date.now() - started, error: '' };
  } catch (err) {
    return { response: null, load_time_ms: Date.now() - started, error: err?.message || 'Fetch failed' };
  }
}

async function discoverFromSitemap(env) {
  const url = `${baseUrl(env)}/sitemap.xml`;
  const { response } = await safeFetch(url);
  if (!response?.ok) return [];
  const xml = await response.text();
  const origin = new URL(baseUrl(env)).origin;
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => match[1].trim())
    .filter((loc) => {
      try { return new URL(loc).origin === origin; } catch { return false; }
    });
}

export async function discoverSeoPages(env, limit = 120) {
  const configured = String(env.PBI_SEO_PAGES || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => fullUrl(env, item));
  const fromSitemap = await discoverFromSitemap(env).catch(() => []);
  const basePaths = BASE_PATHS.map((path) => fullUrl(env, path));
  return [...new Set([...fromSitemap, ...configured, ...basePaths])].slice(0, limit);
}

async function brokenLinks(env, html) {
  const candidates = anchors(html)
    .map((link) => sameSiteLink(env, link.href))
    .filter(Boolean)
    .filter((url) => !/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip)$/i.test(url.pathname))
    .slice(0, 18);

  const broken = [];
  for (const target of candidates) {
    const { response } = await safeFetch(target.toString(), { method: 'GET' });
    if (!response || response.status >= 400) {
      broken.push({ url: target.toString(), status: response?.status || 0 });
    }
  }
  return broken;
}

function schemaTypes(html) {
  const scripts = String(html || '').match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const types = [];
  for (const script of scripts) {
    const body = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
      const parsed = JSON.parse(body);
      const nodes = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
      for (const node of nodes) {
        if (node?.['@type']) types.push(Array.isArray(node['@type']) ? node['@type'].join(',') : node['@type']);
      }
    } catch {
      types.push('invalid');
    }
  }
  return types;
}

export async function auditPage(env, pageUrl, titleCounts = {}) {
  const { response, load_time_ms, error: fetchError } = await safeFetch(pageUrl);
  const status = response?.status || 0;
  const html = response ? await response.text().catch(() => '') : '';
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const canonical = firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i)
    || firstMatch(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i);
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const h1s = [...String(html).matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => textOnly(match[1]));
  const images = tags(html, 'img');
  const imagesMissingAlt = images.filter((tag) => !attr(tag, 'alt').trim());
  const imagesWithoutLazy = images.filter((tag) => !/loading=["']lazy["']/i.test(tag) && !/class=["'][^"']*logo/i.test(tag));
  const scriptCount = tags(html, 'script').length;
  const stylesheetCount = (String(html).match(/<link\b[^>]*rel=["']stylesheet["']/gi) || []).length;
  const linkList = anchors(html);
  const internalLinks = linkList.map((link) => sameSiteLink(env, link.href)).filter(Boolean);
  const schema = schemaTypes(html);
  const wordCount = words(html);
  const broken = response?.ok ? await brokenLinks(env, html) : [];
  const issues = [];

  if (!response?.ok) issues.push(issue('broken_internal_links', 'high', `Page could not be fetched (${status || fetchError}).`, 'Check the route and make sure the page is published.'));
  if (!title) issues.push(issue('missing_title', 'high', 'Missing title tag.', 'Add a page-specific title under 60 characters.', { field: 'title' }));
  if (title && titleCounts[title] > 1) issues.push(issue('duplicate_title', 'high', `Duplicate title: ${title}`, 'Rewrite this title so it targets the page intent uniquely.', { field: 'title', current: title }));
  if (!description) issues.push(issue('missing_meta_description', 'high', 'Missing meta description.', 'Add a useful search snippet around 140-160 characters.', { field: 'meta_description' }));
  if (description && (description.length < 80 || description.length > 170)) issues.push(issue('weak_meta_description', 'medium', 'Meta description length is outside the ideal range.', 'Rewrite the description to be useful, natural and concise.', { field: 'meta_description', current: description }));
  if (h1s.length !== 1) issues.push(issue('weak_h1_structure', 'high', h1s.length ? 'Page has multiple H1 headings.' : 'Page has no H1 heading.', 'Use exactly one clear H1 matching the page purpose.', { field: 'h1', current: h1s.join(' | ') }));
  if (imagesMissingAlt.length) issues.push(issue('missing_alt_tags', 'medium', `${imagesMissingAlt.length} image(s) are missing alt text.`, 'Add descriptive alt text where the image carries meaning.', { field: 'image_alt_text', count: imagesMissingAlt.length }));
  if (imagesWithoutLazy.length > 2) issues.push(issue('oversized_images', 'medium', 'Several non-logo images do not use lazy loading.', 'Add loading="lazy" and width/height to non-critical images.', { count: imagesWithoutLazy.length }));
  if ((scriptCount + stylesheetCount) > 24 || load_time_ms > 2500) issues.push(issue('slow_loading_assets', 'medium', 'Page has heavy asset pressure or slow response time.', 'Review scripts, CSS and images for Core Web Vitals impact.', { load_time_ms, scriptCount, stylesheetCount }));
  if (broken.length) issues.push(issue('broken_internal_links', 'high', `${broken.length} internal link(s) returned an error.`, 'Fix or remove broken internal links.', { broken }));
  if (!canonical) issues.push(issue('missing_canonical', 'high', 'Missing canonical URL.', 'Add a canonical tag pointing to the preferred URL.', { field: 'canonical', value: pageUrl }));
  if (internalLinks.length < 4) issues.push(issue('poor_internal_linking', 'medium', 'Page has few contextual internal links.', 'Add links to related service, industry and support pages.', { internalLinkCount: internalLinks.length }));
  if (wordCount < 360) issues.push(issue('thin_content', 'high', `Thin content detected (${wordCount} words).`, 'Add specific examples, workflows, FAQs and helpful decision guidance.', { wordCount }));
  if (!schema.length || schema.includes('invalid')) issues.push(issue('schema_issues', 'medium', schema.includes('invalid') ? 'Invalid JSON-LD schema detected.' : 'No structured data found.', 'Add valid Service, FAQ, Breadcrumb or Article schema.', { schema }));
  if (!viewport) issues.push(issue('mobile_ux_issues', 'high', 'Missing responsive viewport meta tag.', 'Add a mobile viewport meta tag.'));
  if (!/<html\b[^>]*lang=/i.test(html)) issues.push(issue('accessibility_issues', 'medium', 'HTML language attribute is missing.', 'Set html lang="en-GB" for accessibility and locale clarity.'));
  if (!/<meta[^>]+property=["']og:title["']/i.test(html)) issues.push(issue('missing_open_graph', 'low', 'OpenGraph title is missing.', 'Add OpenGraph metadata for richer sharing previews.'));

  const issueCounts = issues.reduce((memo, item) => {
    memo[item.severity] = (memo[item.severity] || 0) + 1;
    return memo;
  }, {});
  const pagePath = normalisePath(pageUrl);
  return {
    page_url: pageUrl,
    path: pagePath,
    title,
    meta_description: description,
    h1: h1s[0] || '',
    canonical,
    score: scoreFromIssues(issues, wordCount),
    word_count: wordCount,
    status_code: status,
    load_time_ms,
    schema_types: schema,
    issue_counts: issueCounts,
    metrics: {
      title_length: title.length,
      meta_description_length: description.length,
      h1_count: h1s.length,
      image_count: images.length,
      missing_alt_count: imagesMissingAlt.length,
      internal_link_count: internalLinks.length,
      script_count: scriptCount,
      stylesheet_count: stylesheetCount,
      broken_links: broken
    },
    issues
  };
}

export async function ensureSeoAgentTables(env) {
  if (!env.DB) return;

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_audits (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'running',
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    scope_json TEXT DEFAULT '{}',
    summary_json TEXT DEFAULT '{}',
    pages_scanned INTEGER DEFAULT 0,
    issues_found INTEGER DEFAULT 0,
    created_by TEXT
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_page_scores (
    id TEXT PRIMARY KEY,
    audit_id TEXT,
    page_url TEXT NOT NULL,
    path TEXT,
    title TEXT,
    meta_description TEXT,
    h1 TEXT,
    score INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    status_code INTEGER DEFAULT 0,
    load_time_ms INTEGER DEFAULT 0,
    issue_counts_json TEXT DEFAULT '{}',
    metrics_json TEXT DEFAULT '{}',
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_tasks (
    id TEXT PRIMARY KEY,
    audit_id TEXT,
    page_url TEXT NOT NULL,
    task_type TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    reasoning TEXT NOT NULL,
    estimated_impact TEXT NOT NULL,
    suggested_implementation TEXT NOT NULL,
    fix_payload_json TEXT DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    source TEXT DEFAULT 'audit',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    applied_at TEXT
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    target_url TEXT,
    intent TEXT,
    priority TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  for (const sql of [
    `ALTER TABLE seo_keywords ADD COLUMN ranking_position INTEGER`,
    `ALTER TABLE seo_keywords ADD COLUMN click_through_rate REAL`,
    `ALTER TABLE seo_keywords ADD COLUMN impressions INTEGER DEFAULT 0`,
    `ALTER TABLE seo_keywords ADD COLUMN seo_difficulty INTEGER DEFAULT 0`,
    `ALTER TABLE seo_keywords ADD COLUMN search_intent TEXT`,
    `ALTER TABLE seo_keywords ADD COLUMN group_type TEXT DEFAULT 'national'`,
    `ALTER TABLE seo_keywords ADD COLUMN last_updated TEXT`,
    `ALTER TABLE seo_keywords ADD COLUMN notes TEXT`,
    `ALTER TABLE seo_keywords ADD COLUMN status TEXT DEFAULT 'active'`
  ]) {
    try { await env.DB.prepare(sql).run(); } catch (_) {}
  }

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_internal_links (
    id TEXT PRIMARY KEY,
    audit_id TEXT,
    source_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    anchor_text TEXT,
    opportunity_type TEXT DEFAULT 'contextual',
    reasoning TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'suggested',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_content_clusters (
    id TEXT PRIMARY KEY,
    cluster_key TEXT UNIQUE,
    name TEXT NOT NULL,
    topic TEXT,
    intent TEXT,
    pillar_url TEXT,
    supporting_urls_json TEXT DEFAULT '[]',
    content_ideas_json TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_reports (
    id TEXT PRIMARY KEY,
    report_type TEXT DEFAULT 'snapshot',
    period_start TEXT,
    period_end TEXT,
    summary_json TEXT DEFAULT '{}',
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_page_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_url TEXT NOT NULL UNIQUE,
    title TEXT,
    meta_description TEXT,
    h1 TEXT,
    canonical TEXT,
    robots TEXT,
    schema_jsonld TEXT,
    content_block_html TEXT,
    internal_links_html TEXT,
    image_alt_text TEXT,
    source_suggestion_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_apply_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_id INTEGER,
    page_url TEXT,
    action TEXT,
    details_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  for (const sql of [
    `CREATE INDEX IF NOT EXISTS idx_seo_audits_started ON seo_audits(started_at)`,
    `CREATE INDEX IF NOT EXISTS idx_seo_page_scores_url ON seo_page_scores(page_url)`,
    `CREATE INDEX IF NOT EXISTS idx_seo_page_scores_audit ON seo_page_scores(audit_id)`,
    `CREATE INDEX IF NOT EXISTS idx_seo_tasks_status ON seo_tasks(status)`,
    `CREATE INDEX IF NOT EXISTS idx_seo_tasks_page ON seo_tasks(page_url)`,
    `CREATE INDEX IF NOT EXISTS idx_seo_keywords_group ON seo_keywords(group_type)`,
    `CREATE INDEX IF NOT EXISTS idx_seo_internal_links_status ON seo_internal_links(status)`,
    `CREATE INDEX IF NOT EXISTS idx_seo_content_clusters_key ON seo_content_clusters(cluster_key)`
  ]) {
    await env.DB.prepare(sql).run();
  }
}

export async function runAudit(env, admin, options = {}) {
  await ensureSeoAgentTables(env);
  const auditId = crypto.randomUUID();
  const limit = Math.max(1, Math.min(160, Number(options.limit || 80)));
  const urls = Array.isArray(options.urls) && options.urls.length
    ? options.urls.map((url) => fullUrl(env, url))
    : await discoverSeoPages(env, limit);
  const uniqueUrls = [...new Set(urls)].slice(0, limit);

  await env.DB.prepare(`INSERT INTO seo_audits (id,status,scope_json,created_by,started_at) VALUES (?, 'running', ?, ?, CURRENT_TIMESTAMP)`)
    .bind(auditId, JSON.stringify({ limit, urls: uniqueUrls }), admin?.email || '').run();

  const titleCounts = {};
  const preflight = [];
  for (const url of uniqueUrls) {
    const { response } = await safeFetch(url);
    const html = response ? await response.text().catch(() => '') : '';
    const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    if (title) titleCounts[title] = (titleCounts[title] || 0) + 1;
    preflight.push({ url, title, status: response?.status || 0 });
  }

  const pageResults = [];
  for (const url of uniqueUrls) {
    const result = await auditPage(env, url, titleCounts);
    pageResults.push(result);
    await savePageAudit(env, auditId, result);
  }

  await buildInternalLinkOpportunities(env, auditId, pageResults);
  const issuesFound = pageResults.reduce((sum, page) => sum + page.issues.length, 0);
  const averageScore = pageResults.length ? Math.round(pageResults.reduce((sum, page) => sum + page.score, 0) / pageResults.length) : 0;
  const summary = {
    audit_id: auditId,
    generated_at: nowIso(),
    pages_scanned: pageResults.length,
    issues_found: issuesFound,
    average_score: averageScore,
    high_priority_issues: pageResults.reduce((sum, page) => sum + page.issues.filter((item) => item.severity === 'high').length, 0),
    lowest_pages: pageResults.slice().sort((a, b) => a.score - b.score).slice(0, 8).map((page) => ({ page_url: page.page_url, score: page.score })),
    top_pages: pageResults.slice().sort((a, b) => b.score - a.score).slice(0, 8).map((page) => ({ page_url: page.page_url, score: page.score }))
  };
  await env.DB.prepare(`UPDATE seo_audits SET status = 'completed', completed_at = CURRENT_TIMESTAMP, pages_scanned = ?, issues_found = ?, summary_json = ? WHERE id = ?`)
    .bind(pageResults.length, issuesFound, JSON.stringify(summary), auditId).run();
  return { audit_id: auditId, summary, pages: pageResults };
}

async function savePageAudit(env, auditId, page) {
  await env.DB.prepare(`INSERT INTO seo_page_scores (id,audit_id,page_url,path,title,meta_description,h1,score,word_count,status_code,load_time_ms,issue_counts_json,metrics_json,checked_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
    .bind(
      crypto.randomUUID(),
      auditId,
      page.page_url,
      page.path,
      page.title,
      page.meta_description,
      page.h1,
      page.score,
      page.word_count,
      page.status_code,
      page.load_time_ms,
      JSON.stringify(page.issue_counts || {}),
      JSON.stringify(page.metrics || {})
    ).run();

  for (const item of page.issues) {
    await createTask(env, auditId, page.page_url, item);
  }
}

export async function createTask(env, auditId, pageUrl, item) {
  const existing = await env.DB.prepare(`SELECT id FROM seo_tasks WHERE page_url = ? AND task_type = ? AND status IN ('pending','in_progress','preview') LIMIT 1`)
    .bind(pageUrl, item.type).first();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  const priority = item.severity === 'high' ? 'high' : item.severity === 'low' ? 'low' : 'medium';
  await env.DB.prepare(`INSERT INTO seo_tasks (id,audit_id,page_url,task_type,priority,reasoning,estimated_impact,suggested_implementation,fix_payload_json,status,source,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,'pending','audit',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
    .bind(id, auditId, pageUrl, item.type, priority, item.message, item.estimated_impact, item.recommendation, JSON.stringify(item.fix_payload || {})).run();
  return id;
}

async function buildInternalLinkOpportunities(env, auditId, pages) {
  const scored = pages.map((page) => ({ url: page.page_url, path: page.path, title: page.title || page.h1 || page.path }));
  const groups = [
    { match: /automation|ai-business|small-business-automation/i, target: '/business-automation-tools/', anchor: 'business automation tools' },
    { match: /website|builder|web-design|design/i, target: '/website-builder-uk/', anchor: 'UK website builder' },
    { match: /seo|google/i, target: '/seo-for-small-businesses/', anchor: 'SEO for small businesses' },
    { match: /restaurant|cafe|pub|hospitality/i, target: '/hospitality-business-systems/', anchor: 'hospitality business systems' },
    { match: /retail|shop|butcher/i, target: '/retail-business-websites/', anchor: 'retail business websites' }
  ];
  for (const page of scored) {
    for (const group of groups) {
      if (!group.match.test(`${page.path} ${page.title}`)) continue;
      const target = fullUrl(env, group.target);
      if (target === page.url) continue;
      const existing = await env.DB.prepare(`SELECT id FROM seo_internal_links WHERE source_url = ? AND target_url = ? AND status != 'dismissed' LIMIT 1`)
        .bind(page.url, target).first();
      if (existing) continue;
      await env.DB.prepare(`INSERT INTO seo_internal_links (id,audit_id,source_url,target_url,anchor_text,opportunity_type,reasoning,priority,status,created_at,updated_at)
        VALUES (?,?,?,?,?,'topical_cluster',?,'medium','suggested',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
        .bind(crypto.randomUUID(), auditId, page.url, target, group.anchor, `Connect this page into the ${group.anchor} topical cluster.`).run();
    }
  }
}

export async function latestDashboard(env) {
  await ensureSeoAgentTables(env);
  const latestAudit = await env.DB.prepare(`SELECT * FROM seo_audits ORDER BY datetime(started_at) DESC LIMIT 1`).first();
  const auditId = latestAudit?.id || '';
  const pages = auditId
    ? (await env.DB.prepare(`SELECT * FROM seo_page_scores WHERE audit_id = ? ORDER BY score ASC LIMIT 100`).bind(auditId).all()).results || []
    : [];
  const tasks = (await env.DB.prepare(`SELECT * FROM seo_tasks WHERE status NOT IN ('completed','dismissed') ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, datetime(created_at) DESC LIMIT 120`).all()).results || [];
  const keywords = (await env.DB.prepare(`SELECT * FROM seo_keywords WHERE COALESCE(status,'active') != 'archived' ORDER BY COALESCE(last_updated, created_at) DESC LIMIT 120`).all()).results || [];
  const links = (await env.DB.prepare(`SELECT * FROM seo_internal_links WHERE status = 'suggested' ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, datetime(created_at) DESC LIMIT 80`).all()).results || [];
  const clusters = (await env.DB.prepare(`SELECT * FROM seo_content_clusters ORDER BY datetime(updated_at) DESC LIMIT 60`).all()).results || [];
  const score = pages.length ? Math.round(pages.reduce((sum, page) => sum + Number(page.score || 0), 0) / pages.length) : Number(parseJson(latestAudit?.summary_json, {}).average_score || 0);
  const countByType = (type) => tasks.filter((task) => task.task_type === type).length;
  return {
    latestAudit,
    summary: {
      overall_seo_score: score,
      indexed_pages: pages.filter((page) => Number(page.status_code) >= 200 && Number(page.status_code) < 400).length,
      pages_scanned: pages.length,
      missing_meta_descriptions: countByType('missing_meta_description'),
      broken_links: countByType('broken_internal_links'),
      thin_content_pages: countByType('thin_content'),
      missing_alt_tags: countByType('missing_alt_tags'),
      internal_link_opportunities: links.length,
      core_web_vitals_warnings: countByType('slow_loading_assets') + countByType('oversized_images'),
      pages_missing_schema: countByType('schema_issues'),
      keyword_tracking_summary: keywords.length,
      open_tasks: tasks.length,
      high_priority_tasks: tasks.filter((task) => task.priority === 'high').length
    },
    pages,
    tasks,
    keywords,
    links,
    clusters
  };
}

export async function callSeoAi(env, payload, fallback = null) {
  if (!env.OPENAI_API_KEY) return fallback;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5.5',
      input: [
        {
          role: 'system',
          content: [
            'You are PBI SEO Operations Agent for a UK small-business website and automation platform.',
            'Return only strict JSON.',
            'Use UK English.',
            'Do not keyword stuff.',
            'Follow helpful content principles.',
            'Recommendations must be editable, natural and production-safe.'
          ].join(' ')
        },
        { role: 'user', content: JSON.stringify(payload).slice(0, 12000) }
      ]
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return fallback;
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('') || '';
  try { return JSON.parse(text); } catch { return fallback; }
}

export function ruleBasedFix(task = {}) {
  const page = new URL(task.page_url || baseUrl({}), 'https://www.purbeckbusinessinnovations.co.uk');
  const readable = page.pathname.replace(/^\/|\/$/g, '').replace(/-/g, ' ') || 'UK small business websites';
  const title = readable.split(' ').map((word) => word ? word[0].toUpperCase() + word.slice(1) : '').join(' ');
  return {
    title: `${title} | PBI`,
    meta_description: `Practical ${readable} support from PBI for UK small businesses that need clearer websites, automation and operational systems.`,
    h1: `${title} for UK small businesses`,
    schema_jsonld: '',
    content_block_html: '',
    internal_links_html: '<section class="section soft-section"><div class="container"><p class="eyebrow">Related PBI services</p><div class="pbi-seo-link-grid"><a href="/website-builder-uk/">Website Builder UK</a><a href="/business-automation-tools/">Business automation tools</a><a href="/seo-for-small-businesses/">SEO for small businesses</a></div></div></section>'
  };
}

export function parseJson(value, fallback = {}) {
  try { return typeof value === 'string' ? JSON.parse(value || JSON.stringify(fallback)) : (value || fallback); }
  catch { return fallback; }
}
