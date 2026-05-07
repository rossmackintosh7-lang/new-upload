import { json, error, requireSeoUser, ensureSeoTables } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const auth = await requireSeoUser(env, request);
  if (!auth.ok) return auth.response;
  await ensureSeoTables(env);
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id || body.suggestion_id || 0);
  const action = String(body.action || body.status || '').toLowerCase();
  if (!id) return error('Suggestion id is required.');
  const status = action === 'approve' || action === 'approved' ? 'approved' : action === 'reject' || action === 'rejected' ? 'rejected' : 'saved';
  await env.DB.prepare(`UPDATE seo_suggestions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id).run();
  return json({ ok: true, id, status });
}
