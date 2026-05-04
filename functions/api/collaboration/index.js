
import { json, error, readBody, getUserFromSession, makeId } from "../projects/_shared.js";

async function ensureCollabTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_collaborators (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'editor',
      status TEXT DEFAULT 'invited',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_presence (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT,
      page TEXT,
      block TEXT,
      seen_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_collab_notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      page TEXT,
      text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in first.", 401);
  const url = new URL(request.url);
  const projectId = String(url.searchParams.get("project_id") || "").trim();
  if (!projectId) return error("Missing project_id.", 400);
  await ensureCollabTables(env);
  const collaborators = await env.DB.prepare(`SELECT id, email, role, status, created_at FROM project_collaborators WHERE project_id=? AND owner_user_id=? ORDER BY created_at DESC`).bind(projectId, user.id).all();
  const presence = await env.DB.prepare(`SELECT id, name, page, block, seen_at FROM project_presence WHERE project_id=? AND datetime(seen_at) > datetime('now', '-3 minutes') ORDER BY seen_at DESC`).bind(projectId).all();
  const notes = await env.DB.prepare(`SELECT id, page, text, created_at FROM project_collab_notes WHERE project_id=? ORDER BY created_at DESC LIMIT 30`).bind(projectId).all();
  return json({ ok: true, collaborators: collaborators.results || [], presence: presence.results || [], notes: notes.results || [] });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in first.", 401);
  const body = await readBody(request);
  const projectId = String(body.project_id || "").trim();
  const action = String(body.action || "");
  if (!projectId) return error("Missing project_id.", 400);
  await ensureCollabTables(env);

  if (action === "invite") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return error("A valid email is required.", 400);
    const role = ["owner", "editor", "viewer"].includes(String(body.role)) ? String(body.role) : "editor";
    const id = makeId();
    await env.DB.prepare(`INSERT INTO project_collaborators (id, project_id, owner_user_id, email, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'invited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(id, projectId, user.id, email, role).run();
    return json({ ok: true, id, email, role });
  }

  if (action === "presence") {
    const presence = body.presence || {};
    const id = `${projectId}:${user.id}`;
    await env.DB.prepare(`
      INSERT INTO project_presence (id, project_id, user_id, name, page, block, seen_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, page=excluded.page, block=excluded.block, seen_at=CURRENT_TIMESTAMP
    `).bind(id, projectId, user.id, String(presence.name || user.email || "Editor").slice(0, 120), String(presence.page || "").slice(0, 120), String(presence.block || "").slice(0, 180)).run();
    return json({ ok: true });
  }

  if (action === "comment") {
    const text = String(body.text || "").trim().slice(0, 2000);
    if (!text) return error("Comment text is required.", 400);
    const id = makeId();
    await env.DB.prepare(`INSERT INTO project_collab_notes (id, project_id, user_id, page, text, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(id, projectId, user.id, String(body.page || "").slice(0, 120), text).run();
    return json({ ok: true, id });
  }

  return error("Unknown collaboration action.", 400);
}
