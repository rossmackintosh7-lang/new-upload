import { json, error, getUserFromSession, readBody, slugify } from '../projects/_shared.js';

export { json, error, readBody, slugify };

export async function getAdminUser(env, request) {
  const user = await getUserFromSession(env, request);
  if (!user) return null;

  const fallbackAdmins = 'rossmackintosh7@icloud.com,info@purbeckbusinessinnovations.co.uk';
  const allowed = String(env.PBI_ADMIN_EMAILS || fallbackAdmins)
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.includes(String(user.email || '').toLowerCase())) {
    return null;
  }

  return user;
}

export async function requireAdmin(env, request) {
  const admin = await getAdminUser(env, request);
  if (!admin) return { response: error('Admin access required.', 403) };
  if (admin.admin_error) return { response: error(admin.admin_error, 500) };
  return { admin };
}

export function parseProjectData(project) {
  try {
    return typeof project?.data_json === 'string' ? JSON.parse(project.data_json || '{}') : (project?.data_json || {});
  } catch {
    return {};
  }
}

export function safeJson(value) {
  try { return JSON.stringify(value || {}); } catch { return '{}'; }
}

export async function ensureAdminTables(env) {
  if (!env.DB) return;

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS custom_build_enquiries (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      business_name TEXT,
      main_promotion_goal TEXT,
      status TEXT DEFAULT 'new',
      body_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      user_id TEXT,
      email TEXT,
      type TEXT DEFAULT 'assisted_setup',
      message TEXT,
      status TEXT DEFAULT 'new',
      body_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function uniqueSlug(env, base, id) {
  let slug = slugify(base || 'website');
  let c = 2;

  while (true) {
    const existing = await env.DB
      .prepare(`SELECT id FROM projects WHERE public_slug = ? AND id != ? LIMIT 1`)
      .bind(slug, id || '')
      .first();

    if (!existing) return slug;
    slug = `${slugify(base || 'website')}-${c++}`;
  }
}


export async function ensurePbiOpsTables(env) {
  await ensureAdminTables(env);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_notifications (id TEXT PRIMARY KEY,type TEXT NOT NULL,title TEXT NOT NULL,message TEXT,status TEXT DEFAULT 'new',priority TEXT DEFAULT 'normal',customer_email TEXT,project_id TEXT,request_id TEXT,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,read_at TEXT)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_requests (id TEXT PRIMARY KEY,request_type TEXT NOT NULL,status TEXT DEFAULT 'new',priority TEXT DEFAULT 'normal',customer_name TEXT,customer_email TEXT,customer_phone TEXT,business_name TEXT,business_type TEXT,project_id TEXT,package_name TEXT,payment_status TEXT DEFAULT 'unknown',brief TEXT,requested_pages TEXT,uploaded_assets_json TEXT,internal_notes TEXT,customer_message TEXT,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_requests_project_id ON admin_requests(project_id)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_project_notes (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,request_id TEXT,note TEXT NOT NULL,created_by TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS project_sections (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,section_order INTEGER DEFAULT 0,section_type TEXT NOT NULL,title TEXT,text TEXT,button TEXT,image TEXT,layout TEXT DEFAULT 'standard',background TEXT DEFAULT '#fff8f1',accent TEXT DEFAULT '#bf5c29',padding TEXT DEFAULT 'comfortable',align TEXT DEFAULT 'left',hidden INTEGER DEFAULT 0,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_project_sections_project_id ON project_sections(project_id)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_audit_log (id TEXT PRIMARY KEY,admin_email TEXT,action TEXT NOT NULL,project_id TEXT,request_id TEXT,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
}

export async function createAdminNotification(env, payload = {}) {
  await ensurePbiOpsTables(env);
  const id = payload.id || crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO admin_notifications (id,type,title,message,status,priority,customer_email,project_id,request_id,body_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(id,String(payload.type||'notification'),String(payload.title||'New notification'),String(payload.message||''),String(payload.status||'new'),String(payload.priority||'normal'),String(payload.customer_email||''),String(payload.project_id||''),String(payload.request_id||''),JSON.stringify(payload.body||{})).run();
  return id;
}

export async function audit(env, admin, action, payload = {}) {
  try { await ensurePbiOpsTables(env); await env.DB.prepare(`INSERT INTO admin_audit_log (id,admin_email,action,project_id,request_id,body_json,created_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(crypto.randomUUID(),admin?.email||'',action,payload.project_id||'',payload.request_id||'',JSON.stringify(payload)).run(); } catch {}
}
