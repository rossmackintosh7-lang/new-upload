import { json, requireHostingUser } from './_shared.js';
import { sitePublicUrl } from '../../_lib/hosting.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireHostingUser(env, request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const rows = await env.DB.prepare(`
    SELECT ps.*, p.name AS project_name, p.billing_status AS project_billing_status
    FROM published_sites ps
    LEFT JOIN projects p ON p.id = ps.project_id
    WHERE ps.user_id = ?
    ORDER BY datetime(COALESCE(ps.updated_at, ps.created_at, '1970-01-01')) DESC
    LIMIT 100
  `).bind(auth.user.id).all();

  const sites = [];
  for (const row of rows.results || []) {
    const leads = await env.DB.prepare(`SELECT COUNT(*) AS count FROM leads WHERE project_id = ?`).bind(row.project_id).first().catch(() => ({ count: 0 }));
    const media = await env.DB.prepare(`SELECT COUNT(*) AS count FROM media_assets WHERE project_id = ?`).bind(row.project_id).first().catch(() => ({ count: 0 }));
    const views = await env.DB.prepare(`SELECT COUNT(*) AS count FROM analytics_events WHERE project_id = ? AND event_name = 'page_view'`).bind(row.project_id).first().catch(() => ({ count: 0 }));
    sites.push({
      ...row,
      live_url: row.custom_domain && row.primary_url ? row.primary_url : sitePublicUrl(env, row.site_slug, '', url.origin),
      lead_count: Number(leads?.count || 0),
      media_count: Number(media?.count || 0),
      page_views: Number(views?.count || 0)
    });
  }

  return json({ ok: true, sites });
}
