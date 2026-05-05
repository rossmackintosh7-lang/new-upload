export function parseCookies(request) {
  const raw = request.headers.get('Cookie') || '';
  return Object.fromEntries(
    raw
      .split(';')
      .map(part => {
        const [key, ...rest] = part.trim().split('=');
        return [key, decodeURIComponent(rest.join('=') || '')];
      })
      .filter(([key]) => key)
  );
}

export function makeSetCookie(name, value, maxAge, secure = true) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(name, secure = true) {
  return makeSetCookie(name, '', 0, secure);
}

export async function createSession(env, userId) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  await env.DB
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(id, userId, expiresAt)
    .run();

  return { id, expiresAt };
}

export async function getSessionUser(env, request) {
  const cookies = parseCookies(request);
  const sessionId = cookies.session_id;
  if (!sessionId) return null;

  const row = await env.DB
    .prepare(`
      SELECT users.id, users.email, COALESCE(users.email_verified, 0) AS email_verified, sessions.expires_at,
             COALESCE(admin_user_controls.status, 'active') AS account_status
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      LEFT JOIN admin_user_controls ON admin_user_controls.user_id = users.id
      WHERE sessions.id = ?
      LIMIT 1
    `)
    .bind(sessionId)
    .first();

  if (!row) return null;

  if (row.account_status === 'suspended') {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    return null;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    email_verified: Boolean(row.email_verified)
  };
}

export async function destroySession(env, request) {
  const cookies = parseCookies(request);
  const sessionId = cookies.session_id;
  if (!sessionId) return;

  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}
