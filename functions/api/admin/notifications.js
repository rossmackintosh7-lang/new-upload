import { json, error, readBody, requireAdmin, ensurePbiOpsTables } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const rows = (await env.DB.prepare(`SELECT * FROM admin_notifications ORDER BY datetime(created_at) DESC LIMIT 120`).all()).results || [];
  return json({ ok: true, notifications: rows });
}

export async function onRequestPatch({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const body = await readBody(request);
  const id = String(body.id || '').trim();
  if (!id) return error('Notification id is required.');
  const status = String(body.status || 'read');
  await env.DB.prepare(`UPDATE admin_notifications SET status = ?, read_at = CASE WHEN ? = 'read' THEN CURRENT_TIMESTAMP ELSE read_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(status, status, id).run();
  return json({ ok: true });
}
