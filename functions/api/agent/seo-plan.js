import { json, requireUser, ensureCoreTables } from './_shared.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const business = String(body.businessName || 'PBI website').trim();
  const location = String(body.location || '').trim();
  const core = location ? `${business} ${location}` : business;
  return json({
    ok: true,
    seoPlan: {
      pageTitle: `${core} | Services, Pricing and Contact`,
      metaDescription: `Learn about ${business}, compare services and contact the team for a clear next step.`,
      keywords: [core, `${business} website`, `${business} services`],
      localSeoActions: ['Add location wording to the homepage', 'Add contact details in text, not only images', 'Create service-specific internal links'],
      contentIdeas: ['Customer questions page', 'Before and after project story', 'Simple pricing or package explainer']
    }
  });
}
