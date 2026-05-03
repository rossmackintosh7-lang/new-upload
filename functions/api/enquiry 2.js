import { json, error } from "../_lib/json.js";
import { sendEmail, escapeHtml, formatMultiline, publicBaseUrl } from "../_lib/email.js";
import { verifyTurnstileDetailed } from "../_lib/turnstile.js";

function clean(value, max = 3000) {
  return String(value ?? "").trim().slice(0, max);
}

function makeId(prefix = "support") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function labelType(type) {
  const map = {
    general: "General enquiry",
    support: "Support request",
    assisted_setup: "Assisted Setup enquiry",
    custom_build: "Custom build enquiry",
    seo_care: "SEO Care enquiry",
    retail_setup: "Retail setup enquiry",
    discovery_call: "Discovery call request",
    template_demo: "Template enquiry",
    privacy: "Privacy/data question"
  };
  return map[type] || "Website enquiry";
}

function firstAdminEmail(env) {
  const emails = String(env.CUSTOM_BUILD_NOTIFY_TO || env.SUPPORT_NOTIFY_TO || env.PBI_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return emails[0] || "info@purbeckbusinessinnovations.co.uk";
}

async function ensureSupportTable(env) {
  if (!env.DB) throw new Error("Database binding missing. Check the DB binding points to d1-template-database.");

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      user_id TEXT,
      email TEXT,
      type TEXT DEFAULT 'support',
      message TEXT,
      status TEXT DEFAULT 'new',
      body_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function maybeValidateTurnstile(env, request, token) {
  const hasSecret = Boolean(
    env.TURNSTILE_SECRET_KEY ||
    env.CF_TURNSTILE_SECRET_KEY ||
    env.CLOUDFLARE_TURNSTILE_SECRET_KEY
  );

  if (!hasSecret && !token) {
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, message: "Security check missing. Refresh the page and try again." };
  }

  const result = await verifyTurnstileDetailed(
    env,
    token,
    request.headers.get("CF-Connecting-IP") || ""
  );

  if (!result.success) {
    return {
      ok: false,
      message: result.reason || "Security check failed. Refresh the page and try again."
    };
  }

  return { ok: true };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));

    const enquiry = {
      id: makeId("support"),
      name: clean(body.name, 120),
      businessName: clean(body.businessName || body.business_name, 180),
      email: clean(body.email, 180).toLowerCase(),
      phone: clean(body.phone, 80),
      type: clean(body.type || body.enquiryType || body.enquiry_type || "general", 80),
      preferredContact: clean(body.preferredContact || body.preferred_contact, 80),
      subject: clean(body.subject, 180),
      projectName: clean(body.projectName || body.project_name, 180),
      projectId: clean(body.projectId || body.project_id, 120),
      pageUrl: clean(body.pageUrl || body.page_url, 600),
      source: clean(body.source || "pbi_contact_form", 120),
      message: clean(body.message, 6000),
      turnstileToken: clean(body.turnstileToken || body["cf-turnstile-response"], 2048)
    };

    if (!enquiry.name) return error("Please enter your name.", 400);
    if (!enquiry.email || !/^\S+@\S+\.\S+$/.test(enquiry.email)) return error("Please enter a valid email address.", 400);
    if (!enquiry.message || enquiry.message.length < 10) return error("Please add a little more detail to your enquiry.", 400);

    const turnstile = await maybeValidateTurnstile(env, request, enquiry.turnstileToken);
    if (!turnstile.ok) return error(turnstile.message, 400);

    await ensureSupportTable(env);

    const bodyJson = {
      name: enquiry.name,
      business_name: enquiry.businessName,
      phone: enquiry.phone,
      preferred_contact: enquiry.preferredContact,
      subject: enquiry.subject,
      project_name: enquiry.projectName,
      page_url: enquiry.pageUrl,
      source: enquiry.source,
      enquiry_type_label: labelType(enquiry.type),
      user_agent: request.headers.get("User-Agent") || "",
      ip_address: request.headers.get("CF-Connecting-IP") || ""
    };

    await env.DB.prepare(`
      INSERT INTO support_requests
      (id, project_id, user_id, email, type, message, status, body_json, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      enquiry.id,
      enquiry.projectId || null,
      enquiry.email,
      enquiry.type || "general",
      enquiry.message,
      JSON.stringify(bodyJson)
    ).run();

    const baseUrl = publicBaseUrl(request, env);
    const adminUrl = `${baseUrl}/admin/`;
    const typeLabel = labelType(enquiry.type);
    const to = firstAdminEmail(env);

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17110e;max-width:760px">
        <h2>New PBI enquiry</h2>
        <p><strong>Type:</strong> ${escapeHtml(typeLabel)}</p>
        <p><strong>Name:</strong> ${escapeHtml(enquiry.name)}</p>
        <p><strong>Business:</strong> ${escapeHtml(enquiry.businessName || "Not provided")}</p>
        <p><strong>Email:</strong> ${escapeHtml(enquiry.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(enquiry.phone || "Not provided")}</p>
        <p><strong>Preferred contact:</strong> ${escapeHtml(enquiry.preferredContact || "Not provided")}</p>
        <p><strong>Subject:</strong> ${escapeHtml(enquiry.subject || "Not provided")}</p>
        <p><strong>Project:</strong> ${escapeHtml(enquiry.projectName || enquiry.projectId || "Not provided")}</p>
        <p><strong>Page:</strong> ${escapeHtml(enquiry.pageUrl || "Not provided")}</p>
        <hr>
        <h3>Message</h3>
        <p>${formatMultiline(enquiry.message)}</p>
        <hr>
        <p><a href="${adminUrl}" style="display:inline-block;background:#bf5c29;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">Open PBI admin</a></p>
      </div>
    `;

    const text = `New PBI enquiry

Type: ${typeLabel}
Name: ${enquiry.name}
Business: ${enquiry.businessName || "Not provided"}
Email: ${enquiry.email}
Phone: ${enquiry.phone || "Not provided"}
Preferred contact: ${enquiry.preferredContact || "Not provided"}
Subject: ${enquiry.subject || "Not provided"}
Project: ${enquiry.projectName || enquiry.projectId || "Not provided"}
Page: ${enquiry.pageUrl || "Not provided"}

Message:
${enquiry.message}

Open admin: ${adminUrl}`;

    let emailStatus = { ok: false, skipped: true };

    if (env.RESEND_API_KEY) {
      emailStatus = await sendEmail(env, {
        to,
        replyTo: enquiry.email,
        subject: `PBI ${typeLabel}: ${enquiry.businessName || enquiry.name}`,
        html,
        text
      }).catch((err) => ({ ok: false, error: String(err?.message || err) }));

      if (env.PBI_SEND_ENQUIRY_CONFIRMATION !== "false") {
        await sendEmail(env, {
          to: enquiry.email,
          subject: "PBI has received your enquiry",
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17110e;max-width:680px">
              <h2>Thanks, ${escapeHtml(enquiry.name)}</h2>
              <p>PBI has received your enquiry and will review it as soon as possible.</p>
              <p><strong>Enquiry type:</strong> ${escapeHtml(typeLabel)}</p>
              <p><strong>Your message:</strong></p>
              <p>${formatMultiline(enquiry.message)}</p>
              <p style="font-size:13px;color:#666">This is an automatic confirmation from Purbeck Business Innovations.</p>
            </div>
          `,
          text: `Thanks, ${enquiry.name}. PBI has received your enquiry.\n\nType: ${typeLabel}\n\nMessage:\n${enquiry.message}`
        }).catch(() => null);
      }
    }

    return json({
      ok: true,
      enquiryId: enquiry.id,
      emailSent: Boolean(emailStatus?.ok),
      message: "Your enquiry has been sent. PBI will review it and come back to you."
    });
  } catch (err) {
    console.error("PBI enquiry failed:", err);
    return error(err?.message || "Could not submit enquiry.", 500);
  }
}
