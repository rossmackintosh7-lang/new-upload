
import { json, error, readBody, getUserFromSession } from "../projects/_shared.js";

async function ensureCanvasTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_canvas (
      project_id TEXT PRIMARY KEY,
      user_id TEXT,
      canvas_json TEXT NOT NULL,
      published_json TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT
    )
  `).run();
}

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in first.", 401);

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  if (!projectId) return error("Missing project_id.", 400);

  await ensureCanvasTable(env);

  const row = await env.DB.prepare(`
    SELECT project_id, user_id, canvas_json, published_json, status, updated_at, published_at
    FROM project_canvas
    WHERE project_id=? AND user_id=?
    LIMIT 1
  `).bind(projectId, user.id).first();

  return json({
    ok: true,
    canvas: row ? {
      project_id: row.project_id,
      status: row.status,
      updated_at: row.updated_at,
      published_at: row.published_at,
      canvas: JSON.parse(row.canvas_json || "{}"),
      published: row.published_json ? JSON.parse(row.published_json) : null
    } : null
  });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in first.", 401);

  const body = await readBody(request);
  const projectId = String(body.project_id || "").trim();
  if (!projectId) return error("Missing project_id.", 400);

  const canvas = body.canvas || {};
  await ensureCanvasTable(env);

  await env.DB.prepare(`
    INSERT INTO project_canvas (project_id, user_id, canvas_json, status, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(project_id) DO UPDATE SET
      canvas_json=excluded.canvas_json,
      updated_at=CURRENT_TIMESTAMP
  `).bind(projectId, user.id, JSON.stringify(canvas)).run();

  return json({ ok: true, project_id: projectId });
}
