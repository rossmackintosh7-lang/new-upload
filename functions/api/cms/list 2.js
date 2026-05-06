import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  if (!projectId) return error('Project id is required.');
  try {
    const rows = await env.DB.prepare(`SELECT * FROM cms_items WHERE project_id = ? AND user_id = ? ORDER BY datetime(updated_at) DESC`).bind(projectId, auth.user.id).all();
    return json({ ok:true, items:(rows.results || []).map(row => ({ ...JSON.parse(row.data_json || '{}'), id:row.id, title:row.title, type:row.type, status:row.status, slug:row.slug })) });
  } catch (_) {
    return json({ ok:true, items:[] });
  }
}
