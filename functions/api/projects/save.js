import { json, error } from '../../_lib/json.js';
import { getSessionUser } from '../../_lib/session.js';
import { enforceProjectPackage, validateProjectForPublish, cleanPlan } from '../../_lib/package-rules.js';

async function ensure(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    status TEXT DEFAULT 'draft',
    data_json TEXT DEFAULT '{}',
    published INTEGER DEFAULT 0,
    public_slug TEXT,
    plan TEXT DEFAULT 'starter',
    billing_status TEXT DEFAULT 'draft',
    domain_option TEXT DEFAULT 'pbi_subdomain',
    custom_domain TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  const alters = [
    `ALTER TABLE projects ADD COLUMN readiness_score INTEGER DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN package_warnings TEXT DEFAULT '[]'`,
    `ALTER TABLE projects ADD COLUMN last_validated_at TEXT`,
    `ALTER TABLE projects ADD COLUMN staging_slug TEXT`,
    `ALTER TABLE projects ADD COLUMN unpublished_at TEXT`,
    `ALTER TABLE projects ADD COLUMN domain_option TEXT DEFAULT 'pbi_subdomain'`,
    `ALTER TABLE projects ADD COLUMN custom_domain TEXT`
  ];
  for (const sql of alters) { try { await env.DB.prepare(sql).run(); } catch (_) {} }
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return error('Login required to save to your PBI account.', 401);
  await ensure(env);

  const body = await request.json().catch(() => ({}));
  const project = body.project || {};
  const rawCanvas = body.canvas || project.canvas || project.data || project;
  const id = String(project.id || rawCanvas.project_id || crypto.randomUUID()).slice(0, 80);
  const name = String(project.name || rawCanvas.business_name || 'Untitled website').slice(0, 160);
  const plan = cleanPlan(project.plan || rawCanvas.plan || rawCanvas.package || 'starter');
  const enforced = enforceProjectPackage({ ...rawCanvas, project_id: id, business_name: name }, plan);
  const checklist = validateProjectForPublish(enforced, plan);
  const domainOption = String(enforced.domain_option || project.domain_option || 'pbi_subdomain').slice(0, 80);
  const customDomain = String(enforced.custom_domain || enforced.domain_registration?.name || project.custom_domain || '').slice(0, 253);

  await env.DB.prepare(`INSERT INTO projects (id, user_id, name, status, data_json, plan, billing_status, domain_option, custom_domain, published, readiness_score, package_warnings, last_validated_at, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', ?, ?, 'draft', ?, ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      data_json = excluded.data_json,
      plan = excluded.plan,
      domain_option = excluded.domain_option,
      custom_domain = excluded.custom_domain,
      readiness_score = excluded.readiness_score,
      package_warnings = excluded.package_warnings,
      last_validated_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(id, user.id, name, JSON.stringify(enforced), plan, domainOption, customDomain, checklist.score || 0, JSON.stringify(checklist.warnings || [])).run();

  return json({
    ok: true,
    project: { id, name, plan, status: 'draft', readiness_score: checklist.score || 0 },
    package_warnings: enforced.packageWarnings || [],
    checklist
  });
}
