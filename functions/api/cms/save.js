import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cms_items (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    user_id TEXT,
    type TEXT,
    title TEXT,
    slug TEXT,
    status TEXT DEFAULT 'draft',
    body TEXT,
    excerpt TEXT,
    seo_title TEXT,
    seo_description TEXT,
    data_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env); await ensure(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || '').trim();
  if (!projectId) return error('Project id is required.');
  const items = Array.isArray(body.items) ? body.items : [];
  for (const item of items) {
    const id = String(item.id || crypto.randomUUID()).slice(0,80);
    await env.DB.prepare(`INSERT INTO cms_items (id, project_id, user_id, type, title, slug, status, body, excerpt, seo_title, seo_description, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET type=excluded.type, title=excluded.title, slug=excluded.slug, status=excluded.status, body=excluded.body, excerpt=excluded.excerpt, seo_title=excluded.seo_title, seo_description=excluded.seo_description, data_json=excluded.data_json, updated_at=CURRENT_TIMESTAMP`)
      .bind(id, projectId, auth.user.id, item.type || 'blog', item.title || 'Untitled', item.slug || id, item.status || 'draft', item.body || '', item.excerpt || '', item.seoTitle || item.seo_title || '', item.seoDescription || item.seo_description || '', JSON.stringify(item)).run();
  }
  return json({ ok:true, count:items.length });
}
