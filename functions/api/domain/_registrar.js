export function cloudflareRegistrarConfigured(env = {}) {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
}

export function autoRegisterEnabled(env = {}) {
  return String(env.DOMAIN_AUTO_REGISTER || '').toLowerCase() === 'true';
}

function cloudflareError(data = {}, status = 0) {
  const message = Array.isArray(data.errors) && data.errors[0]?.message
    ? data.errors[0].message
    : data.error || data.message || `Cloudflare Registrar request failed with ${status || 'unknown status'}`;
  return message;
}

async function cloudflareRegistrarFetch(env, path, body, options = {}) {
  if (!cloudflareRegistrarConfigured(env)) {
    return {
      configured: false,
      ok: false,
      status: 0,
      message: 'Cloudflare Registrar credentials are not configured.'
    };
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  const ok = response.ok && data.success !== false;

  return {
    configured: true,
    ok,
    status: response.status,
    data,
    message: ok ? '' : cloudflareError(data, response.status)
  };
}

export async function checkCloudflareRegistrarDomains(env, domains = []) {
  const cleaned = [...new Set(domains.map((domain) => String(domain || '').trim().toLowerCase()).filter(Boolean))];
  if (!cleaned.length) return { configured: cloudflareRegistrarConfigured(env), ok: false, domains: [] };

  const result = await cloudflareRegistrarFetch(env, '/registrar/domain-check', { domains: cleaned });
  if (!result.ok) return { ...result, domains: [] };

  return {
    ...result,
    domains: Array.isArray(result.data?.result?.domains) ? result.data.result.domains : []
  };
}

export async function createCloudflareRegistration(env, domainName) {
  const years = Math.max(1, Number.parseInt(env.DOMAIN_REGISTRATION_YEARS || '1', 10) || 1);
  const autoRenew = String(env.DOMAIN_REGISTRATION_AUTO_RENEW || '').toLowerCase() === 'true';
  const result = await cloudflareRegistrarFetch(
    env,
    '/registrar/registrations',
    {
      domain_name: domainName,
      privacy_mode: 'redaction',
      years,
      auto_renew: autoRenew
    },
    { headers: { Prefer: 'respond-async' } }
  );

  const workflow = result.data?.result || {};
  return {
    configured: result.configured,
    ok: result.ok,
    status: result.status,
    order_id: workflow.id || workflow.links?.self || domainName,
    registrar: 'cloudflare',
    completed: Boolean(workflow.completed),
    state: workflow.state || (result.ok ? 'submitted' : 'failed'),
    message: result.ok
      ? `Cloudflare Registrar accepted the registration workflow for ${domainName}.`
      : result.message,
    response: result.data
  };
}
