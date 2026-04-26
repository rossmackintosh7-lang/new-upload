import { json, error, readJson } from '../../_lib/json.js';

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

async function getUserFromSession(env, request) {
  const sessionId = getCookie(request, SESSION_COOKIE_NAME);

  if (!sessionId) return null;

  return await env.DB
    .prepare(
      `SELECT sessions.id, sessions.user_id, users.email
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?`
    )
    .bind(sessionId)
    .first();
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);

  if (!user) {
    return error('Unauthorized.', 401);
  }

  const body = await readJson(request);
  const id = String(body.id || '').trim();

  if (!id) {
    return error('Project ID is required.', 400);
  }

  const existing = await env.DB
    .prepare(
      `SELECT id
       FROM projects
       WHERE id = ? AND user_id = ?`
    )
    .bind(id, user.user_id)
    .first();

  if (!existing) {
    return error('Project not found.', 404);
  }

  await env.DB
    .prepare(
      `DELETE FROM projects
       WHERE id = ? AND user_id = ?`
    )
    .bind(id, user.user_id)
    .run();

  return json({
    ok: true,
    deleted: id
  });
}
