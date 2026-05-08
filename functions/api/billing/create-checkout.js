import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { cleanPlan, priceEnvNameForPlan, validateProjectForPublish } from '../../_lib/package-rules.js';

function priceIdForPlan(env, plan) {
  const envName = priceEnvNameForPlan(plan);
  return env[envName] || '';
}

function baseUrlFromRequest(request, env) {
  return String(env.PBI_BASE_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

function normaliseCheckoutDomain(domain, fallbackName = '') {
  const name = String(domain?.name || fallbackName || '').trim().toLowerCase().slice(0, 253);
  if (!name) return null;

  const blocked = domain?.available === false || domain?.status === 'invalid';
  const manualReview = domain?.available !== true;
  return {
    ...(domain || {}),
    name,
    available: domain?.available === true ? true : null,
    status: manualReview ? (domain?.status || 'manual_review') : (domain?.status || 'available'),
    requires_manual_review: manualReview,
    checkout_blocked: blocked,
    message: manualReview
      ? (domain?.message || 'This domain is saved for PBI manual review before registration.')
      : (domain?.message || 'Available')
  };
}

function canCheckoutWithDomain(domain) {
  if (!domain?.name) return false;
  if (domain.checkout_blocked || domain.available === false || domain.status === 'invalid') return false;
  return true;
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf',
  'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'
]);

function decimalAmountToMinor(value, currency) {
  const text = String(value || '').trim().replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!text) return 0;

  const [wholeRaw, fractionRaw = ''] = text.split('.');
  const whole = Number.parseInt(wholeRaw || '0', 10);
  if (!Number.isFinite(whole)) return 0;

  if (ZERO_DECIMAL_CURRENCIES.has(String(currency || '').toLowerCase())) return whole;

  const fraction = Number.parseInt((fractionRaw + '00').slice(0, 2), 10) || 0;
  return (whole * 100) + fraction;
}

function domainRegistrationBilling(domain, env = {}) {
  const pricing = domain?.pricing || {};
  const currency = String(env.DOMAIN_REGISTRATION_CURRENCY || pricing.currency || 'GBP').trim().toLowerCase() || 'gbp';
  const dynamicAmount = decimalAmountToMinor(pricing.registration_cost, currency);
  const fallbackAmount = Number.parseInt(env.DOMAIN_REGISTRATION_DEFAULT_AMOUNT_MINOR || '2000', 10) || 2000;
  const handlingAmount = Math.max(0, Number.parseInt(env.DOMAIN_REGISTRATION_ONE_OFF_HANDLING_AMOUNT_MINOR || '0', 10) || 0);
  const amountMinor = Math.max(50, dynamicAmount || fallbackAmount) + handlingAmount;

  return {
    currency,
    amount_minor: amountMinor,
    registration_cost: pricing.registration_cost || '',
    renewal_cost: pricing.renewal_cost || '',
    source: dynamicAmount ? (domain?.source || 'domain_checker') : 'fallback',
    handling_amount_minor: handlingAmount
  };
}

function appendPriceLine(params, index, priceId) {
  if (!priceId) return index;
  params.append(`line_items[${index}][price]`, priceId);
  params.append(`line_items[${index}][quantity]`, '1');
  return index + 1;
}

