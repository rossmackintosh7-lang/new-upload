import { json, error, readBody, getUserFromSession } from '../projects/_shared.js';
import { sendEmail, escapeHtml, formatMultiline } from '../../_lib/email.js';

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);
  if (!user) return error('Unauthorized.', 401);

  const body = await readBody(request);
  const projectId = String(body.project_id || '').trim();
  const message = String(body.message || '').trim();
  if (!projectId) return error('Missing project id.', 400);
  if (!message) return error('Please enter a message.', 400);

  const project = await env.DB.prepare('SELECT id, name, data_json FROM projects WHERE id = ? AND user_id = ? LIMIT 1').bind(projectId, user.id).first();
  if (!project) return error('Project not found.', 404);

  let data = {};
  try { data = typeof project.data_json === 'string' ? JSON.parse(project.data_json || '{}') : {}; } catch { data = {}; }
  if (data.assisted_setup_paid !== true) return error('Assisted setup has not been paid for on this project yet.', 402);

  const notifyTo = env.CUSTOM_BUILD_NOTIFY_TO || 'info@purbeckbusinessinnovations.co.uk';
  const subject = `PBI assisted setup request: ${project.name || 'Untitled website'}`;
  const snapshot = JSON.stringify({ project_id: project.id, project_name: project.name, data }, null, 2);

  const result = await sendEmail(env, {
    to: notifyTo,
    replyTo: user.email,
    subject,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111"><h2>Assisted setup request</h2><p><strong>Customer:</strong> ${escapeHtml(user.email)}</p><p><strong>Project:</strong> ${escapeHtml(project.name || project.id)}</p><h3>Message</h3><p>${formatMultiline(message)}</p><h3>Current project snapshot</h3><pre style="white-space:pre-wrap;background:#f6f2ec;padding:16px;border-radius:12px">${escapeHtml(snapshot)}</pre></div>`,
    text: `Assisted setup request\nCustomer: ${user.email}\nProject: ${project.name || project.id}\n\nMessage:\n${message}\n\nProject snapshot:\n${snapshot}`
  });

  if (!result.ok) return error('Could not send assisted setup request email.', 500);
  return json({ ok: true, message: 'Assisted setup request sent.' });
}

export async function onRequestGet() { return error('Method not allowed.', 405); }
