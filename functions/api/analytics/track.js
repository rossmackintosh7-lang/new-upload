import { json } from '../../_lib/json.js';
import { ensureHostingTables } from '../../_lib/hosting.js';

async function ensure(env) {
  await ensureHostingTables(env);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    site_id TEXT,
    event_name TEXT,
    path TEXT,
    visitor_id TEXT,
    referrer TEXT,
    user_agent TEXT,
    data_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  for (const sql of [
    `ALTER TABLE analytics_events ADD COLUMN site_id TEXT`,
    `ALTER TABLE analytics_events ADD COLUMN visitor_id TEXT`,
    `ALTER TABLE analytics_events ADD COLUMN referrer TEXT`,
    `ALTER TABLE analytics_events ADD COLUMN user_agent TEXT`
  ]) { try { await env.DB.prepare(sql).run(); } catch (_) {} }
}

export async function onRequestPost({ request, env }) {
  await ensure(env);
  const body = await request.json().catch(() => ({}));
  const id = crypto.randomUUID();
  const userAgent = request.headers.get('user-agent') || '';
  await env.DB.prepare(`INSERT INTO analytics_events (id, project_id, site_id, event_name, path, visitor_id, referrer, user_agent, data_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .bind(id, body.project_id || '', body.site_id || '', body.event_name || 'page_view', body.path || '', body.visitor_id || '', body.referrer || '', userAgent, JSON.stringify(body)).run();
  return json({ ok:true });
}
