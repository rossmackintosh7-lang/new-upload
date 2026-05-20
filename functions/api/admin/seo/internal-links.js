import { ensureSeoAgentTables, error, json, latestDashboard, requireAdmin } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const dashboard = await latestDashboard(env);
  return json({ ok: true, links: dashboard.links });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const body = await request.json().catch(() => ({}));
  const source = String(body.source_url || body.sourceUrl || '').trim();
  const target = String(body.target_url || body.targetUrl || '').trim();
  if (!source || !target) return error('Source URL and target URL are required.');
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO seo_internal_links (id,audit_id,source_url,target_url,anchor_text,opportunity_type,reasoning,priority,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
    .bind(id, String(body.audit_id || ''), source, target, String(body.anchor_text || body.anchorText || ''), String(body.opportunity_type || 'manual'), String(body.reasoning || ''), String(body.priority || 'medium'), String(body.status || 'suggested')).run();
  return json({ ok: true, id });
}

export async function onRequestPatch({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  const status = String(body.status || '').trim();
  if (!id || !status) return error('Internal link id and status are required.');
  await env.DB.prepare(`UPDATE seo_internal_links SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(status, id).run();
  return json({ ok: true, id, status });
}
