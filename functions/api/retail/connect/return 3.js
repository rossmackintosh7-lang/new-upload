import {
  getUserFromSession,
  ensureRetailConnectTables,
  getStripeAccount,
  upsertConnectAccount,
  updateProjectRetailAccount
} from "./_shared.js";

export async function onRequestGet({ request, env }) {
  await ensureRetailConnectTables(env);

  const url = new URL(request.url);
  const projectId = String(url.searchParams.get("project") || "").trim();
  const user = await getUserFromSession(env, request);

  if (!user) {
    return Response.redirect(`${url.origin}/login/?retail_connect=login_required`, 302);
  }

  let status = "returned";

  try {
    const row = await env.DB
      .prepare(`SELECT * FROM retail_connect_accounts WHERE user_id = ? LIMIT 1`)
      .bind(user.id)
      .first();

    if (row?.stripe_account_id && env.STRIPE_SECRET_KEY) {
      const account = await getStripeAccount(env, row.stripe_account_id);
      const updated = await upsertConnectAccount(env, {
        user,
        account,
        projectId,
        country: row.country || "GB",
        businessType: row.business_type || "company"
      });

      if (projectId && updated?.stripe_account_id) {
        await updateProjectRetailAccount(env, user.id, projectId, updated.stripe_account_id);
      }

      status = updated?.onboarding_complete ? "ready" : "pending";
    }
  } catch (err) {
    status = "check_failed";
  }

  const target = projectId
    ? `${url.origin}/builder/?project=${encodeURIComponent(projectId)}&retail_connect=${encodeURIComponent(status)}`
    : `${url.origin}/dashboard/?retail_connect=${encodeURIComponent(status)}`;

  return Response.redirect(target, 302);
}
