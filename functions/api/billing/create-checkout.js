import { json, error, readBody, getUserFromSession } from '../projects/_shared.js';

const PLAN_PRICE_ENV = {
  starter: 'STRIPE_PRICE_STARTER',
  business: 'STRIPE_PRICE_BUSINESS',
  plus: 'STRIPE_PRICE_PLUS',
  assisted_setup: 'STRIPE_PRICE_ASSISTED_SETUP',
  custom_build_deposit: 'STRIPE_PRICE_CUSTOM_DEPOSIT'
};

const PLAN_NAMES = {
  starter: 'Starter Launch',
  business: 'Business Launch',
  plus: 'Business Plus',
  assisted_setup: 'Assisted Setup',
  custom_build_deposit: 'Custom Built Website Deposit'
};

const ONE_TIME_PAYMENT_PLANS = new Set(['assisted_setup', 'custom_build_deposit']);

function getOrigin(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function encodeForm(data) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) params.append(key, String(value));
  }
  return params;
}

function cleanDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function isValidDomain(domain) {
  if (!domain || domain.length > 253) return false;
  if (!domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.includes('..')) return false;
  return /^[a-z0-9.-]+$/.test(domain);
}

function parseProjectData(project) {
  try {
    return typeof project.data_json === 'string' ? JSON.parse(project.data_json || '{}') : (project.data_json || {});
  } catch {
    return {};
  }
}

function decimalToMinorUnits(value) {
  const cleaned = String(value || '').replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const [whole, decimals = ''] = cleaned.split('.');
  return Number(whole || 0) * 100 + Number((decimals + '00').slice(0, 2));
}

function safeJson(value) {
  try { return JSON.stringify(value || {}); } catch { return '{}'; }
}

