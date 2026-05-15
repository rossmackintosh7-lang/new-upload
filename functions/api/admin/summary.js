import { json, requireAdmin, ensurePbiOpsTables } from './_shared.js';

async function all(env, sql, ...binds) {
  try { return (await env.DB.prepare(sql).bind(...binds).all()).results || []; } catch { return []; }
}
async function first(env, sql, ...binds) {
  try { return await env.DB.prepare(sql).bind(...binds).first(); } catch { return null; }
}
function countFrom(rows, status) {
  return Number((rows || []).find((row) => row.status === status)?.count || 0);
}
function numberValue(row) {
  return Number(row?.count || 0);
}
function buildPriorities({ newNotifications, newRequests, paidAssistedSetups, pastDueBilling, readyDrafts, suspendedUsers }) {
  const items = [
    {
      label: 'Paid Assisted Setup',
      count: paidAssistedSetups,
      detail: paidAssistedSetups ? 'Customers have paid for hands-on setup. Open the project and make the changes for them.' : 'No paid Assisted Setup work waiting.',
      href: '/admin/assisted-builds/',
      priority: paidAssistedSetups ? 'high' : 'calm'
    },
    {
      label: 'New customer requests',
      count: newRequests,
      detail: newRequests ? 'Triage and assign these before they go cold.' : 'No new build/support requests.',
      href: '/admin/requests/',
      priority: newRequests ? 'high' : 'calm'
    },
    {
      label: 'Unread notifications',
      count: newNotifications,
      detail: newNotifications ? 'Review alerts, customer messages and project updates.' : 'No unread admin notifications.',
      href: '/admin/notifications/',
      priority: newNotifications ? 'high' : 'calm'
    },
    {
      label: 'Payment issues',
      count: pastDueBilling,
      detail: pastDueBilling ? 'Check Stripe before publishing or deleting affected projects.' : 'No obvious failed or past-due billing.',
      href: '/account/billing/',
      priority: pastDueBilling ? 'high' : 'calm'
    },
    {
      label: 'Publish-ready drafts',
      count: readyDrafts,
      detail: readyDrafts ? 'These are paid or payment-not-required drafts waiting for final launch checks.' : 'No paid drafts waiting to go live.',
      href: '/admin/projects/',
      priority: readyDrafts ? 'medium' : 'calm'
    },
    {
      label: 'Suspended users',
      count: suspendedUsers,
      detail: suspendedUsers ? 'Review account notes and decide whether anything needs follow-up.' : 'No suspended accounts.',
      href: '/admin/users/',
      priority: suspendedUsers ? 'medium' : 'calm'
    }
  ];
  return items.sort((a, b) => {
    const rank = { high: 0, medium: 1, calm: 2 };
    return rank[a.priority] - rank[b.priority] || b.count - a.count;
  });
}
function buildGooseBrief({ newNotifications, newRequests, paidAssistedSetups, pastDueBilling, readyDrafts, latestProjects }) {
  const lines = [];
  if (paidAssistedSetups) lines.push(`${paidAssistedSetups} paid Assisted Setup project${paidAssistedSetups === 1 ? ' is' : 's are'} ready for admin edits.`);
  if (newRequests) lines.push(`${newRequests} new request${newRequests === 1 ? '' : 's'} need a first look.`);
  if (newNotifications) lines.push(`${newNotifications} unread notification${newNotifications === 1 ? '' : 's'} are waiting in the inbox.`);
  if (pastDueBilling) lines.push(`${pastDueBilling} project${pastDueBilling === 1 ? ' has' : 's have'} a payment issue to check before any launch work.`);
  if (readyDrafts) lines.push(`${readyDrafts} paid or approved draft${readyDrafts === 1 ? '' : 's'} look close to publish checks.`);
  const latest = (latestProjects || [])[0];
  if (latest) lines.push(`Most recently touched project: ${latest.name || latest.business_name || latest.id}.`);
  if (!lines.length) lines.push('No obvious blockers right now. Good moment to review launch quality, SEO and follow-ups.');
  return {
    title: lines.some((line) => /need|waiting|issue|check/.test(line)) ? 'Goose sees work to clear' : 'Goose sees a calm desk',
    mood: pastDueBilling || newRequests || newNotifications ? 'alert' : readyDrafts ? 'excited' : 'profile',
    lines
  };
}
async function ensureUserControls(env) {
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_user_controls (
      user_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'active',
      notes TEXT,
      suspended_at TEXT,
      suspended_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();
  } catch (_) {}
}

