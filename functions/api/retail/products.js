import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS retail_products (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    user_id TEXT,
    name TEXT,
    price INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 0,
    image TEXT,
    status TEXT DEFAULT 'active',
    data_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env); await ensure(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  const rows = await env.DB.prepare(`SELECT * FROM retail_products WHERE project_id = ? AND user_id = ? ORDER BY datetime(updated_at) DESC`).bind(projectId, auth.user.id).all();
  return json({ ok:true, products:rows.results || [] });
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env); await ensure(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || crypto.randomUUID());
  await env.DB.prepare(`INSERT INTO retail_products (id, project_id, user_id, name, price, stock, image, status, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, price=excluded.price, stock=excluded.stock, image=excluded.image, status=excluded.status, data_json=excluded.data_json, updated_at=CURRENT_TIMESTAMP`)
    .bind(id, body.project_id || '', auth.user.id, body.name || 'Product', Number(body.price || 0), Number(body.stock || 0), body.image || '', body.status || 'active', JSON.stringify(body)).run();
  return json({ ok:true, product:{ id } });
}
