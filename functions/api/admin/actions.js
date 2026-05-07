import { json, error, readBody, requireAdmin, ensurePbiOpsTables, audit } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const { admin, response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const body = await readBody(request);
  const action = String(body.action || '').trim();
  const projectId = String(body.project_id || '').trim();

  if (action === 'create_project_for_user') {
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || 'New website').slice(0, 160);
    if (!email) return error('Email is required.');
    let user = await env.DB.prepare(`SELECT id, email FROM users WHERE lower(email) = lower(?) LIMIT 1`).bind(email).first();
    if (!user) {
      const userId = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO users (id, email, email_verified, created_at, updated_at) VALUES (?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(userId, email).run();
      user = { id: userId, email };
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO projects (id, user_id, name, status, data_json, published, plan, billing_status, created_at, updated_at) VALUES (?, ?, ?, 'draft', '{}', 0, 'starter', 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(id, user.id, name).run();
    await audit(env, admin, action, { project_id: id, email });
    return json({ ok: true, project: { id, name, user_email: email } });
  }

  if (!projectId) return error('project_id is required.');
  const updates = {
    mark_billing_active: [`billing_status = 'active'`],
    mark_billing_pending: [`billing_status = 'pending'`],
    mark_billing_cancelled: [`billing_status = 'cancelled', published = 0, status = 'cancelled'`],
    delete_project: null
  };
  if (action === 'delete_project') {
    await env.DB.prepare(`DELETE FROM projects WHERE id = ?`).bind(projectId).run();
  } else if (updates[action]) {
    await env.DB.prepare(`UPDATE projects SET ${updates[action].join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(projectId).run();
  } else {
    return error('Unknown admin action.');
  }
  await audit(env, admin, action, { project_id: projectId });
  return json({ ok: true });
}
