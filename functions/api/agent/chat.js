import { json, requireUser, ensureCoreTables, loadProjectContext, callOpenAi } from './_shared.js';

function fallbackAnswer(message, project) {
  const name = project?.name || project?.data?.business_name || 'this project';
  const lower = String(message || '').toLowerCase();
  if (lower.includes('seo')) {
    return `I would start with ${name}'s SEO basics: one page-specific title, one useful meta description, descriptive image alt text, and stronger internal links from the homepage to pricing, templates and contact.`;
  }
  if (lower.includes('publish') || lower.includes('launch')) {
    return `Before publishing ${name}, check three things: a clear hero section, a working contact or booking route, and Stripe/payment readiness. Then run the pre-publish check and publish only after checkout is confirmed.`;
  }
  return `I can help with ${name}. The quickest useful move is to identify the page or workflow you want improved, then I can suggest copy, SEO fixes, missing sections, or admin follow-up steps.`;
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const message = String(body.message || body.prompt || '').trim();
  const projectId = String(body.project_id || body.projectId || '').trim();
  const project = await loadProjectContext(env, auth.user.id, projectId);
  const fallback = fallbackAnswer(message, project);

  const ai = await callOpenAi(env, [
    {
      role: 'system',
      content: 'You are PBI Secret Agent, a private website operations assistant. Be concise, practical and safety-conscious. Suggest actions but do not claim you changed data unless a tool explicitly did it.'
    },
    {
      role: 'user',
      content: JSON.stringify({
        message,
        page: body.page || '',
        project: project ? { id: project.id, name: project.name, status: project.status, plan: project.plan, billing_status: project.billing_status, data: project.data } : null
      }).slice(0, 14000)
    }
  ], fallback);

  const answer = ai?.text || fallback;
  return json({
    ok: true,
    reply: {
      answer,
      suggestedActions: [
        'Run a readiness check',
        'Review SEO title and description',
        'Check payment and publish status'
      ]
    },
    source: ai?.text ? 'openai' : 'fallback'
  });
}
