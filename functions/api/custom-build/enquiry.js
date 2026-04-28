import { json, error, readBody, getUserFromSession, makeId } from '../projects/_shared.js';

function clean(value, maxLength = 5000) {
  return String(value || '').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function row(label, value) {
  const cleaned = clean(value, 8000);

  if (!cleaned) return '';

  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #ead8cd;font-weight:700;width:220px;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #ead8cd;vertical-align:top;white-space:pre-wrap;">
        ${escapeHtml(cleaned)}
      </td>
    </tr>
  `;
}

function buildEmailHtml({ enquiry, project, user }) {
  return `
    <div style="font-family:Arial,sans-serif;background:#fff8f1;padding:24px;color:#2f1b12;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #ead8cd;border-radius:18px;overflow:hidden;">
        <div style="padding:22px 24px;background:#c86f3d;color:#ffffff;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
            New custom build enquiry
          </p>
          <h1 style="margin:0;font-size:28px;line-height:1.1;">
            ${escapeHtml(enquiry.business_name || 'Custom Build Request')}
          </h1>
        </div>

        <div style="padding:22px 24px;">
          <p style="margin:0 0 18px;line-height:1.5;">
            A customer has submitted a custom website build enquiry through PBI.
          </p>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${row('Project ID', project.id)}
            ${row('Project name', project.name)}
            ${row('User account email', user.email)}

            ${row('Business name', enquiry.business_name)}
            ${row('Contact name', enquiry.contact_name)}
            ${row('Email', enquiry.email)}
            ${row('Phone', enquiry.phone)}
            ${row('Industry', enquiry.industry)}
            ${row('Current website', enquiry.current_website)}

            ${row('Project summary', enquiry.project_summary)}
            ${row('Pages needed', enquiry.pages_needed)}

            ${row('Domain status', enquiry.domain_status)}
            ${row('Domain name', enquiry.domain_name)}
            ${row('Selected domain option', enquiry.domain_option)}

            ${row('Logo status', enquiry.logo_status)}
            ${row('Brand colours', enquiry.brand_colours)}
            ${row('Logo ideas', enquiry.logo_ideas)}

            ${row('Websites they like', enquiry.liked_websites)}
            ${row('Websites they dislike', enquiry.disliked_websites)}

            ${row('Features needed', enquiry.features_needed)}
            ${row('Images status', enquiry.images_status)}
            ${row('Wording help', enquiry.wording_help)}

            ${row('Ideal launch date', enquiry.deadline)}
            ${row('Estimated budget', enquiry.budget)}
            ${row('Extra notes', enquiry.extra_notes)}
          </table>

          <p style="margin:20px 0 0;color:#7b6255;font-size:13px;">
            This enquiry has also been saved in Cloudflare D1 under custom_build_enquiries.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildEmailText({ enquiry, project, user }) {
  return `
New custom build enquiry

Project ID: ${project.id}
Project name: ${project.name || ''}
User account email: ${user.email || ''}

Business name: ${enquiry.business_name}
Contact name: ${enquiry.contact_name}
Email: ${enquiry.email}
Phone: ${enquiry.phone}
Industry: ${enquiry.industry}
Current website: ${enquiry.current_website}

Project summary:
${enquiry.project_summary}

Pages needed:
${enquiry.pages_needed}

Domain status: ${enquiry.domain_status}
Domain name: ${enquiry.domain_name}
Selected domain option: ${enquiry.domain_option}

Logo status: ${enquiry.logo_status}
Brand colours: ${enquiry.brand_colours}

Logo ideas:
${enquiry.logo_ideas}

Websites they like:
${enquiry.liked_websites}

Websites they dislike:
${enquiry.disliked_websites}

Features needed:
${enquiry.features_needed}

Images status: ${enquiry.images_status}
Wording help: ${enquiry.wording_help}

Ideal launch date: ${enquiry.deadline}
Estimated budget: ${enquiry.budget}

Extra notes:
${enquiry.extra_notes}
  `.trim();
}

async function sendNotificationEmail(env, { enquiry, project, user }) {
  if (!env.RESEND_API_KEY) {
    return {
      sent: false,
      reason: 'RESEND_API_KEY is not set.'
    };
  }

  const to = env.CUSTOM_BUILD_NOTIFY_TO || 'hello@purbeckbusinessinnovations.co.uk';
  const from = env.CUSTOM_BUILD_NOTIFY_FROM || 'PBI Enquiries <enquiry@purbeckbusinessinnovations.co.uk>';

  const subject = `New custom build enquiry: ${enquiry.business_name || project.name || 'PBI website'}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: enquiry.email || user.email,
      subject,
      html: buildEmailHtml({ enquiry, project, user }),
      text: buildEmailText({ enquiry, project, user })
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      sent: false,
      reason: result.error?.message || result.message || 'Resend email failed.'
    };
  }

  return {
    sent: true,
    id: result.id || ''
  };
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
    return error(
      'Please complete the required fields: business name, contact name, email and project summary.',
      400
    );
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

  const emailResult = await sendNotificationEmail(env, {
    enquiry,
    project,
    user
  });

  return json({
    ok: true,
    enquiry_id: id,
    email_sent: emailResult.sent,
    email_message: emailResult.sent ? 'Notification email sent.' : emailResult.reason,
    message: 'Custom build enquiry submitted.'
  });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
