import { json, error } from '../../_lib/json.js';
import { requireUser } from '../../_lib/auth.js';

const MULTI_PART_SUFFIXES = ['com.au', 'co.au', 'net.au', 'org.au', 'asn.au', 'id.au', 'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk'];
const DEFAULT_TLDS = ['co.uk', 'uk', 'com', 'net', 'org'];
const AU_TLDS = ['com.au', 'au', 'net.au', 'org.au', 'com', 'co.uk'];
const DEFAULT_PRICES = {
  'co.uk': '12.00',
  'com.au': '18.00',
  au: '18.00',
  'net.au': '18.00',
  'org.au': '18.00',
  uk: '12.00',
  com: '18.00',
  net: '18.00',
  org: '18.00',
  studio: '28.00',
  services: '24.00',
  digital: '24.00',
  online: '24.00'
};

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'my-business';
}

function cleanInput(value) {
  let text = String(value || '').trim().toLowerCase();
  text = text.replace(/^https?:\/\//, '');
  text = text.replace(/^www\./, '');
  text = text.split(/[/?#]/)[0] || text;
  text = text.replace(/:\d+$/, '');
  text = text.replace(/\s+/g, '');
  return text.replace(/\.$/, '').slice(0, 253);
}

function domainFromInput(domainValue, keywordValue) {
  const cleaned = cleanInput(domainValue);
  if (cleaned && cleaned.includes('.')) return cleaned;
  const base = slug(cleaned || keywordValue || 'my-business');
  return `${base}.co.uk`;
}

function validateDomain(domain) {
  if (!domain) return 'Domain is required.';
  if (domain.length > 253) return 'Domain is too long.';
  if (!domain.includes('.')) return 'Enter a full domain like mybusiness.co.uk.';
  if (domain.includes('..')) return 'Domain cannot contain two dots together.';

  const labels = domain.split('.');
  if (labels.length < 2) return 'Enter a full domain like mybusiness.co.uk.';

  for (const label of labels) {
    if (!label) return 'Every part of the domain must contain letters or numbers.';
    if (label.length > 63) return 'One part of the domain is too long.';
    if (!/^[a-z0-9-]+$/.test(label)) return 'Use letters, numbers and hyphens only.';
    if (label.startsWith('-') || label.endsWith('-')) return 'Domain parts cannot start or end with a hyphen.';
  }

  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) return 'Use a valid domain ending like .co.uk, .uk or .com.';
  return '';
}

function suffixKey(domain) {
  for (const suffix of MULTI_PART_SUFFIXES) {
    if (domain.endsWith(`.${suffix}`)) return suffix;
  }
  return domain.split('.').pop() || 'domain';
}

function isAuDomain(domain) {
  const suffix = suffixKey(domain);
  return suffix === 'au' || suffix.endsWith('.au') || String(domain || '').endsWith('.au');
}

function domainRoot(domain) {
  const suffix = suffixKey(domain);
  return domain.endsWith(`.${suffix}`)
    ? domain.slice(0, -suffix.length - 1)
    : domain.split('.')[0] || domain;
}

function pricingFor(domain, env = {}) {
  const key = suffixKey(domain);
  const envName = `DOMAIN_PRICE_${key.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  return {
    currency: String(env.DOMAIN_REGISTRATION_CURRENCY || 'GBP').toUpperCase(),
    registration_cost: String(env[envName] || env.DOMAIN_DEFAULT_YEAR_ONE_COST || DEFAULT_PRICES[key] || '')
  };
}

async function fetchJson(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body };
  } catch (err) {
    return { ok: false, status: 0, error: err?.name === 'AbortError' ? 'timeout' : 'fetch_failed' };
  } finally {
    clearTimeout(timer);
  }
}

async function lookupRdap(domain) {
  const endpoints = [`https://rdap.org/domain/${encodeURIComponent(domain)}`];
  if (isAuDomain(domain)) endpoints.push(`https://rdap.cctld.au/rdap/domain/${encodeURIComponent(domain)}`);

  let last = null;
  for (const endpoint of endpoints) {
    const result = await fetchJson(endpoint, {
      headers: { Accept: 'application/rdap+json, application/json' }
    });
    last = result;

    if (result.status === 404) {
      return { checked: true, registered: false, status: 'not_found', endpoint };
    }

    if (result.ok) {
      const nameservers = Array.isArray(result.body?.nameservers)
        ? result.body.nameservers.map((item) => item?.ldhName || item?.unicodeName).filter(Boolean).slice(0, 6)
        : [];
      return {
        checked: true,
        registered: true,
        status: 'registered',
        nameservers,
        rdap_status: Array.isArray(result.body?.status) ? result.body.status.slice(0, 5) : [],
        endpoint
      };
    }
  }

  return { checked: false, registered: null, status: last?.error || `rdap_${last?.status || 'unavailable'}` };
}

async function lookupDns(domain) {
  const types = ['NS', 'A'];
  const checks = await Promise.all(types.map(async (type) => {
    const result = await fetchJson(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: { Accept: 'application/dns-json' }
    }, 3000);
    const answers = Array.isArray(result.body?.Answer)
      ? result.body.Answer.map((answer) => answer?.data).filter(Boolean)
      : [];
    return { type, ok: result.ok, status: result.body?.Status, answers };
  }));

  const records = checks.flatMap((check) => check.answers.map((answer) => `${check.type} ${answer}`)).slice(0, 8);
  const checked = checks.some((check) => check.ok || Number.isInteger(check.status));
  return {
    checked,
    has_records: records.length > 0,
    records,
    statuses: checks.map((check) => ({ type: check.type, status: check.status ?? null }))
  };
}

function resultMessage({ available, rdap, dns }) {
  if (available === true) return 'Looks available from live RDAP and DNS checks. Final registrar confirmation happens at checkout.';
  if (available === false && rdap?.registered) return 'Already registered according to live RDAP records.';
  if (available === false && dns?.has_records) return 'Already has live DNS records, so treat it as taken or owned elsewhere.';
  return 'Could not confirm automatically. Review manually before promising this domain.';
}

async function checkOne(domain, env) {
  const validationError = validateDomain(domain);
  if (validationError) {
    return {
      name: domain,
      available: null,
      status: 'invalid',
      confidence: 'none',
      message: validationError,
      source: 'validation',
      pricing: pricingFor(domain, env)
    };
  }

  const [rdap, dns] = await Promise.all([lookupRdap(domain), lookupDns(domain)]);
  let available = null;
  let status = 'manual_review';
  let confidence = 'manual';

  if (rdap.registered === true || dns.has_records) {
    available = false;
    status = 'registered';
    confidence = rdap.registered === true && dns.checked ? 'high' : 'medium';
  } else if (rdap.registered === false && dns.checked && !dns.has_records) {
    available = true;
    status = 'available';
    confidence = 'high';
  } else if (rdap.registered === false) {
    available = true;
    status = 'available';
    confidence = 'medium';
  }

  return {
    name: domain,
    available,
    status,
    confidence,
    message: resultMessage({ available, rdap, dns }),
    source: 'rdap_dns',
    checked_at: new Date().toISOString(),
    pricing: pricingFor(domain, env),
    rdap,
    dns,
    requires_final_confirmation: available === true
  };
}

function suggestionNames(domain, keywordValue) {
  const base = slug(keywordValue || domainRoot(domain) || domain);
  const tlds = isAuDomain(domain) ? AU_TLDS : DEFAULT_TLDS;
  const ideas = [
    ...tlds.map((tld) => `${base}.${tld}`),
    isAuDomain(domain) ? `${base}online.com.au` : `${base}online.co.uk`,
    isAuDomain(domain) ? `${base}digital.com.au` : `${base}digital.co.uk`,
    isAuDomain(domain) ? `${base}studio.com.au` : `${base}studio.co.uk`,
    `${base}.services`,
    `${base}.studio`
  ];
  return [...new Set(ideas)]
    .filter((name) => name !== domain)
    .filter((name) => !validateDomain(name))
    .slice(0, 6);
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const keyword = body.keyword || body.business_name || '';
  const domain = domainFromInput(body.domain || keyword, keyword);
  const suggestionKeyword = cleanInput(keyword).includes('.') ? domainRoot(domain) : keyword;
  if (!domain) return error('Domain is required.');

  const requested = await checkOne(domain, env);
  const suggestions = await Promise.all(suggestionNames(domain, suggestionKeyword).map((name) => checkOne(name, env)));
  const registrationAgentConnected = Boolean(env.DOMAIN_REGISTRATION_AGENT_URL || env.DOMAIN_REGISTRATION_WEBHOOK_URL);

  return json({
    ok: true,
    live_check: true,
    registrar_connected: registrationAgentConnected,
    registration_agent_connected: registrationAgentConnected,
    cloudflare_credentials_present: Boolean(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID),
    requested,
    suggestions,
    message: registrationAgentConnected
      ? 'Live public domain checks completed. The Domain Registration Agent can hand available domains to the registrar workflow after checkout.'
      : 'Live public domain checks completed. Available domains can be selected, then PBI will queue registration after checkout until registrar automation is connected.'
  });
}
