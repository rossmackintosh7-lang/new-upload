import { ensureCoreTables } from '../../_lib/auth.js';
import { validateProjectForPublish, cleanPlan } from '../../_lib/package-rules.js';
import { createAdminNotification, ensurePbiOpsTables, uniqueSlug } from '../admin/_shared.js';
import { runDomainRegistrationWorkflow } from '../domain/registration-agent.js';
import { takeProjectDown, restoreProjectAfterBilling } from './_cancellation.js';

function parseData(project) {
  try {
    return typeof project?.data_json === 'string' ? JSON.parse(project.data_json || '{}') : (project?.data_json || {});
  } catch {
    return {};
  }
}

function paidCheckoutSession(session = {}) {
  return session.payment_status === 'paid' || session.status === 'complete';
}

function objectId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value.id || '');
}

function checkoutKind(session = {}) {
  const raw = session.metadata?.checkout_kind || session.metadata?.addon_type || '';
  const key = String(raw || '').trim().toLowerCase().replace(/-/g, '_');
  return ['assisted_setup', 'custom_build_deposit'].includes(key) ? key : '';
}

async function ensurePublishColumns(env) {
  const alters = [
    `ALTER TABLE projects ADD COLUMN readiness_score INTEGER DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN package_warnings TEXT`,
    `ALTER TABLE projects ADD COLUMN last_validated_at TEXT`
  ];

  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch (_) {}
  }
}

async function getProjectForSession(env, session) {
  const metadata = session.metadata || {};
  const projectId = String(metadata.project_id || session.client_reference_id || '').trim();
  const userId = String(metadata.user_id || '').trim();
  if (!projectId) return null;

  if (userId) {
    const project = await env.DB.prepare(`
      SELECT id, user_id, name, plan, billing_status, public_slug, domain_option, custom_domain, data_json, stripe_session_id, stripe_customer_id, stripe_subscription_id
      FROM projects
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `).bind(projectId, userId).first();
    if (project) return project;
  }

  return env.DB.prepare(`
    SELECT id, user_id, name, plan, billing_status, public_slug, domain_option, custom_domain, data_json, stripe_session_id, stripe_customer_id, stripe_subscription_id
    FROM projects
    WHERE id = ?
    LIMIT 1
  `).bind(projectId).first();
}

async function getProjectUser(env, userId) {
  if (!userId) return {};
  return await env.DB.prepare(`SELECT id, email FROM users WHERE id = ? LIMIT 1`).bind(userId).first() || { id: userId, email: '' };
}

