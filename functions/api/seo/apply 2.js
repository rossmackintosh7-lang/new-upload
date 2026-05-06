import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

function setPath(obj, path, value) {
  const parts = String(path || '').split('.');
  let cur = obj;
  for (let i=0; i<parts.length-1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length-1]] = value;
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || '').trim();
  const fixes = Array.isArray(body.fixes) ? body.fixes : [];
  if (!projectId) return error('Project id is required.');
  const row = await env.DB.prepare(`SELECT data_json FROM projects WHERE id = ? AND user_id = ?`).bind(projectId, auth.user.id).first();
  if (!row) return error('Project not found.', 404);
  const data = JSON.parse(row.data_json || '{}');
  for (const fix of fixes) setPath(data, fix.field, fix.value);
  await env.DB.prepare(`UPDATE projects SET data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).bind(JSON.stringify(data), projectId, auth.user.id).run();
  return json({ ok:true, applied:fixes.length });
}
