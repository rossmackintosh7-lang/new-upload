import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables, readJson } from '../../_lib/auth.js';
import { callOpenAi, loadProjectContext } from '../agent/_shared.js';

export { json, error, requireUser, ensureCoreTables, readJson };

const MISSION_STATUSES = new Set(['active', 'planning', 'needs_approval', 'paused', 'completed', 'cancelled']);
const STEP_STATUSES = new Set(['todo', 'in_progress', 'needs_approval', 'done']);

function id(prefix) {
  const value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}_${String(value).replace(/-/g, '').slice(0, 28)}`;
}

function clean(value, max = 400) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeJson(value) {
  try { return JSON.stringify(value || {}); } catch { return '{}'; }
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

function inferMissionType(goal, requested = '') {
  const value = `${requested} ${goal}`.toLowerCase();
  if (/seo|google|rank|keyword|content|meta|schema/.test(value)) return 'seo_growth';
  if (/domain|dns|publish|launch|stripe|payment|live/.test(value)) return 'launch';
  if (/custom|bespoke|quote|assisted|done for you/.test(value)) return 'custom_build';
  if (/automation|workflow|system|crm|lead|booking|order/.test(value)) return 'automation';
  if (/mobile|responsive|phone|speed|performance|accessibility/.test(value)) return 'quality';
  return requested || 'business_growth';
}

function fallbackSteps(type, goal) {
  const common = [
    {
      title: 'Clarify the commercial outcome',
      detail: 'Confirm what result the mission should create: more enquiries, a better launch, stronger SEO, smoother admin work or better customer conversion.',
      category: 'strategy',
      estimated_impact: 'high',
      action_key: 'review_goal'
    },
    {
      title: 'Audit the current website/project state',
      detail: 'Check the active project, page structure, calls to action, domain route, payment state, mobile layout and obvious blockers before making changes.',
      category: 'audit',
      estimated_impact: 'high',
      action_key: 'audit_project'
    }
  ];

  const maps = {
    seo_growth: [
      {
        title: 'Map the target search intent',
        detail: 'Identify the national, industry and local-support search terms this mission should strengthen without keyword stuffing.',
        category: 'seo',
        estimated_impact: 'high',
        action_key: 'open_seo_agent'
      },
      {
        title: 'Improve metadata and headings',
        detail: 'Rewrite the page title, meta description and heading structure so they read naturally and support the target query.',
        category: 'seo',
        estimated_impact: 'high',
        action_key: 'fix_metadata'
      },
      {
        title: 'Add useful supporting content',
        detail: 'Create FAQs, internal links and practical sections that answer real customer questions rather than thin SEO copy.',
        category: 'content',
        estimated_impact: 'medium',
        action_key: 'generate_content'
      }
    ],
    launch: [
      {
        title: 'Run launch readiness',
        detail: 'Check pages, forms, domain choice, Stripe readiness, mobile layout and publish route before the customer pays.',
        category: 'launch',
        estimated_impact: 'high',
        action_key: 'open_canvas_launch'
      },
      {
        title: 'Confirm domain and payment route',
        detail: 'Make sure the selected domain, custom domain or PBI subdomain path is saved and checkout reflects the correct package and domain charge.',
        category: 'domain_payment',
        estimated_impact: 'high',
        action_key: 'domain_payment_check'
      },
      {
        title: 'Prepare post-launch checks',
        detail: 'After publishing, verify the live route, contact form, sitemap, robots file, schema and key calls to action.',
        category: 'qa',
        estimated_impact: 'medium',
        action_key: 'post_launch_qa'
      }
    ],
    custom_build: [
      {
        title: 'Turn the enquiry into a build scope',
        detail: 'Define the page count, integrations, customer actions, imagery, SEO goals and anything that needs a quoted custom workflow.',
        category: 'scope',
        estimated_impact: 'high',
        action_key: 'custom_scope'
      },
      {
        title: 'Prepare the customer-facing build plan',
        detail: 'Create a clear phased plan covering content, design, build, review, launch and aftercare.',
        category: 'delivery',
        estimated_impact: 'high',
        action_key: 'custom_build_plan'
      },
      {
        title: 'Set admin follow-up tasks',
        detail: 'Record the next Ross-side actions, project link and customer communication needed to keep the custom build moving.',
        category: 'admin',
        estimated_impact: 'medium',
        action_key: 'admin_follow_up'
      }
    ],
    automation: [
      {
        title: 'Identify the repeatable workflow',
        detail: 'Find the manual process that should become a system: leads, bookings, orders, reminders, reviews, support or follow-up.',
        category: 'automation',
        estimated_impact: 'high',
        action_key: 'workflow_map'
      },
      {
        title: 'Design the operational route',
        detail: 'Map inputs, customer steps, admin notifications, Stripe or domain events, and the dashboard view needed to manage it.',
        category: 'systems',
        estimated_impact: 'high',
        action_key: 'system_design'
      },
      {
        title: 'Add the website touchpoints',
        detail: 'Place the right forms, calls to action, trust proof and automated next steps into the website flow.',
        category: 'conversion',
        estimated_impact: 'medium',
        action_key: 'add_touchpoints'
      }
    ],
    quality: [
      {
        title: 'Check mobile and responsive layout',
        detail: 'Review the project on mobile widths and fix spacing, text scale, button alignment and menu behaviour.',
        category: 'mobile',
        estimated_impact: 'high',
        action_key: 'mobile_sweep'
      },
      {
        title: 'Improve page performance',
        detail: 'Look for oversized images, unnecessary assets, slow sections and layout shifts before launch.',
        category: 'performance',
        estimated_impact: 'medium',
        action_key: 'performance_sweep'
      },
      {
        title: 'Review accessibility basics',
        detail: 'Check contrast, alt text, keyboard flow, labels and readable button text.',
        category: 'accessibility',
        estimated_impact: 'medium',
        action_key: 'accessibility_sweep'
      }
    ],
    business_growth: [
      {
        title: 'Strengthen the offer',
        detail: 'Make sure the first screen explains who the business helps, what the offer is and why someone should act now.',
        category: 'conversion',
        estimated_impact: 'high',
        action_key: 'offer_review'
      },
      {
        title: 'Add proof and useful next steps',
        detail: 'Add testimonials, FAQs, service details, contact prompts and trust signals that reduce customer hesitation.',
        category: 'content',
        estimated_impact: 'medium',
        action_key: 'proof_sections'
      },
      {
        title: 'Connect the website to operations',
        detail: 'Check whether the site needs enquiry handling, booking, payment, domain, lead export or support workflows.',
        category: 'operations',
        estimated_impact: 'medium',
        action_key: 'ops_connection'
      }
    ]
  };

  return [...common, ...(maps[type] || maps.business_growth)].map((step, index) => ({ ...step, step_index: index + 1 }));
}

function fallbackPlan(goal, missionType, project) {
  const type = inferMissionType(goal, missionType);
  const projectName = project?.name || project?.data?.businessName || project?.data?.business_name || 'this project';
  return {
    summary: `Goose mission for ${projectName}: ${clean(goal, 220) || 'improve the website and launch route'}.`,
    mission_type: type,
    priority: type === 'launch' || type === 'seo_growth' ? 'high' : 'medium',
    steps: fallbackSteps(type, goal)
  };
}

function normalisePlan(plan, goal, missionType, project) {
  const fallback = fallbackPlan(goal, missionType, project);
  const parsed = plan && typeof plan === 'object' ? plan : {};
  const steps = Array.isArray(parsed.steps) && parsed.steps.length
    ? parsed.steps
    : fallback.steps;
  return {
    summary: clean(parsed.summary || fallback.summary, 600),
    mission_type: inferMissionType(goal, clean(parsed.mission_type || fallback.mission_type, 60)),
    priority: ['high', 'medium', 'low'].includes(clean(parsed.priority, 20)) ? clean(parsed.priority, 20) : fallback.priority,
    steps: steps.slice(0, 8).map((step, index) => ({
      step_index: Number(step.step_index || index + 1),
      title: clean(step.title || `Mission step ${index + 1}`, 140),
      detail: clean(step.detail || step.description || 'Complete this mission step.', 700),
      category: clean(step.category || 'general', 80),
      estimated_impact: ['high', 'medium', 'low'].includes(clean(step.estimated_impact, 20)) ? clean(step.estimated_impact, 20) : 'medium',
      action_key: clean(step.action_key || step.action || '', 80)
    }))
  };
}

async function generateMissionPlan(env, goal, missionType, project) {
  const fallback = fallbackPlan(goal, missionType, project);
  const ai = await callOpenAi(env, [
    {
      role: 'system',
      content: [
        'You are Goose, the PBI website operations agent.',
        'Create a practical mission plan for a UK small-business website, automation or SEO goal.',
        'Return only valid JSON with keys: summary, mission_type, priority, steps.',
        'steps must be an array of 4 to 7 objects with title, detail, category, estimated_impact, action_key.',
        'No hype, no fake claims, no spam SEO. Make the plan operational and useful.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        goal,
        requested_mission_type: missionType,
        project: project ? {
          id: project.id,
          name: project.name,
          status: project.status,
          plan: project.plan,
          billing_status: project.billing_status,
          published: project.published,
          public_slug: project.public_slug,
          data: project.data
        } : null
      }).slice(0, 12000)
    }
  ], safeJson(fallback));

  return normalisePlan(parseJsonObject(ai?.text) || fallback, goal, missionType, project);
}

export async function ensureGooseMissionTables(env) {
  await ensureCoreTables(env);
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS goose_missions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      project_id TEXT,
      goal TEXT NOT NULL,
      mission_type TEXT DEFAULT 'business_growth',
      status TEXT DEFAULT 'active',
      priority TEXT DEFAULT 'medium',
      progress INTEGER DEFAULT 0,
      plan_json TEXT DEFAULT '{}',
      summary TEXT,
      created_by TEXT DEFAULT 'customer',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS goose_mission_steps (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL,
      step_index INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      detail TEXT,
      category TEXT DEFAULT 'general',
      status TEXT DEFAULT 'todo',
      action_key TEXT,
      estimated_impact TEXT DEFAULT 'medium',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  for (const sql of [
    `ALTER TABLE goose_missions ADD COLUMN created_by TEXT DEFAULT 'customer'`,
    `ALTER TABLE goose_missions ADD COLUMN completed_at TEXT`,
    `ALTER TABLE goose_mission_steps ADD COLUMN action_key TEXT`,
    `ALTER TABLE goose_mission_steps ADD COLUMN estimated_impact TEXT DEFAULT 'medium'`
  ]) {
    try { await env.DB.prepare(sql).run(); } catch (_) {}
  }
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_goose_missions_user_id ON goose_missions(user_id)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_goose_missions_project_id ON goose_missions(project_id)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_goose_missions_status ON goose_missions(status)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_goose_mission_steps_mission_id ON goose_mission_steps(mission_id)`).run();
}

