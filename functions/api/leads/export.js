import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { error } from '../../_lib/json.js';
import { ensureHostingTables } from '../../_lib/hosting.js';

function csvCell(value = '') {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env);
  await ensureHostingTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  if (!projectId) return error('Project id is required.');

  const project = await env.DB.prepare(`SELECT id, name FROM projects WHERE id = ? AND user_id = ? LIMIT 1`).bind(projectId, auth.user.id).first();
  if (!project) return error('Project not found.', 404);

  const rows = await env.DB.prepare(`
    SELECT id, name, email, phone, message, status, source, created_at, updated_at
    FROM leads
    WHERE project_id = ?
    ORDER BY datetime(created_at) DESC
    LIMIT 1000
  `).bind(projectId).all();

  const header = ['id', 'name', 'email', 'phone', 'message', 'status', 'source', 'created_at', 'updated_at'];
  const body = (rows.results || []).map((row) => header.map((key) => csvCell(row[key])).join(',')).join('\n');
  return new Response(`${header.join(',')}\n${body}\n`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${String(project.name || 'pbi-leads').replace(/[^a-z0-9._-]+/gi, '-')}-leads.csv"`
    }
  });
}
