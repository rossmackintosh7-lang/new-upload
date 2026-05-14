import { error, json, loadOwnedProject, requireHostingUser, siteForOwnedProject } from './_shared.js';
import { getHostingConfig, sitePublicUrl } from '../../_lib/hosting.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireHostingUser(env, request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  if (!projectId) return error('Project id is required.');

  const project = await loadOwnedProject(env, projectId, auth.user.id);
  if (!project) return error('Project not found.', 404);

  const site = await siteForOwnedProject(env, project.id, auth.user.id);
  const liveUrl = site?.site_slug ? (site.custom_domain && site.primary_url ? site.primary_url : sitePublicUrl(env, site.site_slug, '', url.origin)) : '';
  const deployment = site?.latest_deployment_id
    ? await env.DB.prepare(`SELECT * FROM site_deployments WHERE id = ? LIMIT 1`).bind(site.latest_deployment_id).first()
    : null;
  const leadCount = await env.DB.prepare(`SELECT COUNT(*) AS count FROM leads WHERE project_id = ?`).bind(project.id).first().catch(() => ({ count: 0 }));
  const mediaCount = await env.DB.prepare(`SELECT COUNT(*) AS count FROM media_assets WHERE project_id = ?`).bind(project.id).first().catch(() => ({ count: 0 }));

  return json({
    ok: true,
    config: getHostingConfig(env),
    project: {
      id: project.id,
      name: project.name,
      plan: project.plan,
      billing_status: project.billing_status,
      published: Number(project.published || 0) === 1
    },
    site: site ? {
      ...site,
      live_url: liveUrl,
      lead_count: Number(leadCount?.count || 0),
      media_count: Number(mediaCount?.count || 0),
      last_deployment: deployment
    } : null
  });
}
