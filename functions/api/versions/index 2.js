
import { json, error, readBody, getUserFromSession } from "../projects/_shared.js";

async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT,
      label TEXT,
      body_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in first.", 401);

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  if (!projectId) return error("Missing project_id.", 400);

  await ensureTable(env);

  const rows = await env.DB.prepare(`
    SELECT id, project_id, label, body_json, created_at
    FROM project_versions
    WHERE project_id=? AND user_id=?
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(projectId, user.id).all();

  return json({ ok: true, versions: rows.results || [] });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in first.", 401);

  const body = await readBody(request);
  const projectId = String(body.project_id || "").trim();
  if (!projectId) return error("Missing project_id.", 400);

  await ensureTable(env);

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO project_versions (id, project_id, user_id, label, body_json, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    id,
    projectId,
    user.id,
    String(body.label || "Saved version").slice(0, 120),
    JSON.stringify(body.snapshot || body || {})
  ).run();

  return json({ ok: true, id });
}
