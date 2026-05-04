import { json, error, readBody, getUserFromSession, slugify } from '../projects/_shared.js';
import { getProjectAccess, hasPublishBilling, paymentRequired } from '../_lib/project-access.js';

async function ensureCanvasTable(env) {
  if (!env?.DB) throw new Error('D1 database binding DB is missing.');
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_canvas (
      project_id TEXT PRIMARY KEY,
      user_id TEXT,
      canvas_json TEXT NOT NULL,
      cms_json TEXT DEFAULT '[]',
      collaboration_json TEXT DEFAULT '{}',
      published_json TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT
    )
  `).run();
  const alters = [
    `ALTER TABLE project_canvas ADD COLUMN cms_json TEXT DEFAULT '[]'`,
    `ALTER TABLE project_canvas ADD COLUMN collaboration_json TEXT DEFAULT '{}'`,
    `ALTER TABLE project_canvas ADD COLUMN published_json TEXT`,
    `ALTER TABLE project_canvas ADD COLUMN status TEXT DEFAULT 'draft'`,
    `ALTER TABLE project_canvas ADD COLUMN published_at TEXT`
  ];
  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch (_) {}
  }
}

function safeJson(value, fallback = {}) {
  try { return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback); } catch (_) { return fallback; }
}

async function uniqueSlug(env, base, id) {
  let root = slugify(base || 'website');
  let slug = root;
  let index = 2;
  while (true) {
    const existing = await env.DB.prepare(`SELECT id FROM projects WHERE public_slug = ? AND id != ? LIMIT 1`).bind(slug, id).first();
    if (!existing) return slug;
    slug = `${root}-${index++}`;
  }
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Log in first.', 401);

  const body = await readBody(request);
  const projectId = String(body.project_id || '').trim();
  if (!projectId) return error('Missing project_id.', 400);

  const access = await getProjectAccess(env, projectId, user, { requireOwner: true });
  if (!access.ok) return error(access.error, access.status || 403);

  const project = access.project;
  const requirePayment = paymentRequired(env);

  if (!hasPublishBilling(project, env)) {
    return json({
      ok: true,
      published: false,
      payment_required: true,
      message: 'Building and previewing are free. Payment is only required when you publish this website live.',
      payment_url: `/payment/?project=${encodeURIComponent(projectId)}`,
      billing_status: project.billing_status || 'draft'
    });
  }

  await ensureCanvasTable(env);

  const row = await env.DB.prepare(`
    SELECT canvas_json
    FROM project_canvas
    WHERE project_id=? AND user_id=?
    LIMIT 1
  `).bind(projectId, project.user_id).first();

  if (!row?.canvas_json) return error('No saved canvas found for this project.', 404);

  const data = safeJson(project.data_json, {});
  const canvas = safeJson(row.canvas_json, {});
  const publicSlug = project.public_slug || await uniqueSlug(env, data.subdomain_slug || canvas.slug || canvas.title || data.business_name || project.name || 'website', project.id);
  const plan = String(body.plan || project.plan || data.plan || 'starter').trim();
  const domainOption = String(body.domain_option || data.domain_option || project.domain_option || 'pbi_subdomain').trim();
  const customDomain = String(data.custom_domain || project.custom_domain || '').trim();

  await env.DB.prepare(`
    UPDATE project_canvas
    SET published_json=canvas_json,
        status='published',
        published_at=CURRENT_TIMESTAMP,
        updated_at=CURRENT_TIMESTAMP
    WHERE project_id=? AND user_id=?
  `).bind(projectId, project.user_id).run();

  await env.DB.prepare(`
    UPDATE projects
    SET published = 1,
        public_slug = ?,
        plan = COALESCE(NULLIF(?, ''), plan),
        domain_option = ?,
        custom_domain = ?,
        billing_status = CASE
          WHEN ? = 'true' THEN billing_status
          ELSE 'not_required'
        END,
        published_at = COALESCE(published_at, datetime('now')),
        updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).bind(publicSlug, plan, domainOption, customDomain, String(requirePayment), project.id, project.user_id).run();

  return json({
    ok: true,
    published: true,
    project_id: projectId,
    status: 'published',
    public_slug: publicSlug,
    live_url: `/site/canvas/${encodeURIComponent(publicSlug)}/`,
    canonical_project_url: `/site/canvas/${encodeURIComponent(projectId)}/`,
    payment_required: false,
    billing_status: requirePayment ? project.billing_status : 'not_required'
  });
}
