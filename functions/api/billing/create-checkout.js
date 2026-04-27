import { json, error, readBody, getUserFromSession } from '../projects/_shared.js';

const PLAN_PRICE_ENV = {
  starter: 'STRIPE_PRICE_STARTER',
  business: 'STRIPE_PRICE_BUSINESS',
  plus: 'STRIPE_PRICE_PLUS',
  custom_build_deposit: 'STRIPE_PRICE_CUSTOM_DEPOSIT'
};

const PLAN_NAMES = {
  starter: 'Starter Launch',
  business: 'Business Launch',
  plus: 'Business Plus',
  custom_build_deposit: 'Custom Built Website Deposit'
};

const ONE_TIME_PAYMENT_PLANS = new Set([
  'custom_build_deposit'
]);

function getOrigin(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function encodeForm(data) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }

  return params;
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);

  if (!user) {
    return error('Unauthorized.', 401);
  }

  const body = await readBody(request);

  const projectId = String(body.project_id || '').trim();
  const plan = String(body.plan || 'business').trim();
  const domainOption = String(body.domain_option || 'pbi_subdomain').trim();
  const assistedSetup = Boolean(body.assisted_setup);

  if (!projectId) {
    return error('Missing project id.', 400);
  }

  if (!PLAN_PRICE_ENV[plan]) {
    return error('Invalid plan selected.', 400);
  }

  const project = await env.DB
    .prepare(`
      SELECT id, name, user_id
      FROM projects
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `)
    .bind(projectId, user.id)
    .first();

  if (!project) {
    return error('Project not found.', 404);
  }

  const priceId = env[PLAN_PRICE_ENV[plan]];
  const assistedSetupPriceId = env.STRIPE_PRICE_ASSISTED_SETUP;
  const checkoutMode = ONE_TIME_PAYMENT_PLANS.has(plan) ? 'payment' : 'subscription';

  if (!env.STRIPE_SECRET_KEY || !priceId) {
    await env.DB
      .prepare(`
        UPDATE projects
        SET
          plan = ?,
          domain_option = ?,
          billing_status = 'setup_required',
          updated_at = datetime('now')
        WHERE id = ?
          AND user_id = ?
      `)
      .bind(plan, domainOption, projectId, user.id)
      .run();

    return json({
      ok: true,
      setup_required: true,
      message: `Stripe is not connected yet. Add STRIPE_SECRET_KEY and ${PLAN_PRICE_ENV[plan]} to Cloudflare environment variables to enable ${PLAN_NAMES[plan]} checkout.`
    });
  }

  const origin = getOrigin(request);

  const form = {
    mode: checkoutMode,

    success_url: `${origin}/payment/?project=${encodeURIComponent(projectId)}&success=1`,
    cancel_url: `${origin}/payment/?project=${encodeURIComponent(projectId)}&cancelled=1`,

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

  if (checkoutMode === 'subscription') {
    form['subscription_data[metadata][project_id]'] = projectId;
    form['subscription_data[metadata][user_id]'] = user.id;
    form['subscription_data[metadata][plan]'] = plan;
    form['subscription_data[metadata][domain_option]'] = domainOption;
    form['subscription_data[metadata][project_name]'] = project.name || '';
  }

  if (assistedSetup && assistedSetupPriceId && checkoutMode === 'subscription') {
    form['line_items[1][price]'] = assistedSetupPriceId;
    form['line_items[1][quantity]'] = '1';
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

  if (!response.ok) {
    return error(
      result.error?.message || 'Stripe checkout session could not be created.',
      500
    );
  }

  await env.DB
    .prepare(`
      UPDATE projects
      SET
        plan = ?,
        domain_option = ?,
        billing_status = 'pending',
        stripe_session_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
        AND user_id = ?
    `)
    .bind(
      plan,
      domainOption,
      result.id || '',
      projectId,
      user.id
    )
    .run();

  return json({
    ok: true,
    url: result.url,
    session_id: result.id,
    mode: checkoutMode
  });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
