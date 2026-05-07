import { json, requireSeoUser, ensureSeoTables } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const auth = await requireSeoUser(env, request);
  if (!auth.ok) return auth.response;
  await ensureSeoTables(env);
  const body = await request.json().catch(() => ({}));
  const issueId = Number(body.issue_id || body.issueId || 0);
  let issue = null;
  if (issueId) {
    issue = await env.DB.prepare(`SELECT * FROM seo_issues WHERE id = ? LIMIT 1`).bind(issueId).first();
  }
  const pageUrl = String(issue?.page_url || body.page_url || body.pageUrl || '/');
  const issueText = String(issue?.issue_text || body.issue_text || body.issueText || 'SEO issue needs a clearer title or description.');
  const result = await env.DB.prepare(`INSERT INTO seo_suggestions (page_url, suggestion_type, current_value, suggested_value, reasoning, status, created_at, updated_at)
    VALUES (?, 'issue_fix', ?, ?, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(pageUrl, issueText, `Improve this page so it directly answers: ${issueText}`, 'Created from an open SEO issue. Review before approving.').run();
  return json({ ok: true, suggestion: { id: result.meta?.last_row_id, page_url: pageUrl } });
}
