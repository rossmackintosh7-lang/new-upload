import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { validateProjectForPublish, cleanPlan } from '../../_lib/package-rules.js';

function slugify(value) {
  return String(value || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70) || 'site';
}

async function verifyStripeCheckout(env, sessionId, projectId) {
  if (!env.STRIPE_SECRET_KEY || !sessionId) return { active: false };

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });

  const session = await response.json().catch(() => ({}));
  if (!response.ok) return { active: false, error: session.error?.message || 'Could not verify Stripe checkout.' };

  const metadataProject = session.metadata?.project_id || session.client_reference_id || '';
  if (metadataProject && metadataProject !== projectId) {
    return { active: false, error: 'Stripe session does not match this project.' };
  }

  const paid = session.payment_status === 'paid' || session.status === 'complete';
  return {
    active: Boolean(paid),
    customer: session.customer || '',
    subscription: session.subscription || '',
    plan: session.metadata?.plan || ''
  };
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || body.project || '').trim();
  const selectedPlan = cleanPlan(body.plan || '');
  const stripeSessionId = String(body.stripe_session_id || '').trim();

  if (!projectId) return error('Project id is required.');

  let project = await env.DB.prepare(`
    SELECT id, user_id, name, plan, billing_status, public_slug, stripe_session_id, data_json
    FROM projects
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).bind(projectId, auth.user.id).first();

  if (!project) return error('Project not found.', 404);

  const plan = cleanPlan(selectedPlan || project.plan || 'starter');
  const rawData = JSON.parse(project.data_json || '{}');
  const validation = validateProjectForPublish(rawData, plan);

  if (!validation.ok) {
    return json({
      ok: false,
      publish_blocked: true,
      message: 'Fix the pre-publish checklist before publishing.',
      issues: validation.issues,
      warnings: validation.warnings,
      readiness_score: validation.score
    }, 400);
  }

  await env.DB.prepare(`
    UPDATE projects
    SET data_json = ?, plan = ?, readiness_score = ?, package_warnings = ?, last_validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(JSON.stringify(validation.data), plan, validation.score || 0, JSON.stringify(validation.warnings || []), projectId, auth.user.id).run();

  const requiresPayment = String(env.PBI_REQUIRE_PAYMENT_TO_PUBLISH || 'true').toLowerCase() !== 'false';
  let billing = String(project.billing_status || '').toLowerCase();
  let paid = ['active', 'paid', 'trialing'].includes(billing);

  if (requiresPayment && !paid && stripeSessionId) {
    const verified = await verifyStripeCheckout(env, stripeSessionId, projectId);
    if (verified.active) {
      paid = true;
      billing = 'active';
      await env.DB.prepare(`
        UPDATE projects
        SET billing_status = 'active',
            stripe_session_id = ?,
            stripe_customer_id = COALESCE(NULLIF(?, ''), stripe_customer_id),
            stripe_subscription_id = COALESCE(NULLIF(?, ''), stripe_subscription_id),
            plan = COALESCE(NULLIF(?, ''), plan),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).bind(stripeSessionId, verified.customer || '', verified.subscription || '', verified.plan || plan, projectId, auth.user.id).run();
    } else if (verified.error) {
      return error(verified.error, 400);
    }
  }

  if (requiresPayment && !paid) {
    return json({
      ok: true,
      payment_required: true,
      message: 'Payment is required before this website can be published.',
      checkout_url: `/payment/?project=${encodeURIComponent(projectId)}&plan=${encodeURIComponent(plan)}`
    });
  }

  const slug = project.public_slug || `${slugify(project.name)}-${project.id.slice(0, 8)}`;
  await env.DB.prepare(`
    UPDATE projects
    SET published = 1, public_slug = ?, status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(slug, projectId, auth.user.id).run();

  return json({ ok: true, published: true, live_url: `/site/canvas/${encodeURIComponent(slug)}/`, warnings: validation.warnings || [] });
}
