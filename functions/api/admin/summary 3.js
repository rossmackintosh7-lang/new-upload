import { json, requireAdmin, ensurePbiOpsTables } from './_shared.js';

async function all(env, sql, ...binds) {
  try { return (await env.DB.prepare(sql).bind(...binds).all()).results || []; } catch { return []; }
}
async function first(env, sql, ...binds) {
  try { return await env.DB.prepare(sql).bind(...binds).first(); } catch { return null; }
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

  return json({
    ok: true,
    notifications,
    requests,
    latest_notifications,
    latest_requests,
    latest_users,
    latest_projects,
    stats: {
      total_users: totalUsers?.count || 0,
      total_projects: totalProjects?.count || 0,
      active_billing: activeBilling?.count || 0,
      published_projects: publishedProjects?.count || 0,
      suspended_users: suspendedUsers?.count || 0
    }
  });
}
