import { json, error } from '../projects/_shared.js';

async function verifyStripeSignature(request, env, rawBody) {
  if (!env.STRIPE_WEBHOOK_SECRET) return true;
  const signature = request.headers.get('Stripe-Signature') || '';
  const parts = Object.fromEntries(signature.split(',').map((part) => { const [key, value] = part.split('='); return [key, value]; }));
  const timestamp = parts.t;
  const receivedSignature = parts.v1;
  if (!timestamp || !receivedSignature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${rawBody}`));
  const expectedSignature = [...new Uint8Array(signatureBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return expectedSignature === receivedSignature;
}

async function markProjectData(env, projectId, userId, updates) {
  const project = await env.DB.prepare(`SELECT data_json FROM projects WHERE id = ? AND (? = '' OR user_id = ?) LIMIT 1`).bind(projectId, userId || '', userId || '').first();
  if (!project) return;
  let data = {};
  try { data = typeof project.data_json === 'string' ? JSON.parse(project.data_json || '{}') : {}; } catch { data = {}; }
  data = { ...data, ...updates };
  await env.DB.prepare(`UPDATE projects SET data_json = ?, updated_at = datetime('now') WHERE id = ? AND (? = '' OR user_id = ?)`).bind(JSON.stringify(data), projectId, userId || '', userId || '').run();
}

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();
  const verified = await verifyStripeSignature(request, env, rawBody);
  if (!verified) return error('Invalid Stripe webhook signature.', 400);

  let event = {};
  try { event = JSON.parse(rawBody); } catch { return error('Invalid webhook JSON.', 400); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    const projectId = session.metadata?.project_id || session.client_reference_id;
    const userId = session.metadata?.user_id || '';
    const plan = session.metadata?.plan || 'business';
    const domainOption = session.metadata?.domain_option || 'pbi_subdomain';

    if (projectId && plan === 'assisted_setup') {
      await markProjectData(env, projectId, userId, { assisted_setup_paid: true, assisted_setup_paid_at: new Date().toISOString(), assisted_setup_status: 'active' });
    } else if (projectId && plan === 'custom_build_deposit') {
      await markProjectData(env, projectId, userId, { custom_build_deposit_paid: true, custom_build_deposit_paid_at: new Date().toISOString(), custom_build_status: 'deposit_paid' });
      await env.DB.prepare(`UPDATE projects SET billing_status = 'custom_build_deposit_paid', updated_at = datetime('now') WHERE id = ? AND (? = '' OR user_id = ?)`).bind(projectId, userId, userId).run();
    } else if (projectId) {
      await env.DB.prepare(`UPDATE projects SET billing_status = 'active', plan = ?, domain_option = ?, stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = datetime('now') WHERE id = ? AND (? = '' OR user_id = ?)`).bind(plan, domainOption, session.customer || '', session.subscription || '', projectId, userId, userId).run();
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data?.object || {};
    const projectId = subscription.metadata?.project_id;
    if (projectId) await env.DB.prepare(`UPDATE projects SET billing_status = 'cancelled', published = 0, updated_at = datetime('now') WHERE id = ?`).bind(projectId).run();
  }

  return json({ received: true });
}

export async function onRequestGet() { return error('Method not allowed.', 405); }
