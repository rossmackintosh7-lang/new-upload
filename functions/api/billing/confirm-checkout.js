import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { provisionPaidCheckoutSession } from './_provision.js';

async function fetchCheckoutSession(env, sessionId) {
  if (!env.STRIPE_SECRET_KEY) return { error: 'STRIPE_SECRET_KEY is not configured.', status: 500 };
  if (!sessionId) return { error: 'Stripe Checkout Session id is required.', status: 400 };

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });
  const session = await response.json().catch(() => ({}));
  if (!response.ok) return { error: session.error?.message || 'Could not verify Stripe checkout.', status: 502 };
  return { session };
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || body.project || '').trim();
  const sessionId = String(body.session_id || body.stripe_session_id || '').trim();
  if (!projectId) return error('Project id is required.');

  const project = await env.DB.prepare(`
    SELECT id, user_id
    FROM projects
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).bind(projectId, auth.user.id).first();
  if (!project) return error('Project not found.', 404);

  const { session, error: fetchError, status } = await fetchCheckoutSession(env, sessionId);
  if (fetchError) return error(fetchError, status || 400);

  const metadataProject = String(session.metadata?.project_id || session.client_reference_id || '').trim();
  const metadataUser = String(session.metadata?.user_id || '').trim();
  if (metadataProject && metadataProject !== projectId) return error('Stripe session does not match this project.', 400);
  if (metadataUser && metadataUser !== auth.user.id) return error('Stripe session does not belong to this user.', 403);

  const result = await provisionPaidCheckoutSession(env, session);
  return json({ ok: Boolean(result?.ok), result });
}
