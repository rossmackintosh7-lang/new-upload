import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

const VALID_PLANS = new Set(['starter', 'business', 'plus']);

function cleanPlan(value) {
  const plan = String(value || 'starter').trim().toLowerCase();
  return VALID_PLANS.has(plan) ? plan : 'starter';
}

function priceIdForPlan(env, plan) {
  if (plan === 'business') return env.STRIPE_PRICE_BUSINESS || '';
  if (plan === 'plus') return env.STRIPE_PRICE_PLUS || '';
  return env.STRIPE_PRICE_STARTER || '';
}

function baseUrlFromRequest(request, env) {
  return String(env.PBI_BASE_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || body.project || '').trim();
  const requestedPlan = cleanPlan(body.plan);
  if (!projectId) return error('Project id is required.');

  const project = await env.DB.prepare(`
    SELECT id, user_id, name, plan, data_json
    FROM projects
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).bind(projectId, auth.user.id).first();

  if (!project) return error('Project not found.', 404);

  const plan = requestedPlan || cleanPlan(project.plan);
  const priceId = priceIdForPlan(env, plan);

  await env.DB.prepare(`
    UPDATE projects
    SET plan = ?, billing_status = COALESCE(NULLIF(billing_status, ''), 'draft'), updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(plan, projectId, auth.user.id).run();

  if (!env.STRIPE_SECRET_KEY || !priceId) {
    return json({
      ok: true,
      setup_required: true,
      plan,
      price_id_missing: !priceId,
      message: `Stripe is not fully connected for the ${plan} package. Add STRIPE_SECRET_KEY and the matching STRIPE_PRICE_${plan.toUpperCase()} value in Cloudflare.`
    });
  }

  const baseUrl = baseUrlFromRequest(request, env);
  const successUrl = `${baseUrl}/payment/?project=${encodeURIComponent(projectId)}&plan=${encodeURIComponent(plan)}&success=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/payment/?project=${encodeURIComponent(projectId)}&plan=${encodeURIComponent(plan)}&cancelled=1`;

  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  params.append('client_reference_id', projectId);
  params.append('customer_email', auth.user.email);
  params.append('metadata[project_id]', projectId);
  params.append('metadata[user_id]', auth.user.id);
  params.append('metadata[plan]', plan);
  params.append('subscription_data[metadata][project_id]', projectId);
  params.append('subscription_data[metadata][user_id]', auth.user.id);
  params.append('subscription_data[metadata][plan]', plan);

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const data = await stripeResponse.json().catch(() => ({}));

  if (!stripeResponse.ok) {
    return error(data.error?.message || 'Stripe checkout could not be created.', 502, { stripe_error: data.error || null });
  }

  try {
    await env.DB.prepare(`
      UPDATE projects
      SET stripe_session_id = ?, plan = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(data.id || '', plan, projectId, auth.user.id).run();
  } catch (_) {}

  return json({ ok: true, url: data.url, id: data.id, plan });
}