export async function onRequestGet({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensurePbiOpsTables(env);
  await ensureUserControls(env);

  const notifications = await all(env, `SELECT status, COUNT(*) count FROM admin_notifications GROUP BY status`);
  const requests = await all(env, `SELECT status, COUNT(*) count FROM admin_requests GROUP BY status`);
  const latest_notifications = await all(env, `SELECT * FROM admin_notifications ORDER BY datetime(created_at) DESC LIMIT 12`);
  const latest_requests = await all(env, `SELECT * FROM admin_requests ORDER BY datetime(created_at) DESC LIMIT 12`);
  const latest_users = await all(env, `
    SELECT users.id, users.email, COALESCE(admin_user_controls.status, 'active') AS status,
           (SELECT COUNT(*) FROM projects WHERE projects.user_id = users.id) AS project_count,
           (SELECT COUNT(*) FROM sessions WHERE sessions.user_id = users.id) AS session_count,
           users.created_at
    FROM users
    LEFT JOIN admin_user_controls ON admin_user_controls.user_id = users.id
    ORDER BY datetime(COALESCE(users.created_at, users.updated_at, '1970-01-01')) DESC
    LIMIT 8
  `);
  const latest_projects = await all(env, `
    SELECT projects.id, projects.name, projects.status, projects.plan, projects.billing_status, projects.published, projects.created_at, projects.updated_at, users.email AS user_email
    FROM projects
    LEFT JOIN users ON users.id = projects.user_id
    ORDER BY datetime(COALESCE(projects.updated_at, projects.created_at, '1970-01-01')) DESC
    LIMIT 8
  `);

  const totalUsers = await first(env, `SELECT COUNT(*) count FROM users`);
  const totalProjects = await first(env, `SELECT COUNT(*) count FROM projects`);
  const activeBilling = await first(env, `SELECT COUNT(*) count FROM projects WHERE billing_status IN ('active','trialing','not_required')`);
  const publishedProjects = await first(env, `SELECT COUNT(*) count FROM projects WHERE published = 1`);
  const suspendedUsers = await first(env, `SELECT COUNT(*) count FROM admin_user_controls WHERE status = 'suspended'`);
  const suspendedSites = await first(env, `SELECT COUNT(*) count FROM projects WHERE lower(COALESCE(status, '')) = 'cancelled' OR lower(COALESCE(billing_status, '')) = 'cancelled'`);
  const pastDueBilling = await first(env, `SELECT COUNT(*) count FROM projects WHERE lower(COALESCE(billing_status, '')) IN ('past_due','unpaid','failed','incomplete')`);
  const paidAssistedSetups = await first(env, `SELECT COUNT(*) count FROM admin_requests WHERE request_type = 'assisted_build' AND payment_status = 'paid' AND lower(COALESCE(status, 'new')) NOT IN ('complete','cancelled')`);
  const readyDrafts = await first(env, `SELECT COUNT(*) count FROM projects WHERE COALESCE(published, 0) != 1 AND lower(COALESCE(billing_status, '')) IN ('active','trialing','not_required','paid')`);
  const domainQueue = await first(env, `SELECT COUNT(*) count FROM projects WHERE lower(COALESCE(domain_option, '')) = 'register_new'`);
  const domainFollowups = await first(env, `SELECT COUNT(*) count FROM projects WHERE lower(COALESCE(domain_option, '')) = 'register_new' AND (COALESCE(data_json, '') LIKE '%queued_for_registrar_follow_up%' OR COALESCE(data_json, '') LIKE '%automation_failed_registrar_follow_up%')`);
  const recentCoupons = await first(env, `SELECT COUNT(*) count FROM admin_coupons`);
  const webhookFailures = await first(env, `SELECT COUNT(*) count FROM stripe_webhook_events WHERE status = 'failed'`);
  const billing_breakdown = await all(env, `SELECT COALESCE(NULLIF(billing_status, ''), 'unknown') AS status, COUNT(*) count FROM projects GROUP BY COALESCE(NULLIF(billing_status, ''), 'unknown') ORDER BY count DESC`);
  const launch_queue = await all(env, `
    SELECT projects.id, projects.name, projects.status, projects.plan, projects.billing_status, projects.published, projects.created_at, projects.updated_at, users.email AS user_email
    FROM projects
    LEFT JOIN users ON users.id = projects.user_id
    WHERE COALESCE(projects.published, 0) != 1
    ORDER BY
      CASE WHEN lower(COALESCE(projects.billing_status, '')) IN ('active','trialing','not_required','paid') THEN 0 ELSE 1 END,
      datetime(COALESCE(projects.updated_at, projects.created_at, '1970-01-01')) DESC
    LIMIT 8
  `);

  const newNotifications = countFrom(notifications, 'new');
  const newRequests = countFrom(requests, 'new');
  const priorityCounts = {
    newNotifications,
    newRequests,
    paidAssistedSetups: numberValue(paidAssistedSetups),
    pastDueBilling: numberValue(pastDueBilling),
    readyDrafts: numberValue(readyDrafts),
    suspendedUsers: numberValue(suspendedUsers)
  };

  return json({
    ok: true,
    notifications,
    requests,
    latest_notifications,
    latest_requests,
    latest_users,
    latest_projects,
    priority_items: buildPriorities(priorityCounts),
    goose_brief: buildGooseBrief({ ...priorityCounts, latestProjects: latest_projects }),
    launch_queue,
    billing_breakdown,
    stats: {
      total_users: totalUsers?.count || 0,
      total_projects: totalProjects?.count || 0,
      active_billing: activeBilling?.count || 0,
      published_projects: publishedProjects?.count || 0,
      suspended_users: suspendedUsers?.count || 0,
      suspended_sites: suspendedSites?.count || 0,
      past_due_billing: priorityCounts.pastDueBilling,
      paid_assisted_setups: priorityCounts.paidAssistedSetups,
      ready_drafts: priorityCounts.readyDrafts,
      domain_queue: domainQueue?.count || 0,
      domain_followups: domainFollowups?.count || 0,
      stripe_webhook_failures: webhookFailures?.count || 0,
      coupon_count: recentCoupons?.count || 0,
      stripe_coupons_enabled: Boolean(env.STRIPE_SECRET_KEY),
      domain_automation_enabled: Boolean(
        String(env.DOMAIN_REGISTRATION_AGENT_URL || env.DOMAIN_REGISTRATION_WEBHOOK_URL || '').trim() ||
        (
          String(env.DOMAIN_AUTO_REGISTER || '').toLowerCase() === 'true' &&
          (env.CLOUDFLARE_REGISTRAR_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID) &&
          (env.CLOUDFLARE_REGISTRAR_TOKEN || env.CLOUDFLARE_API_TOKEN)
        )
      )
    }
  });
}
