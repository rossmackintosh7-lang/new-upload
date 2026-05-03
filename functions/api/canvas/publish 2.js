
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

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in first.", 401);

  const body = await readBody(request);
  const projectId = String(body.project_id || "").trim();
  if (!projectId) return error("Missing project_id.", 400);

  await ensureCanvasTable(env);

  const row = await env.DB.prepare(`
    SELECT canvas_json FROM project_canvas WHERE project_id=? AND user_id=? LIMIT 1
  `).bind(projectId, user.id).first();

  if (!row) return error("No saved canvas found for this project.", 404);

  await env.DB.prepare(`
    UPDATE project_canvas
    SET published_json=canvas_json, status='published', published_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
    WHERE project_id=? AND user_id=?
  `).bind(projectId, user.id).run();

  return json({ ok: true, project_id: projectId, status: "published" });
}
