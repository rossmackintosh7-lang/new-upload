export const SESSION_COOKIE_NAME = 'session_id';

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export function error(message, status = 400, extra = {}) {
  return json({ ok: false, error: message, ...extra }, status);
}

export async function readBody(request) {
  try {
    const type = request.headers.get('content-type') || '';
    if (type.includes('application/json')) return await request.json();
    const text = await request.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return { text }; }
  } catch {
    return {};
  }
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || request.headers.get('cookie') || '';
  for (const chunk of header.split(';')) {
    const part = chunk.trim();
    if (!part) continue;
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (key !== name) continue;
    try { return decodeURIComponent(part.slice(index + 1)); } catch { return part.slice(index + 1); }
  }
  return '';
}

export async function ensureCoreTables(env) {
  if (!env?.DB) return false;

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    password_salt TEXT,
    email_verified INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    expires_at TEXT,
    created_at TEXT,
    last_seen_at TEXT
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    status TEXT DEFAULT 'draft',
    data_json TEXT DEFAULT '{}',
    published INTEGER DEFAULT 0,
    public_slug TEXT,
    plan TEXT DEFAULT 'free_preview',
    billing_status TEXT DEFAULT 'draft',
    domain_option TEXT DEFAULT 'pbi_subdomain',
    custom_domain TEXT,
    published_at TEXT,
    stripe_session_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TEXT,
    updated_at TEXT
  )`).run();

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
    try { await env.DB.prepare(sql).run(); } catch (_) {}
  }

  return true;
}

export async function getUserFromSession(env, request) {
  if (!env?.DB) return null;
  await ensureCoreTables(env);
  const sessionId = getCookie(request, SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  const session = await env.DB.prepare(`
    SELECT sessions.user_id, users.email
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ?
      AND (sessions.expires_at IS NULL OR datetime(sessions.expires_at) > datetime('now'))
    LIMIT 1
  `).bind(sessionId).first();

  if (!session) return null;

  try {
    await env.DB.prepare(`UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`).bind(sessionId).run();
  } catch (_) {}

  return { id: session.user_id, email: session.email };
}

export function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'website';
}
