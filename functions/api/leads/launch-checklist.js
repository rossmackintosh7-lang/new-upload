import { json, error } from '../../_lib/json.js';

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    source TEXT,
    data_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function onRequestPost({ request, env }) {
  await ensure(env);
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  if (!email) return error('Email is required.');
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO leads (id, project_id, name, email, phone, message, status, source, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'new', 'launch_checklist', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, String(body.project_id || ''), String(body.name || ''), email, String(body.phone || ''), String(body.message || 'Launch checklist request'), JSON.stringify(body)).run();
  return json({ ok: true, lead: { id, status: 'new' } });
}
