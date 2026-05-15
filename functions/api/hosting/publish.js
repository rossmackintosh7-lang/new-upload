import { error, loadOwnedProject, publishProjectToHosting, requireHostingUser } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const auth = await requireHostingUser(env, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || body.project || '').trim();
  if (!projectId) return error('Project id is required.');

  const project = await loadOwnedProject(env, projectId, auth.user.id);
  if (!project) return error('Project not found.', 404);

  try {
    return await publishProjectToHosting({ request, env, user: auth.user, project, body });
  } catch (err) {
    return error(err?.message || 'Publishing failed.', 400);
  }
}
