const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

function clean(value = '') {
  return String(value || '').trim();
}

function token(env = {}) {
  return clean(env.CLOUDFLARE_CUSTOM_HOSTNAMES_TOKEN || env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN);
}

function zoneId(env = {}) {
  return clean(env.CLOUDFLARE_CUSTOM_HOSTNAMES_ZONE_ID || env.CLOUDFLARE_ZONE_ID || env.CF_ZONE_ID);
}

export function hasCustomHostnameConfig(env = {}) {
  return Boolean(token(env) && zoneId(env));
}

export function customHostnameTarget(env = {}) {
  return clean(
    env.PBI_CUSTOM_DOMAIN_CNAME_TARGET ||
    env.CLOUDFLARE_CUSTOM_HOSTNAME_CNAME_TARGET ||
    env.PBI_HOSTING_BASE_DOMAIN ||
    'www.purbeckbusinessinnovations.co.uk'
  ).replace(/^https?:\/\//i, '').replace(/\/+$/g, '');
}

function customHostnameBody(domain, metadata = {}, env = {}) {
  const method = clean(env.PBI_CUSTOM_HOSTNAME_SSL_METHOD || 'http').toLowerCase();
  return {
    hostname: domain,
    custom_metadata: {
      platform: 'pbi',
      ...metadata
    },
    ssl: {
      method: ['http', 'txt', 'email'].includes(method) ? method : 'http',
      type: 'dv'
    }
  };
}

async function cloudflareRequest(env, path, options = {}) {
  if (!hasCustomHostnameConfig(env)) {
    return { ok: false, configured: false, error: 'Cloudflare custom hostname API is not configured.' };
  }
  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token(env)}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok && payload.success !== false,
    status: response.status,
    payload,
    result: payload.result,
    errors: payload.errors || []
  };
}

function cfStatus(result = {}) {
  const ssl = result.ssl || {};
  return {
    id: result.id || '',
    hostname: result.hostname || '',
    hostname_status: result.status || '',
    ssl_status: ssl.status || '',
    ownership_verification: result.ownership_verification || {},
    ownership_verification_http: result.ownership_verification_http || {},
    validation_records: ssl.validation_records || ssl.dcv_delegation_records || [],
    validation_errors: ssl.validation_errors || [],
    raw: result
  };
}

export async function createCloudflareCustomHostname(env, domain, metadata = {}) {
  if (!hasCustomHostnameConfig(env)) {
    return { configured: false, created: false, status: cfStatus({ hostname: domain }) };
  }
  const path = `/zones/${encodeURIComponent(zoneId(env))}/custom_hostnames`;
  const created = await cloudflareRequest(env, path, {
    method: 'POST',
    body: JSON.stringify(customHostnameBody(domain, metadata, env))
  });
  if (created.ok) return { configured: true, created: true, status: cfStatus(created.result) };

  const alreadyExists = created.errors.some((err) => /already|exists|duplicate/i.test(String(err.message || '')));
  if (!alreadyExists) return { configured: true, created: false, error: created.errors[0]?.message || 'Cloudflare custom hostname creation failed.', status: cfStatus({ hostname: domain }) };

  const listed = await findCloudflareCustomHostname(env, domain);
  return {
    configured: true,
    created: false,
    already_exists: Boolean(listed.status.id),
    status: listed.status,
    error: listed.status.id ? '' : (created.errors[0]?.message || '')
  };
}

export async function findCloudflareCustomHostname(env, domain) {
  if (!hasCustomHostnameConfig(env)) {
    return { configured: false, found: false, status: cfStatus({ hostname: domain }) };
  }
  const params = new URLSearchParams({ hostname: domain, per_page: '50' });
  const listed = await cloudflareRequest(env, `/zones/${encodeURIComponent(zoneId(env))}/custom_hostnames?${params.toString()}`, { method: 'GET' });
  const rows = Array.isArray(listed.result) ? listed.result : [];
  const match = rows.find((row) => String(row.hostname || '').toLowerCase() === String(domain || '').toLowerCase()) || rows[0] || {};
  return { configured: true, found: Boolean(match.id), status: cfStatus(match.hostname ? match : { hostname: domain }) };
}

export async function getCloudflareCustomHostname(env, id, fallbackDomain = '') {
  if (!hasCustomHostnameConfig(env) || !id) {
    return { configured: hasCustomHostnameConfig(env), found: false, status: cfStatus({ hostname: fallbackDomain }) };
  }
  const got = await cloudflareRequest(env, `/zones/${encodeURIComponent(zoneId(env))}/custom_hostnames/${encodeURIComponent(id)}`, { method: 'GET' });
  if (got.ok) return { configured: true, found: true, status: cfStatus(got.result) };
  if (fallbackDomain) return await findCloudflareCustomHostname(env, fallbackDomain);
  return { configured: true, found: false, error: got.errors[0]?.message || 'Cloudflare custom hostname lookup failed.', status: cfStatus({ hostname: fallbackDomain }) };
}

export async function deleteCloudflareCustomHostname(env, id) {
  if (!hasCustomHostnameConfig(env) || !id) {
    return { configured: hasCustomHostnameConfig(env), deleted: false };
  }
  const removed = await cloudflareRequest(env, `/zones/${encodeURIComponent(zoneId(env))}/custom_hostnames/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return { configured: true, deleted: removed.ok, error: removed.errors?.[0]?.message || '' };
}

