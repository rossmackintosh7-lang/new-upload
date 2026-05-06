import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const id = String(body.lead_id || '').trim();
  const status = String(body.status || 'new').trim().toLowerCase();
  if (!id) return error('Lead id is required.');
  await env.DB.prepare(`UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id).run();
  return json({ ok:true });
}
