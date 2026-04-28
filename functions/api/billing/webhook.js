import { json, error } from '../projects/_shared.js';

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

function parseJson(value, fallback = {}) {
  try {
    return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback);
  } catch {
    return fallback;
  }
}

async function verifyStripeSignature(request, env, rawBody) {
  if (!env.STRIPE_WEBHOOK_SECRET) return true;

  const signature = request.headers.get('Stripe-Signature') || '';
  const parts = Object.fromEntries(
    signature.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    })
  );

  const timestamp = parts.t;
  const receivedSignature = parts.v1;
  if (!timestamp || !receivedSignature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${rawBody}`));
  const expectedSignature = [...new Uint8Array(signatureBuffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return expectedSignature === receivedSignature;
}

async function getProjectData(env, projectId, userId = '') {
  const project = await env.DB
    .prepare(`SELECT data_json FROM projects WHERE id = ? AND (? = '' OR user_id = ?) LIMIT 1`)
    .bind(projectId, userId || '', userId || '')
    .first();

  if (!project) return null;
  return parseJson(project.data_json, {});
}

async function updateProjectData(env, projectId, userId, updates) {
  const data = (await getProjectData(env, projectId, userId)) || {};
  const next = { ...data, ...updates };

  await env.DB
    .prepare(`UPDATE projects SET data_json = ?, updated_at = datetime('now') WHERE id = ? AND (? = '' OR user_id = ?)`)
    .bind(JSON.stringify(next), projectId, userId || '', userId || '')
    .run();

  return next;
}

async function markProjectData(env, projectId, userId, updates) {
  await updateProjectData(env, projectId, userId, updates);
}

async function checkDomainAvailability(env, domainName) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/registrar/domain-check`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domains: [domainName] })
    }
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.errors?.map((item) => item.message).join(', ') || `Cloudflare domain check failed with status ${response.status}`);
  }

  return result.result?.domains?.[0] || null;
}

async function registerDomain(env, domainName) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/registrar/registrations`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain_name: domainName })
    }
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.errors?.map((item) => item.message).join(', ') || `Cloudflare registration failed with status ${response.status}`);
  }

  return result.result || result;
}

async function handleDomainRegistrationAfterPayment(env, { projectId, userId, session, domainOption }) {
  if (domainOption !== 'register_new') return;

  const selectedDomain = cleanDomain(session.metadata?.selected_domain || '');
  if (!selectedDomain || !isValidDomain(selectedDomain)) return;

  const data = (await getProjectData(env, projectId, userId)) || {};
  const registrationData = parseJson(session.metadata?.domain_registration, data.domain_registration || {});

  const baseUpdate = {
    domain_registration: {
      ...registrationData,
      name: selectedDomain,
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id || '',
      stripe_customer_id: session.customer || '',
      stripe_subscription_id: session.subscription || ''
    }
  };

  if (env.DOMAIN_AUTO_REGISTER !== 'true') {
    await updateProjectData(env, projectId, userId, {
      ...baseUpdate,
      domain_registration_status: 'paid_pending_manual_registration',
      domain_registration_message: 'Domain fee paid. Automatic registration is disabled.'
    });

    await env.DB
      .prepare(`UPDATE projects SET custom_domain = ?, domain_option = 'register_new', updated_at = datetime('now') WHERE id = ? AND (? = '' OR user_id = ?)`)
      .bind(selectedDomain, projectId, userId || '', userId || '')
      .run();

    return;
  }

  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    await updateProjectData(env, projectId, userId, {
      ...baseUpdate,
      domain_registration_status: 'paid_registration_blocked',
      domain_registration_message: 'Missing Cloudflare registrar environment variables.'
    });
    return;
  }

  try {
    const liveCheck = await checkDomainAvailability(env, selectedDomain);

    if (!liveCheck?.registrable || liveCheck.tier === 'premium') {
      await updateProjectData(env, projectId, userId, {
        ...baseUpdate,
        domain_registration_status: 'paid_registration_failed',
        domain_registration_message: liveCheck?.reason || 'Domain was not registrable at the final payment check.',
        domain_registration_final_check: liveCheck || null
      });
      return;
    }

    const registration = await registerDomain(env, selectedDomain);

    await updateProjectData(env, projectId, userId, {
      ...baseUpdate,
      domain_registration_status: 'registered',
      domain_registration_message: 'Domain registered successfully through Cloudflare Registrar.',
      domain_registration_provider_result: registration
    });

    await env.DB
      .prepare(`UPDATE projects SET custom_domain = ?, domain_option = 'register_new', updated_at = datetime('now') WHERE id = ? AND (? = '' OR user_id = ?)`)
      .bind(selectedDomain, projectId, userId || '', userId || '')
      .run();

    await env.DB
      .prepare(`INSERT OR REPLACE INTO domains (id, project_id, hostname, status, provider_ref, verification_json) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(`domain_${selectedDomain}`, projectId, selectedDomain, 'registered', registration.id || registration.domain_name || selectedDomain, JSON.stringify(registration))
      .run();
  } catch (err) {
    await updateProjectData(env, projectId, userId, {
      ...baseUpdate,
      domain_registration_status: 'paid_registration_failed',
      domain_registration_message: err?.message || 'Domain registration failed after payment.'
    });
  }
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
      await markProjectData(env, projectId, userId, {
        assisted_setup_paid: true,
        assisted_setup_paid_at: new Date().toISOString(),
        assisted_setup_status: 'active'
      });
    } else if (projectId && plan === 'custom_build_deposit') {
      await markProjectData(env, projectId, userId, {
        custom_build_deposit_paid: true,
        custom_build_deposit_paid_at: new Date().toISOString(),
        custom_build_status: 'deposit_paid'
      });

      await env.DB
        .prepare(`UPDATE projects SET billing_status = 'custom_build_deposit_paid', updated_at = datetime('now') WHERE id = ? AND (? = '' OR user_id = ?)`)
        .bind(projectId, userId, userId)
        .run();
    } else if (projectId) {
      await env.DB
        .prepare(`UPDATE projects SET billing_status = 'active', plan = ?, domain_option = ?, stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = datetime('now') WHERE id = ? AND (? = '' OR user_id = ?)`)
        .bind(plan, domainOption, session.customer || '', session.subscription || '', projectId, userId, userId)
        .run();

      await handleDomainRegistrationAfterPayment(env, { projectId, userId, session, domainOption });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data?.object || {};
    const projectId = subscription.metadata?.project_id;
    if (projectId) {
      await env.DB
        .prepare(`UPDATE projects SET billing_status = 'cancelled', published = 0, updated_at = datetime('now') WHERE id = ?`)
        .bind(projectId)
        .run();
    }
  }

  return json({ received: true });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
