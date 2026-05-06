import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env);
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
    return json({ ok:true, page_views:Number(total?.count || 0), top_pages:top.results || [] });
  } catch (_) {
    return json({ ok:true, page_views:0, top_pages:[] });
  }
}
