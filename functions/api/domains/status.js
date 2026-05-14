import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { json, error } from '../../_lib/json.js';
import { ensureHostingTables, getHostingConfig } from '../../_lib/hosting.js';

export async function onRequestGet({ request, env }) {
  await ensureCoreTables(env);
  await ensureHostingTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  if (!projectId) return error('Project id is required.');

  const site = await env.DB.prepare(`SELECT * FROM published_sites WHERE project_id = ? AND user_id = ? LIMIT 1`).bind(projectId, auth.user.id).first();
  if (!site) return json({ ok: true, site: null, domains: [] });

  const rows = await env.DB.prepare(`SELECT * FROM site_domains WHERE site_id = ? AND user_id = ? ORDER BY datetime(created_at) DESC`).bind(site.id, auth.user.id).all();
  return json({
    ok: true,
    site,
    domains: (rows.results || []).map((domain) => ({
      ...domain,
      domain: domain.domain || domain.domain_name || '',
      domain_name: domain.domain_name || domain.domain || '',
      verification: JSON.parse(domain.verification_json || '{}'),
      target: domain.dns_target || getHostingConfig(env).baseDomain
    }))
  });
}
