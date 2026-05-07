import { json, requireUser, ensureCoreTables, callOpenAi } from './_shared.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const current = String(body.currentContent || '').trim();
  const instruction = String(body.instruction || 'Make this clearer and more useful.').trim();
  const fallback = current
    ? `${current}\n\nNext step: make the benefit clearer, add one proof point, and finish with a direct action.`
    : 'Add clear wording that explains the benefit, proof and next action for the visitor.';
  const ai = await callOpenAi(env, [
    { role: 'system', content: 'Rewrite the section only. Keep it concise, customer-facing and practical.' },
    { role: 'user', content: JSON.stringify({ current, instruction, context: body.businessContext || '' }).slice(0, 8000) }
  ], fallback);
  return json({ ok: true, improvement: { improvedContent: ai?.text || fallback, warning: ai?.error || '' } });
}
