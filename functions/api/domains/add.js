import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { json, error } from '../../_lib/json.js';
import { ensureHostingTables, getHostingConfig } from '../../_lib/hosting.js';

function cleanDomain(value = '') {
  return String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  await ensureHostingTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || '').trim();
  const domainName = cleanDomain(body.domain || body.domain_name || body.custom_domain || '');
  if (!projectId) return error('Project id is required.');
  if (!domainName || !domainName.includes('.')) return error('A valid domain name is required.');

  const site = await env.DB.prepare(`
    SELECT ps.* FROM published_sites ps
    INNER JOIN projects p ON p.id = ps.project_id
    WHERE ps.project_id = ? AND ps.user_id = ?
    LIMIT 1
  `).bind(projectId, auth.user.id).first();
  if (!site) return error('Publish the site before connecting a custom domain.', 400);

  const target = getHostingConfig(env).baseDomain;
  const verification = JSON.stringify({
    cname_target: target,
    instructions: 'Point the domain CNAME to the PBI hosting target, then check status again.'
  });
  const existing = await env.DB.prepare(`
    SELECT id, user_id FROM site_domains
    WHERE domain = ? OR domain_name = ?
    LIMIT 1
  `).bind(domainName, domainName).first().catch(() => null);
  if (existing?.id && String(existing.user_id || '') !== String(auth.user.id || '')) {
    return error('That domain is already connected to another PBI site.', 409);
  }
  if (existing?.id) {
    await env.DB.prepare(`
      UPDATE site_domains
      SET site_id = ?, project_id = ?, domain = ?, domain_name = ?, hostname_type = 'custom', domain_type = 'custom',
          status = 'pending_dns', ssl_status = 'pending', dns_target = ?, is_primary = 1,
          verification_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(site.id, projectId, domainName, domainName, target, verification, existing.id, auth.user.id).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO site_domains (id, site_id, project_id, user_id, domain, domain_name, hostname_type, domain_type, status, ssl_status, dns_target, is_primary, verification_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'custom', 'custom', 'pending_dns', 'pending', ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(crypto.randomUUID(), site.id, projectId, auth.user.id, domainName, domainName, target, verification).run();
  }

  await env.DB.prepare(`
    UPDATE published_sites
    SET custom_domain = ?, primary_domain = ?, primary_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(domainName, domainName, `https://${domainName}`, site.id).run();

  return json({
    ok: true,
    domain: {
      domain: domainName,
      domain_name: domainName,
      status: 'pending_dns',
      ssl_status: 'pending',
      cname_target: target
    }
  });
}
