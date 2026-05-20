import { ensureSeoAgentTables, error, json, requireAdmin } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const rows = (await env.DB.prepare(`SELECT * FROM seo_keywords WHERE COALESCE(status,'active') != 'archived' ORDER BY group_type, keyword LIMIT 300`).all()).results || [];
  return json({ ok: true, keywords: rows });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const body = await request.json().catch(() => ({}));
  const keyword = String(body.keyword || '').trim();
  if (!keyword) return error('Keyword is required.');
  await env.DB.prepare(`INSERT INTO seo_keywords (keyword,target_url,intent,priority,ranking_position,click_through_rate,impressions,seo_difficulty,search_intent,group_type,last_updated,notes,status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
    .bind(
      keyword,
      String(body.target_url || body.targetUrl || ''),
      String(body.intent || body.search_intent || body.searchIntent || ''),
      String(body.priority || 'medium'),
      body.ranking_position ?? body.rankingPosition ?? null,
      body.click_through_rate ?? body.ctr ?? null,
      Number(body.impressions || 0),
      Number(body.seo_difficulty || body.difficulty || 0),
      String(body.search_intent || body.searchIntent || body.intent || ''),
      String(body.group_type || body.groupType || 'national'),
      String(body.last_updated || body.lastUpdated || new Date().toISOString()),
      String(body.notes || ''),
      String(body.status || 'active')
    ).run();
  return json({ ok: true });
}

export async function onRequestPatch({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id || 0);
  if (!id) return error('Keyword id is required.');
  await env.DB.prepare(`UPDATE seo_keywords SET keyword = COALESCE(?, keyword), target_url = COALESCE(?, target_url), intent = COALESCE(?, intent), priority = COALESCE(?, priority), ranking_position = ?, click_through_rate = ?, impressions = ?, seo_difficulty = ?, search_intent = COALESCE(?, search_intent), group_type = COALESCE(?, group_type), last_updated = ?, notes = COALESCE(?, notes), status = COALESCE(?, status) WHERE id = ?`)
    .bind(
      body.keyword ?? null,
      body.target_url ?? body.targetUrl ?? null,
      body.intent ?? null,
      body.priority ?? null,
      body.ranking_position ?? body.rankingPosition ?? null,
      body.click_through_rate ?? body.ctr ?? null,
      body.impressions ?? 0,
      body.seo_difficulty ?? body.difficulty ?? 0,
      body.search_intent ?? body.searchIntent ?? null,
      body.group_type ?? body.groupType ?? null,
      body.last_updated || body.lastUpdated || new Date().toISOString(),
      body.notes ?? null,
      body.status ?? null,
      id
    ).run();
  return json({ ok: true, id });
}
