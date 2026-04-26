import { json, error } from '../../_lib/json.js';

const SESSION_COOKIE_NAME = 'session_id';

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';

  const cookies = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex === -1) continue;

    const cookieName = cookie.slice(0, separatorIndex);
    const cookieValue = cookie.slice(separatorIndex + 1);

    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }

  return '';
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getUserFromSession(env, request) {
  const sessionId = getCookie(request, SESSION_COOKIE_NAME);

  if (!sessionId) {
    return null;
  }

  const session = await env.DB
    .prepare(`
      SELECT
        sessions.id,
        sessions.user_id,
        users.email
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = ?
      LIMIT 1
    `)
    .bind(sessionId)
    .first();

  if (!session) {
    return null;
  }

  return {
    id: session.user_id,
    email: session.email
  };
}

function cleanName(value) {
  const name = String(value || '').trim();

  if (!name) {
    return 'Untitled website';
  }

  return name.slice(0, 120);
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);

  if (!user) {
    return error('Unauthorized.', 401);
  }

  const body = await readBody(request);

  const projectId = String(body.id || body.projectId || '').trim();

  if (!projectId) {
    return error('Missing project id.', 400);
  }

  const name = cleanName(body.name || body.project_name);

  const data = body.data && typeof body.data === 'object'
    ? body.data
    : {};

  const dataJson = JSON.stringify(data);

  const existingProject = await env.DB
    .prepare(`
      SELECT id, user_id
      FROM projects
      WHERE id = ?
      LIMIT 1
    `)
    .bind(projectId)
    .first();

  if (!existingProject) {
    return error('Project not found.', 404);
  }

  if (existingProject.user_id !== user.id) {
    return error('Forbidden.', 403);
  }

  await env.DB
    .prepare(`
      UPDATE projects
      SET
        name = ?,
        data_json = ?,
        updated_at = datetime('now')
      WHERE id = ?
        AND user_id = ?
    `)
    .bind(name, dataJson, projectId, user.id)
    .run();

  const updatedProject = await env.DB
    .prepare(`
      SELECT
        id,
        name,
        data_json,
        created_at,
        updated_at
      FROM projects
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `)
    .bind(projectId, user.id)
    .first();

  return json({
    ok: true,
    project: updatedProject
  });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
