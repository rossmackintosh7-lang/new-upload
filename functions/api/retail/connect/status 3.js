import {
  json,
  error,
  getUserFromSession,
  ensureRetailConnectTables,
  getStripeAccount,
  upsertConnectAccount,
  updateProjectRetailAccount,
  publicConnectPayload
} from "./_shared.js";

export async function onRequestGet({ request, env }) {
  await ensureRetailConnectTables(env);

  const user = await getUserFromSession(env, request);
  if (!user) return error("Unauthorized.", 401);

  const url = new URL(request.url);
  const projectId = String(url.searchParams.get("project") || "").trim();

  let row = await env.DB
    .prepare(`SELECT * FROM retail_connect_accounts WHERE user_id = ? LIMIT 1`)
    .bind(user.id)
    .first();

  if (row?.stripe_account_id && env.STRIPE_SECRET_KEY) {
    try {
      const account = await getStripeAccount(env, row.stripe_account_id);
      row = await upsertConnectAccount(env, {
        user,
        account,
        projectId,
        country: row.country || "GB",
        businessType: row.business_type || "company"
      });

      if (projectId && row?.stripe_account_id) {
        await updateProjectRetailAccount(env, user.id, projectId, row.stripe_account_id);
      }
    } catch (err) {
      // Return stored state if Stripe is temporarily unavailable.
    }
  }

  return json({ ok: true, connect: publicConnectPayload(row) });
}
