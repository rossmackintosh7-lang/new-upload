import { jsonResponse } from './http.js';
import { getSessionUser } from '../../_lib/session.js';
import { ensureCoreTables } from '../../_lib/auth.js';

export function adminEmails(env) {
  return String(env.PBI_ADMIN_EMAILS || 'rossmackintosh7@icloud.com,info@purbeckbusinessinnovations.co.uk')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
}

export function tokenAllowed(request, env) {
  if (!env.PBI_ADMIN_TOKEN) return false;
  const expected = `Bearer ${env.PBI_ADMIN_TOKEN}`;
  const url = new URL(request.url);
  return request.headers.get('Authorization') === expected || url.searchParams.get('token') === env.PBI_ADMIN_TOKEN;
}

export async function requireAdmin(context) {
  const { request, env } = context;
  if (tokenAllowed(request, env)) return { ok: true, user: { email: 'token-admin' } };
  await ensureCoreTables(env);
  const user = await getSessionUser(env, request);
  const allowed = user && adminEmails(env).includes(String(user.email || '').toLowerCase());
  if (!allowed) return { ok: false, response: jsonResponse({ error: 'Admin access required.' }, 403) };
  return { ok: true, user };
}
