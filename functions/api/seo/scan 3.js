import { jsonResponse } from "../_lib/http.js";
import { scanSeo, isManualRequestAllowed } from "../_lib/seo.js";
import { requireAdmin } from "../_lib/admin-auth.js";

export async function onRequestPost(context) {
  const admin = await requireAdmin(context);
  if (!admin.ok && !isManualRequestAllowed(context.request, context.env)) return jsonResponse({ error: "Admin access required." }, 401);
  const result = await scanSeo(context.env, context.request);
  return jsonResponse({ success: true, message: "SEO scan complete.", ...result });
}

export async function onRequestGet(context) {
  const admin = await requireAdmin(context);
  if (!admin.ok && !isManualRequestAllowed(context.request, context.env)) return jsonResponse({ error: "Admin access required." }, 401);
  const result = await scanSeo(context.env, context.request);
  return jsonResponse({ success: true, message: "SEO scan complete.", ...result });
}
