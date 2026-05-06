import { json, error, getUserFromSession } from '../projects/_shared.js';

function parseJson(value, fallback = {}) {
  try { return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback); }
  catch { return fallback; }
}

function liveUrl(project) {
  if (Number(project.published || 0) !== 1 || !project.public_slug) return '';
  return `/site/canvas/${encodeURIComponent(project.public_slug)}/`;
}

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Unauthorized.', 401);

  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  const where = projectId ? 'WHERE user_id = ? AND id = ?' : 'WHERE user_id = ?';
  const binds = projectId ? [user.id, projectId] : [user.id];

  const rows = await env.DB.prepare(`
    SELECT id, name, plan, billing_status, published, public_slug, stripe_customer_id, stripe_subscription_id, data_json, updated_at, created_at
    FROM projects
    ${where}
    ORDER BY datetime(COALESCE(updated_at, created_at, '1970-01-01')) DESC
  `).bind(...binds).all();

  const projects = (rows.results || []).map((project) => {
    const data = parseJson(project.data_json, {});
    return {
      id: project.id,
      name: project.name || data.business_name || 'Untitled website',
      plan: project.plan || 'free_preview',
      billing_status: project.billing_status || 'draft',
      published: Number(project.published || 0) === 1,
      live_url: liveUrl(project),
      stripe_subscription_id: project.stripe_subscription_id || data.stripe_subscription_id || '',
      website_subscription_status: data.website_subscription_status || project.billing_status || '',
      domain_management: data.domain_management || null,
      updated_at: project.updated_at || ''
    };
  });

  return json({ ok: true, user: { id: user.id, email: user.email }, projects });
}
