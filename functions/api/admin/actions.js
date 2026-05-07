import { json, error, readBody, requireAdmin, ensurePbiOpsTables, audit } from './_shared.js';

function parseData(project) {
  try { return JSON.parse(project?.data_json || '{}'); } catch { return {}; }
}

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
  const project = await env.DB.prepare(`SELECT * FROM projects WHERE id = ? LIMIT 1`).bind(projectId).first();
  if (!project) return error('Project not found.', 404);

  if (action === 'set_domain_status') {
    const data = {
      ...parseData(project),
      domain_registration_status: String(body.domain_status || '').trim(),
      domain_registration_message: String(body.domain_message || '').trim(),
      domain_renewal_date: String(body.renewal_date || '').trim()
    };
    await env.DB.prepare(`UPDATE projects SET data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(JSON.stringify(data), projectId).run();
    await audit(env, admin, action, { project_id: projectId, domain_status: data.domain_registration_status });
    return json({ ok: true });
  }

  if (action === 'send_domain_renewal') {
    const data = parseData(project);
    const requestId = crypto.randomUUID();
    const domainName = String(body.domain_name || data.custom_domain || project.custom_domain || '').trim();
    const message = `Domain renewal reminder requested for ${domainName || 'domain'}${body.renewal_date ? ` on ${body.renewal_date}` : ''}.`;
    await env.DB.prepare(`
      INSERT INTO support_requests (id, project_id, user_id, email, type, message, status, body_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'domain_renewal', ?, 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(requestId, projectId, project.user_id || '', body.email || '', message, JSON.stringify(body)).run();
    await audit(env, admin, action, { project_id: projectId, request_id: requestId, domain_name: domainName });
    return json({ ok: true, request_id: requestId });
  }

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
