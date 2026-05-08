import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { ensurePbiOpsTables, createAdminNotification } from '../admin/_shared.js';

function parseData(project) {
  try {
    return typeof project?.data_json === 'string' ? JSON.parse(project.data_json || '{}') : (project?.data_json || {});
  } catch {
    return {};
  }
}

function cleanDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '')
    .replace(/\.$/, '')
    .slice(0, 253);
}

function selectedDomain(body, data, project) {
  const registration = body.domain_registration || data.domain_registration || {};
  const name = cleanDomain(body.domain_name || registration.name || data.custom_domain || project.custom_domain || '');
  return {
    ...registration,
    name,
    available: registration.available,
    status: registration.status || data.domain_registration_status || '',
    pricing: registration.pricing || data.domain_registration?.pricing || null
  };
}

function isPaid(project) {
  return ['active', 'paid', 'trialing'].includes(String(project.billing_status || '').toLowerCase());
}

async function fetchJson(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body };
  } catch (err) {
    return { ok: false, status: 0, error: err?.name === 'AbortError' ? 'timeout' : 'fetch_failed' };
  } finally {
    clearTimeout(timer);
  }
}

async function confirmDomainAvailable(domainName) {
  const [rdap, dns] = await Promise.all([
    fetchJson(`https://rdap.org/domain/${encodeURIComponent(domainName)}`, {
      headers: { Accept: 'application/rdap+json, application/json' }
    }),
    fetchJson(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domainName)}&type=NS`, {
      headers: { Accept: 'application/dns-json' }
    }, 3000)
  ]);

  const rdapAvailable = rdap.status === 404;
  const rdapRegistered = rdap.ok && rdap.status !== 404;
  const dnsAnswers = Array.isArray(dns.body?.Answer) ? dns.body.Answer.filter(Boolean) : [];
  const dnsChecked = dns.ok || Number.isInteger(dns.body?.Status);
  const available = rdapAvailable && dnsChecked && dnsAnswers.length === 0;

  return {
    available,
    checked_at: new Date().toISOString(),
    confidence: available ? 'high' : 'manual',
    rdap_status: rdap.status,
    dns_status: dns.body?.Status ?? null,
    dns_answer_count: dnsAnswers.length,
    message: available
      ? 'Final public RDAP and DNS checks still show the domain as available.'
      : (rdapRegistered || dnsAnswers.length ? 'The domain now appears to be registered or active in DNS.' : 'The agent could not safely reconfirm availability.')
  };
}

async function verifyStripeCheckout(env, sessionId, projectId) {
  if (!env.STRIPE_SECRET_KEY || !sessionId) return { active: false };
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });
  const session = await response.json().catch(() => ({}));
  if (!response.ok) return { active: false, error: session.error?.message || 'Could not verify Stripe checkout.' };
  const metadataProject = session.metadata?.project_id || session.client_reference_id || '';
  if (metadataProject && metadataProject !== projectId) return { active: false, error: 'Stripe session does not match this project.' };
  const active = session.payment_status === 'paid' || session.status === 'complete';
  return {
    active,
    customer: session.customer || '',
    subscription: session.subscription || '',
    status: session.status || '',
    payment_status: session.payment_status || ''
  };
}

async function callRegistrationWebhook(env, payload) {
  const url = String(env.DOMAIN_REGISTRATION_AGENT_URL || env.DOMAIN_REGISTRATION_WEBHOOK_URL || '').trim();
  if (!url) return { configured: false };
  const headers = { 'Content-Type': 'application/json' };
  const token = String(env.DOMAIN_REGISTRATION_AGENT_TOKEN || env.DOMAIN_REGISTRATION_WEBHOOK_TOKEN || '').trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-PBI-Domain-Agent-Token'] = token;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      configured: true,
      ok: false,
      status: response.status,
      message: data.error || data.message || `Domain registration webhook failed with ${response.status}`,
      response: data
    };
  }
  return {
    configured: true,
    ok: true,
    order_id: data.order_id || data.id || '',
    registrar: data.registrar || data.provider || '',
    message: data.message || 'Domain registration order was accepted by the automation agent.',
    response: data
  };
}

async function queueSupportRequest(env, { project, user, domain, agent }) {
  const id = crypto.randomUUID();
  const message = `Domain registration required for ${domain.name}. Status: ${agent.status}.`;
  await env.DB.prepare(`
    INSERT INTO support_requests (id, project_id, user_id, email, type, message, status, body_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'domain_registration', ?, 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(id, project.id, user.id, user.email || '', message, JSON.stringify({ domain, agent })).run();
  return id;
}

async function updateProject(env, project, data, domain, agent, stripe = {}) {
  const nextData = {
    ...data,
    domain_option: 'register_new',
    custom_domain: domain.name,
    domain_registration: { ...(data.domain_registration || {}), ...domain },
    domain_registration_status: agent.status,
    domain_registration_message: agent.message,
    domain_registration_agent: agent,
    domain_management: {
      ...(data.domain_management || {}),
      status: agent.status,
      active: agent.status === 'submitted_to_registration_agent' || agent.status === 'queued_for_manual_registration',
      domain_name: domain.name,
      agent_order_id: agent.order_id || '',
      current_period_start: new Date().toISOString()
    }
  };

  await env.DB.prepare(`
    UPDATE projects
    SET data_json = ?,
        domain_option = 'register_new',
        custom_domain = ?,
        billing_status = CASE WHEN ? != '' THEN 'active' ELSE billing_status END,
        stripe_session_id = COALESCE(NULLIF(?, ''), stripe_session_id),
        stripe_customer_id = COALESCE(NULLIF(?, ''), stripe_customer_id),
        stripe_subscription_id = COALESCE(NULLIF(?, ''), stripe_subscription_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(
    JSON.stringify(nextData),
    domain.name,
    stripe.active ? 'active' : '',
    stripe.session_id || '',
    stripe.customer || '',
    stripe.subscription || '',
    project.id,
    project.user_id
  ).run();

  return nextData;
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  await ensurePbiOpsTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || body.project || '').trim();
  if (!projectId) return error('Project id is required.');

  const project = await env.DB.prepare(`
    SELECT id, user_id, name, billing_status, domain_option, custom_domain, data_json, stripe_session_id, stripe_customer_id, stripe_subscription_id
    FROM projects
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).bind(projectId, auth.user.id).first();
  if (!project) return error('Project not found.', 404);

  const data = parseData(project);
  const domainOption = String(body.domain_option || data.domain_option || project.domain_option || '').trim();
  if (domainOption !== 'register_new') {
    return json({
      ok: true,
      skipped: true,
      status: 'not_required',
      message: 'Domain Registration Agent only runs when the project is set to register a new domain.'
    });
  }

  const domain = selectedDomain(body, data, project);
  if (!domain.name) return error('No selected domain was found for this project.');
  let manualRegistrationOnly = domain.available !== true || domain.requires_manual_review === true || domain.status === 'manual_review';
  if (manualRegistrationOnly) {
    domain.available = null;
    domain.status = domain.status || 'manual_review';
    domain.requires_manual_review = true;
    domain.message = domain.message || 'This domain could not be confirmed automatically and needs PBI manual review before registration.';
  } else {
    const availability = await confirmDomainAvailable(domain.name);
    domain.availability_confirmation = availability;
    if (!availability.available) {
      manualRegistrationOnly = true;
      domain.available = null;
      domain.status = 'manual_review';
      domain.requires_manual_review = true;
      domain.message = 'The final availability check could not confirm this domain, so it has been queued for manual review before registration.';
    }
  }
  domain.requires_final_confirmation = !manualRegistrationOnly;

  let stripe = { active: isPaid(project), session_id: String(body.stripe_session_id || project.stripe_session_id || '') };
  if (!stripe.active && stripe.session_id) {
    const verified = await verifyStripeCheckout(env, stripe.session_id, project.id);
    if (verified.error) return error(verified.error, 400);
    stripe = { ...stripe, ...verified, session_id: stripe.session_id };
  }

  const requiresPayment = String(env.PBI_REQUIRE_PAYMENT_TO_PUBLISH || 'true').toLowerCase() !== 'false';
  if (requiresPayment && !stripe.active) {
    return json({
      ok: false,
      payment_required: true,
      status: 'waiting_for_payment',
      message: 'Payment must be active before the Domain Registration Agent can start.'
    }, 402);
  }

  const orderPayload = {
    order_id: crypto.randomUUID(),
    project_id: project.id,
    project_name: project.name,
    customer_email: auth.user.email || '',
    domain,
    live_url: body.live_url || data.live_url || '',
    requested_at: new Date().toISOString()
  };
  const webhook = manualRegistrationOnly
    ? { configured: false, ok: false, manual_only: true }
    : await callRegistrationWebhook(env, orderPayload);
  const agent = {
    id: orderPayload.order_id,
    domain_name: domain.name,
    requested_at: orderPayload.requested_at,
    registrar_connected: manualRegistrationOnly ? false : webhook.configured === true,
    actual_purchase_attempted: manualRegistrationOnly ? false : webhook.configured === true,
    status: manualRegistrationOnly ? 'queued_for_manual_registration' : (webhook.configured
      ? (webhook.ok ? 'submitted_to_registration_agent' : 'automation_failed_manual_queue')
      : 'queued_for_manual_registration'),
    order_id: webhook.order_id || orderPayload.order_id,
    registrar: webhook.registrar || '',
    message: manualRegistrationOnly
      ? 'This domain needs manual review before registration. It has been saved and queued for PBI to check.'
      : (webhook.configured
      ? (webhook.ok ? webhook.message : `${webhook.message}. A manual registration task has been queued.`)
      : 'No registrar automation webhook is configured yet, so this has been queued for manual registration.'),
    webhook_response: webhook.response || null
  };

  const requestId = await queueSupportRequest(env, { project, user: auth.user, domain, agent });
  agent.support_request_id = requestId;
  await createAdminNotification(env, {
    type: 'domain_registration',
    title: webhook.ok ? 'Domain registration automation started' : 'Domain registration needs action',
    message: `${domain.name} for ${project.name || project.id}: ${agent.message}`,
    priority: webhook.ok ? 'normal' : 'high',
    customer_email: auth.user.email || '',
    project_id: project.id,
    request_id: requestId,
    body: { domain, agent }
  });
  await updateProject(env, project, data, domain, agent, stripe);

  return json({
    ok: true,
    domain,
    agent,
    actual_purchase_attempted: agent.actual_purchase_attempted,
    registrar_connected: agent.registrar_connected,
    message: agent.message
  });
}
