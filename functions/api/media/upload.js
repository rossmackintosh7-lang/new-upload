import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { json, error, ensurePlatformTables } from '../../_lib/platform.js';

function mimeFromDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,/);
  return match ? match[1] : 'application/octet-stream';
}
function bytesFromDataUrl(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function ext(mime) {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  await ensurePlatformTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || body.projectId || '').trim();
  const dataUrl = String(body.data_url || body.url || '').trim();
  const filename = String(body.filename || 'uploaded-image').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
  const alt = String(body.alt || filename.replace(/\.[^.]+$/, '')).slice(0, 200);
  if (!projectId) return error('Project id is required.');
  if (!dataUrl.startsWith('data:image/')) return error('Image data URL is required.');

  const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ? LIMIT 1').bind(projectId, auth.user.id).first();
  if (!project) return error('Project not found.', 404);

  const mime = mimeFromDataUrl(dataUrl);
  const bytes = bytesFromDataUrl(dataUrl);
  const id = crypto.randomUUID();
  let url = dataUrl;
  let storageKey = '';

  if (env.MEDIA_BUCKET) {
    storageKey = `projects/${projectId}/${id}.${ext(mime)}`;
    await env.MEDIA_BUCKET.put(storageKey, bytes, { httpMetadata: { contentType: mime } });
    const base = String(env.PBI_MEDIA_PUBLIC_URL || '').replace(/\/+$/, '');
    url = base ? `${base}/${storageKey}` : dataUrl;
  }

  await env.DB.prepare(`INSERT INTO media_assets (id, user_id, project_id, filename, content_type, size, url, alt, storage_key, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .bind(id, auth.user.id, projectId, filename, mime, bytes.length, url, alt, storageKey).run();

  return json({ ok: true, asset: { id, project_id: projectId, filename, content_type: mime, size: bytes.length, url, alt, storage_key: storageKey } });
}
