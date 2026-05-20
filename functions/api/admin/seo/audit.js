import { json, error, requireAdmin, latestDashboard, runAudit } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  try {
    const dashboard = await latestDashboard(env);
    return json({ ok: true, latestAudit: dashboard.latestAudit, summary: dashboard.summary, pages: dashboard.pages });
  } catch (err) {
    return error(err?.message || 'Unable to load SEO audit.', 500);
  }
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await runAudit(env, auth.admin, body);
    return json({ ok: true, ...result });
  } catch (err) {
    return error(err?.message || 'Unable to run SEO audit.', 500);
  }
}
