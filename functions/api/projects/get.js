import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const id = String(url.searchParams.get('id') || url.searchParams.get('project') || '').trim();
  if (!id) return error('Project id is required.');

  const project = await env.DB.prepare(`
    SELECT id, user_id, name, status, data_json, published, public_slug, plan, billing_status, stripe_customer_id, stripe_subscription_id, updated_at, created_at
    FROM projects
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).bind(id, auth.user.id).first();

  if (!project) return error('Project not found.', 404);
  return json({ ok: true, project });
}