async function loadProjectForMission(env, userId, projectId, admin = false) {
  if (!projectId) return null;
  if (admin) {
    const row = await env.DB.prepare(`
      SELECT projects.*, users.email AS user_email
      FROM projects
      LEFT JOIN users ON users.id = projects.user_id
      WHERE projects.id = ?
      LIMIT 1
    `).bind(projectId).first();
    if (!row) return null;
    let data = {};
    try { data = JSON.parse(row.data_json || '{}'); } catch (_) {}
    return { ...row, data };
  }
  return loadProjectContext(env, userId, projectId);
}

export async function createGooseMission(env, { userId, projectId = '', goal, missionType = '', createdBy = 'customer', admin = false }) {
  await ensureGooseMissionTables(env);
  const cleanGoal = clean(goal, 1200);
  if (!cleanGoal || cleanGoal.length < 8) {
    return { ok: false, response: error('Add a clearer mission goal for Goose.', 400) };
  }

  const project = await loadProjectForMission(env, userId, projectId, admin);
  if (projectId && !project) return { ok: false, response: error('Project not found for this mission.', 404) };

  const ownerId = project?.user_id || userId || '';
  const plan = await generateMissionPlan(env, cleanGoal, missionType, project);
  const missionId = id('goose_mission');
  const status = 'active';

  await env.DB.prepare(`
    INSERT INTO goose_missions
      (id, user_id, project_id, goal, mission_type, status, priority, progress, plan_json, summary, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    missionId,
    ownerId,
    project?.id || '',
    cleanGoal,
    plan.mission_type,
    status,
    plan.priority,
    0,
    safeJson(plan),
    plan.summary,
    createdBy
  ).run();

  const statements = plan.steps.map((step) => env.DB.prepare(`
    INSERT INTO goose_mission_steps
      (id, mission_id, step_index, title, detail, category, status, action_key, estimated_impact, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'todo', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id('goose_step'),
    missionId,
    Number(step.step_index || 0),
    step.title,
    step.detail,
    step.category,
    step.action_key,
    step.estimated_impact
  ));
  if (statements.length) await env.DB.batch(statements);

  const mission = await getGooseMission(env, missionId, ownerId, admin);
  return { ok: true, mission };
}

