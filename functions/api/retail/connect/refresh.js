import {
  getUserFromSession,
  ensureRetailConnectTables,
  createAccountLink
} from "./_shared.js";

export async function onRequestGet({ request, env }) {
  await ensureRetailConnectTables(env);

  const url = new URL(request.url);
  const projectId = String(url.searchParams.get("project") || "").trim();
  const user = await getUserFromSession(env, request);

  if (!user) {
    return Response.redirect(`${url.origin}/login/?retail_connect=login_required`, 302);
  }

  const row = await env.DB
    .prepare(`SELECT * FROM retail_connect_accounts WHERE user_id = ? LIMIT 1`)
    .bind(user.id)
    .first();

  if (!row?.stripe_account_id) {
    const target = projectId
      ? `${url.origin}/builder/?project=${encodeURIComponent(projectId)}&retail_connect=restart`
      : `${url.origin}/dashboard/?retail_connect=restart`;
    return Response.redirect(target, 302);
  }

  try {
    const link = await createAccountLink(env, request, row.stripe_account_id, projectId);
    return Response.redirect(link.url, 302);
  } catch (err) {
    const target = projectId
      ? `${url.origin}/builder/?project=${encodeURIComponent(projectId)}&retail_connect=refresh_failed`
      : `${url.origin}/dashboard/?retail_connect=refresh_failed`;
    return Response.redirect(target, 302);
  }
}
