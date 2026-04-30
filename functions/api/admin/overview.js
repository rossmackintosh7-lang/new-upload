import { json, error, requireAdmin, ensureAdminTables, parseProjectData } from './_shared.js';

function safeCount(rows) {
  return Array.isArray(rows) ? rows.length : 0;
}

async function allOrEmpty(env, sql) {
  try {
    const result = await env.DB.prepare(sql).all();
    return result.results || [];
  } catch (err) {
    console.warn('Admin overview query skipped:', err?.message || err);
    return [];
  }
}

function enrichProject(project) {
  const data = parseProjectData(project);
  return {
    ...project,
    data,
    business_name: data.business_name || '',
    subdomain_slug: data.subdomain_slug || '',
    main_promotion_goal: data.main_promotion_goal || '',
    assisted_setup_paid: data.assisted_setup_paid === true,
    custom_build_enquiry_submitted: data.custom_build_enquiry_submitted === true,
    domain_registration: data.domain_registration || null,
    domain_management: data.domain_management || null,
    readiness_score: data.readiness_score || null
  };
}

function normaliseAgentEnquiry(row) {
  return {
    id: row.id,
    project_id: row.project_id || row.projectId || '',
    contact_name: row.name || row.contact_name || '',
    email: row.email || '',
    phone: row.phone || '',
    business_name: row.business_name || row.businessName || '',
    main_promotion_goal: row.needs || row.main_promotion_goal || '',
    status: row.status || 'new',
    body_json: JSON.stringify({
      source: row.source || 'pbi_agent',
      budget: row.budget || '',
      timeframe: row.timeframe || '',
      needs: row.needs || ''
    }),
    created_at: row.created_at || row.createdAt || '',
    updated_at: row.updated_at || row.created_at || row.createdAt || ''
  };
}

export async function onRequestGet({ request, env }) {
  const { admin, response } = await requireAdmin(env, request);
  if (response) return response;
  if (!env.DB) return error('Database binding missing.', 500);

  await ensureAdminTables(env);

  const users = await allOrEmpty(env, `
    SELECT id, email, COALESCE(email_verified, 0) AS email_verified, created_at, updated_at
    FROM users
    ORDER BY datetime(COALESCE(created_at, updated_at, '1970-01-01')) DESC
    LIMIT 250
  `);

  const projectRows = await allOrEmpty(env, `
    SELECT
      projects.*,
      users.email AS user_email
    FROM projects
    LEFT JOIN users ON users.id = projects.user_id
    ORDER BY datetime(COALESCE(projects.updated_at, projects.created_at, '1970-01-01')) DESC
    LIMIT 500
  `);

  const customEnquiries = await allOrEmpty(env, `
    SELECT *
    FROM custom_build_enquiries
    ORDER BY datetime(COALESCE(created_at, updated_at, '1970-01-01')) DESC
    LIMIT 150
  `);

  const agentEnquiries = (await allOrEmpty(env, `
    SELECT *
    FROM pbi_custom_build_enquiries
    ORDER BY datetime(COALESCE(created_at, '1970-01-01')) DESC
    LIMIT 150
  `)).map(normaliseAgentEnquiry);

  const support_requests = await allOrEmpty(env, `
    SELECT *
    FROM support_requests
    ORDER BY datetime(COALESCE(created_at, updated_at, '1970-01-01')) DESC
    LIMIT 150
  `);

  const projects = projectRows.map(enrichProject);
  const enquiryMap = new Map();
  [...customEnquiries, ...agentEnquiries].forEach((row) => {
    if (row?.id) enquiryMap.set(row.id, row);
  });
  const enquiries = [...enquiryMap.values()].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  const stats = {
    users: safeCount(users),
    projects: safeCount(projects),
    published_projects: projects.filter((project) => Number(project.published) === 1).length,
    active_billing: projects.filter((project) => project.billing_status === 'active').length,
    custom_enquiries: safeCount(enquiries),
    support_requests: safeCount(support_requests),
    assisted_setup_paid: projects.filter((project) => project.assisted_setup_paid).length,
    new_domain_projects: projects.filter((project) => project.domain_option === 'register_new' || project.domain_registration?.name).length
  };

  return json({ ok: true, admin, stats, users, projects, enquiries, support_requests });
}

export async function onRequestPost() {
  return error('Method not allowed.', 405);
}
