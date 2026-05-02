import { json, error, getUserFromSession } from '../projects/_shared.js';

async function ensureRetailTables(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS retail_orders (id TEXT PRIMARY KEY, project_id TEXT, user_id TEXT, site_slug TEXT, customer_email TEXT, customer_name TEXT, status TEXT DEFAULT 'pending', currency TEXT DEFAULT 'gbp', subtotal_minor INTEGER DEFAULT 0, shipping_minor INTEGER DEFAULT 0, tax_minor INTEGER DEFAULT 0, total_minor INTEGER DEFAULT 0, stripe_session_id TEXT, stripe_payment_intent_id TEXT, body_json TEXT, items_json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
}

export async function onRequestGet({ request, env }) {
  await ensureRetailTables(env);
  const user = await getUserFromSession(env, request);
  if (!user) return error('Unauthorized.', 401);

  const rows = await env.DB.prepare(`SELECT retail_orders.*, projects.name AS project_name FROM retail_orders LEFT JOIN projects ON projects.id = retail_orders.project_id WHERE retail_orders.user_id = ? ORDER BY retail_orders.created_at DESC LIMIT 100`).bind(user.id).all();
  return json({ ok: true, orders: rows.results || [] });
}
