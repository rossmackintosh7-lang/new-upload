import { json, requireAdmin, ensurePbiOpsTables, parseProjectData } from './_shared.js';

async function all(env, sql, ...binds) {
  try { return (await env.DB.prepare(sql).bind(...binds).all()).results || []; } catch { return []; }
}

export async function onRequestGet({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const url = new URL(request.url);
  const projectId = url.searchParams.get('project_id') || '';
  if (projectId) {
    const project = await env.DB.prepare(`SELECT projects.*, users.email AS user_email FROM projects LEFT JOIN users ON users.id = projects.user_id WHERE projects.id = ? LIMIT 1`).bind(projectId).first();
    const sections = await all(env, `SELECT * FROM project_sections WHERE project_id = ? ORDER BY section_order ASC, created_at ASC`, projectId);
    const notes = await all(env, `SELECT * FROM admin_project_notes WHERE project_id = ? ORDER BY datetime(created_at) DESC LIMIT 30`, projectId);
    return json({ ok: true, project: project ? { ...project, data: parseProjectData(project) } : null, sections, notes });
  }
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 80), 1), 200);
  const projects = await all(env, `SELECT projects.*, users.email AS user_email FROM projects LEFT JOIN users ON users.id = projects.user_id ORDER BY datetime(COALESCE(projects.updated_at, projects.created_at, '1970-01-01')) DESC LIMIT ?`, limit);
  return json({ ok: true, projects: projects.map((project) => ({ ...project, data: parseProjectData(project) })) });
}
