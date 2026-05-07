import { json, error } from '../../_lib/json.js';

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS custom_build_enquiries (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    business_name TEXT,
    main_promotion_goal TEXT,
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
  const email = String(body.email || '').trim();
  const name = String(body.name || body.contact_name || '').trim();
  if (!email || !name) return error('Name and email are required.');
  const id = crypto.randomUUID();
  const brief = String(body.needs || body.message || body.main_promotion_goal || '').slice(0, 4000);
  await env.DB.prepare(`INSERT INTO custom_build_enquiries (id, project_id, contact_name, email, phone, business_name, main_promotion_goal, status, body_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, String(body.project_id || body.projectId || ''), name, email, String(body.phone || ''), String(body.businessName || body.business_name || ''), brief, JSON.stringify(body)).run();
  await env.DB.prepare(`INSERT INTO admin_requests (id, request_type, status, priority, customer_name, customer_email, customer_phone, business_name, project_id, brief, body_json, created_at, updated_at)
    VALUES (?, 'custom_build', 'new', 'normal', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, name, email, String(body.phone || ''), String(body.businessName || body.business_name || ''), String(body.project_id || body.projectId || ''), brief, JSON.stringify(body)).run();
  return json({ ok: true, enquiry: { id, status: 'new' } });
}
