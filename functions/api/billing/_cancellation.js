function parseJson(value, fallback = {}) {
  try {
    return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback);
  } catch {
    return fallback;
  }
}

function stringify(value) {
  try {
    return JSON.stringify(value || {});
  } catch {
    return '{}';
  }
}

async function safeRun(env, sql, ...binds) {
  try {
    return await env.DB.prepare(sql).bind(...binds).run();
  } catch (_) {
    return null;
  }
}

async function ensureCancellationColumns(env) {
  const alters = [
    `ALTER TABLE projects ADD COLUMN unpublished_at TEXT`,
    `ALTER TABLE projects ADD COLUMN stripe_subscription_id TEXT`,
    `ALTER TABLE projects ADD COLUMN stripe_customer_id TEXT`,
    `ALTER TABLE projects ADD COLUMN public_slug TEXT`
  ];
  for (const sql of alters) await safeRun(env, sql);
}

export async function takeProjectDown(env, project, cancelledBy = 'stripe') {
  if (!env?.DB || !project?.id) return { ok: false, skipped: true };
  await ensureCancellationColumns(env);

  const stored = project.data_json === undefined
    ? await env.DB.prepare(`SELECT data_json FROM projects WHERE id = ? LIMIT 1`).bind(project.id).first()
    : null;
  const data = parseJson(project.data_json ?? stored?.data_json, {});
  const now = new Date().toISOString();
  const nextData = {
    ...data,
    website_subscription_status: 'cancelled',
    stripe_subscription_status: 'cancelled',
    cancelled_at: data.cancelled_at || now,
    cancelled_by: cancelledBy,
    service_stopped: true,
    service_stopped_at: now,
    public_site_status: 'suspended',
    suspended_landing: {
      enabled: true,
      reason: 'subscription_cancelled',
      shown_from: now
    },
    domain_management: data.domain_management
      ? { ...data.domain_management, status: 'cancelled', active: false, cancelled_at: now }
      : data.domain_management
  };

  await env.DB.prepare(`
    UPDATE projects
    SET billing_status = 'cancelled',
        published = 0,
        status = 'cancelled',
        unpublished_at = CURRENT_TIMESTAMP,
        data_json = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(stringify(nextData), project.id).run();

  await safeRun(env, `UPDATE project_canvas SET status = 'cancelled', published_json = NULL, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`, project.id);
  await safeRun(env, `UPDATE project_cms_entries SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`, project.id);

  return { ok: true, data: nextData };
}

export async function restoreProjectAfterBilling(env, project, restoredBy = 'stripe') {
  if (!env?.DB || !project?.id) return { ok: false, skipped: true };
  await ensureCancellationColumns(env);

  const stored = project.data_json === undefined || project.public_slug === undefined || project.published === undefined
    ? await env.DB.prepare(`SELECT data_json, public_slug, published, status, billing_status FROM projects WHERE id = ? LIMIT 1`).bind(project.id).first()
    : null;
  const data = parseJson(project.data_json ?? stored?.data_json, {});
  const now = new Date().toISOString();
  const publicSlug = String(project.public_slug || stored?.public_slug || '').trim();
  const hadPublicRoute = Boolean(publicSlug);
  const nextData = {
    ...data,
    website_subscription_status: 'active',
    stripe_subscription_status: 'active',
    service_stopped: false,
    service_restored_at: now,
    restored_by: restoredBy,
    public_site_status: hadPublicRoute ? 'live' : 'draft',
    suspended_landing: {
      enabled: false,
      reason: '',
      shown_from: ''
    },
    domain_management: data.domain_management
      ? {
          ...data.domain_management,
          active: true,
          status: data.domain_management.status === 'cancelled' ? 'active' : (data.domain_management.status || 'active'),
          restored_at: now
        }
      : data.domain_management
  };

  await env.DB.prepare(`
    UPDATE projects
    SET billing_status = 'active',
        published = ?,
        status = ?,
        data_json = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    hadPublicRoute ? 1 : Number(project.published ?? stored?.published ?? 0),
    hadPublicRoute ? 'published' : (String(project.status || stored?.status || '').toLowerCase() === 'cancelled' ? 'draft' : (project.status || stored?.status || 'draft')),
    stringify(nextData),
    project.id
  ).run();

  if (hadPublicRoute) {
    await safeRun(env, `UPDATE project_canvas SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`, project.id);
  }

  return { ok: true, restored: true, republished: hadPublicRoute, public_slug: publicSlug, data: nextData };
}
