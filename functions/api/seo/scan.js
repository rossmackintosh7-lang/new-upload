import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { validateProjectForPublish } from '../../_lib/package-rules.js';

function scanData(data = {}) {
  const issues = [];
  const fixes = [];
  const seo = data.seo || {};
  if (!seo.title && !data.seo_title) { issues.push('Missing SEO title.'); fixes.push({ field:'seo.title', value:data.business_name || 'Small business website' }); }
  if (!seo.description && !data.seo_description) { issues.push('Missing SEO description.'); fixes.push({ field:'seo.description', value:data.sub_heading || 'Clear small-business website built with PBI.' }); }
  if (!seo.ogTitle) fixes.push({ field:'seo.ogTitle', value:seo.title || data.business_name || 'Website' });
  if (!seo.ogDescription) fixes.push({ field:'seo.ogDescription', value:seo.description || data.sub_heading || '' });
  const blocks = Object.values(data.blocksByPage || {}).flat();
  if (blocks.some(b => b.image && !b.imageAlt)) issues.push('Some images are missing alt text.');
  if (!blocks.some(b => ['contact','booking'].includes(b.type))) issues.push('Missing contact/booking conversion section.');
  return { issues, fixes, score: Math.max(10, 100 - issues.length * 12) };
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || '').trim();
  let data = body.canvas || null;
  if (!data && projectId) {
    const row = await env.DB.prepare(`SELECT data_json, plan FROM projects WHERE id = ? AND user_id = ?`).bind(projectId, auth.user.id).first();
    if (!row) return error('Project not found.', 404);
    data = JSON.parse(row.data_json || '{}');
  }
  const packageCheck = validateProjectForPublish(data || {}, data?.plan || 'starter');
  const seo = scanData(packageCheck.data || data || {});
  return json({ ok:true, ...seo, package_warnings:packageCheck.warnings || [] });
}
