import { json, error } from '../../_lib/json.js';
import { createAdminNotification, ensurePbiOpsTables } from '../admin/_shared.js';
import { provisionPaidCheckoutSession, syncStripeBillingStatus } from './_provision.js';

const encoder = new TextEncoder();

function hex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (!left || !right || left.length !== right.length) return false;

  let out = 0;
  for (let i = 0; i < left.length; i += 1) {
    out |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return out === 0;
}

function parseStripeSignature(header) {
  const parts = String(header || '').split(',').map((part) => part.trim()).filter(Boolean);
  const parsed = { timestamp: '', signatures: [] };
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') parsed.timestamp = value || '';
    if (key === 'v1' && value) parsed.signatures.push(value);
  }
  return parsed;
}

async function hmacSha256(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function verifyStripeSignature(payload, header, secret, toleranceSeconds = 300) {
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  const parsed = parseStripeSignature(header);
  if (!parsed.timestamp || !parsed.signatures.length) throw new Error('Stripe signature header is missing.');

  const timestamp = Number.parseInt(parsed.timestamp, 10);
  if (!Number.isFinite(timestamp)) throw new Error('Stripe signature timestamp is invalid.');

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) throw new Error('Stripe signature timestamp is outside the allowed tolerance.');

  const expected = await hmacSha256(secret, `${parsed.timestamp}.${payload}`);
  if (!parsed.signatures.some((signature) => constantTimeEqual(signature, expected))) {
    throw new Error('Stripe signature verification failed.');
  }
}

async function ensureWebhookEventsTable(env) {
  await ensurePbiOpsTables(env);
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      id TEXT PRIMARY KEY,
      type TEXT,
      status TEXT DEFAULT 'received',
      project_id TEXT,
      body_json TEXT,
      result_json TEXT,
      error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT
    )
  `).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON stripe_webhook_events(type)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON stripe_webhook_events(status)`).run();
}

async function recordReceived(env, event, payload) {
  await env.DB.prepare(`
    INSERT OR IGNORE INTO stripe_webhook_events (id, type, status, body_json, created_at)
    VALUES (?, ?, 'received', ?, CURRENT_TIMESTAMP)
  `).bind(event.id, event.type || '', payload.slice(0, 100000)).run();

  return await env.DB.prepare(`SELECT id, status FROM stripe_webhook_events WHERE id = ? LIMIT 1`).bind(event.id).first();
}

async function recordProcessed(env, event, result) {
  await env.DB.prepare(`
    UPDATE stripe_webhook_events
    SET status = 'processed',
        project_id = ?,
        result_json = ?,
        error = '',
        processed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(result?.project_id || '', JSON.stringify(result || {}), event.id).run();
}

async function recordFailed(env, event, err) {
  await env.DB.prepare(`
    UPDATE stripe_webhook_events
    SET status = 'failed',
        error = ?,
        processed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(err?.message || 'Webhook processing failed.', event.id).run();
}

function subscriptionIdFromInvoice(invoice = {}) {
  return invoice.subscription || invoice.parent?.subscription_details?.subscription || invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription || '';
}

async function handleEvent(env, event) {
  const object = event.data?.object || {};

  if (event.type === 'checkout.session.completed') {
    return provisionPaidCheckoutSession(env, object);
  }

  if (event.type === 'invoice.paid') {
    return syncStripeBillingStatus(env, {
      subscription: subscriptionIdFromInvoice(object),
      customer: object.customer || '',
      billingStatus: 'active',
      published: null,
      eventType: event.type
    });
  }

  if (event.type === 'invoice.payment_failed') {
    return syncStripeBillingStatus(env, {
      subscription: subscriptionIdFromInvoice(object),
      customer: object.customer || '',
      billingStatus: 'past_due',
      published: null,
      eventType: event.type
    });
  }

  if (event.type === 'customer.subscription.deleted') {
    return syncStripeBillingStatus(env, {
      subscription: object.id || '',
      customer: object.customer || '',
      billingStatus: 'cancelled',
      published: false,
      eventType: event.type
    });
  }

  if (event.type === 'customer.subscription.updated') {
    const status = String(object.status || '').toLowerCase();
    const billingStatus = status === 'canceled' ? 'cancelled' : (status || 'active');
    return syncStripeBillingStatus(env, {
      subscription: object.id || '',
      customer: object.customer || '',
      billingStatus,
      published: billingStatus === 'cancelled' ? false : null,
      eventType: event.type
    });
  }

  return { ok: true, skipped: true, event_type: event.type || '', message: 'Stripe event type not handled by PBI.' };
}

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  const signature = request.headers.get('Stripe-Signature') || '';
  const tolerance = Number.parseInt(env.STRIPE_WEBHOOK_TOLERANCE_SECONDS || '300', 10) || 300;

  try {
    await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET, tolerance);
  } catch (err) {
    return error(err?.message || 'Stripe webhook signature verification failed.', 400);
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch (_) {
    return error('Invalid Stripe webhook payload.', 400);
  }

  if (!event?.id) return error('Stripe event id is required.', 400);

  await ensureWebhookEventsTable(env);
  const received = await recordReceived(env, event, payload);
  if (received?.status === 'processed') {
    return json({ received: true, duplicate: true, event_id: event.id });
  }

  try {
    const result = await handleEvent(env, event);
    await recordProcessed(env, event, result);
    return json({ received: true, event_id: event.id, result });
  } catch (err) {
    await recordFailed(env, event, err);
    try {
      await createAdminNotification(env, {
        type: 'stripe_webhook',
        title: 'Stripe webhook processing failed',
        message: `${event.type || 'Stripe event'} ${event.id}: ${err?.message || 'Webhook processing failed.'}`,
        priority: 'high',
        body: { event_id: event.id, event_type: event.type || '', error: err?.message || '' }
      });
    } catch (_) {}
    return error(err?.message || 'Stripe webhook processing failed.', 500);
  }
}
