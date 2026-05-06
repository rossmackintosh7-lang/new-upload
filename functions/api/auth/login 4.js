import { json, error } from '../../_lib/json.js';
import { verifyTurnstileDetailed } from '../../_lib/turnstile.js';
import { verifyPassword } from '../../_lib/crypto.js';
import { createSession, makeSetCookie } from '../../_lib/session.js';
import { readJson, ensureCoreTables } from '../../_lib/auth.js';

async function ensureUserControls(env) {
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_user_controls (
      user_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'active',
      notes TEXT,
      suspended_at TEXT,
      suspended_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();
  } catch (_) {}
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  await ensureUserControls(env);
  const body = await readJson(request);
  if (!body) return error('Invalid request body.');

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const token = String(body.turnstileToken || '');

  if (!email || !password) {
    return error('Email and password are required.');
  }

  if (!token) {
    return error('Turnstile token missing. Refresh the page and complete the security check again.');
  }

  const turnstile = await verifyTurnstileDetailed(
    env,
    token,
    request.headers.get('CF-Connecting-IP') || ''
  );

  if (!turnstile.success) {
    return error(turnstile.reason || 'Turnstile validation failed.', 400, {
      turnstileCode: turnstile.code || 'unknown',
      turnstileErrors: turnstile.errorCodes || [],
      turnstileHostname: turnstile.hostname || ''
    });
  }

  let user = null;
  try {
    user = await env.DB
      .prepare(`SELECT users.id, users.email, users.password_hash, users.password_salt, users.email_verified, COALESCE(admin_user_controls.status, 'active') AS account_status FROM users LEFT JOIN admin_user_controls ON admin_user_controls.user_id = users.id WHERE users.email = ? LIMIT 1`)
      .bind(email)
      .first();
  } catch (_) {
    user = await env.DB
      .prepare('SELECT id, email, password_hash, password_salt, email_verified, "active" AS account_status FROM users WHERE email = ? LIMIT 1')
      .bind(email)
      .first();
  }

  if (!user) {
    return error('Invalid email or password.', 401);
  }

  if (String(user.account_status || '').toLowerCase() === 'suspended') {
    return error('This account has been suspended. Contact PBI support if you think this is a mistake.', 403);
  }

  const valid = await verifyPassword(password, user.password_salt, user.password_hash);

  if (!valid) {
    return error('Invalid email or password.', 401);
  }

  const session = await createSession(env, user.id);

  return json(
    {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        email_verified: Boolean(user.email_verified)
      }
    },
    200,
    {
      'Set-Cookie': makeSetCookie('session_id', session.id, 60 * 60 * 24 * 30, true)
    }
  );
}
