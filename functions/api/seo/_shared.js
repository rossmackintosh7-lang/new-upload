import { json, error } from '../../_lib/json.js';
import { requireUser } from '../../_lib/auth.js';

export { json, error };

export async function requireSeoUser(env, request) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (token && env.PBI_ADMIN_TOKEN && token === env.PBI_ADMIN_TOKEN) {
    return { ok: true, user: { id: 'admin-token', email: 'admin-token@pbi.local', admin_token: true } };
  }
  return requireUser(env, request);
}

export async function ensureSeoTables(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    seo_score INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_checked TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  try { await env.DB.prepare(`ALTER TABLE seo_pages ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP`).run(); } catch (_) {}
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_url TEXT NOT NULL,
    severity TEXT DEFAULT 'medium',
    issue_text TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_url TEXT NOT NULL,
    suggestion_type TEXT DEFAULT 'meta',
    current_value TEXT,
    suggested_value TEXT,
    reasoning TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    target_url TEXT,
    intent TEXT,
    priority TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export function defaultPages(env) {
  const base = String(env.PBI_BASE_URL || 'https://www.purbeckbusinessinnovations.co.uk').replace(/\/+$/, '');
  const paths = String(env.PBI_SEO_PAGES || '/,/templates/,/pricing/,/contact/,/custom-build/')
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean);
  return paths.map((path) => ({
    url: path.startsWith('http') ? path : `${base}${path}`,
    title: path === '/' ? 'PBI Website Builder' : path.replace(/\//g, ' ').trim() || 'PBI page',
    seo_score: 78,
    word_count: 0,
    last_checked: ''
  }));
}
