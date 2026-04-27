import { json, error } from '../projects/_shared.js';

async function verifyStripeSignature(request, env, rawBody) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return true;
  }

  const signature = request.headers.get('Stripe-Signature') || '';

  const parts = Object.fromEntries(
    signature.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    })
  );

  const timestamp = parts.t;
  const receivedSignature = parts.v1;

  if (!timestamp || !receivedSignature) {
    return false;
  }

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signedPayload = `${timestamp}.${rawBody}`;

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const expectedSignature = [...new Uint8Array(signatureBuffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return expectedSignature === receivedSignature;
}

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();

  const verified = await verifyStripeSignature(request, env, rawBody);

  if (!verified) {
    return error('Invalid Stripe webhook signature.', 400);
  }

  let event = {};

  try {
    event = JSON.parse(rawBody);
  } catch {
    return error('Invalid webhook JSON.', 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};

    const projectId = session.metadata?.project_id || session.client_reference_id;
    const userId = session.metadata?.user_id || '';
    const plan = session.metadata?.plan || 'business';
    const domainOption = session.metadata?.domain_option || 'pbi_subdomain';

    const billingStatus =
      plan === 'custom_build_deposit'
        ? 'custom_build_deposit_paid'
        : 'active';

    if (projectId) {
      await env.DB
        .prepare(`
          UPDATE projects
          SET
            billing_status = ?,
            plan = ?,
            domain_option = ?,
            stripe_customer_id = ?,
            stripe_subscription_id = ?,
            updated_at = datetime('now')
          WHERE id = ?
            AND (? = '' OR user_id = ?)
        `)
        .bind(
          billingStatus,
          plan,
          domainOption,
          session.customer || '',
          session.subscription || '',
          projectId,
          userId,
          userId
        )
        .run();
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data?.object || {};
    const projectId = subscription.metadata?.project_id;

    if (projectId) {
      await env.DB
        .prepare(`
          UPDATE projects
          SET
            billing_status = 'cancelled',
            published = 0,
            updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(projectId)
        .run();
    }
  }

  return json({
    received: true
  });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
