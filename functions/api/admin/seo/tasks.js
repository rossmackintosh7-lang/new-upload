import { json, error, requireAdmin, ensureSeoAgentTables } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const sql = status
    ? `SELECT * FROM seo_tasks WHERE status = ? ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, datetime(created_at) DESC LIMIT 200`
    : `SELECT * FROM seo_tasks ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, datetime(created_at) DESC LIMIT 200`;
  const rows = status
    ? (await env.DB.prepare(sql).bind(status).all()).results || []
    : (await env.DB.prepare(sql).all()).results || [];
  return json({ ok: true, tasks: rows });
}

export async function onRequestPatch({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  const status = String(body.status || '').trim();
  if (!id || !status) return error('Task id and status are required.');
  await env.DB.prepare(`UPDATE seo_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP, applied_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE applied_at END WHERE id = ?`)
    .bind(status, status, id).run();
  return json({ ok: true, id, status });
}
