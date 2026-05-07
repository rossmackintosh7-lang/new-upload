import { json, requireAdmin, ensurePbiOpsTables } from './_shared.js';

async function all(env, sql, ...binds) {
  try { return (await env.DB.prepare(sql).bind(...binds).all()).results || []; } catch { return []; }
}

export async function onRequestGet({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const projects = await all(env, `SELECT projects.*, users.email AS user_email FROM projects LEFT JOIN users ON users.id = projects.user_id ORDER BY datetime(COALESCE(projects.updated_at, projects.created_at, '1970-01-01')) DESC LIMIT 150`);
  const users = await all(env, `SELECT id, email, created_at, updated_at FROM users ORDER BY datetime(COALESCE(created_at, updated_at, '1970-01-01')) DESC LIMIT 150`);
  const enquiries = await all(env, `SELECT * FROM custom_build_enquiries ORDER BY datetime(created_at) DESC LIMIT 100`);
  const support_requests = await all(env, `SELECT * FROM support_requests ORDER BY datetime(created_at) DESC LIMIT 100`);
  return json({ ok: true, projects, users, enquiries, support_requests });
}
