import { json, error, readBody, requireAdmin, ensurePbiOpsTables, uniqueSlug } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const body = await readBody(request);
  const projectId = String(body.project_id || '').trim();
  if (!projectId) return error('Project id is required.');
  const project = await env.DB.prepare(`SELECT * FROM projects WHERE id = ? LIMIT 1`).bind(projectId).first();
  if (!project) return error('Project not found.', 404);
  const slug = project.public_slug || await uniqueSlug(env, project.name || 'website', projectId);
  await env.DB.prepare(`UPDATE projects SET published = 1, public_slug = ?, status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(slug, projectId).run();
  return json({ ok: true, live_url: `/site/canvas/${encodeURIComponent(slug)}/`, public_slug: slug });
}
