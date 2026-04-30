import { json, error, readBody, getUserFromSession, slugify } from './_shared.js';

async function uniqueSlug(env, base, id) {
  let slug = base || 'website';
  let c = 2;

  while (true) {
    const existing = await env.DB
      .prepare(`SELECT id FROM projects WHERE public_slug = ? AND id != ? LIMIT 1`)
      .bind(slug, id)
      .first();

    if (!existing) return slug;
    slug = `${base}-${c++}`;
  }
}

function safeJson(value) {
  try {
    return typeof value === 'string' ? JSON.parse(value || '{}') : (value || {});
  } catch {
    return {};
  }
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Unauthorized.', 401);

  const body = await readBody(request);
  const id = String(body.project_id || body.id || '').trim();
  if (!id) return error('Missing project id.', 400);

  const project = await env.DB
    .prepare(`SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1`)
    .bind(id, user.id)
    .first();

  if (!project) return error('Project not found.', 404);

  const paymentRequired = env.PBI_REQUIRE_PAYMENT_TO_PUBLISH === 'true';

  if (project.billing_status !== 'active' && paymentRequired) {
    return json({
      ok: true,
      published: false,
      payment_required: true,
      message: 'Payment is required before this website can be published.',
      payment_url: `/payment/?project=${encodeURIComponent(id)}`
    });
  }

  const data = safeJson(project.data_json);
  const publicSlug = project.public_slug || await uniqueSlug(
    env,
    slugify(data.subdomain_slug || data.business_name || project.name || 'website'),
    project.id
  );

  const domainOption = String(body.domain_option || data.domain_option || project.domain_option || 'pbi_subdomain');
  const customDomain = String(data.custom_domain || project.custom_domain || '').trim();
  const plan = String(body.plan || project.plan || data.plan || 'starter').trim();

  await env.DB
    .prepare(`
      UPDATE projects
      SET published = 1,
          public_slug = ?,
          domain_option = ?,
          custom_domain = ?,
          plan = COALESCE(NULLIF(?, ''), plan),
          billing_status = CASE
            WHEN ? = 'true' THEN billing_status
            ELSE COALESCE(NULLIF(billing_status, ''), 'not_required')
          END,
          published_at = COALESCE(published_at, datetime('now')),
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `)
    .bind(publicSlug, domainOption, customDomain, plan, String(paymentRequired), project.id, user.id)
    .run();

  return json({
    ok: true,
    published: true,
    public_slug: publicSlug,
    live_url: `/site/${encodeURIComponent(publicSlug)}/`,
    domain_option: domainOption,
    custom_domain: customDomain,
    plan,
    payment_required: false,
    billing_status: paymentRequired ? project.billing_status : 'not_required'
  });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
