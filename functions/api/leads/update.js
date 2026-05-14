import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { ensureHostingTables } from '../../_lib/hosting.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  await ensureHostingTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const id = String(body.lead_id || '').trim();
  const status = String(body.status || 'new').trim().toLowerCase();
  if (!id) return error('Lead id is required.');
  const allowed = new Set(['new', 'contacted', 'read', 'replied', 'won', 'lost', 'spam', 'archived']);
  if (!allowed.has(status)) return error('Invalid lead status.');
  const lead = await env.DB.prepare(`
    SELECT l.id
    FROM leads l
    INNER JOIN projects p ON p.id = l.project_id
    WHERE l.id = ? AND p.user_id = ?
    LIMIT 1
  `).bind(id, auth.user.id).first();
  if (!lead) return error('Lead not found.', 404);
  await env.DB.prepare(`UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id).run();
  return json({ ok:true });
}