function appendDomainRegistrationLine(params, index, domain, billing) {
  params.append(`line_items[${index}][price_data][currency]`, billing.currency);
  params.append(`line_items[${index}][price_data][product_data][name]`, `Domain registration: ${domain.name}`);
  params.append(`line_items[${index}][price_data][product_data][description]`, `First-year registration for ${domain.name}`);
  params.append(`line_items[${index}][price_data][unit_amount]`, String(billing.amount_minor));
  params.append(`line_items[${index}][quantity]`, '1');
  return index + 1;
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || body.project || '').trim();
  if (!projectId) return error('Project id is required.');

  const project = await env.DB.prepare(`
    SELECT id, user_id, name, plan, data_json, domain_option, custom_domain
    FROM projects
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).bind(projectId, auth.user.id).first();

  if (!project) return error('Project not found.', 404);

  const requested = cleanPlan(body.plan || '');
  const saved = cleanPlan(project.plan || 'starter');
  const plan = requested || saved || 'starter';
  const existingData = JSON.parse(project.data_json || '{}');
  const domainOption = String(body.domain_option || existingData.domain_option || project.domain_option || 'pbi_subdomain');
  const fallbackDomainName = body.custom_domain || existingData.custom_domain || project.custom_domain || '';
  const domainRegistration = body.domain_registration || existingData.domain_registration || null;
  const selectedDomainRegistration = domainOption === 'register_new'
    ? normaliseCheckoutDomain(domainRegistration, fallbackDomainName)
    : null;
  const customDomain = String(
    selectedDomainRegistration?.name ||
    (domainOption === 'connect_existing' ? (body.custom_domain || existingData.custom_domain || project.custom_domain || '') : '') ||
    ''
  ).slice(0, 253);

  if (domainOption === 'register_new' && !canCheckoutWithDomain(selectedDomainRegistration)) {
    return error('Choose and save an available or reviewable domain before registering a new domain at checkout.', 400);
  }

  const selectedDomainBilling = selectedDomainRegistration?.name
    ? domainRegistrationBilling(selectedDomainRegistration, env)
    : null;

  const data = {
    ...existingData,
    domain_option: domainOption,
    custom_domain: customDomain,
    domain_registration: selectedDomainRegistration
      ? { ...selectedDomainRegistration, checkout_pricing: selectedDomainBilling }
      : null,
    domain_billing: selectedDomainBilling
  };
  const validation = validateProjectForPublish(data, plan);

  if (!validation.ok) {
    return json({
      ok: false,
      checkout_blocked: true,
      message: 'Fix the pre-publish checklist before checkout.',
      issues: validation.issues,
      warnings: validation.warnings
    }, 400);
  }

  await env.DB.prepare(`
    UPDATE projects
    SET plan = ?, data_json = ?, domain_option = ?, custom_domain = ?, readiness_score = ?, package_warnings = ?, last_validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(plan, JSON.stringify(validation.data), domainOption, customDomain, validation.score || 0, JSON.stringify(validation.warnings || []), projectId, auth.user.id).run();

  const priceId = priceIdForPlan(env, plan);

  if (!env.STRIPE_SECRET_KEY || !priceId) {
    return json({
      ok: true,
      setup_required: true,
      plan,
      expected_price_env: priceEnvNameForPlan(plan),
      price_id_missing: !priceId,
      domain_billing: selectedDomainBilling,
      message: `Stripe is not fully connected for the ${plan} package. Add STRIPE_SECRET_KEY and ${priceEnvNameForPlan(plan)} in Cloudflare.`
    });
  }

  const baseUrl = baseUrlFromRequest(request, env);
  const successUrl = `${baseUrl}/payment/?project=${encodeURIComponent(projectId)}&plan=${encodeURIComponent(plan)}&success=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/payment/?project=${encodeURIComponent(projectId)}&plan=${encodeURIComponent(plan)}&cancelled=1`;

  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  let lineItemIndex = appendPriceLine(params, 0, priceId);
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  params.append('client_reference_id', projectId);
  params.append('customer_email', auth.user.email);
  params.append('metadata[project_id]', projectId);
  params.append('metadata[user_id]', auth.user.id);
  params.append('metadata[plan]', plan);
  params.append('metadata[domain_option]', domainOption);
  params.append('subscription_data[metadata][project_id]', projectId);
  params.append('subscription_data[metadata][user_id]', auth.user.id);
  params.append('subscription_data[metadata][plan]', plan);
  params.append('subscription_data[metadata][domain_option]', domainOption);
  if (selectedDomainRegistration?.name) {
    params.append('metadata[domain_name]', selectedDomainRegistration.name);
    params.append('metadata[domain_registration_amount_minor]', String(selectedDomainBilling?.amount_minor || ''));
    params.append('metadata[domain_registration_currency]', selectedDomainBilling?.currency || '');
    params.append('metadata[domain_registration_price_source]', selectedDomainBilling?.source || '');
    params.append('subscription_data[metadata][domain_name]', selectedDomainRegistration.name);
  }

  if (domainOption === 'register_new' && selectedDomainRegistration?.name && selectedDomainBilling) {
    lineItemIndex = appendDomainRegistrationLine(params, lineItemIndex, selectedDomainRegistration, selectedDomainBilling);
    lineItemIndex = appendPriceLine(params, lineItemIndex, env.STRIPE_PRICE_DOMAIN_MANAGEMENT_YEARLY || '');
  }

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const stripe = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) {
    return error(stripe.error?.message || 'Stripe checkout could not be created.', 502, { stripe_error: stripe.error || null });
  }

  try {
    await env.DB.prepare(`
      UPDATE projects SET stripe_session_id = ?, plan = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(stripe.id || '', plan, projectId, auth.user.id).run();
  } catch (_) {}

  return json({
    ok: true,
    url: stripe.url,
    id: stripe.id,
    plan,
    price_env: priceEnvNameForPlan(plan),
    domain_billing: selectedDomainBilling
  });
}
