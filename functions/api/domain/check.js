import { json, error } from '../../_lib/json.js';
import { requireUser } from '../../_lib/auth.js';

function cleanDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/[^a-z0-9.-]/g, '')
    .slice(0, 120);
}

function slug(value) {
  return String(value || 'my-business').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'my-business';
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const domain = cleanDomain(body.domain || '');
  const keyword = slug(body.keyword || body.business_name || domain || 'my-business');
  if (!domain) return error('Domain is required.');

  const requested = {
    name: domain,
    available: false,
    message: 'Manual availability check required before registration.',
    source: 'manual_review'
  };

  const suggestions = [`${keyword}.co.uk`, `${keyword}.uk`, `${keyword}online.co.uk`]
    .filter((name) => name !== domain)
    .map((name) => ({
      name,
      available: false,
      message: 'Manual availability check required.',
      source: 'manual_review',
      pricing: { currency: env.DOMAIN_REGISTRATION_CURRENCY || 'GBP' }
    }));

  return json({
    ok: true,
    live_check: false,
    requested,
    suggestions,
    message: 'Domain checking endpoint is live. Connect Cloudflare Registrar credentials before showing domains as automatically available.'
  });
}
