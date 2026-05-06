import { json } from '../../_lib/json.js';

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    event_name TEXT,
    path TEXT,
    data_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function onRequestPost({ request, env }) {
  await ensure(env);
  const body = await request.json().catch(() => ({}));
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO analytics_events (id, project_id, event_name, path, data_json, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .bind(id, body.project_id || '', body.event_name || 'page_view', body.path || '', JSON.stringify(body)).run();
  return json({ ok:true });
}
