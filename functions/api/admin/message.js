import { json, error, readBody, requireAdmin, ensurePbiOpsTables } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  const body = await readBody(request);
  const id = String(body.id || '').trim();
  const status = String(body.status || 'reviewed').trim();
  const type = String(body.type || '').trim();
  if (!id) return error('Message id is required.');

  if (type === 'custom_enquiry') {
    await env.DB.prepare(`UPDATE custom_build_enquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id).run();
    await env.DB.prepare(`UPDATE admin_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id).run();
    return json({ ok: true });
  }

  if (type === 'support_request') {
    await env.DB.prepare(`UPDATE support_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id).run();
    return json({ ok: true });
  }

  return error('Unknown message type.');
}
