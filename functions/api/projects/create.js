import { json, error, readBody, getUserFromSession, makeId } from './_shared.js';

const ALLOWED_PLANS = ['starter', 'business', 'plus'];

function cleanName(value) {
  return (String(value || 'New website').trim().slice(0, 120) || 'New website');
}

function cleanPlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  return ALLOWED_PLANS.includes(plan) ? plan : '';
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Unauthorized.', 401);

  const body = await readBody(request);
  const name = cleanName(body.name || body.project_name);
  const templatePreset = String(body.template_preset || body.preset || '').trim();
  const plan = cleanPlan(body.plan || body.selected_plan);

  if (!plan) return error('Choose a website package before creating a project.', 400);

  const id = makeId();
  const starterData = {
    project_name: name,
    business_name: '',
    template: 'service',
    template_preset: templatePreset || '',
    selected_pages: ['home', 'about', 'services', 'contact'],
    active_page: 'home',
    domain_option: 'pbi_subdomain',
    selected_plan: plan,
    plan,
    build_is_free: true,
    payment_due: 'publish',
    created_from_existing_account: true
  };

  await env.DB.prepare(`
    INSERT INTO projects
      (id, user_id, name, status, data_json, published, billing_status, plan, domain_option, created_at, updated_at)
    VALUES
      (?, ?, ?, 'draft', ?, 0, 'draft', ?, 'pbi_subdomain', datetime('now'), datetime('now'))
  `).bind(
    id,
    user.id,
    name,
    JSON.stringify(starterData),
    plan
  ).run();

  const project = await env.DB
    .prepare(`SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1`)
    .bind(id, user.id)
    .first();

  return json({ ok: true, project });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
