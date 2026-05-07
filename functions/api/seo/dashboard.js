import { json, requireSeoUser, ensureSeoTables, defaultPages } from './_shared.js';

async function all(env, sql, ...binds) {
  try { return (await env.DB.prepare(sql).bind(...binds).all()).results || []; } catch { return []; }
}

export async function onRequestGet({ request, env }) {
  const auth = await requireSeoUser(env, request);
  if (!auth.ok) return auth.response;
  await ensureSeoTables(env);

  let pages = await all(env, `SELECT * FROM seo_pages ORDER BY datetime(COALESCE(last_checked, '1970-01-01')) DESC LIMIT 80`);
  if (!pages.length) pages = defaultPages(env);
  const issues = await all(env, `SELECT * FROM seo_issues WHERE status != 'resolved' ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, id DESC LIMIT 80`);
  const suggestions = await all(env, `SELECT * FROM seo_suggestions ORDER BY id DESC LIMIT 80`);
  const keywords = await all(env, `SELECT * FROM seo_keywords ORDER BY id DESC LIMIT 80`);
  const openIssues = issues.length;
  const highIssues = issues.filter((issue) => issue.severity === 'high').length;
  const average = pages.length ? Math.round(pages.reduce((sum, page) => sum + Number(page.seo_score || 0), 0) / pages.length) : 0;

  return json({
    ok: true,
    summary: { seoScore: average, pagesScanned: pages.length, openIssues, highIssues },
    pages,
    issues,
    suggestions,
    keywords
  });
}
