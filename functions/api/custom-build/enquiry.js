import { json, error, readBody, getUserFromSession, makeId } from '../projects/_shared.js';

function clean(value, maxLength = 5000) {
  return String(value || '').trim().slice(0, maxLength);
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);

  if (!user) {
    return error('Unauthorized.', 401);
  }

  const body = await readBody(request);

  const projectId = clean(body.project_id, 120);

  if (!projectId) {
    return error('Missing project id.', 400);
  }

  const project = await env.DB
    .prepare(`
      SELECT id, user_id, name
      FROM projects
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `)
    .bind(projectId, user.id)
    .first();

  if (!project) {
    return error('Project not found.', 404);
  }

  const id = makeId();

  const enquiry = {
    business_name: clean(body.business_name, 200),
    contact_name: clean(body.contact_name, 200),
    email: clean(body.email, 240),
    phone: clean(body.phone, 80),
    industry: clean(body.industry, 200),
    current_website: clean(body.current_website, 500),
    project_summary: clean(body.project_summary, 5000),
    pages_needed: clean(body.pages_needed, 3000),
    domain_status: clean(body.domain_status, 100),
    domain_name: clean(body.domain_name, 200),
    logo_status: clean(body.logo_status, 100),
    brand_colours: clean(body.brand_colours, 500),
    logo_ideas: clean(body.logo_ideas, 3000),
    liked_websites: clean(body.liked_websites, 3000),
    disliked_websites: clean(body.disliked_websites, 3000),
    features_needed: clean(body.features_needed, 3000),
    images_status: clean(body.images_status, 100),
    wording_help: clean(body.wording_help, 100),
    deadline: clean(body.deadline, 200),
    budget: clean(body.budget, 100),
    extra_notes: clean(body.extra_notes, 5000),
    domain_option: clean(body.domain_option, 100)
  };

  if (!enquiry.business_name || !enquiry.contact_name || !enquiry.email || !enquiry.project_summary) {
    return error('Please complete the required fields: business name, contact name, email and project summary.', 400);
  }

  await env.DB
    .prepare(`
      INSERT INTO custom_build_enquiries (
        id,
        user_id,
        project_id,
        business_name,
        contact_name,
        email,
        phone,
        industry,
        current_website,
        project_summary,
        pages_needed,
        domain_status,
        domain_name,
        logo_status,
        brand_colours,
        logo_ideas,
        liked_websites,
        disliked_websites,
        features_needed,
        images_status,
        wording_help,
        deadline,
        budget,
        extra_notes,
        domain_option,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, 'submitted', datetime('now'), datetime('now')
      )
    `)
    .bind(
      id,
      user.id,
      projectId,
      enquiry.business_name,
      enquiry.contact_name,
      enquiry.email,
      enquiry.phone,
      enquiry.industry,
      enquiry.current_website,
      enquiry.project_summary,
      enquiry.pages_needed,
      enquiry.domain_status,
      enquiry.domain_name,
      enquiry.logo_status,
      enquiry.brand_colours,
      enquiry.logo_ideas,
      enquiry.liked_websites,
      enquiry.disliked_websites,
      enquiry.features_needed,
      enquiry.images_status,
      enquiry.wording_help,
      enquiry.deadline,
      enquiry.budget,
      enquiry.extra_notes,
      enquiry.domain_option
    )
    .run();

  await env.DB
    .prepare(`
      UPDATE projects
      SET
        plan = 'custom_build_deposit',
        billing_status = 'custom_build_enquiry_submitted',
        updated_at = datetime('now')
      WHERE id = ?
        AND user_id = ?
    `)
    .bind(projectId, user.id)
    .run();

  return json({
    ok: true,
    enquiry_id: id,
    message: 'Custom build enquiry submitted.'
  });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
