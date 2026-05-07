import { json, error, readBody, requireAdmin, ensurePbiOpsTables, parseProjectData } from './_shared.js';

async function related(env, projectId) {
  const safeAll = async (sql, ...binds) => {
    try { return (await env.DB.prepare(sql).bind(...binds).all()).results || []; } catch { return []; }
  };
  return {
    support_requests: await safeAll(`SELECT * FROM support_requests WHERE project_id = ? ORDER BY datetime(created_at) DESC`, projectId),
    custom_enquiries: await safeAll(`SELECT * FROM custom_build_enquiries WHERE project_id = ? ORDER BY datetime(created_at) DESC`, projectId)
  };
}

export async function onRequestGet({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return error('Project id is required.');
  const project = await env.DB.prepare(`SELECT projects.*, users.email AS user_email FROM projects LEFT JOIN users ON users.id = projects.user_id WHERE projects.id = ? LIMIT 1`).bind(id).first();
  if (!project) return error('Project not found.', 404);
  return json({ ok: true, project: { ...project, data: parseProjectData(project) }, related: await related(env, id) });
}

export async function onRequestPost({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const body = await readBody(request);
  const id = String(body.id || body.project_id || '').trim();
  if (!id) return error('Project id is required.');
  const existing = await env.DB.prepare(`SELECT * FROM projects WHERE id = ? LIMIT 1`).bind(id).first();
  if (!existing) return error('Project not found.', 404);
  const dataJson = body.data_json ? String(body.data_json) : JSON.stringify(body.data || parseProjectData(existing));
  await env.DB.prepare(`UPDATE projects SET name = COALESCE(NULLIF(?, ''), name), status = COALESCE(NULLIF(?, ''), status), billing_status = COALESCE(NULLIF(?, ''), billing_status), plan = COALESCE(NULLIF(?, ''), plan), domain_option = COALESCE(NULLIF(?, ''), domain_option), custom_domain = ?, public_slug = COALESCE(NULLIF(?, ''), public_slug), published = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(String(body.name || ''), String(body.status || ''), String(body.billing_status || ''), String(body.plan || ''), String(body.domain_option || ''), body.custom_domain ?? existing.custom_domain ?? '', String(body.public_slug || ''), body.published ? 1 : Number(existing.published || 0), dataJson, id).run();
  const project = await env.DB.prepare(`SELECT * FROM projects WHERE id = ? LIMIT 1`).bind(id).first();
  return json({ ok: true, project: { ...project, data: parseProjectData(project) } });
}
