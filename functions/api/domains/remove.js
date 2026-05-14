import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { json, error } from '../../_lib/json.js';
import { ensureHostingTables, getHostingConfig, sitePublicUrl } from '../../_lib/hosting.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  await ensureHostingTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || '').trim();
  const domainName = String(body.domain || body.domain_name || '').trim().toLowerCase();
  if (!projectId) return error('Project id is required.');
  if (!domainName) return error('Domain name is required.');

  const site = await env.DB.prepare(`SELECT * FROM published_sites WHERE project_id = ? AND user_id = ? LIMIT 1`).bind(projectId, auth.user.id).first();
  if (!site) return error('Hosted site not found.', 404);

  await env.DB.prepare(`
    UPDATE site_domains
    SET status = 'removed', is_primary = 0, updated_at = CURRENT_TIMESTAMP
    WHERE site_id = ? AND user_id = ? AND (domain = ? OR domain_name = ?)
  `).bind(site.id, auth.user.id, domainName, domainName).run();
  const fallbackDomain = getHostingConfig(env).baseDomain;
  const publicUrl = sitePublicUrl(env, site.site_slug, '', new URL(request.url).origin);
  await env.DB.prepare(`UPDATE published_sites SET custom_domain = '', primary_domain = ?, primary_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).bind(fallbackDomain, publicUrl, site.id, auth.user.id).run();
  return json({ ok: true, removed: true });
}
