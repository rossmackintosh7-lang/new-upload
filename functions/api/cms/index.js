
import { json, error, readBody, getUserFromSession, makeId, slugify } from "../projects/_shared.js";

async function ensureCmsTables(env) {
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
      data_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_project_cms_project_user ON project_cms_entries(project_id, user_id)`).run();
}

function cleanItem(item = {}) {
  const title = String(item.title || "Untitled entry").slice(0, 180);
  const type = String(item.type || "blog").slice(0, 60);
  const status = ["draft", "published", "archived"].includes(String(item.status)) ? String(item.status) : "draft";
  const slug = slugify(item.slug || title).slice(0, 100);
  const body = String(item.text || item.body || "").slice(0, 6000);
  return { id: String(item.id || makeId()).slice(0, 80), type, title, slug, status, body, data_json: JSON.stringify(item) };
}

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in first.", 401);
  const url = new URL(request.url);
  const projectId = String(url.searchParams.get("project_id") || "").trim();
  if (!projectId) return error("Missing project_id.", 400);
  await ensureCmsTables(env);
  const rows = await env.DB.prepare(`
    SELECT id, type, title, slug, status, body, data_json, updated_at
    FROM project_cms_entries
    WHERE project_id=? AND user_id=?
    ORDER BY updated_at DESC
  `).bind(projectId, user.id).all();
  const items = (rows.results || []).map((row) => {
    let data = {};
    try { data = JSON.parse(row.data_json || "{}"); } catch (_) {}
    return { ...data, id: row.id, type: row.type, title: row.title, slug: row.slug, status: row.status, text: row.body, updated_at: row.updated_at };
  });
  return json({ ok: true, items });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in first.", 401);
  const body = await readBody(request);
  const projectId = String(body.project_id || "").trim();
  if (!projectId) return error("Missing project_id.", 400);
  await ensureCmsTables(env);

  if (body.delete_id) {
    await env.DB.prepare(`DELETE FROM project_cms_entries WHERE id=? AND project_id=? AND user_id=?`).bind(String(body.delete_id), projectId, user.id).run();
    return json({ ok: true, deleted_id: String(body.delete_id) });
  }

  const items = Array.isArray(body.items) ? body.items : [body.item || body];
  for (const raw of items) {
    const item = cleanItem(raw);
    await env.DB.prepare(`
      INSERT INTO project_cms_entries (id, project_id, user_id, type, title, slug, status, body, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        type=excluded.type,
        title=excluded.title,
        slug=excluded.slug,
        status=excluded.status,
        body=excluded.body,
        data_json=excluded.data_json,
        updated_at=CURRENT_TIMESTAMP
    `).bind(item.id, projectId, user.id, item.type, item.title, item.slug, item.status, item.body, item.data_json).run();
  }
  return json({ ok: true, count: items.length });
}
