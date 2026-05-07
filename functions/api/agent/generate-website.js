import { json, requireUser, ensureCoreTables, basicWebsite } from './_shared.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const website = basicWebsite(body);
  return json({ ok: true, website, draftId: body.projectId || crypto.randomUUID(), source: 'fallback' });
}
