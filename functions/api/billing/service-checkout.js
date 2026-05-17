import { json, error } from '../../_lib/json.js';

const SERVICE_CHECKOUTS = {
  basic_build: {
    label: 'Basic Build',
    priceEnv: 'STRIPE_PRICE_BASIC_BUILD',
    mode: 'payment',
    category: 'custom_build',
    successPath: '/custom-build/',
    cancelPath: '/custom-build/'
  },
  standard_build: {
    label: 'Standard Build',
    priceEnv: 'STRIPE_PRICE_STANDARD_BUILD',
    mode: 'payment',
    category: 'custom_build',
    successPath: '/custom-build/',
    cancelPath: '/custom-build/'
  },
  premium_build: {
    label: 'Premium Build',
    priceEnv: 'STRIPE_PRICE_PREMIUM_BUILD',
    mode: 'payment',
    category: 'custom_build',
    successPath: '/custom-build/',
    cancelPath: '/custom-build/'
  },
  ecommerce_build: {
    label: 'E-Commerce Build',
    priceEnv: 'STRIPE_PRICE_ECOMMERCE_BUILD',
    mode: 'payment',
    category: 'ecommerce_build',
    successPath: '/custom-build/',
    cancelPath: '/custom-build/'
  },
  complex_build: {
    label: 'Complex Build',
    priceEnv: 'STRIPE_PRICE_COMPLEX_BUILD',
    mode: 'payment',
    category: 'custom_build',
    successPath: '/custom-build/',
    cancelPath: '/custom-build/'
  },
  website_care_plan: {
    label: 'Website Care Plan',
    priceEnv: 'STRIPE_PRICE_WEBSITE_CARE_PLAN',
    mode: 'subscription',
    category: 'care_plan',
    successPath: '/pricing/',
    cancelPath: '/pricing/'
  },
  seo_care_plan: {
    label: 'SEO Care Plan',
    priceEnv: 'STRIPE_PRICE_SEO_CARE_PLAN',
    mode: 'subscription',
    category: 'care_plan',
    successPath: '/pricing/',
    cancelPath: '/pricing/'
  }
};

function normaliseService(value = '') {
  const key = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  return SERVICE_CHECKOUTS[key] ? key : '';
}

function baseUrlFromRequest(request, env) {
  return String(env.PBI_BASE_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

function checkoutReturnUrl(baseUrl, path, serviceKey, state) {
  const url = new URL(path, baseUrl);
  url.searchParams.set('checkout', serviceKey);
  url.searchParams.set(state, '1');
  if (state === 'success') url.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  return url.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
}

async function createServiceCheckout({ request, env, serviceKey, wantsJson = false }) {
  const key = normaliseService(serviceKey || new URL(request.url).searchParams.get('service'));
  if (!key) {
    return error('Choose a valid PBI service checkout option.', 400, {
      allowed_services: Object.keys(SERVICE_CHECKOUTS)
    });
  }

  const service = SERVICE_CHECKOUTS[key];
  const priceId = env[service.priceEnv] || '';
  if (!env.STRIPE_SECRET_KEY || !priceId) {
    return error(`Stripe checkout is not fully connected for ${service.label}.`, 500, {
      service: key,
      expected_price_env: service.priceEnv,
      price_id_missing: !priceId,
      stripe_secret_missing: !env.STRIPE_SECRET_KEY
    });
  }

  const baseUrl = baseUrlFromRequest(request, env);
  const params = new URLSearchParams();
  params.append('mode', service.mode);
  params.append('allow_promotion_codes', 'true');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('success_url', checkoutReturnUrl(baseUrl, service.successPath, key, 'success'));
  params.append('cancel_url', checkoutReturnUrl(baseUrl, service.cancelPath, key, 'cancelled'));
  params.append('client_reference_id', key);
  params.append('metadata[pbi_service_checkout]', 'true');
  params.append('metadata[service_checkout_kind]', key);
  params.append('metadata[service_label]', service.label);
  params.append('metadata[service_category]', service.category);
  params.append('metadata[pbi_auto_provision]', 'true');

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
    return error(stripe.error?.message || 'Stripe checkout could not be created.', 502, {
      service: key,
      stripe_error: stripe.error || null
    });
  }

  if (wantsJson) {
    return json({
      ok: true,
      service: key,
      label: service.label,
      mode: service.mode,
      id: stripe.id,
      url: stripe.url
    });
  }

  return Response.redirect(stripe.url, 303);
}

export async function onRequestGet({ request, env }) {
  return createServiceCheckout({ request, env });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  return createServiceCheckout({
    request,
    env,
    serviceKey: body.service,
    wantsJson: true
  });
}
