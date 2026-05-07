import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const id = String(url.searchParams.get('id') || url.searchParams.get('project') || '').trim();
  if (!id) return error('Project id is required.');
  const row = await env.DB.prepare(`SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1`).bind(id, auth.user.id).first();
  if (!row) return error('Project not found.', 404);
  let projectJson = {};
  try { projectJson = JSON.parse(row.data_json || '{}'); } catch {}
  return json({ ok: true, project: { ...row, project_json: projectJson } });
}
