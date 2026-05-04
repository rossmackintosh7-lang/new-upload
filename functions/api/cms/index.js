import { json, error, readBody, getUserFromSession, makeId, slugify } from '../projects/_shared.js';
import { getProjectAccess } from '../_lib/project-access.js';

async function ensureCmsTables(env) {
  if (!env?.DB) throw new Error('D1 database binding DB is missing.');
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_cms_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT DEFAULT 'blog',
      title TEXT,
      slug TEXT,
      status TEXT DEFAULT 'draft',
      body TEXT,
      excerpt TEXT,
      image TEXT,
      seo_title TEXT,
      seo_description TEXT,
      data_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT
    )
  `).run();
  const alters = [
    `ALTER TABLE project_cms_entries ADD COLUMN excerpt TEXT`,
    `ALTER TABLE project_cms_entries ADD COLUMN image TEXT`,
    `ALTER TABLE project_cms_entries ADD COLUMN seo_title TEXT`,
    `ALTER TABLE project_cms_entries ADD COLUMN seo_description TEXT`,
    `ALTER TABLE project_cms_entries ADD COLUMN published_at TEXT`
  ];
  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch (_) {}
  }
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_project_cms_project_user ON project_cms_entries(project_id, user_id)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_project_cms_public ON project_cms_entries(project_id, type, slug, status)`).run();
}

function normaliseType(value) {
  return String(value || 'blog')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'blog';
}

function cleanItem(item = {}) {
  const title = String(item.title || 'Untitled entry').trim().slice(0, 180) || 'Untitled entry';
  const type = normaliseType(item.type || item.collection);
  const status = ['draft', 'published', 'archived'].includes(String(item.status)) ? String(item.status) : 'draft';
  const slug = slugify(item.slug || title).slice(0, 100);
  const body = String(item.text || item.body || '').slice(0, 12000);
  const excerpt = String(item.excerpt || body.split('\n').find(Boolean) || '').slice(0, 260);
  const image = String(item.image || '').slice(0, 700);
  return {
    id: String(item.id || makeId()).slice(0, 80),
    type,
    title,
    slug,
    status,
    body,
    excerpt,
    image,
    seo_title: String(item.seo_title || title).slice(0, 180),
    seo_description: String(item.seo_description || excerpt).slice(0, 300),
    data_json: JSON.stringify({ ...item, type, title, slug, status, text: body, excerpt, image })
  };
}

function rowToItem(row) {
  let data = {};
  try { data = JSON.parse(row.data_json || '{}'); } catch (_) {}
  return {
    ...data,
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    status: row.status,
    text: row.body,
    body: row.body,
    excerpt: row.excerpt,
    image: row.image,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    updated_at: row.updated_at,
    published_at: row.published_at
  };
}

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Log in first.', 401);
  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  if (!projectId) return error('Missing project_id.', 400);

  const access = await getProjectAccess(env, projectId, user);
  if (!access.ok) return error(access.error, access.status || 403);

  await ensureCmsTables(env);
  const rows = await env.DB.prepare(`
    SELECT id, type, title, slug, status, body, excerpt, image, seo_title, seo_description, data_json, updated_at, published_at
    FROM project_cms_entries
    WHERE project_id=? AND user_id=?
    ORDER BY updated_at DESC
  `).bind(projectId, access.ownerId).all();

  return json({ ok: true, role: access.role, can_edit: access.canEdit, items: (rows.results || []).map(rowToItem) });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Log in first.', 401);
  const body = await readBody(request);
  const projectId = String(body.project_id || '').trim();
  if (!projectId) return error('Missing project_id.', 400);

  const access = await getProjectAccess(env, projectId, user, { requireEdit: true });
  if (!access.ok) return error(access.error, access.status || 403);

  await ensureCmsTables(env);

  if (body.delete_id) {
    await env.DB.prepare(`DELETE FROM project_cms_entries WHERE id=? AND project_id=? AND user_id=?`).bind(String(body.delete_id), projectId, access.ownerId).run();
    return json({ ok: true, deleted_id: String(body.delete_id) });
  }

  const items = Array.isArray(body.items) ? body.items : [body.item || body];
  for (const raw of items) {
    const item = cleanItem(raw);
    const publishedAt = item.status === 'published' ? new Date().toISOString() : null;
    await env.DB.prepare(`
      INSERT INTO project_cms_entries (id, project_id, user_id, type, title, slug, status, body, excerpt, image, seo_title, seo_description, data_json, created_at, updated_at, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(id) DO UPDATE SET
        type=excluded.type,
        title=excluded.title,
        slug=excluded.slug,
        status=excluded.status,
        body=excluded.body,
        excerpt=excluded.excerpt,
        image=excluded.image,
        seo_title=excluded.seo_title,
        seo_description=excluded.seo_description,
        data_json=excluded.data_json,
        updated_at=CURRENT_TIMESTAMP,
        published_at=CASE WHEN excluded.status='published' THEN COALESCE(project_cms_entries.published_at, excluded.published_at, CURRENT_TIMESTAMP) ELSE project_cms_entries.published_at END
    `).bind(item.id, projectId, access.ownerId, item.type, item.title, item.slug, item.status, item.body, item.excerpt, item.image, item.seo_title, item.seo_description, item.data_json, publishedAt).run();
  }
  return json({ ok: true, count: items.length });
}
