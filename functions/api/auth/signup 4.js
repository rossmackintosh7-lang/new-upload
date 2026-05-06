import { json, error } from '../../_lib/json.js';
import { verifyTurnstileDetailed } from '../../_lib/turnstile.js';
import { randomHex, hashPassword } from '../../_lib/crypto.js';
import { createSession, makeSetCookie } from '../../_lib/session.js';
import { readJson, ensureCoreTables } from '../../_lib/auth.js';

const VALID_PLANS = new Set(['starter', 'business', 'plus']);

function cleanPlan(value) {
  const plan = String(value || 'starter').trim().toLowerCase();
  return VALID_PLANS.has(plan) ? plan : 'starter';
}

function cleanTemplate(value) {
  return String(value || 'cafe').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'cafe';
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);

  const body = await readJson(request);
  if (!body) return error('Invalid request body.');

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const projectName = String(body.project_name || body.website_name || 'My PBI website').trim().slice(0, 160) || 'My PBI website';
  const plan = cleanPlan(body.plan || body.package);
  const template = cleanTemplate(body.template_preset || body.template || body.preset);
  const termsAccepted = Boolean(body.terms_accepted);
  const termsVersion = String(body.terms_version || '2026-04-28').slice(0, 40);
  const token = String(body.turnstileToken || body.turnstile_token || '');

  if (!email || !email.includes('@')) return error('A valid email address is required.');
  if (password.length < 8) return error('Password must be at least 8 characters.');
  if (!termsAccepted) return error('You must agree to the Terms and Conditions before creating an account.');

  const turnstile = await verifyTurnstileDetailed(env, token, request.headers.get('CF-Connecting-IP') || '');
  if (!turnstile.success) {
    return error(turnstile.reason || 'Turnstile validation failed.', 400, {
      turnstileCode: turnstile.code || 'unknown',
      turnstileErrors: turnstile.errorCodes || []
    });
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first();
  if (existing) return error('An account already exists for this email address. Please log in instead.', 409);

  const userId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO users (id, email, password_hash, password_salt, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).bind(userId, email, passwordHash, salt, now, now).run();

  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS terms_acceptances (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT,
      terms_version TEXT,
      accepted_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    await env.DB.prepare(`
      INSERT INTO terms_acceptances (id, user_id, email, terms_version, accepted_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(crypto.randomUUID(), userId, email, termsVersion).run();
  } catch (_) {}

  const projectData = {
    id: projectId,
    business_name: projectName,
    template,
    template_preset: template,
    plan,
    package: plan,
    billing_status: 'draft',
    status: 'draft'
  };

  await env.DB.prepare(`
    INSERT INTO projects (id, user_id, name, status, data_json, published, plan, billing_status, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', ?, 0, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(projectId, userId, projectName, JSON.stringify(projectData), plan).run();

  const session = await createSession(env, userId);

  return json({
    ok: true,
    user: { id: userId, email, email_verified: false },
    project: { id: projectId, name: projectName, plan, template, status: 'draft' }
  }, 200, {
    'Set-Cookie': makeSetCookie('session_id', session.id, 60 * 60 * 24 * 30, true)
  });
}
