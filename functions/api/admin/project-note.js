import { json, error, readBody, requireAdmin, ensurePbiOpsTables } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const { admin, response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const body = await readBody(request);
  const projectId = String(body.project_id || '').trim();
  const note = String(body.note || '').trim();
  if (!projectId || !note) return error('Project id and note are required.');
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO admin_project_notes (id, project_id, request_id, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .bind(id, projectId, String(body.request_id || ''), note.slice(0, 4000), admin.email || admin.id || 'admin').run();
  return json({ ok: true, note: { id } });
}
