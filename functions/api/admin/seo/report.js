import { ensureSeoAgentTables, json, latestDashboard, requireAdmin } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const reports = (await env.DB.prepare(`SELECT * FROM seo_reports ORDER BY datetime(created_at) DESC LIMIT 30`).all()).results || [];
  return json({ ok: true, reports });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const dashboard = await latestDashboard(env);
  const id = crypto.randomUUID();
  const summary = {
    created_at: new Date().toISOString(),
    summary: dashboard.summary,
    lowest_pages: dashboard.pages.slice(0, 10),
    top_tasks: dashboard.tasks.slice(0, 20),
    keyword_groups: dashboard.keywords.reduce((memo, keyword) => {
      const key = keyword.group_type || 'national';
      memo[key] = (memo[key] || 0) + 1;
      return memo;
    }, {})
  };
  await env.DB.prepare(`INSERT INTO seo_reports (id,report_type,period_start,period_end,summary_json,created_by,created_at) VALUES (?,'snapshot',?,?,?, ?, CURRENT_TIMESTAMP)`)
    .bind(id, dashboard.latestAudit?.started_at || '', new Date().toISOString(), JSON.stringify(summary), auth.admin?.email || '').run();
  return json({ ok: true, id, report: summary });
}
