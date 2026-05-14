import { json, error } from '../../_lib/json.js';
import { requireUser } from '../../_lib/auth.js';
import { cleanPlan, validateProjectForPublish } from '../../_lib/package-rules.js';
import {
  cleanSiteSlug,
  ensureHostingTables,
  getHostingConfig,
  isPaymentActive,
  parseProjectData,
  publishValidatedProject,
  recordSiteEvent,
  sitePublicUrl,
  uniqueSiteSlug,
  updateProjectPublication,
  upsertPublishedSite
} from '../../_lib/hosting.js';

export { json, error, ensureHostingTables };

export async function requireHostingUser(env, request) {
  await ensureHostingTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return { response: auth.response };
  return { user: auth.user };
}

export async function loadOwnedProject(env, projectId, userId) {
  if (!projectId) return null;
  return await env.DB.prepare(`
    SELECT id, user_id, name, status, plan, billing_status, published, public_slug,
           domain_option, custom_domain, data_json, stripe_customer_id, stripe_subscription_id
    FROM projects
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).bind(projectId, userId).first();
}

function originFromRequest(request) {
  try { return new URL(request.url).origin; } catch { return ''; }
}

function checkoutUrl(request, projectId, plan) {
  const origin = originFromRequest(request);
  const route = `/payment/?project=${encodeURIComponent(projectId)}&plan=${encodeURIComponent(plan)}&hosting=1`;
  return origin ? `${origin}${route}` : route;
}

function projectNameForSlug(project, data) {
  return data.business_name || data.site_name || data.name || project.name || 'website';
}

export async function publishProjectToHosting({ request, env, user, project, body = {}, forcePayment = false }) {
  const cfg = getHostingConfig(env);
  const rawData = parseProjectData(project);
  const requestedPlan = body.plan || rawData.plan || rawData.package || project.plan || cfg.defaultPlan;
  const plan = cleanPlan(requestedPlan);
  const validation = validateProjectForPublish(rawData, plan);

  await env.DB.prepare(`
    UPDATE projects
    SET plan = ?, data_json = ?, readiness_score = ?, package_warnings = ?, last_validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(plan, JSON.stringify(validation.data), validation.score || 0, JSON.stringify(validation.warnings || []), project.id, user.id).run();

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

  const billingStatus = String(project.billing_status || '').toLowerCase();
  const paymentActive = isPaymentActive(billingStatus);
  const slug = body.site_slug
    ? cleanSiteSlug(body.site_slug)
    : (project.public_slug || await uniqueSiteSlug(env, projectNameForSlug(project, validation.data), project.id));

  if (cfg.requirePayment && !paymentActive && !forcePayment) {
    const site = await upsertPublishedSite(env, {
      project,
      data: validation.data,
      plan,
      siteSlug: slug,
      status: 'payment_required',
      paymentStatus: billingStatus || 'unpaid',
      readinessScore: validation.score || 0
    });
    await updateProjectPublication(env, {
      projectId: project.id,
      userId: user.id,
      slug: site.site_slug,
      published: false,
      status: 'payment_required',
      data: validation.data,
      billingStatus: billingStatus || 'unpaid'
    });
    await recordSiteEvent(env, {
      site_id: site.id,
      project_id: project.id,
      user_id: user.id,
      event_type: 'payment_required',
      message: 'Publish is ready, but payment is required before the live route opens.'
    });
    return json({
      ok: false,
      payment_required: true,
      message: 'Payment is required before this website can be published.',
      site_slug: site.site_slug,
      readiness_score: validation.score,
      checkout_url: checkoutUrl(request, project.id, plan)
    }, 402);
  }

  const published = await publishValidatedProject(env, {
    project: {
      ...project,
      plan,
      billing_status: cfg.requirePayment ? (billingStatus || 'active') : 'not_required'
    },
    data: validation.data,
    siteSlug: slug,
    plan,
    paymentStatus: cfg.requirePayment ? (billingStatus || 'active') : 'not_required',
    readinessScore: validation.score || 0
  });

  const liveUrl = published.site.custom_domain && published.site.primary_url
    ? published.site.primary_url
    : sitePublicUrl(env, published.site.site_slug, '', originFromRequest(request));
  return json({
    ok: true,
    published: true,
    site_id: published.site.id,
    site_slug: published.site.site_slug,
    live_url: liveUrl,
    site: {
      id: published.site.id,
      site_slug: published.site.site_slug,
      status: published.site.status,
      primary_url: liveUrl
    },
    readiness_score: validation.score,
    warnings: validation.warnings || []
  });
}

export async function siteForOwnedProject(env, projectId, userId) {
  return await env.DB.prepare(`
    SELECT * FROM published_sites
    WHERE project_id = ? AND user_id = ?
    LIMIT 1
  `).bind(projectId, userId).first();
}
