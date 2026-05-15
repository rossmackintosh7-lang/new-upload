import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { json, error } from '../../_lib/json.js';
import { ensureHostingTables } from '../../_lib/hosting.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  await ensureHostingTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || body.asset_id || '').trim();
  if (!id) return error('Media asset id is required.');

  const asset = await env.DB.prepare(`
    SELECT id, user_id, project_id, storage_key FROM media_assets WHERE id = ? AND user_id = ? LIMIT 1
  `).bind(id, auth.user.id).first();
  if (!asset) return error('Media asset not found.', 404);

  const bucket = env.MEDIA_BUCKET || env.PBI_ASSETS;
  if (bucket && asset.storage_key) {
    try { await bucket.delete(asset.storage_key); } catch (_) {}
  }

  await env.DB.prepare(`DELETE FROM media_assets WHERE id = ? AND user_id = ?`).bind(id, auth.user.id).run();
  return json({ ok: true, deleted: true });
}
