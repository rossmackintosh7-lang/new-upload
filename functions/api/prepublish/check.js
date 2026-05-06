import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { validateProjectForPublish, enforceProjectPackage, cleanPlan } from '../../_lib/package-rules.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || '').trim();
  const incoming = body.canvas || body.data || null;
  let data = incoming;
  let plan = cleanPlan(body.plan || incoming?.plan || 'starter');

  if (!data && projectId) {
    const row = await env.DB.prepare(`SELECT data_json, plan FROM projects WHERE id = ? AND user_id = ? LIMIT 1`).bind(projectId, auth.user.id).first();
    if (!row) return error('Project not found.', 404);
    data = JSON.parse(row.data_json || '{}');
    plan = cleanPlan(body.plan || row.plan || data.plan);
  }

  const enforced = enforceProjectPackage(data || {}, plan);
  const result = validateProjectForPublish(enforced, plan);
  return json({ ok:true, ...result });
}
