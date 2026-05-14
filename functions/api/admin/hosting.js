import { json, error } from '../../_lib/json.js';
import { ensureHostingTables, recordSiteEvent } from '../../_lib/hosting.js';
import { ensurePbiOpsTables, requireAdmin, audit } from './_shared.js';

export async function onRequestGet({ request, env }) {
  await ensureHostingTables(env);
  await ensurePbiOpsTables(env);
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  const sites = await env.DB.prepare(`
    SELECT ps.*, p.name AS project_name, p.billing_status AS project_billing_status, u.email AS customer_email
    FROM published_sites ps
    LEFT JOIN projects p ON p.id = ps.project_id
    LEFT JOIN users u ON u.id = ps.user_id
    ORDER BY datetime(COALESCE(ps.updated_at, ps.created_at, '1970-01-01')) DESC
    LIMIT 250
  `).all();
  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) AS live,
      SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS suspended,
      SUM(CASE WHEN status = 'payment_required' THEN 1 ELSE 0 END) AS payment_required
    FROM published_sites
  `).first().catch(() => ({ total: 0, live: 0, suspended: 0, payment_required: 0 }));
  const leads = await env.DB.prepare(`SELECT COUNT(*) AS count FROM leads WHERE status = 'new'`).first().catch(() => ({ count: 0 }));
  const domains = await env.DB.prepare(`SELECT COUNT(*) AS count FROM site_domains WHERE COALESCE(status, '') != 'removed'`).first().catch(() => ({ count: 0 }));
  const storage = await env.DB.prepare(`SELECT COALESCE(SUM(size), 0) AS bytes FROM media_assets`).first().catch(() => ({ bytes: 0 }));
  const recentErrors = await env.DB.prepare(`
    SELECT event_type, message, created_at FROM site_events
    WHERE event_type LIKE '%error%' OR event_type LIKE '%failed%'
    ORDER BY datetime(created_at) DESC
    LIMIT 10
  `).all().catch(() => ({ results: [] }));
  const recentLeads = await env.DB.prepare(`
    SELECT l.id, l.project_id, l.name, l.email, l.phone, l.status, l.created_at, p.name AS project_name
    FROM leads l
    LEFT JOIN projects p ON p.id = l.project_id
    ORDER BY datetime(l.created_at) DESC
    LIMIT 10
  `).all().catch(() => ({ results: [] }));
  return json({
    ok: true,
    stats: {
      ...stats,
      new_leads: Number(leads?.count || 0),
      custom_domains: Number(domains?.count || 0),
      storage_bytes: Number(storage?.bytes || 0)
    },
    recent_errors: recentErrors.results || [],
    recent_leads: recentLeads.results || [],
    sites: sites.results || []
  });
}

export async function onRequestPost({ request, env }) {
  await ensureHostingTables(env);
  await ensurePbiOpsTables(env);
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const siteId = String(body.site_id || '').trim();
  const action = String(body.action || '').trim().toLowerCase();
  if (!siteId) return error('Site id is required.');
  if (!['suspend', 'unsuspend', 'unpublish'].includes(action)) return error('Unsupported admin hosting action.');

  const site = await env.DB.prepare(`SELECT * FROM published_sites WHERE id = ? LIMIT 1`).bind(siteId).first();
  if (!site) return error('Site not found.', 404);

  const status = action === 'unsuspend' ? 'live' : (action === 'unpublish' ? 'unpublished' : 'suspended');
  await env.DB.prepare(`
    UPDATE published_sites
    SET status = ?,
        suspended_at = CASE WHEN ? = 'suspended' THEN COALESCE(suspended_at, CURRENT_TIMESTAMP) ELSE suspended_at END,
        unpublished_at = CASE WHEN ? = 'unpublished' THEN COALESCE(unpublished_at, CURRENT_TIMESTAMP) ELSE unpublished_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, status, status, siteId).run();

  await env.DB.prepare(`
    UPDATE projects
    SET published = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status === 'live' ? 1 : 0, status === 'live' ? 'published' : status, site.project_id).run();

  await recordSiteEvent(env, {
    site_id: siteId,
    project_id: site.project_id,
    user_id: site.user_id,
    event_type: `admin_${action}`,
    message: `Admin ${auth.admin.email} changed hosting status to ${status}.`
  });
  await audit(env, auth.admin, `hosting_${action}`, { site_id: siteId, project_id: site.project_id });
  return json({ ok: true, site_id: siteId, status });
}
