import { json, error } from './json.js';

export const PLANS = {
  starter: { pages: 5, freeform: false, cms: false, ecommerce: false, customCode: false, collab: false, animations: 'basic' },
  business: { pages: 20, freeform: true, cms: false, ecommerce: false, customCode: false, collab: false, animations: 'standard' },
  plus: { pages: 100, freeform: true, cms: true, ecommerce: true, customCode: true, collab: true, animations: 'premium' }
};

export function cleanPlan(value = 'starter') {
  const plan = String(value || 'starter').toLowerCase().replace(/[^a-z]/g, '');
  if (['plus', 'business', 'starter'].includes(plan)) return plan;
  if (['freepreview', 'free', 'preview'].includes(plan)) return 'starter';
  return 'starter';
}

export function priceEnvNameForPlan(plan) {
  const p = cleanPlan(plan);
  if (p === 'plus') return 'STRIPE_PRICE_PLUS';
  if (p === 'business') return 'STRIPE_PRICE_BUSINESS';
  return 'STRIPE_PRICE_STARTER';
}

export function allBlocks(data = {}) {
  return Object.entries(data.blocksByPage || {}).flatMap(([page, blocks]) => (blocks || []).map((block) => ({ page, block })));
}

export function selectedPages(data = {}) {
  const pages = Array.isArray(data.selected_pages) ? data.selected_pages : [];
  return pages.length ? pages : Object.keys(data.pages || data.blocksByPage || { home: {} });
}

export function enforceProjectPackage(data = {}, planValue = 'starter') {
  const plan = cleanPlan(planValue || data.plan || data.package);
  const limits = PLANS[plan];
  const clone = JSON.parse(JSON.stringify(data || {}));
  clone.plan = plan;
  clone.package = plan;
  clone.packageWarnings = [];

  clone.blocksByPage = clone.blocksByPage || { home: [] };
  clone.pages = clone.pages || {};

  const pages = selectedPages(clone);
  if (pages.length > limits.pages) {
    clone.selected_pages = pages.slice(0, limits.pages);
    clone.packageWarnings.push(`${plan} allows ${limits.pages} pages. Extra pages were locked from publishing.`);
  }

  for (const { block } of allBlocks(clone)) {
    block.publishable = block.publishable !== false;
    block.packageLocked = false;
    if (!limits.freeform && block.positionMode === 'free') {
      block.positionMode = 'flow';
      block.packageLocked = true;
      clone.packageWarnings.push('Freeform positioning requires Business or Plus. A freeform block was converted to flow layout.');
    }
    if (!limits.cms && ['cms', 'cmsList', 'blog', 'caseStudy'].includes(block.type)) {
      block.packageLocked = true;
      block.publishable = false;
      clone.packageWarnings.push('CMS blocks require Plus.');
    }
    if (!limits.ecommerce && ['productGrid', 'retailStrip', 'cart', 'checkout'].includes(block.type)) {
      block.packageLocked = true;
      block.publishable = false;
      clone.packageWarnings.push('Retail/ecommerce blocks require Plus.');
    }
    if (!limits.customCode && ['customCode', 'embed'].includes(block.type)) {
      block.packageLocked = true;
      block.publishable = false;
      clone.packageWarnings.push('Custom code/embed blocks require Plus.');
    }
    if (limits.animations === 'basic' && ['parallax', 'premium', 'scrollReveal'].includes(block.animation)) {
      block.animation = 'rise';
      clone.packageWarnings.push('Premium animations require Business or Plus.');
    }
  }
  clone.packageWarnings = [...new Set(clone.packageWarnings)].slice(0, 20);
  return clone;
}

export function validateProjectForPublish(data = {}, planValue = 'starter') {
  const plan = cleanPlan(planValue || data.plan || data.package);
  const enforced = enforceProjectPackage(data, plan);
  const blocks = allBlocks(enforced).filter(({ block }) => block.publishable !== false);
  const issues = [];
  const warnings = [...(enforced.packageWarnings || [])];
  const seo = enforced.seo || {};
  const pages = selectedPages(enforced);

  if (!enforced.business_name && !enforced.page_main_heading) warnings.push('Add a business name or clear homepage heading.');
  if (!blocks.length) issues.push('Add at least one publishable page block.');
  if (!blocks.some(({ block }) => block.image || block.backgroundImage)) warnings.push('Add at least one real image.');
  if (!blocks.some(({ block }) => ['contact', 'booking', 'cta'].includes(block.type) || /contact|enquiry|book|quote/i.test(`${block.title || ''} ${block.button || ''}`))) issues.push('Add a contact, booking, quote or CTA block.');
  if (!(seo.title || enforced.seo_title)) issues.push('Add an SEO title.');
  if (!(seo.description || enforced.seo_description)) issues.push('Add an SEO description.');
  if (pages.length < 3) warnings.push('A stronger small-business site usually needs at least Home, Services and Contact.');
  if (blocks.some(({ block }) => block.packageLocked || block.publishable === false)) issues.push('Remove or upgrade locked package features before publishing.');

  const score = Math.max(0, Math.min(100, 100 - issues.length * 18 - warnings.length * 6));
  return { ok: issues.length === 0, score, issues: [...new Set(issues)], warnings: [...new Set(warnings)], data: enforced, plan };
}

export async function ensurePlatformTables(env) {
  if (!env.DB) throw new Error('Database binding missing.');
  const sql = [
    `CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, filename TEXT, content_type TEXT, size INTEGER DEFAULT 0, url TEXT, alt TEXT, storage_key TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, project_id TEXT, name TEXT, email TEXT, phone TEXT, message TEXT, status TEXT DEFAULT 'new', source TEXT, data_json TEXT DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS cms_items (id TEXT PRIMARY KEY, project_id TEXT, user_id TEXT, type TEXT, title TEXT, slug TEXT, status TEXT DEFAULT 'draft', body TEXT, excerpt TEXT, seo_title TEXT, seo_description TEXT, data_json TEXT DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS analytics_events (id TEXT PRIMARY KEY, project_id TEXT, event_name TEXT, path TEXT, data_json TEXT DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS project_versions (id TEXT PRIMARY KEY, project_id TEXT, user_id TEXT, plan TEXT, data_json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`
  ];
  for (const statement of sql) await env.DB.prepare(statement).run();

  const alters = [
    `ALTER TABLE projects ADD COLUMN readiness_score INTEGER DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN package_warnings TEXT DEFAULT '[]'`,
    `ALTER TABLE projects ADD COLUMN last_validated_at TEXT`,
    `ALTER TABLE projects ADD COLUMN staging_slug TEXT`,
    `ALTER TABLE projects ADD COLUMN unpublished_at TEXT`
  ];
  for (const statement of alters) { try { await env.DB.prepare(statement).run(); } catch {} }
}

export function slugify(value = 'site') {
  return String(value || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70) || 'site';
}

export { json, error };
