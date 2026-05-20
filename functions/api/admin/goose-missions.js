import { json, error, requireAdmin, audit } from './_shared.js';
import {
  readJson,
  createGooseMission,
  listGooseMissions,
  updateGooseMission,
  ensureGooseMissionTables
} from '../goose/_shared.js';

async function projectOwner(env, projectId) {
  if (!projectId) return '';
  try {
    const row = await env.DB.prepare(`SELECT user_id FROM projects WHERE id = ? LIMIT 1`).bind(projectId).first();
    return row?.user_id || '';
  } catch {
    return '';
  }
}

function missionStats(missions = []) {
  const active = missions.filter((mission) => mission.status === 'active' || mission.status === 'planning').length;
  const approval = missions.filter((mission) => mission.status === 'needs_approval').length;
  const completed = missions.filter((mission) => mission.status === 'completed').length;
  const avgProgress = missions.length
    ? Math.round(missions.reduce((sum, mission) => sum + Number(mission.progress || 0), 0) / missions.length)
    : 0;
  return {
    total: missions.length,
    active,
    needs_approval: approval,
    completed,
    avg_progress: avgProgress
  };
}

export async function onRequestGet({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  await ensureGooseMissionTables(env);
  const url = new URL(request.url);
  const missions = await listGooseMissions(env, {
    admin: true,
    limit: url.searchParams.get('limit') || 100
  });
  return json({ ok: true, missions, stats: missionStats(missions) });
}

export async function onRequestPost({ request, env }) {
  const { response, admin } = await requireAdmin(env, request);
  if (response) return response;
  const body = await readJson(request) || {};
  const projectId = String(body.project_id || body.projectId || '').trim();
  const userId = String(body.user_id || '').trim() || await projectOwner(env, projectId) || admin.id;
  const result = await createGooseMission(env, {
    userId,
    projectId,
    goal: body.goal || body.message || body.prompt,
    missionType: String(body.mission_type || body.type || '').trim(),
    createdBy: `admin:${admin.email || admin.id}`,
    admin: true
  });
  if (!result.ok) return result.response;
  await audit(env, admin, 'goose_mission_create', { mission_id: result.mission.id, project_id: projectId, user_id: userId });
  return json({ ok: true, mission: result.mission });
}

export async function onRequestPatch({ request, env }) {
  const { response, admin } = await requireAdmin(env, request);
  if (response) return response;
  const body = await readJson(request) || {};
  const missionId = String(body.mission_id || body.id || '').trim();
  if (!missionId) return error('Mission id is required.', 400);
  const result = await updateGooseMission(env, {
    missionId,
    stepId: String(body.step_id || '').trim(),
    stepStatus: String(body.step_status || '').trim(),
    missionStatus: String(body.status || body.mission_status || '').trim(),
    admin: true
  });
  if (!result.ok) return result.response;
  await audit(env, admin, 'goose_mission_update', {
    mission_id: missionId,
    step_id: body.step_id || '',
    status: body.status || body.mission_status || '',
    step_status: body.step_status || ''
  });
  return json({ ok: true, mission: result.mission });
}
