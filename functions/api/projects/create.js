import { json, error } from '../../_lib/json.js';
import { requireUser, ensureCoreTables } from '../../_lib/auth.js';
import { cleanPlan, enforceProjectPackage } from '../../_lib/package-rules.js';

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = crypto.randomUUID();
  const plan = cleanPlan(body.plan || 'starter');
  const name = String(body.name || body.project_name || 'New PBI website').slice(0, 160);
  const template = String(body.template || body.preset || 'cafe').slice(0, 80);
  const data = enforceProjectPackage({
    project_id: id,
    business_name: name,
    templateId: template,
    template,
    plan,
    package: plan,
    selected_pages: ['home','about','services','gallery','contact'],
    pages: {
      home:{ label:'Home', title:name, body:'Start building your website.' },
      about:{ label:'About', title:`About ${name}`, body:'Tell visitors what makes this business trustworthy.' },
      services:{ label:'Services', title:'Services', body:'Show your main services.' },
      gallery:{ label:'Gallery', title:'Gallery', body:'Show proof and atmosphere.' },
      contact:{ label:'Contact', title:'Contact', body:'Make the next step easy.' }
    },
    blocksByPage: {}
  }, plan);

  await env.DB.prepare(`INSERT INTO projects (id, user_id, name, status, data_json, plan, billing_status, published, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', ?, ?, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, auth.user.id, name, JSON.stringify(data), plan).run();

  return json({ ok:true, project:{ id, name, plan, template, status:'draft' } });
}
