
import { json } from '../projects/_shared.js';

async function tableReady(env, name) {
  try {
    if (!env?.DB) return false;
    const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(name).first();
    return Boolean(row?.name);
  } catch (_) {
    return false;
  }
}

export async function onRequestGet({ env }) {
  const tables = {
    users: await tableReady(env, 'users'),
    projects: await tableReady(env, 'projects'),
    project_canvas: await tableReady(env, 'project_canvas'),
    project_cms_entries: await tableReady(env, 'project_cms_entries'),
    project_collaborators: await tableReady(env, 'project_collaborators')
  };
  return json({
    ok: true,
    db_ready: Object.values(tables).every(Boolean),
    tables,
    auth_endpoint: true,
    journey_checks: [
      'Signup and login routes reachable',
      'Existing users can continue from package selection',
      'Builder can save draft before publish',
      'Canvas publish is payment-gated',
      'Public renderer only serves published websites',
      'CMS entries can publish to clean collection URLs'
    ],
    notes: 'This preflight checks infrastructure. Still run one manual Stripe test checkout before taking real customers.'
  });
}
