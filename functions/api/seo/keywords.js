import { json, error, requireSeoUser, ensureSeoTables } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireSeoUser(env, request);
  if (!auth.ok) return auth.response;
  await ensureSeoTables(env);
  const rows = (await env.DB.prepare(`SELECT * FROM seo_keywords ORDER BY id DESC LIMIT 100`).all()).results || [];
  return json({ ok: true, keywords: rows });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireSeoUser(env, request);
  if (!auth.ok) return auth.response;
  await ensureSeoTables(env);
  const body = await request.json().catch(() => ({}));
  const keyword = String(body.keyword || '').trim();
  if (!keyword) return error('Keyword is required.');
  await env.DB.prepare(`INSERT INTO seo_keywords (keyword, target_url, intent, priority, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .bind(keyword, String(body.target_url || body.targetUrl || ''), String(body.intent || ''), String(body.priority || 'medium')).run();
  return json({ ok: true });
}
