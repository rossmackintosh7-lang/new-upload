
import { json, error } from "../../_lib/json.js";
async function body(request){try{return await request.json()}catch{return {}}}
async function ensure(env){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS published_project_sections (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, section_order INTEGER DEFAULT 0, section_type TEXT NOT NULL, title TEXT, text TEXT, button TEXT, image TEXT, layout TEXT DEFAULT 'standard', background TEXT DEFAULT '#fff8f1', accent TEXT DEFAULT '#bf5c29', padding TEXT DEFAULT 'comfortable', align TEXT DEFAULT 'left', hidden INTEGER DEFAULT 0, body_json TEXT, published_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
 await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_published_project_sections_project_id ON published_project_sections(project_id)`).run();
}
export async function onRequestPost({request,env}){
 if(!env.DB)return error('Database binding missing.',500); await ensure(env);
 const data=await body(request), projectId=String(data.project_id||data.project||''); if(!projectId)return error('Missing project_id.',400);
 await env.DB.prepare(`DELETE FROM published_project_sections WHERE project_id=?`).bind(projectId).run();
 const rows=await env.DB.prepare(`SELECT * FROM project_sections WHERE project_id=? ORDER BY section_order ASC, created_at ASC`).bind(projectId).all();
 const sections=rows.results||[];
 for(let i=0;i<sections.length;i++){
  const s=sections[i];
  await env.DB.prepare(`INSERT INTO published_project_sections (id,project_id,section_order,section_type,title,text,button,image,layout,background,accent,padding,align,hidden,body_json,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(crypto.randomUUID(),projectId,i,s.section_type,String(s.title||''),String(s.text||''),String(s.button||''),String(s.image||''),String(s.layout||'standard'),String(s.background||'#fff8f1'),String(s.accent||'#bf5c29'),String(s.padding||'comfortable'),String(s.align||'left'),s.hidden?1:0,s.body_json||JSON.stringify(s)).run();
 }
 for(const table of ['projects','user_projects']){try{await env.DB.prepare(`UPDATE ${table} SET status='published', updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(projectId).run()}catch{}}
 return json({ok:true,project_id:projectId,sections_published:sections.length,published_at:new Date().toISOString()});
}
