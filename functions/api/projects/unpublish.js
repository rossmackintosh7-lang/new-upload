import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const id = String(body.project_id || '').trim();
  if (!id) return error('Project id is required.');
  await env.DB.prepare(`UPDATE projects SET published = 0, status = 'draft', unpublished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`)
    .bind(id, auth.user.id).run();
  return json({ ok:true, unpublished:true });
}
