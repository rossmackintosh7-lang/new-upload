import { json, error } from '../../_lib/json.js';
import { ensureHostingTables, recordSiteEvent } from '../../_lib/hosting.js';

async function ensure(env) {
  await ensureHostingTables(env);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    site_id TEXT,
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
  try { await env.DB.prepare(`ALTER TABLE leads ADD COLUMN site_id TEXT`).run(); } catch (_) {}
}

export async function onRequestPost({ request, env }) {
  await ensure(env);
  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || '').trim();
  const siteId = String(body.site_id || '').trim();
  if (!projectId) return error('Project id is required.');
  if (String(body.website || body.company_website || body._gotcha || '').trim()) {
    return json({ ok: true, lead: { id: '', status: 'ignored' } });
  }
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const message = String(body.message || '').trim().slice(0, 5000);
  const name = String(body.name || '').trim().slice(0, 160);
  const ip = String(request.headers.get('cf-connecting-ip') || '').trim();
  if (!email && !phone) return error('Email or phone is required.');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return error('Use a valid email address.');
  if (!message && !body.source) return error('Message is required.');

  const project = await env.DB.prepare(`SELECT id FROM projects WHERE id = ? LIMIT 1`).bind(projectId).first();
  if (!project) return error('Project not found.', 404);
  if (ip) {
    const recent = await env.DB.prepare(`
      SELECT COUNT(*) AS count FROM leads
      WHERE project_id = ? AND data_json LIKE ? AND datetime(created_at) > datetime('now', '-2 minutes')
    `).bind(projectId, `%"ip":"${ip}"%`).first().catch(() => ({ count: 0 }));
    if (Number(recent?.count || 0) >= 5) return error('Too many enquiries were sent too quickly. Please try again shortly.', 429);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO leads (id, project_id, site_id, name, email, phone, message, status, source, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, projectId, siteId, name, email, phone, message, body.source || 'website', JSON.stringify({ ...body, ip })).run();
  await env.DB.prepare(`INSERT INTO analytics_events (id, project_id, site_id, event_name, path, data_json, created_at)
    VALUES (?, ?, ?, 'lead_submit', ?, ?, CURRENT_TIMESTAMP)`)
    .bind(crypto.randomUUID(), projectId, siteId, String(body.path || ''), JSON.stringify({ lead_id: id, source: body.source || 'website' })).run().catch(() => {});
  await recordSiteEvent(env, {
    site_id: siteId,
    project_id: projectId,
    event_type: 'lead_submitted',
    message: `New lead from ${email || phone}`,
    data: { lead_id: id, source: body.source || 'website' }
  });
  return json({ ok:true, lead:{ id, status:'new' } });
}
