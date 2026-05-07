import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS support_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    user_id TEXT,
    email TEXT,
    type TEXT DEFAULT 'domain_renewal',
    message TEXT,
    status TEXT DEFAULT 'new',
    body_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  await ensure(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || '').trim();
  const domainName = String(body.domain_name || '').trim();
  if (!projectId || !domainName) return error('Project id and domain name are required.');
  const id = crypto.randomUUID();
  const message = `Domain renewal reminder requested for ${domainName}${body.renewal_date ? ` on ${body.renewal_date}` : ''}.`;
  await env.DB.prepare(`INSERT INTO support_requests (id, project_id, user_id, email, type, message, status, body_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'domain_renewal', ?, 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, projectId, auth.user.id, auth.user.email || '', message, JSON.stringify(body)).run();
  return json({ ok: true, request: { id, status: 'new', message } });
}
