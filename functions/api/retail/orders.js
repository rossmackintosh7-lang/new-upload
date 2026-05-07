import { json } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS retail_orders (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    user_id TEXT,
    site_slug TEXT,
    customer_name TEXT,
    customer_email TEXT,
    status TEXT DEFAULT 'new',
    total_minor INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'gbp',
    items_json TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env);
  await ensure(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const rows = (await env.DB.prepare(`
    SELECT retail_orders.*, projects.name AS project_name
    FROM retail_orders
    LEFT JOIN projects ON projects.id = retail_orders.project_id
    WHERE retail_orders.user_id = ? OR projects.user_id = ?
    ORDER BY datetime(retail_orders.created_at) DESC
    LIMIT 100
  `).bind(auth.user.id, auth.user.id).all()).results || [];
  return json({ ok: true, orders: rows });
}