function decorateMission(row, steps) {
  const done = steps.filter((step) => step.status === 'done').length;
  const progress = steps.length ? Math.round((done / steps.length) * 100) : Number(row.progress || 0);
  return {
    ...row,
    progress,
    steps,
    plan: parseJsonObject(row.plan_json) || {},
    project_name: row.project_name || '',
    project_plan: row.project_plan || '',
    user_email: row.user_email || ''
  };
}

export async function listGooseMissions(env, { userId = '', projectId = '', admin = false, limit = 30 } = {}) {
  await ensureGooseMissionTables(env);
  const safeLimit = Math.min(Math.max(Number(limit || 30), 1), 100);
  let rows = [];
  if (admin) {
    rows = (await env.DB.prepare(`
      SELECT goose_missions.*, projects.name AS project_name, projects.plan AS project_plan, users.email AS user_email
      FROM goose_missions
      LEFT JOIN projects ON projects.id = goose_missions.project_id
      LEFT JOIN users ON users.id = goose_missions.user_id
      ORDER BY datetime(goose_missions.updated_at) DESC, datetime(goose_missions.created_at) DESC
      LIMIT ?
    `).bind(safeLimit).all()).results || [];
  } else if (projectId) {
    rows = (await env.DB.prepare(`
      SELECT goose_missions.*, projects.name AS project_name, projects.plan AS project_plan
      FROM goose_missions
      LEFT JOIN projects ON projects.id = goose_missions.project_id
      WHERE goose_missions.user_id = ? AND goose_missions.project_id = ?
      ORDER BY datetime(goose_missions.updated_at) DESC, datetime(goose_missions.created_at) DESC
      LIMIT ?
    `).bind(userId, projectId, safeLimit).all()).results || [];
  } else {
    rows = (await env.DB.prepare(`
      SELECT goose_missions.*, projects.name AS project_name, projects.plan AS project_plan
      FROM goose_missions
      LEFT JOIN projects ON projects.id = goose_missions.project_id
      WHERE goose_missions.user_id = ?
      ORDER BY datetime(goose_missions.updated_at) DESC, datetime(goose_missions.created_at) DESC
      LIMIT ?
    `).bind(userId, safeLimit).all()).results || [];
  }

  const missions = [];
  for (const row of rows) {
    const steps = (await env.DB.prepare(`
      SELECT *
      FROM goose_mission_steps
      WHERE mission_id = ?
      ORDER BY step_index ASC, datetime(created_at) ASC
    `).bind(row.id).all()).results || [];
    missions.push(decorateMission(row, steps));
  }
  return missions;
}

