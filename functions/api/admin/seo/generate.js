import { callSeoAi, ensureSeoAgentTables, error, json, requireAdmin } from './_shared.js';

function fallbackCluster(topic) {
  const clean = String(topic || 'UK small business automation').trim();
  return {
    cluster_name: clean,
    pillar_url: '/business-automation-tools/',
    summary: `Build a helpful PBI content cluster around ${clean}, focused on practical UK small-business operations rather than generic marketing.`,
    ideas: [
      { title: `${clean}: practical starter guide`, intent: 'informational', target_url: '/business-automation-tools/' },
      { title: `How small businesses can use AI without losing control`, intent: 'informational', target_url: '/ai-business-tools/' },
      { title: `Website and automation checklist for UK small businesses`, intent: 'transactional', target_url: '/small-business-automation/' }
    ],
    faq_cluster: [
      `What should a small business automate first?`,
      `How can AI support website enquiries?`,
      `How do websites and operations systems work together?`
    ],
    internal_links: [
      { source_url: '/small-business-automation/', target_url: '/business-automation-tools/', anchor_text: 'business automation tools' },
      { source_url: '/ai-business-tools/', target_url: '/small-business-websites/', anchor_text: 'small business websites' }
    ],
    source: 'rule-based'
  };
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(env, request);
  if (auth.response) return auth.response;
  await ensureSeoAgentTables(env);
  const body = await request.json().catch(() => ({}));
  const topic = String(body.topic || body.cluster || 'UK small business websites and automation').trim();
  if (!topic) return error('Topic is required.');
  const payload = {
    mode: 'content_cluster_generation',
    topic,
    audience: 'UK small businesses',
    positioning: 'AI-powered websites, automation and operational systems for UK small businesses',
    required_json: {
      cluster_name: 'string',
      pillar_url: 'string',
      summary: 'string',
      ideas: [{ title: 'string', intent: 'informational|transactional|commercial', target_url: 'string' }],
      faq_cluster: ['string'],
      internal_links: [{ source_url: 'string', target_url: 'string', anchor_text: 'string' }]
    }
  };
  const generated = await callSeoAi(env, payload, fallbackCluster(topic)) || fallbackCluster(topic);
  const id = crypto.randomUUID();
  const key = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || id;
  await env.DB.prepare(`INSERT INTO seo_content_clusters (id,cluster_key,name,topic,intent,pillar_url,supporting_urls_json,content_ideas_json,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(cluster_key) DO UPDATE SET name=excluded.name, topic=excluded.topic, intent=excluded.intent, pillar_url=excluded.pillar_url, supporting_urls_json=excluded.supporting_urls_json, content_ideas_json=excluded.content_ideas_json, updated_at=CURRENT_TIMESTAMP`)
    .bind(id, key, generated.cluster_name || topic, topic, String(body.intent || 'mixed'), generated.pillar_url || '', JSON.stringify(generated.internal_links || []), JSON.stringify(generated),).run();
  return json({ ok: true, cluster_key: key, generated });
}
