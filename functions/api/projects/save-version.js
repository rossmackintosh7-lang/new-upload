import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { cleanPlan, enforceProjectPackage } from '../../_lib/package-rules.js';

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS project_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    user_id TEXT,
    plan TEXT,
    data_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
  const plan = cleanPlan(body.plan || body.state?.plan || 'starter');
  const data = enforceProjectPackage(body.state || {}, plan);
  await env.DB.prepare(`INSERT INTO project_versions (id, project_id, user_id, plan, data_json, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .bind(crypto.randomUUID(), projectId, auth.user.id, plan, JSON.stringify(data)).run();
  return json({ ok:true });
}
