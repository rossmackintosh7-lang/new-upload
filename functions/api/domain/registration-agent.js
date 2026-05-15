import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { ensurePbiOpsTables, createAdminNotification } from '../admin/_shared.js';
import {
  autoRegisterEnabled,
  checkCloudflareRegistrarDomains,
  cloudflareRegistrarConfigured,
  createCloudflareRegistration
} from './_registrar.js';

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
    pricing: registration.pricing || data.domain_registration?.pricing || null,
    checkout_pricing: registration.checkout_pricing || data.domain_registration?.checkout_pricing || data.domain_billing || null
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
  const dnsClear = dnsChecked && dnsAnswers.length === 0;
  const available = (rdapAvailable && dnsClear) || (!rdapRegistered && dnsClear);

  return {
    available,
    checked_at: new Date().toISOString(),
    confidence: rdapAvailable && dnsClear ? 'high' : (available ? 'medium' : 'provider_final_check'),
    rdap_status: rdap.status,
    dns_status: dns.body?.Status ?? null,
    dns_answer_count: dnsAnswers.length,
    message: available
      ? 'Final public checks passed for automatic registration handoff.'
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

function registrarDomainName(item = {}) {
  return String(item.domain_name || item.domain || item.name || item.fqdn || '').trim().toLowerCase();
}

function registrarBoolean(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (['true', 'yes', 'available', 'registrable'].includes(lower)) return true;
    if (['false', 'no', 'unavailable', 'registered', 'taken'].includes(lower)) return false;
  }
  return null;
}

function registrarItemFor(result, domainName) {
  const wanted = String(domainName || '').toLowerCase();
  return (result.domains || []).find((item) => registrarDomainName(item) === wanted) || result.domains?.[0] || null;
}

function cloudflareCanRegister(item = {}) {
  const supported = registrarBoolean(item.supported);
  const available = registrarBoolean(item.available);
  const registrable = registrarBoolean(item.registrable ?? item.can_register ?? item.registerable ?? item.supported);
  const reason = String(item.reason || item.status || item.availability || item.message || '').toLowerCase();
  const premium = item.premium === true || String(item.tier || '').toLowerCase() === 'premium';

  if (premium || supported === false || reason.includes('unsupported') || reason.includes('not_supported') || reason.includes('not supported')) return false;
  if (available === false || reason.includes('taken') || reason.includes('registered') || reason.includes('unavailable')) return false;
  return (available === true || registrable === true) && registrable !== false;
}

function mergeRegistrarPricing(domain, item = {}) {
  const pricing = item.pricing || item.price || item.prices || {};
  const amount = pricing.registration_cost || pricing.registration || pricing.create || pricing.first_year || item.registration_cost || item.registration_price || item.price || '';
  const renewal = pricing.renewal_cost || pricing.renewal || item.renewal_cost || item.renewal_price || '';
  if (!amount && !renewal) return domain.pricing || null;

  return {
    ...(domain.pricing || {}),
    currency: String(item.currency || pricing.currency || domain.pricing?.currency || 'GBP').toUpperCase(),
    registration_cost: String(amount || domain.pricing?.registration_cost || ''),
    renewal_cost: String(renewal || domain.pricing?.renewal_cost || ''),
    registrar_source: 'cloudflare_registrar'
  };
}

async function finalCloudflareCheck(env, domain) {
  if (!cloudflareRegistrarConfigured(env)) return { checked: false, configured: false };

  const result = await checkCloudflareRegistrarDomains(env, [domain.name]);
  if (!result.ok) {
    return {
      checked: false,
      configured: true,
      ok: false,
      status: result.status || 0,
      message: result.message || 'Cloudflare Registrar final check failed.'
    };
  }

  const item = registrarItemFor(result, domain.name);
  if (!item) {
    return {
      checked: false,
      configured: true,
      ok: false,
      message: 'Cloudflare Registrar returned no final domain result.'
    };
  }

  const registrable = cloudflareCanRegister(item);
  const unavailable = registrarBoolean(item.available) === false;
  return {
    checked: true,
    configured: true,
    ok: registrable,
    registrable,
    unavailable,
    status: item.status || item.availability || '',
    reason: item.reason || item.message || '',
    pricing: mergeRegistrarPricing(domain, item),
    raw: item,
    message: registrable
      ? 'Cloudflare Registrar final check confirms this domain can be registered.'
      : 'Cloudflare Registrar cannot automatically register this domain.'
  };
}

