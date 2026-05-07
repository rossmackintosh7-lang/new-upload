import { json, error } from '../../_lib/json.js';
import { requireUser } from '../../_lib/auth.js';

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function fallbackCopy(body = {}) {
  const business = String(body.business_name || 'Your business').trim();
  const brief = String(body.brief || body.sub_heading || 'clear small-business website').trim();
  const pages = {};
  const selected = Array.isArray(body.selected_pages) && body.selected_pages.length ? body.selected_pages : ['home', 'about', 'services', 'contact'];

  for (const page of selected) {
    const label = titleCase(page);
    pages[page] = {
      title: page === 'home' ? `${business} website built to turn visitors into enquiries` : `${label} for ${business}`,
      body: page === 'contact'
        ? `Make it simple for customers to contact ${business}. Add the best phone number, email address and response promise.`
        : `Use this section to explain ${brief} in plain English, with proof, useful detail and one clear next step.`
    };
  }

  return {
    business_name: business,
    page_main_heading: `${business} made clear online`,
    sub_heading: `A focused website for ${brief}.`,
    pages
  };
}

async function openAiRewrite(env, body) {
  if (!env.OPENAI_API_KEY) return null;
  const model = env.OPENAI_MODEL || 'gpt-5.5';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: 'Return only compact JSON with keys business_name, page_main_heading, sub_heading and pages. Pages must map page keys to title/body.' },
        { role: 'user', content: JSON.stringify(body).slice(0, 12000) }
      ]
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'AI copy request failed.');
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('') || '';
  try { return JSON.parse(text); } catch { return null; }
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  if (!String(body.brief || body.business_name || '').trim()) return error('Add a brief or business name first.');
  const copy = await openAiRewrite(env, body).catch(() => null) || fallbackCopy(body);
  return json({ ok: true, copy, source: env.OPENAI_API_KEY ? 'openai_or_fallback' : 'fallback' });
}
