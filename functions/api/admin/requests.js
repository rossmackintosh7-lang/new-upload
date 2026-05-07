import { json, error, readBody, requireAdmin, ensurePbiOpsTables } from './_shared.js';

async function all(env, sql, ...binds) {
  try { return (await env.DB.prepare(sql).bind(...binds).all()).results || []; } catch { return []; }
}

export async function onRequestGet({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  if (id) {
    const requestRow = await env.DB.prepare(`SELECT * FROM admin_requests WHERE id = ? LIMIT 1`).bind(id).first();
    return json({ ok: true, request: requestRow || null });
  }
  const type = url.searchParams.get('type') || '';
  const status = url.searchParams.get('status') || '';
  const where = [];
  const binds = [];
  if (type) { where.push(`request_type = ?`); binds.push(type); }
  if (status) { where.push(`status = ?`); binds.push(status); }
  const rows = await all(env, `SELECT * FROM admin_requests ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY datetime(created_at) DESC LIMIT 120`, ...binds);
  return json({ ok: true, requests: rows });
}

export async function onRequestPatch({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const body = await readBody(request);
  const id = String(body.id || '').trim();
  if (!id) return error('Request id is required.');
  await env.DB.prepare(`UPDATE admin_requests SET status = COALESCE(NULLIF(?, ''), status), internal_notes = COALESCE(?, internal_notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(String(body.status || ''), body.internal_notes ?? null, id).run();
  return json({ ok: true });
}
