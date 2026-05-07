import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || body.projectId || crypto.randomUUID()).slice(0, 80);
  const project = body.project || {};
  const name = String(body.projectName || body.name || project.brand?.businessName || 'PBI website draft').slice(0, 160);
  const existing = await env.DB.prepare(`SELECT user_id FROM projects WHERE id = ? LIMIT 1`).bind(id).first();
  if (existing && existing.user_id !== auth.user.id) return error('Project not found.', 404);
  await env.DB.prepare(`INSERT INTO projects (id, user_id, name, status, data_json, published, plan, billing_status, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', ?, 0, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, data_json = excluded.data_json, status = 'draft', updated_at = CURRENT_TIMESTAMP`)
    .bind(id, auth.user.id, name, JSON.stringify(project), String(project.plan || body.plan || 'starter')).run();
  return json({ ok: true, projectId: id, project: { id, name } });
}
