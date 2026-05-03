// PBI admin subdomain router
// If visitors open admin.purbeckbusinessinnovations.co.uk, send them straight to the admin command centre.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  if (host === "admin.purbeckbusinessinnovations.co.uk" && (url.pathname === "/" || url.pathname === "")) {
    url.pathname = "/admin/";
    return Response.redirect(url.toString(), 302);
  }

  return context.next();
}
