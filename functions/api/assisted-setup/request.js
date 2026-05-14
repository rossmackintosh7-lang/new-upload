import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { ensurePbiOpsTables, createAdminNotification } from '../admin/_shared.js';

async function ensure(env) {
  await ensurePbiOpsTables(env);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS support_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    user_id TEXT,
    email TEXT,
    type TEXT DEFAULT 'assisted_setup',
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
  if (!projectId) return error('Project id is required.');

  const project = await env.DB.prepare(`
    SELECT id, user_id, name, data_json
    FROM projects
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).bind(projectId, auth.user.id).first();
  if (!project) return error('Project not found.', 404);

  let data = {};
  try { data = JSON.parse(project.data_json || '{}'); } catch (_) {}
  if (data.assisted_setup_paid !== true) {
    return json({
      ok: false,
      payment_required: true,
      message: 'Assisted Setup needs to be paid before sending setup instructions to PBI.'
    }, 402);
  }

  const id = crypto.randomUUID();
  const message = String(body.message || 'Assisted setup requested.').slice(0, 4000);
  await env.DB.prepare(`INSERT INTO support_requests (id, project_id, user_id, email, type, message, status, body_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'assisted_setup', ?, 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, projectId, auth.user.id, auth.user.email || '', message, JSON.stringify(body)).run();

  await env.DB.prepare(`
    INSERT INTO admin_requests (
      id, request_type, status, priority, customer_email, business_name, project_id,
      package_name, payment_status, brief, customer_message, body_json, created_at, updated_at
    )
    VALUES (?, 'assisted_build', 'new', 'high', ?, ?, ?, 'Assisted Setup', 'paid', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    auth.user.email || '',
    project.name || data.business_name || 'Assisted Setup project',
    projectId,
    message,
    message,
    JSON.stringify({ ...body, project_id: projectId, source: 'customer_assisted_setup_request' })
  ).run();

  await createAdminNotification(env, {
    type: 'assisted_setup_request',
    title: 'Assisted Setup request received',
    message: `${project.name || projectId}: customer has sent setup instructions after payment.`,
    priority: 'high',
    customer_email: auth.user.email || '',
    project_id: projectId,
    request_id: id,
    body: { message, builder_url: `/canvas-builder/?project=${encodeURIComponent(projectId)}&admin=1` }
  });

  return json({ ok: true, request: { id, status: 'new' } });
}
