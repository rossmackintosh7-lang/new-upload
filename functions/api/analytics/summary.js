import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { ensureHostingTables } from '../../_lib/hosting.js';

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env);
  await ensureHostingTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  if (!projectId) return error('Project id is required.');
  const project = await env.DB.prepare(`SELECT id FROM projects WHERE id = ? AND user_id = ?`).bind(projectId, auth.user.id).first();
  if (!project) return error('Project not found.', 404);
  try {
    const total = await env.DB.prepare(`SELECT COUNT(*) AS count FROM analytics_events WHERE project_id = ?`).bind(projectId).first();
    const top = await env.DB.prepare(`SELECT path, COUNT(*) AS count FROM analytics_events WHERE project_id = ? GROUP BY path ORDER BY count DESC LIMIT 10`).bind(projectId).all();
    const leads = await env.DB.prepare(`SELECT COUNT(*) AS count FROM leads WHERE project_id = ?`).bind(projectId).first().catch(() => ({ count: 0 }));
    const site = await env.DB.prepare(`SELECT id, site_slug, status, payment_status FROM published_sites WHERE project_id = ? LIMIT 1`).bind(projectId).first().catch(() => null);
    const recent = await env.DB.prepare(`SELECT event_name, path, created_at FROM analytics_events WHERE project_id = ? ORDER BY datetime(created_at) DESC LIMIT 20`).bind(projectId).all().catch(() => ({ results: [] }));
    return json({
      ok:true,
      site,
      page_views:Number(total?.count || 0),
      leads:Number(leads?.count || 0),
      conversion_rate:Number(total?.count || 0) ? Number(((Number(leads?.count || 0) / Number(total.count || 1)) * 100).toFixed(1)) : 0,
      top_pages:top.results || [],
      recent_events:recent.results || []
    });
  } catch (_) {
    return json({ ok:true, page_views:0, top_pages:[] });
  }
}
