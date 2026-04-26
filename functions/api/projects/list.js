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

    if (separatorIndex === -1) {
      continue;
    }

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

  if (!sessionId) {
    return null;
  }

  const session = await env.DB
    .prepare(
      `SELECT sessions.id, sessions.user_id, users.email
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?`
    )
    .bind(sessionId)
    .first();

  return session || null;
}

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(env, request);

  if (!user) {
    return error('Unauthorized.', 401);
  }

  const result = await env.DB
    .prepare(
      `SELECT id, name, data_json, created_at, updated_at
       FROM projects
       WHERE user_id = ?
       ORDER BY updated_at DESC`
    )
    .bind(user.user_id)
    .all();

  return json({
    ok: true,
    projects: result.results || []
  });
}
