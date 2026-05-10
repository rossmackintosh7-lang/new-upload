import { json, error, readBody, getUserFromSession } from '../projects/_shared.js';
import { takeProjectDown } from './_cancellation.js';

function parseJson(value, fallback = {}) {
  try { return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback); }
  catch { return fallback; }
}

async function cancelStripeSubscription(env, subscriptionId) {
  if (!subscriptionId) return { skipped: true, reason: 'No Stripe subscription id stored.' };
  if (!env.STRIPE_SECRET_KEY) return { ok: false, error: 'STRIPE_SECRET_KEY is missing, so Stripe billing was not cancelled. Add the secret or cancel the subscription in Stripe manually.' };

  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: result.error?.message || `Stripe cancellation failed with status ${response.status}.` };
  return { ok: true, subscription: result };
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Unauthorized.', 401);

  const body = await readBody(request);
  const projectId = String(body.project_id || '').trim();
  const confirm = String(body.confirm || '').trim().toUpperCase();
  if (!projectId) return error('Missing project id.', 400);
  if (confirm !== 'CANCEL') return error('Type CANCEL to confirm the cancellation.', 400);

  const project = await env.DB.prepare(`SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1`).bind(projectId, user.id).first();
  if (!project) return error('Project not found.', 404);

  const data = parseJson(project.data_json, {});
  const subscriptionId = project.stripe_subscription_id || data.stripe_subscription_id || data.domain_management?.stripe_subscription_id || '';
  const stripe = await cancelStripeSubscription(env, subscriptionId);
  if (stripe.ok === false) return error(stripe.error || 'Stripe cancellation failed.', 500, { stripe });

  await takeProjectDown(env, project, 'customer');

  return json({
    ok: true,
    cancelled: true,
    project_id: project.id,
    stripe,
    message: 'Subscription cancelled. The website has been unpublished and the public site is no longer available.'
  });
}
