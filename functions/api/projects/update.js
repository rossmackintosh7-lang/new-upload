import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { cleanPlan, enforceProjectPackage, validateProjectForPublish } from '../../_lib/package-rules.js';

async function ensureProjectExtras(env) {
  const alters = [
    `ALTER TABLE projects ADD COLUMN readiness_score INTEGER DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN package_warnings TEXT DEFAULT '[]'`,
    `ALTER TABLE projects ADD COLUMN last_validated_at TEXT`
  ];
  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch (_) {}
  }
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  await ensureProjectExtras(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || body.project_id || body.project || '').trim();
  if (!id) return error('Project id is required.');

  const existing = await env.DB.prepare(`SELECT id, user_id, plan FROM projects WHERE id = ? AND user_id = ? LIMIT 1`)
    .bind(id, auth.user.id)
    .first();
  if (!existing) return error('Project not found.', 404);

  const rawData = body.data || body.canvas || body.project_data || {};
  const name = String(body.name || rawData.project_name || rawData.business_name || 'Untitled website').slice(0, 160);
  const plan = cleanPlan(body.plan || rawData.plan || existing.plan || 'starter');
  const data = enforceProjectPackage({ ...rawData, project_id: id, business_name: rawData.business_name || name }, plan);
  const checklist = validateProjectForPublish(data, plan);
  const domainOption = String(data.domain_option || rawData.domain_option || 'pbi_subdomain').slice(0, 80);
  const customDomain = String(data.custom_domain || data.domain_registration?.name || rawData.custom_domain || '').slice(0, 253);

  await env.DB.prepare(`
    UPDATE projects
    SET name = ?, data_json = ?, plan = ?, readiness_score = ?, package_warnings = ?,
        domain_option = ?, custom_domain = ?,
        last_validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(name, JSON.stringify(data), plan, checklist.score || 0, JSON.stringify(checklist.warnings || []), domainOption, customDomain, id, auth.user.id).run();

  return json({ ok: true, project: { id, name, plan, readiness_score: checklist.score || 0 }, checklist });
}
