import { json, error, readBody, getUserFromSession } from "../projects/_shared.js";

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function encodeForm(data) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== "") params.append(key, String(value));
  }
  return params;
}

async function ensureLogoTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS logo_creation_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      user_id TEXT,
      business_name TEXT,
      logo_brief TEXT,
      logo_style TEXT,
      logo_colours TEXT,
      status TEXT DEFAULT 'draft',
      stripe_session_id TEXT,
      body_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

function originFromRequest(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in before requesting paid logo creation.", 401);
  await ensureLogoTables(env);

  const body = await readBody(request);
  const projectId = clean(body.project_id, 120);
  const businessName = clean(body.business_name, 180);
  const logoBrief = clean(body.logo_brief, 3000);
  const logoStyle = clean(body.logo_style, 100);
  const logoColours = clean(body.logo_colours, 300);

  if (!projectId) return error("Missing project id.", 400);
  if (!logoBrief || logoBrief.length < 12) return error("Describe the logo you want before continuing.", 400);

  const project = await env.DB.prepare(`SELECT id, name FROM projects WHERE id=? AND user_id=? LIMIT 1`).bind(projectId, user.id).first();
  if (!project) return error("Project not found.", 404);

  const requestId = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO logo_creation_requests
    (id, project_id, user_id, business_name, logo_brief, logo_style, logo_colours, status, body_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    requestId, projectId, user.id, businessName || project.name || "", logoBrief, logoStyle, logoColours,
    JSON.stringify({ user_email: user.email || "" })
  ).run();

  const priceId = String(env.STRIPE_PRICE_LOGO_CREATION || "").trim();

  if (!env.STRIPE_SECRET_KEY) {
    return json({
      ok: true,
      setup_required: true,
      request_id: requestId,
      message: "Logo request saved, but Stripe is not fully connected. Add STRIPE_SECRET_KEY as a Cloudflare Secret before taking logo payments."
    });
  }

  if (!priceId || priceId === "ADD_PRICE_ID_IN_GITHUB") {
    return json({
      ok: true,
      setup_required: true,
      request_id: requestId,
      message: "Logo request saved. Add STRIPE_PRICE_LOGO_CREATION with the real Stripe price_... ID to enable paid logo checkout."
    });
  }

  const origin = originFromRequest(request);
  const form = {
    mode: "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/builder/?project=${encodeURIComponent(projectId)}&logo_paid=1&logo_request=${encodeURIComponent(requestId)}`,
    cancel_url: `${origin}/builder/?project=${encodeURIComponent(projectId)}&logo_cancelled=1&logo_request=${encodeURIComponent(requestId)}`,
    client_reference_id: requestId,
    customer_email: user.email || "",
    "metadata[type]": "logo_creation",
    "metadata[logo_request_id]": requestId,
    "metadata[project_id]": projectId,
    "metadata[user_id]": user.id,
    "metadata[business_name]": businessName || project.name || ""
  };

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: encodeForm(form)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    await env.DB.prepare(`UPDATE logo_creation_requests SET status='checkout_failed', body_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(JSON.stringify(result), requestId).run();
    return error(result.error?.message || "Stripe could not create the logo checkout.", 500);
  }

  await env.DB.prepare(`UPDATE logo_creation_requests SET status='checkout_started', stripe_session_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(result.id || "", requestId).run();

  return json({ ok: true, url: result.url, request_id: requestId });
}
