import { json, error, requireSeoUser, ensureSeoTables } from './_shared.js';

function suggestionFor(url) {
  const page = String(url || '/').replace(/^https?:\/\/[^/]+/, '') || '/';
  return {
    page_url: url || '/',
    suggestion_type: 'page_title',
    current_value: '',
    suggested_value: page === '/' ? 'PBI Design Studio for Small Businesses' : `PBI ${page.replace(/\//g, ' ').trim()}`,
    reasoning: 'Use a clear, page-specific title that explains the offer and audience.'
  };
}

export async function onRequestPost({ request, env }) {
  const auth = await requireSeoUser(env, request);
  if (!auth.ok) return auth.response;
  await ensureSeoTables(env);
  const body = await request.json().catch(() => ({}));
  const pageUrl = String(body.page_url || body.pageUrl || '').trim();
  if (!pageUrl) return error('Page URL is required.');
  const s = suggestionFor(pageUrl);
  const result = await env.DB.prepare(`INSERT INTO seo_suggestions (page_url, suggestion_type, current_value, suggested_value, reasoning, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(s.page_url, s.suggestion_type, s.current_value, s.suggested_value, s.reasoning).run();
  return json({ ok: true, suggestion: { id: result.meta?.last_row_id, ...s, status: 'draft' } });
}
