import { json, error, readBody, getUserFromSession, makeId } from '../projects/_shared.js';
import { ensureCollaborationTables, getProjectAccess } from '../_lib/project-access.js';

function cleanRole(value) {
  return ['editor', 'viewer'].includes(String(value)) ? String(value) : 'editor';
}

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Log in first.', 401);
  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  if (!projectId) return error('Missing project_id.', 400);

  const access = await getProjectAccess(env, projectId, user);
  if (!access.ok) return error(access.error, access.status || 403);

  await ensureCollaborationTables(env);

  const collaborators = access.isOwner
    ? await env.DB.prepare(`SELECT id, email, role, status, created_at, accepted_at FROM project_collaborators WHERE project_id=? AND owner_user_id=? ORDER BY created_at DESC`).bind(projectId, access.ownerId).all()
    : { results: [] };
  const presence = await env.DB.prepare(`SELECT id, name, page, block, seen_at FROM project_presence WHERE project_id=? AND datetime(seen_at) > datetime('now', '-3 minutes') ORDER BY seen_at DESC`).bind(projectId).all();
  const notes = await env.DB.prepare(`SELECT id, page, text, created_at FROM project_collab_notes WHERE project_id=? ORDER BY created_at DESC LIMIT 30`).bind(projectId).all();

  return json({
    ok: true,
    role: access.role,
    can_edit: access.canEdit,
    can_publish: access.canPublish,
    is_owner: access.isOwner,
    collaborators: collaborators.results || [],
    presence: presence.results || [],
    notes: notes.results || []
  });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Log in first.', 401);
  const body = await readBody(request);
  const projectId = String(body.project_id || '').trim();
  const action = String(body.action || '');
  if (!projectId) return error('Missing project_id.', 400);

  const access = await getProjectAccess(env, projectId, user, action === 'invite' ? { requireOwner: true } : {});
  if (!access.ok) return error(access.error, access.status || 403);

  await ensureCollaborationTables(env);

  if (action === 'invite') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return error('A valid email is required.', 400);
    if (email === String(user.email || '').toLowerCase()) return error('You are already the owner of this project.', 400);
    const role = cleanRole(body.role);
    const id = makeId();
    const inviteToken = makeId();
    await env.DB.prepare(`
      INSERT INTO project_collaborators (id, project_id, owner_user_id, email, role, status, invite_token, invited_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'invited', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(id, projectId, access.ownerId, email, role, inviteToken, user.email || user.id).run();
    return json({ ok: true, id, email, role, invite_url: `/login/?next=${encodeURIComponent(`/canvas-builder/?project=${projectId}`)}` });
  }

  if (action === 'presence') {
    const presence = body.presence || {};
    const id = `${projectId}:${user.id}`;
    await env.DB.prepare(`
      INSERT INTO project_presence (id, project_id, user_id, name, page, block, seen_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, page=excluded.page, block=excluded.block, seen_at=CURRENT_TIMESTAMP
    `).bind(id, projectId, user.id, String(presence.name || user.email || 'Editor').slice(0, 120), String(presence.page || '').slice(0, 120), String(presence.block || '').slice(0, 180)).run();
    return json({ ok: true });
  }

  if (action === 'comment') {
    if (!access.canEdit && !access.isOwner) return error('Viewer access cannot add build notes.', 403);
    const text = String(body.text || '').trim().slice(0, 2000);
    if (!text) return error('Comment text is required.', 400);
    const id = makeId();
    await env.DB.prepare(`INSERT INTO project_collab_notes (id, project_id, user_id, page, text, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(id, projectId, user.id, String(body.page || '').slice(0, 120), text).run();
    return json({ ok: true, id });
  }

  if (action === 'remove_invite') {
    if (!access.isOwner) return error('Only the project owner can remove collaborators.', 403);
    const collaboratorId = String(body.id || '').trim();
    if (!collaboratorId) return error('Missing collaborator id.', 400);
    await env.DB.prepare(`DELETE FROM project_collaborators WHERE id=? AND project_id=? AND owner_user_id=?`).bind(collaboratorId, projectId, access.ownerId).run();
    return json({ ok: true, removed_id: collaboratorId });
  }

  return error('Unknown collaboration action.', 400);
}