function buildDomainLineItem(form, index, domain, env) {
  const pricing = domain?.pricing || {};
  const domainName = cleanDomain(domain?.name);
  const checkoutCurrency = String(env.DOMAIN_REGISTRATION_CURRENCY || 'GBP').toLowerCase();
  const providerCurrency = String(pricing.currency || '').toLowerCase();
  const defaultBaseAmount = Number(env.DOMAIN_REGISTRATION_DEFAULT_AMOUNT_MINOR || 2000);
  const providerBaseAmount = decimalToMinorUnits(pricing.registration_cost || pricing.registrationCost || '');
  const baseAmount = providerCurrency === checkoutCurrency && providerBaseAmount > 0
    ? providerBaseAmount
    : defaultBaseAmount;
  const markupAmount = Number(env.DOMAIN_MARKUP_AMOUNT_MINOR || env.DOMAIN_MARKUP_GBP_PENCE || 1000);
  const amount = Math.max(100, baseAmount + (Number.isFinite(markupAmount) ? markupAmount : 1000));

  form[`line_items[${index}][price_data][currency]`] = checkoutCurrency;
  form[`line_items[${index}][price_data][unit_amount]`] = amount;
  form[`line_items[${index}][price_data][product_data][name]`] = `Domain registration: ${domainName}`;
  form[`line_items[${index}][price_data][product_data][description]`] = 'One-year domain registration plus PBI registration handling.';
  form[`line_items[${index}][quantity]`] = '1';

  return { amount, currency: checkoutCurrency, domain_name: domainName, provider_currency: providerCurrency || null, provider_registration_cost: pricing.registration_cost || '' };
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Unauthorized.', 401);

  const body = await readBody(request);
  const projectId = String(body.project_id || '').trim();
  const plan = String(body.plan || 'business').trim();
  const domainOption = String(body.domain_option || 'pbi_subdomain').trim();

  if (!projectId) return error('Missing project id.', 400);
  if (!PLAN_PRICE_ENV[plan]) return error('Invalid plan selected.', 400);

  const project = await env.DB
    .prepare(`SELECT id, name, user_id, data_json FROM projects WHERE id = ? AND user_id = ? LIMIT 1`)
    .bind(projectId, user.id)
    .first();

  if (!project) return error('Project not found.', 404);

  const projectData = parseProjectData(project);
  const priceId = env[PLAN_PRICE_ENV[plan]];
  const checkoutMode = ONE_TIME_PAYMENT_PLANS.has(plan) ? 'payment' : 'subscription';

  let domainRegistration = null;
  let domainLineItem = null;

  if (domainOption === 'register_new' && !ONE_TIME_PAYMENT_PLANS.has(plan)) {
    domainRegistration = body.domain_registration && typeof body.domain_registration === 'object'
      ? body.domain_registration
      : projectData.domain_registration;

    const selectedDomain = cleanDomain(domainRegistration?.name);

    if (!selectedDomain || !isValidDomain(selectedDomain)) {
      return error('Choose and save an available domain in the builder before checkout.', 400);
    }

    if (domainRegistration?.available !== true && domainRegistration?.registrable !== true) {
      return error('The selected domain is not marked as available. Check the domain again before checkout.', 400);
    }

    domainRegistration = { ...domainRegistration, name: selectedDomain };
  }

  if (!env.STRIPE_SECRET_KEY || !priceId) {
    if (!ONE_TIME_PAYMENT_PLANS.has(plan)) {
      await env.DB
        .prepare(`UPDATE projects SET plan = ?, domain_option = ?, billing_status = 'setup_required', updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
        .bind(plan, domainOption, projectId, user.id)
        .run();
    }

    return json({ ok: true, setup_required: true, message: `Stripe is not connected yet. Add STRIPE_SECRET_KEY and ${PLAN_PRICE_ENV[plan]} to Cloudflare environment variables to enable ${PLAN_NAMES[plan]} checkout.` });
  }

  const origin = getOrigin(request);
  const successPath = plan === 'assisted_setup' || plan === 'custom_build_deposit' ? '/dashboard/?success=1' : `/payment/?project=${encodeURIComponent(projectId)}&success=1`;
  const cancelPath = plan === 'assisted_setup' || plan === 'custom_build_deposit' ? '/dashboard/?cancelled=1' : `/payment/?project=${encodeURIComponent(projectId)}&cancelled=1`;

  const form = {
    mode: checkoutMode,
    success_url: `${origin}${successPath}`,
    cancel_url: `${origin}${cancelPath}`,
    client_reference_id: projectId,
    customer_email: user.email,
    'metadata[project_id]': projectId,
    'metadata[user_id]': user.id,
    'metadata[plan]': plan,
    'metadata[domain_option]': domainOption,
    'metadata[project_name]': project.name || '',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1'
  };

  if (domainRegistration?.name) {
    domainLineItem = buildDomainLineItem(form, 1, domainRegistration, env);
    form['metadata[selected_domain]'] = domainLineItem.domain_name;
    form['metadata[domain_registration]'] = safeJson(domainRegistration).slice(0, 500);
    form['metadata[domain_registration_amount]'] = domainLineItem.amount;
    form['metadata[domain_registration_currency]'] = domainLineItem.currency;
  }

  if (checkoutMode === 'subscription') {
    form['subscription_data[metadata][project_id]'] = projectId;
    form['subscription_data[metadata][user_id]'] = user.id;
    form['subscription_data[metadata][plan]'] = plan;
    form['subscription_data[metadata][domain_option]'] = domainOption;
    form['subscription_data[metadata][project_name]'] = project.name || '';
    if (domainRegistration?.name) {
      form['subscription_data[metadata][selected_domain]'] = domainRegistration.name;
    }
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: encodeForm(form)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) return error(result.error?.message || 'Stripe checkout session could not be created.', 500);

  if (!ONE_TIME_PAYMENT_PLANS.has(plan)) {
    const updatedProjectData = domainRegistration?.name
      ? {
          ...projectData,
          domain_registration: domainRegistration,
          domain_registration_payment: domainLineItem,
          domain_registration_status: 'checkout_started'
        }
      : projectData;

    await env.DB
      .prepare(`UPDATE projects SET plan = ?, domain_option = ?, custom_domain = ?, data_json = ?, billing_status = 'pending', stripe_session_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
      .bind(plan, domainOption, domainRegistration?.name || String(projectData.custom_domain || '').trim(), safeJson(updatedProjectData), result.id || '', projectId, user.id)
      .run();
  } else {
    await env.DB
      .prepare(`UPDATE projects SET stripe_session_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
      .bind(result.id || '', projectId, user.id)
      .run();
  }

  return json({ ok: true, url: result.url, session_id: result.id, mode: checkoutMode, domain_registration: domainLineItem });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
