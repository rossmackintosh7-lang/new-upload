
import { json, error } from "../../_lib/json.js";
async function body(request){try{return await request.json()}catch{return {}}}

const PLAN_RANK = { starter: 1, business: 2, plus: 3 };
function cleanPlan(value){ value = String(value || '').toLowerCase(); return PLAN_RANK[value] ? value : 'starter'; }
function sectionMinPlan(type){ return ({ gallery:'business', featureGrid:'business', cta:'business', testimonial:'plus', faq:'plus', retail:'plus' })[type] || 'starter'; }
function planAllows(plan,min){ return PLAN_RANK[cleanPlan(plan)] >= PLAN_RANK[cleanPlan(min)]; }
function filterSectionsForPlan(sections, plan){ const p=cleanPlan(plan); return (sections||[]).filter(s=>planAllows(p, sectionMinPlan(s.section_type||s.type))).map(s=>{ const out={...s}; if(p==='starter') out.image=''; return out; }); }
async function projectPlan(env, projectId, fallback='starter'){
  const fb = cleanPlan(fallback);
  if(!env?.DB || !projectId) return fb;
  for (const table of ['projects','user_projects','pbi_projects']) {
    try { const row = await env.DB.prepare(`SELECT plan FROM ${table} WHERE id=? LIMIT 1`).bind(projectId).first(); if(row?.plan) return cleanPlan(row.plan); } catch {}
  }
  return fb;
}

async function ensure(env){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS published_project_sections (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, section_order INTEGER DEFAULT 0, section_type TEXT NOT NULL, title TEXT, text TEXT, button TEXT, image TEXT, layout TEXT DEFAULT 'standard', background TEXT DEFAULT '#fff8f1', accent TEXT DEFAULT '#bf5c29', padding TEXT DEFAULT 'comfortable', align TEXT DEFAULT 'left', hidden INTEGER DEFAULT 0, body_json TEXT, published_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
 await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_published_project_sections_project_id ON published_project_sections(project_id)`).run();
}
export async function onRequestPost({request,env}){
 if(!env.DB)return error('Database binding missing.',500); await ensure(env);
 const data=await body(request), projectId=String(data.project_id||data.project||''); if(!projectId)return error('Missing project_id.',400);
 const plan = await projectPlan(env, projectId, data.plan || 'starter');
 await env.DB.prepare(`DELETE FROM published_project_sections WHERE project_id=?`).bind(projectId).run();
 const rows=await env.DB.prepare(`SELECT * FROM project_sections WHERE project_id=? ORDER BY section_order ASC, created_at ASC`).bind(projectId).all();
 const sections=filterSectionsForPlan(rows.results||[], plan);
 for(let i=0;i<sections.length;i++){
  const s=sections[i];
  await env.DB.prepare(`INSERT INTO published_project_sections (id,project_id,section_order,section_type,title,text,button,image,layout,background,accent,padding,align,hidden,body_json,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(crypto.randomUUID(),projectId,i,s.section_type,String(s.title||''),String(s.text||''),String(s.button||''),String(s.image||''),String(s.layout||'standard'),String(s.background||'#fff8f1'),String(s.accent||'#bf5c29'),String(s.padding||'comfortable'),String(s.align||'left'),s.hidden?1:0,s.body_json||JSON.stringify(s)).run();
 }
 for(const table of ['projects','user_projects']){try{await env.DB.prepare(`UPDATE ${table} SET status='published', updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(projectId).run()}catch{}}
 return json({ok:true,project_id:projectId,sections_published:sections.length,published_at:new Date().toISOString()});
}
