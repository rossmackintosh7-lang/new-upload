import {
  json,
  requireUser,
  readJson,
  createGooseMission,
  listGooseMissions,
  updateGooseMission
} from './_shared.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const missions = await listGooseMissions(env, {
    userId: auth.user.id,
    projectId: url.searchParams.get('project_id') || '',
    limit: url.searchParams.get('limit') || 30
  });
  return json({ ok: true, missions });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request) || {};
  const result = await createGooseMission(env, {
    userId: auth.user.id,
    projectId: String(body.project_id || body.projectId || '').trim(),
    goal: body.goal || body.message || body.prompt,
    missionType: String(body.mission_type || body.type || '').trim(),
    createdBy: 'customer'
  });
  if (!result.ok) return result.response;
  return json({ ok: true, mission: result.mission });
}
export async function onRequestPatch({ request, env }) {
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request) || {};
  const result = await updateGooseMission(env, {
    userId: auth.user.id,
    missionId: String(body.mission_id || body.id || '').trim(),
    stepId: String(body.step_id || '').trim(),
    stepStatus: String(body.step_status || '').trim(),
    missionStatus: String(body.status || body.mission_status || '').trim()
  });
  if (!result.ok) return result.response;
  return json({ ok: true, mission: result.mission });
}
