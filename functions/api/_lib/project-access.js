import { ensureCoreTables } from '../projects/_shared.js';

export const ACTIVE_BILLING_STATUSES = new Set(['active', 'trialing', 'not_required']);

export async function ensureCollaborationTables(env) {
  if (!env?.DB) throw new Error('D1 database binding DB is missing.');

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_collaborators (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'editor',
      status TEXT DEFAULT 'invited',
      invite_token TEXT,
      invited_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      accepted_at TEXT
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_presence (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT,
      page TEXT,
      block TEXT,
      seen_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_collab_notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      page TEXT,
      text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const alters = [
    `ALTER TABLE project_collaborators ADD COLUMN invite_token TEXT`,
    `ALTER TABLE project_collaborators ADD COLUMN invited_by TEXT`,
    `ALTER TABLE project_collaborators ADD COLUMN accepted_at TEXT`
  ];
  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch (_) {}
  }

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON project_collaborators(project_id)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_project_collaborators_email ON project_collaborators(email)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_project_presence_project ON project_presence(project_id, seen_at)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_project_notes_project ON project_collab_notes(project_id, created_at)`).run();
}

function roleCanEdit(role) {
  return ['owner', 'editor'].includes(String(role || '').toLowerCase());
}

export async function getProjectAccess(env, projectId, user, options = {}) {
  if (!env?.DB) return { ok: false, status: 500, error: 'D1 database binding DB is missing.' };
  if (!user?.id) return { ok: false, status: 401, error: 'Log in first.' };

  const id = String(projectId || '').trim();
  if (!id) return { ok: false, status: 400, error: 'Missing project_id.' };

  await ensureCoreTables(env);
  await ensureCollaborationTables(env);

  const project = await env.DB.prepare(`SELECT * FROM projects WHERE id = ? LIMIT 1`).bind(id).first();
  if (!project) return { ok: false, status: 404, error: 'Project not found.' };

  if (project.user_id === user.id) {
    return {
      ok: true,
      project,
      role: 'owner',
      ownerId: project.user_id,
      canView: true,
      canEdit: true,
      canPublish: true,
      isOwner: true
    };
  }

  const collaborator = await env.DB.prepare(`
    SELECT *
    FROM project_collaborators
    WHERE project_id = ?
      AND lower(email) = lower(?)
      AND status IN ('invited', 'accepted')
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(id, user.email || '').first();

  if (!collaborator) return { ok: false, status: 403, error: 'You do not have access to this project.' };

  if (collaborator.status === 'invited') {
    try {
      await env.DB.prepare(`
        UPDATE project_collaborators
        SET status = 'accepted', accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(collaborator.id).run();
      collaborator.status = 'accepted';
    } catch (_) {}
  }

  const role = String(collaborator.role || 'viewer').toLowerCase();
  const access = {
    ok: true,
    project,
    collaborator,
    role,
    ownerId: project.user_id,
    canView: true,
    canEdit: roleCanEdit(role),
    canPublish: false,
    isOwner: false
  };

  if (options.requireOwner) return { ok: false, status: 403, error: 'Only the project owner can do that.' };
  if (options.requireEdit && !access.canEdit) return { ok: false, status: 403, error: 'Viewer access cannot edit this project.' };
  return access;
}

export function paymentRequired(env) {
  return env?.PBI_REQUIRE_PAYMENT_TO_PUBLISH !== 'false';
}

export function hasPublishBilling(project, env) {
  if (!paymentRequired(env)) return true;
  return ACTIVE_BILLING_STATUSES.has(String(project?.billing_status || '').toLowerCase());
}
