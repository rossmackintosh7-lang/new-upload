import { json } from '../../_lib/json.js';
import { getSessionUser } from '../../_lib/session.js';

function adminEmails(env){
  return String(env.PBI_ADMIN_EMAILS || 'rossmackintosh7@icloud.com')
    .split(',').map(e=>e.trim().toLowerCase()).filter(Boolean);
}

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ ok: false, authenticated: false, is_admin: false, plan: 'starter' }, 200);
  let plan = 'starter';
  try {
    const row = await env.DB.prepare(`SELECT plan FROM projects WHERE user_id = ? ORDER BY datetime(COALESCE(updated_at, created_at, '1970-01-01')) DESC LIMIT 1`).bind(user.id).first();
    if (row?.plan) plan = row.plan;
  } catch (_) {}
  const isAdmin = adminEmails(env).includes(String(user.email || '').toLowerCase());
  return json({ ok: true, authenticated: true, user, email: user.email, is_admin: isAdmin, plan });
}
