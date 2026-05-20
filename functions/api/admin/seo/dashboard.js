import { json, error, requireAdmin, latestDashboard } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  try {
    const dashboard = await latestDashboard(env);
    return json({ ok: true, ...dashboard });
  } catch (err) {
    return error(err?.message || 'Unable to load SEO dashboard.', 500);
  }
}
