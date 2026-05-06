import { json, error, readBody, requireAdmin } from './_shared.js';

function now() { return new Date().toISOString(); }

function like(value) { return `%${String(value || '').trim().toLowerCase()}%`; }

async function safeFirst(env, sql, ...binds) {
  try { return await env.DB.prepare(sql).bind(...binds).first(); } catch (_) { return null; }
}

async function safeAll(env, sql, ...binds) {
  try { const r = await env.DB.prepare(sql).bind(...binds).all(); return r.results || []; } catch (_) { return []; }
}

async function safeRun(env, sql, ...binds) {
  try { await env.DB.prepare(sql).bind(...binds).run(); return true; } catch (_) { return false; }
}

async function ensureUserManagerTables(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_user_controls (
    user_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'active',
    notes TEXT,
    suspended_at TEXT,
    suspended_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_user_controls_status ON admin_user_controls(status)`).run();
}

function parseData(project) {
  try { return JSON.parse(project?.data_json || '{}'); } catch { return {}; }
}

function enrichProject(project) {
  const data = parseData(project);
  return {
    ...project,
    business_name: data.business_name || data.page_main_heading || '',
    subdomain_slug: data.subdomain_slug || '',
    plan: project.plan || 'free_preview',
    billing_status: project.billing_status || 'draft',
    stripe_subscription_id: project.stripe_subscription_id || data.stripe_subscription_id || data.domain_management?.stripe_subscription_id || '',
    website_subscription_status: data.website_subscription_status || project.billing_status || '',
    domain_management: data.domain_management || null,
    live_url: Number(project.published || 0) === 1 && project.public_slug ? `/site/canvas/${encodeURIComponent(project.public_slug)}/` : ''
  };
}

function safeJson(value) { try { return JSON.stringify(value || {}); } catch { return '{}'; } }

async function cancelStripeSubscription(env, subscriptionId) {
  if (!subscriptionId) return { skipped: true, reason: 'No Stripe subscription id stored.' };
  if (!env.STRIPE_SECRET_KEY) return { ok: false, error: 'STRIPE_SECRET_KEY missing. Cancel in Stripe manually or add the secret before using admin cancellation.' };
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: result.error?.message || `Stripe cancellation failed with status ${response.status}.` };
  return { ok: true, subscription: result };
}

async function takeProjectDown(env, projectId, actor = 'admin') {
  const project = await safeFirst(env, `SELECT * FROM projects WHERE id = ? LIMIT 1`, projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  const data = parseData(project);
  const nowIso = now();
  const nextData = {
    ...data,
    website_subscription_status: 'cancelled',
    stripe_subscription_status: 'cancelled',
    cancelled_at: nowIso,
    cancelled_by: actor,
    service_stopped: true,
    service_stopped_at: nowIso,
    domain_management: data.domain_management ? { ...data.domain_management, status: 'cancelled', active: false, cancelled_at: nowIso } : data.domain_management
  };
  await safeRun(env, `UPDATE projects SET billing_status='cancelled', published=0, status='cancelled', data_json=?, updated_at=datetime('now') WHERE id=?`, safeJson(nextData), projectId);
  await safeRun(env, `UPDATE project_canvas SET status='cancelled', published_json=NULL, updated_at=datetime('now') WHERE project_id=?`, projectId);
  await safeRun(env, `UPDATE project_cms_entries SET status='draft', updated_at=datetime('now') WHERE project_id=?`, projectId);
  return { ok: true };
}

async function projectIdsForUser(env, userId) {
  const rows = await safeAll(env, `SELECT id FROM projects WHERE user_id = ?`, userId);
  return rows.map((row) => row.id).filter(Boolean);
}

async function deleteForProjects(env, table, column, ids) {
  let count = 0;
  for (const id of ids) {
    if (await safeRun(env, `DELETE FROM ${table} WHERE ${column} = ?`, id)) count += 1;
  }
  return count;
}

async function deleteUserData(env, user) {
  const userId = user.id;
  const email = String(user.email || '');
  const projectIds = await projectIdsForUser(env, userId);
  const deleted = { projects: projectIds.length };

  await safeRun(env, `DELETE FROM sessions WHERE user_id = ?`, userId);
  await safeRun(env, `DELETE FROM terms_acceptances WHERE user_id = ?`, userId);
  await safeRun(env, `DELETE FROM project_canvas WHERE user_id = ?`, userId);
  await safeRun(env, `DELETE FROM project_cms_entries WHERE user_id = ?`, userId);
  await safeRun(env, `DELETE FROM project_presence WHERE user_id = ?`, userId);
  await safeRun(env, `DELETE FROM project_collab_notes WHERE user_id = ?`, userId);
  await safeRun(env, `DELETE FROM project_collaborators WHERE owner_user_id = ?`, userId);
  if (email) await safeRun(env, `DELETE FROM project_collaborators WHERE lower(email) = lower(?)`, email);
  await safeRun(env, `DELETE FROM support_requests WHERE user_id = ?`, userId);
  if (email) await safeRun(env, `DELETE FROM support_requests WHERE lower(email) = lower(?)`, email);

  for (const table of ['project_canvas', 'project_cms_entries', 'project_sections', 'admin_project_notes', 'admin_requests', 'admin_notifications', 'custom_build_enquiries']) {
    await deleteForProjects(env, table, 'project_id', projectIds);
  }

  await safeRun(env, `DELETE FROM projects WHERE user_id = ?`, userId);
  await safeRun(env, `DELETE FROM admin_user_controls WHERE user_id = ?`, userId);
  await safeRun(env, `DELETE FROM users WHERE id = ?`, userId);
  return deleted;
}

export async function onRequestGet({ request, env }) {
  const { admin, response } = await requireAdmin(env, request);
  if (response) return response;
  if (!env.DB) return error('Database binding missing.', 500);
  await ensureUserManagerTables(env);

  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id') || '';

  if (userId) {
    const user = await safeFirst(env, `
      SELECT users.id, users.email, COALESCE(users.email_verified, 0) AS email_verified, users.created_at, users.updated_at,
             COALESCE(admin_user_controls.status, 'active') AS status,
             admin_user_controls.notes, admin_user_controls.suspended_at, admin_user_controls.suspended_by
      FROM users
      LEFT JOIN admin_user_controls ON admin_user_controls.user_id = users.id
      WHERE users.id = ?
      LIMIT 1
    `, userId);
    if (!user) return error('User not found.', 404);
    const projects = (await safeAll(env, `SELECT * FROM projects WHERE user_id = ? ORDER BY datetime(COALESCE(updated_at, created_at, '1970-01-01')) DESC`, userId)).map(enrichProject);
    const sessions = await safeAll(env, `SELECT id, expires_at, created_at, last_seen_at FROM sessions WHERE user_id = ? ORDER BY datetime(COALESCE(last_seen_at, created_at, '1970-01-01')) DESC`, userId);
    const canvas = await safeFirst(env, `SELECT COUNT(*) AS count FROM project_canvas WHERE user_id = ?`, userId);
    const cms = await safeFirst(env, `SELECT COUNT(*) AS count FROM project_cms_entries WHERE user_id = ?`, userId);
    const activeBilling = projects.filter((project) => ['active','trialing','not_required'].includes(String(project.billing_status || '').toLowerCase())).length;
    const publishedProjects = projects.filter((project) => Number(project.published || 0) === 1).length;
    return json({ ok: true, user: { ...user, email_verified: Boolean(user.email_verified) }, controls: { notes: user.notes || '', status: user.status || 'active' }, projects, sessions, counts: { canvas: canvas?.count || 0, cms: cms?.count || 0, active_billing: activeBilling, published_projects: publishedProjects } });
  }

  const search = url.searchParams.get('search') || '';
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1), 500);
  const where = search.trim() ? `WHERE lower(users.email) LIKE ? OR lower(users.id) LIKE ?` : '';
  const binds = search.trim() ? [like(search), like(search), limit] : [limit];
  const users = await safeAll(env, `
    SELECT users.id, users.email, COALESCE(users.email_verified, 0) AS email_verified, users.created_at, users.updated_at,
           COALESCE(admin_user_controls.status, 'active') AS status,
           admin_user_controls.suspended_at,
           (SELECT COUNT(*) FROM sessions WHERE sessions.user_id = users.id) AS session_count,
           (SELECT COUNT(*) FROM projects WHERE projects.user_id = users.id) AS project_count,
           (SELECT COUNT(*) FROM projects WHERE projects.user_id = users.id AND billing_status = 'active') AS active_project_count
    FROM users
    LEFT JOIN admin_user_controls ON admin_user_controls.user_id = users.id
    ${where}
    ORDER BY datetime(COALESCE(users.created_at, users.updated_at, '1970-01-01')) DESC
    LIMIT ?
  `, ...binds);

  const totalUsers = await safeFirst(env, `SELECT COUNT(*) AS count FROM users`);
  const suspended = await safeFirst(env, `SELECT COUNT(*) AS count FROM admin_user_controls WHERE status = 'suspended'`);
  const projects = await safeFirst(env, `SELECT COUNT(*) AS count FROM projects`);
  const activeBilling = await safeFirst(env, `SELECT COUNT(*) AS count FROM projects WHERE billing_status = 'active'`);
  return json({ ok: true, admin: { email: admin.email }, users: users.map((u) => ({ ...u, email_verified: Boolean(u.email_verified) })), stats: { total_users: totalUsers?.count || 0, suspended_users: suspended?.count || 0, total_projects: projects?.count || 0, active_billing: activeBilling?.count || 0 } });
}

export async function onRequestPost({ request, env }) {
  const { admin, response } = await requireAdmin(env, request);
  if (response) return response;
  if (!env.DB) return error('Database binding missing.', 500);
  await ensureUserManagerTables(env);
  const body = await readBody(request);
  const action = String(body.action || '').trim().toLowerCase();
  const userId = String(body.user_id || '').trim();
  if (!userId) return error('user_id is required.', 400);

  const user = await safeFirst(env, `SELECT id, email FROM users WHERE id = ? LIMIT 1`, userId);
  if (!user) return error('User not found.', 404);
  if (user.id === admin.id && ['suspend', 'delete', 'logout'].includes(action)) return error('You cannot perform this action on your own active admin account.', 400);

  if (action === 'notes') {
    await env.DB.prepare(`INSERT INTO admin_user_controls (user_id, status, notes, created_at, updated_at) VALUES (?, 'active', ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET notes = excluded.notes, updated_at = excluded.updated_at`).bind(userId, String(body.notes || ''), now(), now()).run();
    return json({ ok: true });
  }

  if (action === 'logout') {
    const result = await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run();
    return json({ ok: true, deleted_sessions: result.meta?.changes || 0 });
  }

  if (action === 'suspend') {
    await env.DB.prepare(`INSERT INTO admin_user_controls (user_id, status, notes, suspended_at, suspended_by, created_at, updated_at) VALUES (?, 'suspended', ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET status = 'suspended', notes = excluded.notes, suspended_at = excluded.suspended_at, suspended_by = excluded.suspended_by, updated_at = excluded.updated_at`).bind(userId, String(body.notes || ''), now(), admin.email || admin.id, now(), now()).run();
    await safeRun(env, `DELETE FROM sessions WHERE user_id = ?`, userId);
    return json({ ok: true, status: 'suspended' });
  }

  if (action === 'reactivate') {
    await env.DB.prepare(`INSERT INTO admin_user_controls (user_id, status, notes, created_at, updated_at) VALUES (?, 'active', ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET status = 'active', notes = excluded.notes, suspended_at = NULL, updated_at = excluded.updated_at`).bind(userId, String(body.notes || ''), now(), now()).run();
    return json({ ok: true, status: 'active' });
  }

  if (action === 'take_down_project') {
    const projectId = String(body.project_id || '').trim();
    if (!projectId) return error('project_id is required.', 400);
    const project = await safeFirst(env, `SELECT id, user_id FROM projects WHERE id = ? AND user_id = ? LIMIT 1`, projectId, userId);
    if (!project) return error('Project not found for this user.', 404);
    const result = await takeProjectDown(env, projectId, admin.email || admin.id);
    if (!result.ok) return error(result.error || 'Could not take project down.', 500);
    return json({ ok: true, project_id: projectId, taken_down: true });
  }

  if (action === 'cancel_project_subscription') {
    const projectId = String(body.project_id || '').trim();
    if (!projectId) return error('project_id is required.', 400);
    const project = await safeFirst(env, `SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1`, projectId, userId);
    if (!project) return error('Project not found for this user.', 404);
    const data = parseData(project);
    const subscriptionId = project.stripe_subscription_id || data.stripe_subscription_id || data.domain_management?.stripe_subscription_id || '';
    const stripe = await cancelStripeSubscription(env, subscriptionId);
    if (stripe.ok === false) return error(stripe.error || 'Stripe cancellation failed.', 500, { stripe });
    const result = await takeProjectDown(env, projectId, admin.email || admin.id);
    if (!result.ok) return error(result.error || 'Could not take project down.', 500, { stripe });
    return json({ ok: true, project_id: projectId, cancelled: true, stripe });
  }

  if (action === 'delete') {
    const confirm = String(body.confirm || '').trim();
    if (confirm !== (user.email || user.id)) return error('Delete confirmation did not match the user email/id.', 400);
    const deleted = await deleteUserData(env, user);
    return json({ ok: true, deleted });
  }

  return error('Unknown user action.', 400);
}
