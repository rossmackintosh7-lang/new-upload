import { json, error, readBody, requireAdmin, ensurePbiOpsTables, parseProjectData } from './_shared.js';
import { validateProjectForPublish, cleanPlan } from '../../_lib/package-rules.js';

export async function onRequestPost({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const body = await readBody(request);
  const projectId = String(body.project_id || '').trim();
  if (!projectId) return error('Project id is required.');
  const project = await env.DB.prepare(`SELECT * FROM projects WHERE id = ? LIMIT 1`).bind(projectId).first();
  if (!project) return error('Project not found.', 404);
  const data = parseProjectData(project);
  const check = validateProjectForPublish(data, cleanPlan(project.plan || data.plan || 'starter'));
  try {
    await env.DB.prepare(`ALTER TABLE projects ADD COLUMN readiness_score INTEGER DEFAULT 0`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`UPDATE projects SET readiness_score = ?, package_warnings = ?, last_validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(check.score || 0, JSON.stringify(check.warnings || []), projectId).run();
  } catch (_) {}
  return json({
    ok: true,
    readiness_score: check.score || 0,
    issues: (check.issues || []).map((issue) => ({ label: issue, fix: 'Open the project in the builder and complete this launch requirement.' })),
    warnings: check.warnings || []
  });
}
