import { json, error, getUserFromSession, readBody } from "../../projects/_shared.js";

export { json, error, getUserFromSession, readBody };

export async function ensureRetailConnectTables(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS retail_connect_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email TEXT,
    stripe_account_id TEXT NOT NULL UNIQUE,
    country TEXT DEFAULT 'GB',
    business_type TEXT DEFAULT 'company',
    charges_enabled INTEGER DEFAULT 0,
    payouts_enabled INTEGER DEFAULT 0,
    details_submitted INTEGER DEFAULT 0,
    onboarding_complete INTEGER DEFAULT 0,
    capabilities_json TEXT DEFAULT '{}',
    requirements_json TEXT DEFAULT '{}',
    last_project_id TEXT,
    status TEXT DEFAULT 'created',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_retail_connect_accounts_user_id ON retail_connect_accounts(user_id)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_retail_connect_accounts_stripe_account_id ON retail_connect_accounts(stripe_account_id)`).run();
}

export function getOrigin(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function encodeForm(data) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== "") params.append(key, String(value));
  }
  return params;
}

export function safeJson(value) {
  try { return JSON.stringify(value || {}); } catch { return "{}"; }
}

export function parseJson(value, fallback = {}) {
  try {
    if (!value) return fallback;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

export function normaliseCountry(value) {
  return String(value || "GB").trim().toUpperCase().slice(0, 2) || "GB";
}

export function cleanBusinessType(value) {
  const allowed = new Set(["individual", "company", "non_profit", "government_entity"]);
  const cleaned = String(value || "company").trim();
  return allowed.has(cleaned) ? cleaned : "company";
}

export async function stripeRequest(env, path, body = null, method = "POST") {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing. Add it as a Cloudflare Secret before using Stripe Connect.");
  }

  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body ? encodeForm(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Stripe request failed with ${response.status}`);
  }

  return data;
}

export async function getStripeAccount(env, accountId) {
  if (!accountId) return null;
  const response = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Could not read Stripe connected account.");
  return data;
}

export function connectStatusFromAccount(account) {
  const requirements = account?.requirements || {};
  const currentlyDue = requirements.currently_due || [];
  const eventuallyDue = requirements.eventually_due || [];
  const pastDue = requirements.past_due || [];
  const disabledReason = requirements.disabled_reason || "";

  const chargesEnabled = Boolean(account?.charges_enabled);
  const payoutsEnabled = Boolean(account?.payouts_enabled);
  const detailsSubmitted = Boolean(account?.details_submitted);
  const onboardingComplete = chargesEnabled && payoutsEnabled && detailsSubmitted && !currentlyDue.length && !pastDue.length;

  return {
    charges_enabled: chargesEnabled ? 1 : 0,
    payouts_enabled: payoutsEnabled ? 1 : 0,
    details_submitted: detailsSubmitted ? 1 : 0,
    onboarding_complete: onboardingComplete ? 1 : 0,
    status: onboardingComplete ? "ready" : detailsSubmitted ? "pending_review" : "onboarding_required",
    requirements_json: safeJson({
      currently_due: currentlyDue,
      eventually_due: eventuallyDue,
      past_due: pastDue,
      disabled_reason: disabledReason
    }),
    capabilities_json: safeJson(account?.capabilities || {})
  };
}

export async function upsertConnectAccount(env, { user, account, projectId = "", country = "GB", businessType = "company" }) {
  const status = connectStatusFromAccount(account);
  const existing = await env.DB
    .prepare(`SELECT * FROM retail_connect_accounts WHERE user_id = ? LIMIT 1`)
    .bind(user.id)
    .first();

  const id = existing?.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO retail_connect_accounts (
      id, user_id, email, stripe_account_id, country, business_type,
      charges_enabled, payouts_enabled, details_submitted, onboarding_complete,
      capabilities_json, requirements_json, last_project_id, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      email = excluded.email,
      stripe_account_id = excluded.stripe_account_id,
      country = excluded.country,
      business_type = excluded.business_type,
      charges_enabled = excluded.charges_enabled,
      payouts_enabled = excluded.payouts_enabled,
      details_submitted = excluded.details_submitted,
      onboarding_complete = excluded.onboarding_complete,
      capabilities_json = excluded.capabilities_json,
      requirements_json = excluded.requirements_json,
      last_project_id = COALESCE(NULLIF(excluded.last_project_id, ''), retail_connect_accounts.last_project_id),
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    id,
    user.id,
    user.email || "",
    account.id,
    country,
    businessType,
    status.charges_enabled,
    status.payouts_enabled,
    status.details_submitted,
    status.onboarding_complete,
    status.capabilities_json,
    status.requirements_json,
    projectId || existing?.last_project_id || "",
    status.status
  ).run();

  return env.DB
    .prepare(`SELECT * FROM retail_connect_accounts WHERE user_id = ? LIMIT 1`)
    .bind(user.id)
    .first();
}

export async function createConnectedAccount(env, user, { country = "GB", businessType = "company" } = {}) {
  const acct = await stripeRequest(env, "/v1/accounts", {
    type: "express",
    country: normaliseCountry(country),
    email: user.email || "",
    business_type: cleanBusinessType(businessType),
    "capabilities[card_payments][requested]": "true",
    "capabilities[transfers][requested]": "true",
    "metadata[pbi_user_id]": user.id,
    "metadata[pbi_email]": user.email || ""
  });

  return acct;
}

export async function createAccountLink(env, request, accountId, projectId = "") {
  const origin = getOrigin(request);
  const query = projectId ? `?project=${encodeURIComponent(projectId)}` : "";
  return stripeRequest(env, "/v1/account_links", {
    account: accountId,
    refresh_url: `${origin}/api/retail/connect/refresh${query}`,
    return_url: `${origin}/api/retail/connect/return${query}`,
    type: "account_onboarding",
    "collection_options[fields]": "eventually_due"
  });
}

export async function updateProjectRetailAccount(env, userId, projectId, accountId) {
  if (!projectId || !accountId) return false;

  const project = await env.DB
    .prepare(`SELECT id, data_json FROM projects WHERE id = ? AND user_id = ? LIMIT 1`)
    .bind(projectId, userId)
    .first();

  if (!project) return false;

  const data = parseJson(project.data_json, {});
  data.retail_stripe_account_id = accountId;
  data.retail_connected_automatically = true;
  data.retail_enabled = true;
  data.retail_connect_updated_at = new Date().toISOString();

  await env.DB
    .prepare(`UPDATE projects SET data_json = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
    .bind(JSON.stringify(data), projectId, userId)
    .run();

  return true;
}

export function publicConnectPayload(row) {
  if (!row) {
    return {
      connected: false,
      ready: false,
      status: "not_connected",
      message: "Stripe is not connected yet."
    };
  }

  const requirements = parseJson(row.requirements_json, {});
  const ready = Boolean(row.onboarding_complete);

  return {
    connected: Boolean(row.stripe_account_id),
    account_id: row.stripe_account_id,
    ready,
    status: row.status || (ready ? "ready" : "onboarding_required"),
    charges_enabled: Boolean(row.charges_enabled),
    payouts_enabled: Boolean(row.payouts_enabled),
    details_submitted: Boolean(row.details_submitted),
    requirements,
    message: ready
      ? "Stripe is connected and ready for retail checkout."
      : "Stripe onboarding needs completing before live product checkout can run."
  };
}
