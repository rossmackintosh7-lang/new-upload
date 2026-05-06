import { json } from '../../_lib/json.js';
import { getSessionUser } from '../../_lib/session.js';

async function ensure(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    status TEXT DEFAULT 'draft',
    data_json TEXT DEFAULT '{}',
    published INTEGER DEFAULT 0,
    public_slug TEXT,
    plan TEXT DEFAULT 'starter',
    billing_status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  for (const sql of [
    `ALTER TABLE projects ADD COLUMN plan TEXT DEFAULT 'starter'`,
    `ALTER TABLE projects ADD COLUMN billing_status TEXT DEFAULT 'draft'`,
    `ALTER TABLE projects ADD COLUMN published INTEGER DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN updated_at TEXT`,
    `ALTER TABLE projects ADD COLUMN created_at TEXT`
  ]) { try { await env.DB.prepare(sql).run(); } catch (_) {} }
}

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ ok: true, authenticated: false, projects: [] });
  await ensure(env);
  const rows = await env.DB.prepare(`SELECT id, name, status, plan, billing_status, published, public_slug, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY datetime(COALESCE(updated_at, created_at, '1970-01-01')) DESC LIMIT 50`).bind(user.id).all();
  return json({ ok: true, authenticated: true, projects: rows.results || [] });
}