async function ensureAdminRequest(env, payload = {}) {
  await ensurePbiOpsTables(env);
  const id = payload.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO admin_requests (
      id, request_type, status, priority, customer_name, customer_email, customer_phone,
      business_name, business_type, project_id, package_name, payment_status, brief,
      requested_pages, uploaded_assets_json, internal_notes, customer_message, body_json,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    String(payload.request_type || 'assisted_build'),
    String(payload.status || 'new'),
    String(payload.priority || 'high'),
    String(payload.customer_name || ''),
    String(payload.customer_email || ''),
    String(payload.customer_phone || ''),
    String(payload.business_name || ''),
    String(payload.business_type || ''),
    String(payload.project_id || ''),
    String(payload.package_name || ''),
    String(payload.payment_status || 'paid'),
    String(payload.brief || ''),
    String(payload.requested_pages || ''),
    JSON.stringify(payload.uploaded_assets || []),
    String(payload.internal_notes || ''),
    String(payload.customer_message || ''),
    JSON.stringify(payload.body || {})
  ).run();

  await env.DB.prepare(`
    UPDATE admin_requests
    SET payment_status = ?,
        priority = ?,
        project_id = COALESCE(NULLIF(project_id, ''), ?),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    String(payload.payment_status || 'paid'),
    String(payload.priority || 'high'),
    String(payload.project_id || ''),
    id
  ).run();

  return id;
}

function selectedDomainName(project, data) {
  if (String(data.domain_option || project.domain_option || '') !== 'register_new') return '';
  return String(data.domain_registration?.name || data.custom_domain || project.custom_domain || '').trim().toLowerCase();
}

async function provisionPaidAddOnCheckoutSession(env, session, kind) {
  const project = await getProjectForSession(env, session);
  if (!project) {
    await createAdminNotification(env, {
      type: 'stripe_webhook',
      title: 'Paid add-on has no matching project',
      message: `${kind.replaceAll('_', ' ')} checkout ${session.id || 'unknown'} completed, but PBI could not find the project.`,
      priority: 'high',
      body: { session_id: session.id || '', metadata: session.metadata || {} }
    });
    return { ok: false, project_missing: true, checkout_kind: kind, message: 'No project matched this paid add-on Checkout Session.' };
  }

  const user = await getProjectUser(env, project.user_id);
  const existingData = parseData(project);
  const now = new Date().toISOString();
  const stripeCustomerId = objectId(session.customer);
  const stripeSessionId = String(session.id || '');
  const amountTotal = Number(session.amount_total || 0);
  const currency = String(session.currency || 'gbp').toLowerCase();
  const isAssistedSetup = kind === 'assisted_setup';
  const requestType = isAssistedSetup ? 'assisted_build' : 'custom_build';
  const paidFlag = isAssistedSetup ? 'assisted_setup_paid' : 'custom_build_deposit_paid';
  const paidAt = isAssistedSetup ? 'assisted_setup_paid_at' : 'custom_build_deposit_paid_at';
  const sessionKey = isAssistedSetup ? 'assisted_setup_checkout_session_id' : 'custom_build_deposit_checkout_session_id';
  const statusKey = isAssistedSetup ? 'assisted_setup_status' : 'custom_build_status';
  const label = isAssistedSetup ? 'Assisted Setup' : 'Custom Build Deposit';
  const projectName = project.name || existingData.business_name || existingData.project_name || project.id;

  const requestId = `${kind}_${stripeSessionId || crypto.randomUUID()}`;
  const existingRequest = await env.DB.prepare(`
    SELECT id
    FROM admin_requests
    WHERE id = ?
    LIMIT 1
  `).bind(requestId).first();
  const requestAlreadyExists = Boolean(existingRequest?.id);
  const updatedData = {
    ...existingData,
    [paidFlag]: true,
    [paidAt]: existingData[paidAt] || now,
    [sessionKey]: stripeSessionId,
    [`${kind}_amount_minor`]: amountTotal,
    [`${kind}_currency`]: currency,
    [`${kind}_payment_status`]: 'paid',
    [statusKey]: isAssistedSetup ? 'paid_ready_for_admin' : 'deposit_paid_ready_for_scope',
    assisted_setup_admin_url: isAssistedSetup ? `/admin/projects/?project_id=${encodeURIComponent(project.id)}` : existingData.assisted_setup_admin_url,
    assisted_setup_builder_url: isAssistedSetup ? `/canvas-builder/?project=${encodeURIComponent(project.id)}&admin=1` : existingData.assisted_setup_builder_url
  };

  await env.DB.prepare(`
    UPDATE projects
    SET data_json = ?,
        stripe_customer_id = COALESCE(NULLIF(?, ''), stripe_customer_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(JSON.stringify(updatedData), stripeCustomerId, project.id, project.user_id).run();

  await ensureAdminRequest(env, {
    id: requestId,
    request_type: requestType,
    status: 'new',
    priority: 'high',
    customer_email: user.email || '',
    business_name: projectName,
    project_id: project.id,
    package_name: label,
    payment_status: 'paid',
    brief: isAssistedSetup
      ? 'Customer has paid for Assisted Setup. Open the project and make the requested setup changes for them.'
      : 'Customer has paid a custom build deposit. Open the project and begin scoping the build.',
    internal_notes: `Stripe Checkout Session: ${stripeSessionId}`,
    body: {
      checkout_kind: kind,
      session_id: stripeSessionId,
      amount_total: amountTotal,
      currency,
      customer: stripeCustomerId,
      project_id: project.id,
      edit_url: `/canvas-builder/?project=${encodeURIComponent(project.id)}&admin=1`
    }
  });

  if (!requestAlreadyExists) {
    await createAdminNotification(env, {
      type: isAssistedSetup ? 'assisted_setup_paid' : 'custom_build_deposit_paid',
      title: `${label} paid`,
      message: `${projectName} is ready for admin work. Open the project from the admin panel and edit it directly.`,
      priority: 'high',
      customer_email: user.email || '',
      project_id: project.id,
      request_id: requestId,
      body: {
        checkout_kind: kind,
        session_id: stripeSessionId,
        amount_total: amountTotal,
        currency,
        admin_project_url: `/admin/projects/?project_id=${encodeURIComponent(project.id)}`,
        builder_url: `/canvas-builder/?project=${encodeURIComponent(project.id)}&admin=1`
      }
    });
  }

  return {
    ok: true,
    checkout_kind: kind,
    project_id: project.id,
    request_id: requestId,
    paid: true,
    admin_project_url: `/admin/projects/?project_id=${encodeURIComponent(project.id)}`,
    builder_url: `/canvas-builder/?project=${encodeURIComponent(project.id)}&admin=1`
  };
}

export async function provisionPaidCheckoutSession(env, session = {}) {
  await ensureCoreTables(env);
  await ensurePbiOpsTables(env);
  await ensurePublishColumns(env);

  if (!paidCheckoutSession(session)) {
    return {
      ok: true,
      skipped: true,
      status: 'checkout_not_paid',
      message: 'Checkout Session is not paid or complete yet.'
    };
  }

  const kind = checkoutKind(session);
  if (kind) return provisionPaidAddOnCheckoutSession(env, session, kind);

  const project = await getProjectForSession(env, session);
  if (!project) {
    await createAdminNotification(env, {
      type: 'stripe_webhook',
      title: 'Stripe payment received without project match',
      message: `Checkout Session ${session.id || 'unknown'} completed, but PBI could not find the project.`,
      priority: 'high',
      body: { session_id: session.id || '', metadata: session.metadata || {} }
    });
    return { ok: false, project_missing: true, message: 'No project matched this paid Checkout Session.' };
  }

  const existingData = parseData(project);
  const plan = cleanPlan(session.metadata?.plan || project.plan || existingData.plan || existingData.package || 'starter');
  const validation = validateProjectForPublish(existingData, plan);
  const stripeCustomerId = objectId(session.customer);
  const stripeSubscriptionId = objectId(session.subscription);
  const stripeSessionId = String(session.id || project.stripe_session_id || '');

  const dataWithBilling = {
    ...validation.data,
    stripe_session_id: stripeSessionId,
    stripe_customer_id: stripeCustomerId || project.stripe_customer_id || '',
    stripe_subscription_id: stripeSubscriptionId || project.stripe_subscription_id || '',
    website_subscription_status: 'active',
    billing_activated_at: existingData.billing_activated_at || new Date().toISOString()
  };

  await env.DB.prepare(`
    UPDATE projects
    SET billing_status = 'active',
        stripe_session_id = COALESCE(NULLIF(?, ''), stripe_session_id),
        stripe_customer_id = COALESCE(NULLIF(?, ''), stripe_customer_id),
        stripe_subscription_id = COALESCE(NULLIF(?, ''), stripe_subscription_id),
        plan = ?,
        data_json = ?,
        readiness_score = ?,
        package_warnings = ?,
        last_validated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(
    stripeSessionId,
    stripeCustomerId,
    stripeSubscriptionId,
    plan,
    JSON.stringify(dataWithBilling),
    validation.score || 0,
    JSON.stringify(validation.warnings || []),
    project.id,
    project.user_id
  ).run();

  if (!validation.ok) {
    await createAdminNotification(env, {
      type: 'publish_blocked_after_payment',
      title: 'Payment received but publish checklist is blocked',
      message: `${project.name || project.id} has been paid for but needs publish checklist fixes before going live.`,
      priority: 'high',
      customer_email: '',
      project_id: project.id,
      body: { issues: validation.issues, warnings: validation.warnings, session_id: stripeSessionId }
    });
    return {
      ok: false,
      publish_blocked: true,
      project_id: project.id,
      issues: validation.issues,
      warnings: validation.warnings,
      message: 'Payment is active, but publish checklist issues blocked automatic publishing.'
    };
  }

  const slug = project.public_slug || await uniqueSlug(env, project.name || 'website', project.id);
  const liveUrl = `/site/canvas/${encodeURIComponent(slug)}/`;
  const publishedData = {
    ...dataWithBilling,
    live_url: liveUrl,
    published_at: new Date().toISOString()
  };

  await env.DB.prepare(`
    UPDATE projects
    SET published = 1,
        public_slug = ?,
        status = 'published',
        published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
        data_json = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(slug, JSON.stringify(publishedData), project.id, project.user_id).run();

  let domainResult = null;
  const domainName = selectedDomainName(project, publishedData);
  if (domainName) {
    const user = await getProjectUser(env, project.user_id);
    try {
      domainResult = await runDomainRegistrationWorkflow(env, {
        project: {
          ...project,
          billing_status: 'active',
          stripe_session_id: stripeSessionId,
          stripe_customer_id: stripeCustomerId || project.stripe_customer_id || '',
          stripe_subscription_id: stripeSubscriptionId || project.stripe_subscription_id || '',
          data_json: JSON.stringify(publishedData)
        },
        user,
        data: publishedData,
        stripe: {
          active: true,
          session_id: stripeSessionId,
          customer: stripeCustomerId,
          subscription: stripeSubscriptionId
        },
        skipPaymentCheck: true,
        body: {
          project_id: project.id,
          domain_option: 'register_new',
          domain_name: domainName,
          live_url: liveUrl
        }
      });
    } catch (err) {
      domainResult = {
        ok: false,
        error: err?.message || 'Domain registration workflow failed.'
      };
      await createAdminNotification(env, {
        type: 'domain_registration',
        title: 'Domain registration automation failed after payment',
        message: `${domainName} for ${project.name || project.id}: ${domainResult.error}`,
        priority: 'high',
        customer_email: user.email || '',
        project_id: project.id,
        body: { domain_name: domainName, session_id: stripeSessionId, error: domainResult.error }
      });
    }
  }

  await createAdminNotification(env, {
    type: 'site_published',
    title: 'Website published after payment',
    message: `${project.name || project.id} is live at ${liveUrl}${domainResult?.agent?.domain_name ? ` and domain automation has started for ${domainResult.agent.domain_name}` : ''}.`,
    priority: 'normal',
    project_id: project.id,
    body: { session_id: stripeSessionId, live_url: liveUrl, domain_result: domainResult }
  });

  return {
    ok: true,
    project_id: project.id,
    published: true,
    live_url: liveUrl,
    domain_result: domainResult,
    warnings: validation.warnings || []
  };
}

export async function syncStripeBillingStatus(env, { subscription = '', customer = '', billingStatus = 'active', published = null, eventType = '' } = {}) {
  await ensureCoreTables(env);
  await ensurePbiOpsTables(env);
  const sub = objectId(subscription);
  const cust = objectId(customer);
  if (!sub && !cust) return { ok: true, skipped: true, message: 'No Stripe subscription or customer id supplied.' };

  const where = sub ? 'stripe_subscription_id = ?' : 'stripe_customer_id = ?';
  const value = sub || cust;
  const project = await env.DB.prepare(`
    SELECT id, user_id, name, status, published, public_slug, billing_status, data_json
    FROM projects
    WHERE ${where}
    LIMIT 1
  `).bind(value).first();

  if (!project) return { ok: true, skipped: true, message: 'No matching project for billing sync.' };

  if (billingStatus === 'cancelled' || published === false) {
    await takeProjectDown(env, project, eventType || 'stripe');
    await createAdminNotification(env, {
      type: 'stripe_billing',
      title: 'Website taken down after subscription cancellation',
      message: `${project.name || project.id} has been unpublished because Stripe reported the subscription as cancelled${eventType ? ` from ${eventType}` : ''}.`,
      priority: 'high',
      project_id: project.id,
      body: { subscription: sub, customer: cust, billing_status: 'cancelled', event_type: eventType, public_site_status: 'suspended' }
    });
    return { ok: true, project_id: project.id, billing_status: 'cancelled', published: false, suspended: true };
  }

  const projectData = parseData(project);
  const shouldRestore = ['active', 'trialing'].includes(String(billingStatus || '').toLowerCase()) && (
    projectData.service_stopped === true ||
    String(projectData.public_site_status || '').toLowerCase() === 'suspended' ||
    ['cancelled', 'past_due', 'unpaid', 'failed', 'incomplete'].includes(String(project.billing_status || '').toLowerCase())
  );

  if (shouldRestore) {
    const restored = await restoreProjectAfterBilling(env, project, eventType || 'stripe');
    await createAdminNotification(env, {
      type: 'stripe_billing',
      title: 'Website restored after billing recovery',
      message: `${project.name || project.id} has been restored because Stripe reported the subscription as ${billingStatus}${eventType ? ` from ${eventType}` : ''}.`,
      priority: 'normal',
      project_id: project.id,
      body: {
        subscription: sub,
        customer: cust,
        billing_status: billingStatus,
        event_type: eventType,
        republished: Boolean(restored?.republished),
        public_slug: restored?.public_slug || project.public_slug || ''
      }
    });
    return {
      ok: true,
      project_id: project.id,
      billing_status: 'active',
      restored: true,
      published: Boolean(restored?.republished)
    };
  }

  const publishSql = published === null ? '' : ', published = ?, status = ?';
  const bindValues = published === null
    ? [billingStatus, project.id]
    : [billingStatus, published ? 1 : 0, published ? 'published' : billingStatus, project.id];

  await env.DB.prepare(`
    UPDATE projects
    SET billing_status = ?${publishSql}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(...bindValues).run();

  await createAdminNotification(env, {
    type: 'stripe_billing',
    title: 'Stripe billing status updated',
    message: `${project.name || project.id} is now ${billingStatus}${eventType ? ` from ${eventType}` : ''}.`,
    priority: billingStatus === 'active' ? 'normal' : 'high',
    project_id: project.id,
    body: { subscription: sub, customer: cust, billing_status: billingStatus, event_type: eventType }
  });

  return { ok: true, project_id: project.id, billing_status: billingStatus };
}
