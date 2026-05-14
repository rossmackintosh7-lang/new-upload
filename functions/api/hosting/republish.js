import { error, loadOwnedProject, publishProjectToHosting, requireHostingUser, siteForOwnedProject } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const auth = await requireHostingUser(env, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || body.project || '').trim();
  if (!projectId) return error('Project id is required.');

  const project = await loadOwnedProject(env, projectId, auth.user.id);
  if (!project) return error('Project not found.', 404);
  const site = await siteForOwnedProject(env, project.id, auth.user.id);

  return publishProjectToHosting({
    request,
    env,
    user: auth.user,
    project,
    body: { ...body, site_slug: body.site_slug || site?.site_slug || project.public_slug || '' }
  });
}
