import { json, error } from '../../_lib/json.js';
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
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return error('Login required to save to your PBI account.', 401);
  await ensure(env);
  const body = await request.json().catch(() => ({}));
  const project = body.project || {};
  const id = String(project.id || crypto.randomUUID()).slice(0, 80);
  const name = String(project.name || 'Untitled website').slice(0, 160);
  const plan = String(project.plan || 'starter').slice(0, 40);
  await env.DB.prepare(`INSERT INTO projects (id, user_id, name, status, data_json, plan, billing_status, published, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', ?, ?, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, data_json = excluded.data_json, plan = excluded.plan, updated_at = CURRENT_TIMESTAMP`)
    .bind(id, user.id, name, JSON.stringify(project), plan).run();
  return json({ ok: true, project: { id, name, plan, status: 'draft' } });
}
