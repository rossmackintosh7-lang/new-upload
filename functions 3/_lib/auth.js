import { error } from './json.js';
import { getSessionUser } from './session.js';

export async function ensureCoreTables(env) {
  if (!env.DB) throw new Error('Database binding missing.');

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, password_salt TEXT)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT, expires_at TEXT)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, status TEXT DEFAULT 'draft', data_json TEXT DEFAULT '{}')`).run();

  const alters = [
    `ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN created_at TEXT`,
    `ALTER TABLE users ADD COLUMN updated_at TEXT`,
    `ALTER TABLE sessions ADD COLUMN created_at TEXT`,
    `ALTER TABLE sessions ADD COLUMN last_seen_at TEXT`,
    `ALTER TABLE projects ADD COLUMN created_at TEXT`,
    `ALTER TABLE projects ADD COLUMN updated_at TEXT`,
    `ALTER TABLE projects ADD COLUMN published INTEGER DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN public_slug TEXT`,
    `ALTER TABLE projects ADD COLUMN plan TEXT DEFAULT 'free_preview'`,
    `ALTER TABLE projects ADD COLUMN billing_status TEXT DEFAULT 'draft'`,
    `ALTER TABLE projects ADD COLUMN domain_option TEXT DEFAULT 'pbi_subdomain'`,
    `ALTER TABLE projects ADD COLUMN custom_domain TEXT`,
    `ALTER TABLE projects ADD COLUMN published_at TEXT`,
    `ALTER TABLE projects ADD COLUMN stripe_session_id TEXT`,
    `ALTER TABLE projects ADD COLUMN stripe_customer_id TEXT`,
    `ALTER TABLE projects ADD COLUMN stripe_subscription_id TEXT`
  ];

  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch {}
  }
}

export async function requireUser(env, request) {
  await ensureCoreTables(env);
  const user = await getSessionUser(env, request);
  if (!user) {
    return { ok: false, response: error('Unauthorized.', 401) };
  }
  return { ok: true, user };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
