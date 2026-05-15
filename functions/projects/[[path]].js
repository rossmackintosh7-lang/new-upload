function contentTypeFromKey(key = '') {
  const lower = String(key || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export async function onRequestGet({ request, env, params }) {
  const bucket = env.MEDIA_BUCKET || env.PBI_ASSETS;
  if (!bucket) return new Response('Media bucket is not configured.', { status: 404 });

  const raw = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  const key = `projects/${raw}`.replace(/\/+/g, '/');
  if (!raw || raw.includes('..')) return new Response('Not found.', { status: 404 });

  const object = await bucket.get(key);
  if (!object) return new Response('Not found.', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has('content-type')) headers.set('content-type', contentTypeFromKey(key));
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
