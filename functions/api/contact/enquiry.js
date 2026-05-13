import { json, error } from '../../_lib/json.js';

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS support_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    user_id TEXT,
    email TEXT,
    type TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    body_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_requests (
    id TEXT PRIMARY KEY,
    request_type TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'normal',
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    business_name TEXT,
    project_id TEXT,
    brief TEXT,
    body_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function onRequestPost({ request, env }) {
  await ensure(env);
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || body.contact_name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const message = String(body.message || body.subject || '').trim();
  if (!name || !email || !message) return error('Name, email and message are required.');

  const id = crypto.randomUUID();
  const projectId = String(body.projectName || body.project_id || body.projectId || '').trim();
  const type = String(body.type || 'general').trim();
  const brief = [body.subject, message].filter(Boolean).join('\n\n').slice(0, 4000);

  await env.DB.prepare(`INSERT INTO support_requests (id, project_id, user_id, email, type, message, status, body_json, created_at, updated_at)
    VALUES (?, ?, '', ?, ?, ?, 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, projectId, email, type, message, JSON.stringify(body)).run();

  await env.DB.prepare(`INSERT INTO admin_requests (id, request_type, status, priority, customer_name, customer_email, customer_phone, business_name, project_id, brief, body_json, created_at, updated_at)
    VALUES (?, ?, 'new', 'normal', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, type, name, email, phone, String(body.businessName || body.business_name || ''), projectId, brief, JSON.stringify(body)).run();

  return json({ ok: true, enquiry: { id, status: 'new' } });
}
