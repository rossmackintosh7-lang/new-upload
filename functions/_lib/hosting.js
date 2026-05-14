import { ensureCoreTables } from './auth.js';
import { cleanPlan } from './package-rules.js';

export function getHostingConfig(env = {}) {
  const baseDomain = String(env.PBI_HOSTING_BASE_DOMAIN || 'pbisites.co.uk')
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/g, '')
    .trim();
  return {
    baseDomain,
    siteBaseUrl: String(env.PBI_SITE_BASE_URL || '').replace(/\/+$/g, ''),
    requirePayment: String(env.PBI_REQUIRE_PAYMENT_TO_PUBLISH || 'true').toLowerCase() !== 'false',
    mediaPublicUrl: String(env.PBI_MEDIA_PUBLIC_URL || env.PBI_ASSETS_PUBLIC_URL || '').replace(/\/+$/g, ''),
    defaultPlan: 'starter'
  };
}

async function safeRun(env, sql) {
  try { await env.DB.prepare(sql).run(); } catch (_) {}
}

export async function ensureHostingTables(env) {
  if (!env?.DB) throw new Error('Database binding missing.');
  await ensureCoreTables(env);

  const statements = [
    `CREATE TABLE IF NOT EXISTS published_sites (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id TEXT NOT NULL, site_slug TEXT NOT NULL UNIQUE, default_hostname TEXT, custom_domain TEXT, primary_url TEXT, status TEXT NOT NULL DEFAULT 'draft', plan TEXT NOT NULL DEFAULT 'starter', stripe_customer_id TEXT, stripe_subscription_id TEXT, stripe_checkout_session_id TEXT, payment_status TEXT DEFAULT 'unpaid', readiness_score INTEGER DEFAULT 0, latest_deployment_id TEXT, last_deploy_hash TEXT, seo_title TEXT, seo_description TEXT, primary_domain TEXT, published_at TEXT, unpublished_at TEXT, suspended_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS site_domains (id TEXT PRIMARY KEY, site_id TEXT NOT NULL, project_id TEXT NOT NULL, user_id TEXT NOT NULL, domain TEXT, domain_name TEXT, hostname_type TEXT DEFAULT 'custom', domain_type TEXT DEFAULT 'custom', status TEXT DEFAULT 'pending_dns', ssl_status TEXT DEFAULT 'pending', verification_token TEXT, cloudflare_hostname_id TEXT, dns_target TEXT, is_primary INTEGER DEFAULT 0, verification_json TEXT DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS site_deployments (id TEXT PRIMARY KEY, site_id TEXT NOT NULL, project_id TEXT NOT NULL, user_id TEXT NOT NULL, deploy_hash TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'starter', status TEXT DEFAULT 'created', notes TEXT, snapshot_json TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS site_events (id TEXT PRIMARY KEY, site_id TEXT, project_id TEXT, user_id TEXT, event_type TEXT NOT NULL, message TEXT, data_json TEXT DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, site_id TEXT, filename TEXT, content_type TEXT, size INTEGER DEFAULT 0, url TEXT, alt TEXT, storage_key TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, project_id TEXT, site_id TEXT, name TEXT, email TEXT, phone TEXT, message TEXT, status TEXT DEFAULT 'new', source TEXT, data_json TEXT DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS analytics_events (id TEXT PRIMARY KEY, project_id TEXT, site_id TEXT, event_name TEXT, path TEXT, visitor_id TEXT, referrer TEXT, user_agent TEXT, data_json TEXT DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`
  ];
  for (const statement of statements) await env.DB.prepare(statement).run();

  const alters = [
    `ALTER TABLE published_sites ADD COLUMN default_hostname TEXT`,
    `ALTER TABLE published_sites ADD COLUMN primary_url TEXT`,
    `ALTER TABLE published_sites ADD COLUMN stripe_checkout_session_id TEXT`,
    `ALTER TABLE published_sites ADD COLUMN latest_deployment_id TEXT`,
    `ALTER TABLE published_sites ADD COLUMN primary_domain TEXT`,
    `ALTER TABLE site_domains ADD COLUMN domain TEXT`,
    `ALTER TABLE site_domains ADD COLUMN domain_name TEXT`,
    `ALTER TABLE site_domains ADD COLUMN hostname_type TEXT DEFAULT 'custom'`,
    `ALTER TABLE site_domains ADD COLUMN domain_type TEXT DEFAULT 'custom'`,
    `ALTER TABLE site_domains ADD COLUMN verification_token TEXT`,
    `ALTER TABLE site_domains ADD COLUMN cloudflare_hostname_id TEXT`,
    `ALTER TABLE site_domains ADD COLUMN dns_target TEXT`,
    `ALTER TABLE site_domains ADD COLUMN is_primary INTEGER DEFAULT 0`,
    `ALTER TABLE site_domains ADD COLUMN verification_json TEXT DEFAULT '{}'`,
    `ALTER TABLE site_deployments ADD COLUMN plan TEXT DEFAULT 'starter'`,
    `ALTER TABLE media_assets ADD COLUMN site_id TEXT`,
    `ALTER TABLE leads ADD COLUMN site_id TEXT`,
    `ALTER TABLE analytics_events ADD COLUMN site_id TEXT`,
    `ALTER TABLE analytics_events ADD COLUMN visitor_id TEXT`,
    `ALTER TABLE analytics_events ADD COLUMN referrer TEXT`,
    `ALTER TABLE analytics_events ADD COLUMN user_agent TEXT`,
    `ALTER TABLE projects ADD COLUMN readiness_score INTEGER DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN package_warnings TEXT DEFAULT '[]'`,
    `ALTER TABLE projects ADD COLUMN last_validated_at TEXT`,
    `ALTER TABLE projects ADD COLUMN published_at TEXT`,
    `ALTER TABLE projects ADD COLUMN unpublished_at TEXT`,
    `ALTER TABLE projects ADD COLUMN domain_option TEXT DEFAULT 'pbi_subdomain'`,
    `ALTER TABLE projects ADD COLUMN custom_domain TEXT`
  ];
  for (const statement of alters) await safeRun(env, statement);

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_published_sites_project_id ON published_sites(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_published_sites_user_id ON published_sites(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_published_sites_status ON published_sites(status)`,
    `CREATE INDEX IF NOT EXISTS idx_published_sites_subscription ON published_sites(stripe_subscription_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_site_domains_domain ON site_domains(domain)`,
    `CREATE INDEX IF NOT EXISTS idx_site_domains_domain_name ON site_domains(domain_name)`,
    `CREATE INDEX IF NOT EXISTS idx_site_domains_site_id ON site_domains(site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_site_deployments_site_id ON site_deployments(site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_site_deployments_project_id ON site_deployments(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_site_events_site_id ON site_events(site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_site_events_project_id ON site_events(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_site_events_event_type ON site_events(event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_media_assets_project_id ON media_assets(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_media_assets_site_id ON media_assets(site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_site_id ON leads(site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_project_id ON analytics_events(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_site_id ON analytics_events(site_id)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name)`
  ];
  for (const statement of indexes) await safeRun(env, statement);
}

export function parseProjectData(project = {}) {
  try {
    return typeof project.data_json === 'string' ? JSON.parse(project.data_json || '{}') : (project.data_json || {});
  } catch {
    return {};
  }
}

export function cleanSiteSlug(value = 'site') {
  return String(value || 'site')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64) || 'site';
}

export async function uniqueSiteSlug(env, base = 'site', projectId = '') {
  const root = cleanSiteSlug(base || 'site');
  let slug = root;
  let index = 2;

  while (true) {
    const existing = await env.DB.prepare(`
      SELECT project_id FROM published_sites WHERE site_slug = ? LIMIT 1
    `).bind(slug).first();
    if (!existing || String(existing.project_id || '') === String(projectId || '')) return slug;
    slug = `${root}-${index++}`.slice(0, 64).replace(/-$/g, '');
  }
}

export function paymentStatusFromValue(value = '') {
  const status = String(value || '').toLowerCase();
  if (['active', 'trialing', 'paid', 'not_required'].includes(status)) return 'active';
  if (['past_due', 'unpaid'].includes(status)) return 'past_due';
  if (['cancelled', 'canceled', 'unsubscribed'].includes(status)) return 'cancelled';
  if (['failed', 'incomplete'].includes(status)) return 'failed';
  return status || 'unpaid';
}

export function isPaymentActive(value = '') {
  return ['active', 'paid', 'trialing', 'not_required'].includes(paymentStatusFromValue(value));
}

export function sitePublicUrl(env = {}, slug = '', path = '', origin = '') {
  const cfg = getHostingConfig(env);
  const root = String(cfg.siteBaseUrl || origin || env.PBI_BASE_URL || '').replace(/\/+$/g, '');
  const cleanPath = String(path || '').replace(/^\/+|\/+$/g, '');
  const route = `/site/${encodeURIComponent(slug)}/${cleanPath ? `${cleanPath}/` : ''}`;
  return root ? `${root}${route}` : route;
}

export async function deploymentHash(data = {}) {
  const text = JSON.stringify(data || {});
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function seoFromData(data = {}, project = {}) {
  return {
    title: String(data.seo?.title || data.seo_title || data.business_name || data.site_name || project.name || 'PBI website').slice(0, 160),
    description: String(data.seo?.description || data.seo_description || data.description || '').slice(0, 260)
  };
}

export async function upsertPublishedSite(env, options = {}) {
  await ensureHostingTables(env);
  const project = options.project || {};
  const data = options.data || parseProjectData(project);
  const siteSlug = cleanSiteSlug(options.siteSlug || project.public_slug || await uniqueSiteSlug(env, project.name || 'website', project.id));
  const existingBySlug = await env.DB.prepare(`SELECT * FROM published_sites WHERE site_slug = ? LIMIT 1`).bind(siteSlug).first();
  if (existingBySlug && String(existingBySlug.project_id || '') !== String(project.id || '')) {
    throw new Error('That public site slug is already in use.');
  }

  const existing = existingBySlug || await env.DB.prepare(`SELECT * FROM published_sites WHERE project_id = ? LIMIT 1`).bind(project.id).first();
  const id = existing?.id || crypto.randomUUID();
  const seo = seoFromData(data, project);
  const status = String(options.status || existing?.status || 'draft');
  const paymentStatus = paymentStatusFromValue(options.paymentStatus || project.billing_status || existing?.payment_status || 'unpaid');
  const customDomain = String(options.customDomain || data.custom_domain || project.custom_domain || '').trim().toLowerCase();
  const cfg = getHostingConfig(env);
  const publicRoot = String(cfg.siteBaseUrl || env.PBI_BASE_URL || `https://${cfg.baseDomain}`).replace(/\/+$/g, '');
  let defaultHostname = cfg.baseDomain;
  try { defaultHostname = new URL(publicRoot).hostname || cfg.baseDomain; } catch (_) {}
  const primaryDomain = customDomain || defaultHostname;
  const primaryUrl = customDomain ? `https://${customDomain}` : `${publicRoot}/site/${encodeURIComponent(siteSlug)}/`;
  const plan = cleanPlan(options.plan || project.plan || data.plan || data.package || 'starter');
  const stripeCustomer = String(options.stripeCustomerId || project.stripe_customer_id || existing?.stripe_customer_id || '');
  const stripeSubscription = String(options.stripeSubscriptionId || project.stripe_subscription_id || existing?.stripe_subscription_id || '');
  const stripeCheckoutSession = String(options.stripeCheckoutSessionId || project.stripe_checkout_session_id || existing?.stripe_checkout_session_id || '');
  const readinessScore = Number(options.readinessScore ?? existing?.readiness_score ?? 0) || 0;

  if (existing) {
    await env.DB.prepare(`
      UPDATE published_sites
      SET site_slug = ?, plan = ?, status = ?, payment_status = ?,
          stripe_customer_id = COALESCE(NULLIF(?, ''), stripe_customer_id),
          stripe_subscription_id = COALESCE(NULLIF(?, ''), stripe_subscription_id),
          stripe_checkout_session_id = COALESCE(NULLIF(?, ''), stripe_checkout_session_id),
          default_hostname = ?, primary_url = ?, primary_domain = ?, custom_domain = ?, seo_title = ?, seo_description = ?,
          readiness_score = ?, published_at = CASE WHEN ? = 'live' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE published_at END,
          suspended_at = CASE WHEN ? = 'suspended' THEN COALESCE(suspended_at, CURRENT_TIMESTAMP) ELSE suspended_at END,
          unpublished_at = CASE WHEN ? = 'unpublished' THEN COALESCE(unpublished_at, CURRENT_TIMESTAMP) ELSE unpublished_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      siteSlug, plan, status, paymentStatus, stripeCustomer, stripeSubscription, stripeCheckoutSession,
      defaultHostname, primaryUrl, primaryDomain, customDomain, seo.title, seo.description, readinessScore,
      status, status, status, existing.id
    ).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO published_sites (id, project_id, user_id, site_slug, default_hostname, primary_url, plan, status, payment_status, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id, primary_domain, custom_domain, seo_title, seo_description, readiness_score, published_at, suspended_at, unpublished_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'live' THEN CURRENT_TIMESTAMP ELSE NULL END, CASE WHEN ? = 'suspended' THEN CURRENT_TIMESTAMP ELSE NULL END, CASE WHEN ? = 'unpublished' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      id, project.id, project.user_id, siteSlug, defaultHostname, primaryUrl, plan, status, paymentStatus,
      stripeCustomer, stripeSubscription, stripeCheckoutSession, primaryDomain, customDomain, seo.title, seo.description,
      readinessScore, status, status, status
    ).run();
  }

  return await env.DB.prepare(`SELECT * FROM published_sites WHERE id = ? LIMIT 1`).bind(id).first();
}

export async function createSiteDeployment(env, options = {}) {
  await ensureHostingTables(env);
  const site = options.site || {};
  const project = options.project || {};
  const data = options.data || parseProjectData(project);
  const id = crypto.randomUUID();
  const hash = await deploymentHash(data);
  const plan = cleanPlan(options.plan || site.plan || project.plan || data.plan || data.package || 'starter');
  await env.DB.prepare(`
    INSERT INTO site_deployments (id, site_id, project_id, user_id, deploy_hash, plan, status, notes, snapshot_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(id, site.id, project.id || site.project_id, project.user_id || site.user_id, hash, plan, options.status || 'created', options.notes || '', JSON.stringify(data)).run();
  await env.DB.prepare(`
    UPDATE published_sites
    SET latest_deployment_id = ?, last_deploy_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(id, hash, site.id).run();
  return { id, deploy_hash: hash };
}

export async function recordSiteEvent(env, options = {}) {
  try {
    await ensureHostingTables(env);
    await env.DB.prepare(`
      INSERT INTO site_events (id, site_id, project_id, user_id, event_type, message, data_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      crypto.randomUUID(),
      options.site_id || options.siteId || '',
      options.project_id || options.projectId || '',
      options.user_id || options.userId || '',
      String(options.event_type || options.type || 'event'),
      String(options.message || ''),
      JSON.stringify(options.data || {})
    ).run();
  } catch (_) {}
}

export async function updateProjectPublication(env, options = {}) {
  const published = options.published ? 1 : 0;
  await env.DB.prepare(`
    UPDATE projects
    SET published = ?, public_slug = COALESCE(NULLIF(?, ''), public_slug), status = ?, data_json = COALESCE(NULLIF(?, ''), data_json),
        billing_status = COALESCE(NULLIF(?, ''), billing_status),
        published_at = CASE WHEN ? = 1 THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE published_at END,
        unpublished_at = CASE WHEN ? = 0 THEN COALESCE(unpublished_at, CURRENT_TIMESTAMP) ELSE unpublished_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(
    published,
    options.slug || '',
    options.status || (published ? 'published' : 'unpublished'),
    options.data ? JSON.stringify(options.data) : '',
    options.billingStatus || '',
    published,
    published,
    options.projectId,
    options.userId
  ).run();
}

export async function publishValidatedProject(env, options = {}) {
  const project = options.project || {};
  const data = options.data || parseProjectData(project);
  const siteSlug = options.siteSlug || project.public_slug || await uniqueSiteSlug(env, project.name || 'website', project.id);
  const site = await upsertPublishedSite(env, {
    project,
    data,
    siteSlug,
    plan: options.plan || project.plan || data.plan,
    status: 'live',
    paymentStatus: options.paymentStatus || 'active',
    stripeCustomerId: options.stripeCustomerId || project.stripe_customer_id || '',
    stripeSubscriptionId: options.stripeSubscriptionId || project.stripe_subscription_id || '',
    stripeCheckoutSessionId: options.stripeCheckoutSessionId || project.stripe_session_id || '',
    readinessScore: options.readinessScore || 0
  });
  const deployment = await createSiteDeployment(env, {
    site,
    project,
    data,
    notes: options.notes || 'Published from PBI hosting platform'
  });
  await updateProjectPublication(env, {
    projectId: project.id,
    userId: project.user_id,
    slug: site.site_slug,
    published: true,
    status: 'published',
    data,
    billingStatus: options.projectBillingStatus || options.paymentStatus || 'active'
  });
  await recordSiteEvent(env, {
    site_id: site.id,
    project_id: project.id,
    user_id: project.user_id,
    event_type: 'site_published',
    message: `Site published at ${site.site_slug}`,
    data: { deployment_id: deployment.id }
  });
  return { site, deployment };
}

export async function markHostingBillingState(env, options = {}) {
  await ensureHostingTables(env);
  const project = options.project || {};
  const paymentStatus = paymentStatusFromValue(options.billingStatus || project.billing_status || '');
  const status = paymentStatus === 'cancelled'
    ? 'suspended'
    : (paymentStatus === 'past_due' || paymentStatus === 'failed' ? 'payment_required' : (isPaymentActive(paymentStatus) ? 'live' : 'payment_required'));

  const site = await env.DB.prepare(`SELECT * FROM published_sites WHERE project_id = ? LIMIT 1`).bind(project.id).first();
  if (!site) return null;

  await env.DB.prepare(`
    UPDATE published_sites
    SET payment_status = ?, status = ?,
        suspended_at = CASE WHEN ? IN ('suspended','payment_required') THEN COALESCE(suspended_at, CURRENT_TIMESTAMP) ELSE suspended_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(paymentStatus, status, status, site.id).run();

  await recordSiteEvent(env, {
    site_id: site.id,
    project_id: site.project_id,
    user_id: site.user_id,
    event_type: 'billing_status',
    message: `Billing status changed to ${paymentStatus}`,
    data: { event_type: options.eventType || '' }
  });

  return await env.DB.prepare(`SELECT * FROM published_sites WHERE id = ? LIMIT 1`).bind(site.id).first();
}
