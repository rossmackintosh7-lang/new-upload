import { error, json, loadOwnedProject, requireHostingUser, siteForOwnedProject } from './_shared.js';
import { recordSiteEvent, updateProjectPublication } from '../../_lib/hosting.js';

export async function onRequestPost({ request, env }) {
  const auth = await requireHostingUser(env, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || body.project || '').trim();
  if (!projectId) return error('Project id is required.');

  const project = await loadOwnedProject(env, projectId, auth.user.id);
  if (!project) return error('Project not found.', 404);
  const site = await siteForOwnedProject(env, project.id, auth.user.id);
  if (!site) return error('Hosted site not found.', 404);

  await env.DB.prepare(`
    UPDATE published_sites
    SET status = 'unpublished', unpublished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(site.id, auth.user.id).run();
  await updateProjectPublication(env, {
    projectId: project.id,
    userId: auth.user.id,
    published: false,
    status: 'unpublished'
  });
  await recordSiteEvent(env, {
    site_id: site.id,
    project_id: project.id,
    user_id: auth.user.id,
    event_type: 'site_unpublished',
    message: 'Site unpublished by account owner.'
  });

  return json({ ok: true, unpublished: true });
}
