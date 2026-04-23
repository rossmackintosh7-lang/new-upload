import { json, error } from '../../_lib/json.js';
import { randomHex, hashPassword } from '../../_lib/crypto.js';
import { verifyTurnstile } from '../../_lib/turnstile.js';
import { createSession, makeSetCookie } from '../../_lib/session.js';
import { readJson } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return error('Invalid request body.');

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const projectName = String(body.project_name || 'Untitled website').trim();
  const token = String(body.turnstileToken || '');

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return error('Enter a valid email address.');
  }

  if (!password || password.length < 8) {
    return error('Password must be at least 8 characters.');
  }

  if (!token) {
    return error('Turnstile token missing.');
  }

  const ok = await verifyTurnstile(
    env,
    token,
    request.headers.get('CF-Connecting-IP') || ''
  );

  if (!ok) {
    return error('Turnstile validation failed.', 400);
  }

  const existing = await env.DB
    .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first();

  if (existing) {
    return error('An account with that email already exists.', 409);
  }

  const userId = crypto.randomUUID();
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);

  await env.DB
    .prepare(`
      INSERT INTO users
      (id, email, password_hash, password_salt, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
    .bind(userId, email, passwordHash, salt)
    .run();

  const projectId = crypto.randomUUID();

  await env.DB
    .prepare(`
      INSERT INTO projects
      (id, user_id, name, status, data_json, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
    .bind(projectId, userId, projectName)
    .run();

  const session = await createSession(env, userId);

  return json(
    {
      ok: true,
      user: { id: userId, email },
      project: { id: projectId, name: projectName }
    },
    200,
    {
      'Set-Cookie': makeSetCookie('session_id', session.id, 60 * 60 * 24 * 30, true)
    }
  );
}