async function submitAutomaticRegistration(env, payload, domain) {
  if (autoRegisterEnabled(env) && cloudflareRegistrarConfigured(env) && domain.cloudflare_registrable === true) {
    return createCloudflareRegistration(env, domain.name);
  }

  return callRegistrationWebhook(env, payload);
}

function registrarAutomationConfigured(env = {}) {
  return Boolean(
    String(env.DOMAIN_REGISTRATION_AGENT_URL || env.DOMAIN_REGISTRATION_WEBHOOK_URL || '').trim() ||
    (autoRegisterEnabled(env) && cloudflareRegistrarConfigured(env))
  );
}

async function queueSupportRequest(env, { project, user, domain, agent }) {
  const id = crypto.randomUUID();
  const message = `Domain registration required for ${domain.name}. Status: ${agent.status}.`;
  await env.DB.prepare(`
    INSERT INTO support_requests (id, project_id, user_id, email, type, message, status, body_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'domain_registration', ?, 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(id, project.id, user?.id || project.user_id || '', user?.email || '', message, JSON.stringify({ domain, agent })).run();
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
      active: ['registration_in_progress', 'submitted_to_registration_agent', 'queued_for_registrar_follow_up', 'registered', 'completed'].includes(agent.status),
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

function domainAgentAlreadyStarted(data, domainName) {
  const agent = data.domain_registration_agent || {};
  const status = String(agent.status || data.domain_registration_status || '').toLowerCase();
  const sameDomain = cleanDomain(agent.domain_name || data.domain_registration?.name || data.custom_domain || '') === cleanDomain(domainName);
  const activeStatuses = new Set([
    'registration_in_progress',
    'submitted_to_registration_agent',
    'registered',
    'completed'
  ]);

  return sameDomain && (agent.actual_purchase_attempted || agent.order_id) && activeStatuses.has(status);
}

export async function runDomainRegistrationWorkflow(env, { project, user = {}, body = {}, data: suppliedData = null, stripe: suppliedStripe = null, skipPaymentCheck = false } = {}) {
  if (!project?.id) throw new Error('Project is required.');
  await ensureCoreTables(env);
  await ensurePbiOpsTables(env);

  const data = suppliedData || parseData(project);
  const domainOption = String(body.domain_option || data.domain_option || project.domain_option || '').trim();
  if (domainOption !== 'register_new') {
    return {
      ok: true,
      skipped: true,
      status: 'not_required',
      message: 'Domain Registration Agent only runs when the project is set to register a new domain.'
    };
  }

  const domain = selectedDomain(body, data, project);
  if (!domain.name) throw new Error('No selected domain was found for this project.');

  if (domainAgentAlreadyStarted(data, domain.name)) {
    const agent = data.domain_registration_agent || {};
    return {
      ok: true,
      skipped: true,
      domain: data.domain_registration || domain,
      agent,
      actual_purchase_attempted: Boolean(agent.actual_purchase_attempted),
      registrar_connected: Boolean(agent.registrar_connected),
      message: agent.message || 'Domain registration has already been started for this project.'
    };
  }

  const automaticConfigured = registrarAutomationConfigured(env);
  let manualRegistrationOnly = domain.available === false || ['invalid', 'registered', 'taken'].includes(String(domain.status || '').toLowerCase());
  if (manualRegistrationOnly) {
    domain.available = null;
    domain.status = domain.status || 'registrar_follow_up';
    domain.requires_manual_review = true;
    domain.message = domain.message || 'This domain needs registrar follow-up before registration.';
  } else {
    const availability = await confirmDomainAvailable(domain.name);
    domain.availability_confirmation = availability;
    if (!availability.available && !automaticConfigured) {
      manualRegistrationOnly = true;
      domain.available = null;
      domain.status = 'registrar_follow_up';
      domain.requires_manual_review = true;
      domain.message = 'The final availability check could not confirm this domain, so it has been queued for registrar follow-up before registration.';
    } else {
      domain.available = true;
      domain.status = availability.available ? 'available' : 'automatic_final_check_pending';
      domain.requires_manual_review = false;
      domain.message = availability.available
        ? availability.message
        : 'Automatic registrar workflow will run the final provider check before purchase.';
    }
  }
  domain.requires_final_confirmation = !manualRegistrationOnly;

  let stripe = suppliedStripe || { active: isPaid(project), session_id: String(body.stripe_session_id || project.stripe_session_id || '') };
  if (!skipPaymentCheck && !stripe.active && stripe.session_id) {
    const verified = await verifyStripeCheckout(env, stripe.session_id, project.id);
    if (verified.error) throw new Error(verified.error);
    stripe = { ...stripe, ...verified, session_id: stripe.session_id };
  }

  const requiresPayment = String(env.PBI_REQUIRE_PAYMENT_TO_PUBLISH || 'true').toLowerCase() !== 'false';
  if (requiresPayment && !stripe.active) {
    return {
      ok: false,
      payment_required: true,
      status: 'waiting_for_payment',
      message: 'Payment must be active before the Domain Registration Agent can start.'
    };
  }

  const orderPayload = {
    order_id: crypto.randomUUID(),
    project_id: project.id,
    project_name: project.name,
    customer_email: user?.email || '',
    domain,
    domain_billing: domain.checkout_pricing || data.domain_billing || null,
    live_url: body.live_url || data.live_url || '',
    requested_at: new Date().toISOString()
  };

  if (!manualRegistrationOnly) {
    const registrarCheck = await finalCloudflareCheck(env, domain);
    domain.registrar_final_check = registrarCheck;
    if (registrarCheck.checked && registrarCheck.registrable) {
      domain.available = true;
      domain.status = 'available';
      domain.requires_manual_review = false;
      domain.cloudflare_registrable = true;
      domain.pricing = registrarCheck.pricing || domain.pricing;
      domain.message = registrarCheck.message;
    } else if (registrarCheck.checked && registrarCheck.unavailable) {
      manualRegistrationOnly = true;
      domain.available = null;
      domain.status = 'registrar_follow_up';
      domain.requires_manual_review = true;
      domain.message = 'The final registrar check says this domain is no longer available, so the registrar workflow has been stopped for follow-up.';
    } else if (registrarCheck.checked) {
      domain.cloudflare_registrable = false;
    }
  }

  const registration = manualRegistrationOnly
    ? { configured: false, ok: false, manual_only: true }
    : await submitAutomaticRegistration(env, orderPayload, domain);

  const registrationAccepted = !manualRegistrationOnly && registration.configured === true && registration.ok === true;
  const automationAttempted = !manualRegistrationOnly && registration.configured === true;
  const agent = {
    id: orderPayload.order_id,
    domain_name: domain.name,
    requested_at: orderPayload.requested_at,
    registrar_connected: automationAttempted,
    actual_purchase_attempted: automationAttempted,
    registration_started: registrationAccepted,
    status: manualRegistrationOnly ? 'queued_for_registrar_follow_up' : (registration.configured
      ? (registration.ok ? (registration.registrar === 'cloudflare' ? 'registration_in_progress' : 'submitted_to_registration_agent') : 'automation_failed_registrar_follow_up')
      : 'queued_for_registrar_follow_up'),
    order_id: registration.order_id || orderPayload.order_id,
    registrar: registration.registrar || '',
    message: manualRegistrationOnly
      ? 'This domain needs registrar follow-up before registration. It has been saved for follow-up.'
      : (registration.configured
      ? (registration.ok ? registration.message : `${registration.message}. A registrar follow-up task has been queued.`)
      : 'No automatic registrar is configured for this domain yet, so this has been saved for registrar follow-up.'),
    webhook_response: registration.response || null
  };

  const requestId = await queueSupportRequest(env, { project, user, domain, agent });
  agent.support_request_id = requestId;
  await createAdminNotification(env, {
    type: 'domain_registration',
    title: registration.ok ? 'Domain registration automation started' : 'Domain registration needs action',
    message: `${domain.name} for ${project.name || project.id}: ${agent.message}`,
    priority: registration.ok ? 'normal' : 'high',
    customer_email: user?.email || '',
    project_id: project.id,
    request_id: requestId,
    body: { domain, agent }
  });
  await updateProject(env, project, data, domain, agent, stripe);

  return {
    ok: true,
    domain,
    agent,
    actual_purchase_attempted: agent.actual_purchase_attempted,
    registrar_connected: agent.registrar_connected,
    registration_started: agent.registration_started,
    message: agent.message
  };
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

  try {
    const result = await runDomainRegistrationWorkflow(env, {
      project,
      user: auth.user,
      body
    });
    return json(result, result.payment_required ? 402 : 200);
  } catch (err) {
    return error(err?.message || 'Domain Registration Agent could not start.', 400);
  }
}
