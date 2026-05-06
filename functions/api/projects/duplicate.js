import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { enforceProjectPackage } from '../../_lib/package-rules.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const sourceId = String(body.project_id || '').trim();
  if (!sourceId) return error('Project id is required.');

  const source = await env.DB.prepare(`SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1`).bind(sourceId, auth.user.id).first();
  if (!source) return error('Project not found.', 404);

  const id = crypto.randomUUID();
  const data = enforceProjectPackage({ ...(JSON.parse(source.data_json || '{}')), project_id:id }, source.plan);
  const name = `${source.name || 'Website'} copy`.slice(0,160);

  await env.DB.prepare(`INSERT INTO projects (id, user_id, name, status, data_json, plan, billing_status, published, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', ?, ?, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, auth.user.id, name, JSON.stringify(data), source.plan || 'starter').run();

  return json({ ok:true, project:{ id, name, plan: source.plan || 'starter', status:'draft' } });
}