export async function getGooseMission(env, missionId, userId = '', admin = false) {
  await ensureGooseMissionTables(env);
  const row = admin
    ? await env.DB.prepare(`
      SELECT goose_missions.*, projects.name AS project_name, projects.plan AS project_plan, users.email AS user_email
      FROM goose_missions
      LEFT JOIN projects ON projects.id = goose_missions.project_id
      LEFT JOIN users ON users.id = goose_missions.user_id
      WHERE goose_missions.id = ?
      LIMIT 1
    `).bind(missionId).first()
    : await env.DB.prepare(`
      SELECT goose_missions.*, projects.name AS project_name, projects.plan AS project_plan
      FROM goose_missions
      LEFT JOIN projects ON projects.id = goose_missions.project_id
      WHERE goose_missions.id = ? AND goose_missions.user_id = ?
      LIMIT 1
    `).bind(missionId, userId).first();
  if (!row) return null;
  const steps = (await env.DB.prepare(`
    SELECT *
    FROM goose_mission_steps
    WHERE mission_id = ?
    ORDER BY step_index ASC, datetime(created_at) ASC
  `).bind(row.id).all()).results || [];
  return decorateMission(row, steps);
}

async function recomputeMissionProgress(env, missionId) {
  const steps = (await env.DB.prepare(`SELECT status FROM goose_mission_steps WHERE mission_id = ?`).bind(missionId).all()).results || [];
  const done = steps.filter((step) => step.status === 'done').length;
  const progress = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const completed = steps.length && done === steps.length;
  await env.DB.prepare(`
    UPDATE goose_missions
    SET progress = ?,
        status = CASE WHEN ? = 1 THEN 'completed' WHEN status = 'completed' THEN 'active' ELSE status END,
        completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) WHEN status = 'completed' THEN NULL ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(progress, completed ? 1 : 0, completed ? 1 : 0, missionId).run();
}

export async function updateGooseMission(env, { userId = '', missionId, stepId = '', stepStatus = '', missionStatus = '', admin = false }) {
  await ensureGooseMissionTables(env);
  const mission = await getGooseMission(env, missionId, userId, admin);
  if (!mission) return { ok: false, response: error('Mission not found.', 404) };

  if (stepId) {
    const status = clean(stepStatus || 'done', 40);
    if (!STEP_STATUSES.has(status)) return { ok: false, response: error('Unsupported step status.', 400) };
    await env.DB.prepare(`
      UPDATE goose_mission_steps
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND mission_id = ?
    `).bind(status, stepId, missionId).run();
    await recomputeMissionProgress(env, missionId);
  }

  if (missionStatus) {
    const status = clean(missionStatus, 40);
    if (!MISSION_STATUSES.has(status)) return { ok: false, response: error('Unsupported mission status.', 400) };
    await env.DB.prepare(`
      UPDATE goose_missions
      SET status = ?,
          completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, status, missionId).run();
  }

  return { ok: true, mission: await getGooseMission(env, missionId, userId, admin) };
}
