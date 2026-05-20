import { callSeoAi, ensureSeoAgentTables, error, json, parseJson, requireAdmin, ruleBasedFix } from './_shared.js';

async function loadTask(env, id) {
  if (!id) return null;
  return env.DB.prepare(`SELECT * FROM seo_tasks WHERE id = ? LIMIT 1`).bind(id).first();
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const body = await request.json().catch(() => ({}));
  const task = await loadTask(env, String(body.task_id || body.taskId || '').trim());
  const pageUrl = String(task?.page_url || body.page_url || body.pageUrl || '').trim();
  if (!pageUrl) return error('Page URL is required.');
  const payload = {
    mode: 'seo_fix_preview',
    task: task ? { ...task, fix_payload: parseJson(task.fix_payload_json, {}) } : body,
    page_url: pageUrl,
    requested_fields: ['title', 'meta_description', 'h1', 'schema_jsonld', 'content_block_html', 'internal_links_html'],
    output_shape: {
      title: 'string',
      meta_description: 'string',
      h1: 'string',
      schema_jsonld: 'valid JSON-LD string or empty string',
      content_block_html: 'small editable HTML section or empty string',
      internal_links_html: 'small editable HTML section with contextual links or empty string',
      reasoning: 'string'
    }
  };
  const fallback = { ...ruleBasedFix(task || { page_url: pageUrl }), reasoning: 'Rule-based fallback generated because the AI service did not return structured JSON.', source: 'rule-based' };
  const fix = await callSeoAi(env, payload, fallback) || fallback;
  const suggestionId = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO seo_tasks (id,audit_id,page_url,task_type,priority,reasoning,estimated_impact,suggested_implementation,fix_payload_json,status,source,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,'preview',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
    .bind(
      suggestionId,
      task?.audit_id || '',
      pageUrl,
      'ai_fix_preview',
      task?.priority || 'medium',
      fix.reasoning || task?.reasoning || 'SEO fix preview generated for review.',
      task?.estimated_impact || 'Medium',
      'Review and apply this editable SEO fix when approved.',
      JSON.stringify(fix),
      fix.source || 'openai'
    ).run();
  return json({ ok: true, task_id: task?.id || null, preview_id: suggestionId, page_url: pageUrl, fix });
}

export async function onRequestPatch({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const body = await request.json().catch(() => ({}));
  const previewId = String(body.preview_id || body.previewId || body.task_id || body.taskId || '').trim();
  const task = await loadTask(env, previewId);
  if (!task) return error('Preview task not found.', 404);
  const fix = { ...parseJson(task.fix_payload_json, {}), ...(body.fix || {}) };
  await env.DB.prepare(`INSERT INTO seo_page_overrides (page_url,title,meta_description,h1,canonical,robots,schema_jsonld,content_block_html,internal_links_html,image_alt_text,source_suggestion_id,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(page_url) DO UPDATE SET title=excluded.title, meta_description=excluded.meta_description, h1=excluded.h1, canonical=excluded.canonical, robots=excluded.robots, schema_jsonld=excluded.schema_jsonld, content_block_html=excluded.content_block_html, internal_links_html=excluded.internal_links_html, image_alt_text=excluded.image_alt_text, source_suggestion_id=excluded.source_suggestion_id, status='active', updated_at=CURRENT_TIMESTAMP`)
    .bind(
      task.page_url,
      fix.title || '',
      fix.meta_description || '',
      fix.h1 || '',
      fix.canonical || '',
      fix.robots || '',
      fix.schema_jsonld || '',
      fix.content_block_html || '',
      fix.internal_links_html || '',
      fix.image_alt_text || '',
      previewId
    ).run();
  await env.DB.prepare(`UPDATE seo_tasks SET status = 'completed', applied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(previewId).run();
  await env.DB.prepare(`INSERT INTO seo_apply_log (suggestion_id,page_url,action,details_json,created_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)`)
    .bind(null, task.page_url, 'apply_override', JSON.stringify({ ...fix, preview_id: previewId })).run();
  return json({ ok: true, page_url: task.page_url, status: 'applied' });
}
