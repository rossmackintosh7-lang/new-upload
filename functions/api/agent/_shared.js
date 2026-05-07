import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';

export { json, error, requireUser, ensureCoreTables };

export async function loadProjectContext(env, userId, projectId) {
  if (!projectId) return null;
  try {
    const row = await env.DB.prepare(`SELECT id, name, status, plan, billing_status, published, public_slug, data_json FROM projects WHERE id = ? AND (user_id = ? OR ? = 'admin-token') LIMIT 1`)
      .bind(projectId, userId, userId).first();
    if (!row) return null;
    let data = {};
    try { data = JSON.parse(row.data_json || '{}'); } catch {}
    return { ...row, data };
  } catch {
    return null;
  }
}

export async function callOpenAi(env, messages, fallbackText) {
  if (!env.OPENAI_API_KEY) return null;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5.5',
      input: messages
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return fallbackText ? { text: fallbackText, error: data.error?.message || 'AI request failed.' } : null;
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('') || '';
  return { text: text.trim() };
}

export function basicWebsite(body = {}) {
  const business = String(body.businessName || body.business_name || body.brief || 'Small Business').trim().slice(0, 90);
  const description = String(body.businessDescription || body.business_description || body.brief || 'A useful local business website.').trim().slice(0, 280);
  return {
    brand: { businessName: business, location: String(body.location || body.aiLocation || '') },
    home: {
      heroTitle: `${business} made easier to find, trust and contact`,
      heroSubtitle: description,
      primaryButtonAction: 'contact'
    },
    about: { summary: `${business} helps customers with clear service, practical support and a simple next step.` },
    services: [
      { title: 'Core service', description: 'Explain the main service in plain English.' },
      { title: 'Fast enquiry', description: 'Give visitors one obvious route to ask for help.' },
      { title: 'Local support', description: 'Show the area served and why people can trust you.' }
    ],
    seo: {
      pageTitle: `${business} | Local Business Website`,
      metaDescription: description.slice(0, 155)
    }
  };
}
