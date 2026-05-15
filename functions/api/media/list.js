import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { json, error, ensurePlatformTables } from '../../_lib/platform.js';
import { ensureHostingTables } from '../../_lib/hosting.js';

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env);
  await ensurePlatformTables(env);
  await ensureHostingTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  if (!projectId) return error('Project id is required.');
  const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ? LIMIT 1').bind(projectId, auth.user.id).first();
  if (!project) return error('Project not found.', 404);
  const rows = await env.DB.prepare('SELECT id, project_id, site_id, filename, content_type, size, url, alt, storage_key, created_at FROM media_assets WHERE project_id = ? AND user_id = ? ORDER BY datetime(created_at) DESC LIMIT 200').bind(projectId, auth.user.id).all();
  return json({ ok: true, assets: rows.results || [] });
}
