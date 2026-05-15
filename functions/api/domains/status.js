import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { json, error } from '../../_lib/json.js';
import { ensureHostingTables, getHostingConfig } from '../../_lib/hosting.js';
import { getCloudflareCustomHostname, customHostnameTarget } from '../../_lib/cloudflare-custom-hostnames.js';

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
  const domains = [];
  for (const domain of rows.results || []) {
    const domainName = domain.domain || domain.domain_name || '';
    const verification = JSON.parse(domain.verification_json || '{}');
    const cf = await getCloudflareCustomHostname(env, domain.cloudflare_hostname_id || '', domainName);
    const cfStatus = cf.status || {};
    const sslStatus = cfStatus.ssl_status || domain.ssl_status || 'pending';
    const status = String(sslStatus).toLowerCase() === 'active' ? 'active' : (domain.status || 'pending_dns');
    const mergedVerification = {
      ...verification,
      cname_target: verification.cname_target || customHostnameTarget(env),
      cloudflare_configured: cf.configured !== false,
      cloudflare_found: Boolean(cf.found),
      cloudflare_error: cf.error || verification.cloudflare_error || '',
      cloudflare_status: cfStatus.hostname_status || verification.cloudflare_status || '',
      ssl_status: sslStatus,
      ownership_verification: cfStatus.ownership_verification || verification.ownership_verification || {},
      ownership_verification_http: cfStatus.ownership_verification_http || verification.ownership_verification_http || {},
      validation_records: cfStatus.validation_records || verification.validation_records || [],
      validation_errors: cfStatus.validation_errors || verification.validation_errors || []
    };
    if (cf.configured !== false && (cf.found || cfStatus.id)) {
      await env.DB.prepare(`
        UPDATE site_domains
        SET status = ?, ssl_status = ?, cloudflare_hostname_id = COALESCE(NULLIF(?, ''), cloudflare_hostname_id),
            verification_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).bind(status, sslStatus, cfStatus.id || '', JSON.stringify(mergedVerification), domain.id, auth.user.id).run();
    }
    domains.push({
      ...domain,
      status,
      ssl_status: sslStatus,
      cloudflare_hostname_id: cfStatus.id || domain.cloudflare_hostname_id || '',
      domain: domainName,
      domain_name: domainName,
      verification: mergedVerification,
      target: domain.dns_target || mergedVerification.cname_target || getHostingConfig(env).baseDomain
    });
  }
  return json({
    ok: true,
    site,
    domains
  });
}
