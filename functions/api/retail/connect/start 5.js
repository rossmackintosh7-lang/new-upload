import {
  json,
  error,
  readBody,
  getUserFromSession,
  ensureRetailConnectTables,
  normaliseCountry,
  cleanBusinessType,
  createConnectedAccount,
  getStripeAccount,
  upsertConnectAccount,
  createAccountLink,
  updateProjectRetailAccount
} from "./_shared.js";

export async function onRequestPost({ request, env }) {
  await ensureRetailConnectTables(env);

  const user = await getUserFromSession(env, request);
  if (!user) return error("Log in before connecting Stripe.", 401);

  const body = await readBody(request);
  const projectId = String(body.project_id || "").trim();
  const country = normaliseCountry(body.country || env.RETAIL_ALLOWED_COUNTRY_1 || "GB");
  const businessType = cleanBusinessType(body.business_type || "company");

  if (!env.STRIPE_SECRET_KEY) {
    return error("Stripe is not connected to PBI yet. Add STRIPE_SECRET_KEY as a Cloudflare Secret.", 500);
  }

  let row = await env.DB
    .prepare(`SELECT * FROM retail_connect_accounts WHERE user_id = ? LIMIT 1`)
    .bind(user.id)
    .first();

  let account;

  try {
    if (row?.stripe_account_id) {
      account = await getStripeAccount(env, row.stripe_account_id);
    } else {
      account = await createConnectedAccount(env, user, { country, businessType });
    }

    row = await upsertConnectAccount(env, { user, account, projectId, country, businessType });

    if (projectId && row?.stripe_account_id) {
      await updateProjectRetailAccount(env, user.id, projectId, row.stripe_account_id);
    }

    const link = await createAccountLink(env, request, row.stripe_account_id, projectId);

    return json({
      ok: true,
      url: link.url,
      account_id: row.stripe_account_id,
      message: "Stripe Connect onboarding link created."
    });
  } catch (err) {
    return error(err.message || "Could not start Stripe onboarding.", 500);
  }
}
