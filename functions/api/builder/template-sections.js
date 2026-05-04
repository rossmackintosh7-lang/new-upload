import { json, readBody } from '../projects/_shared.js';

const PLAN_RANK = { starter: 1, business: 2, plus: 3 };
const ALL_TYPES = ['navBar','splitHero','hero','trustBand','logoCloud','services','process','featureGrid','stats','gallery','testimonial','pricing','productGrid','cmsList','faq','map','booking','contact','retail','cta','spacer'];
function uuid(){ return crypto.randomUUID(); }
function body(v){ return JSON.stringify(v || {}); }
function normaliseKey(value){
  value = String(value || '').toLowerCase().replace(/_/g,'-');
  if (['cafe','restaurant','food'].includes(value)) return 'cafe';
  if (['trades','trade','tradesperson','contractor'].includes(value)) return 'trades';
  if (['salon','beauty','wellness'].includes(value)) return 'salon';
  if (['shop','retail','store'].includes(value)) return 'shop';
  if (['holiday-let','holiday','glamping','stay'].includes(value)) return 'holiday-let';
  return 'consultant';
}
function cleanPlan(value){ value = String(value || '').toLowerCase(); return PLAN_RANK[value] ? value : 'starter'; }
function sectionMinPlan(type){
  return ({
    logoCloud:'business', featureGrid:'business', stats:'business', gallery:'business', pricing:'business', booking:'business', map:'business', cta:'business',
    testimonial:'plus', faq:'plus', productGrid:'plus', cmsList:'plus', retail:'plus'
  })[type] || 'starter';
}
function planAllows(plan, min){ return PLAN_RANK[cleanPlan(plan)] >= PLAN_RANK[cleanPlan(min)]; }
function filterSectionsForPlan(sections, plan){
  const p = cleanPlan(plan);
  return (sections || []).filter(s => planAllows(p, sectionMinPlan(s.section_type || s.type))).map((s) => {
    const out = { ...s };
    if (p === 'starter') out.image = '';
    return out;
  });
}

const palette = {
  cafe: { bg:'#fff4eb', soft:'#f6efe7', accent:'#b85f32', deep:'#2d160d', image:'/assets/demo-media/cafe-hero.jpg', gallery:['/assets/demo-media/cafe-1.jpg','/assets/demo-media/cafe-2.jpg','/assets/demo-media/cafe-3.jpg'] },
  trades: { bg:'#f3f7f4', soft:'#edf3ef', accent:'#256b5b', deep:'#173f35', image:'/assets/demo-media/trades-hero.jpg', gallery:['/assets/demo-media/trades-1.jpg','/assets/demo-media/trades-2.jpg','/assets/demo-media/trades-3.jpg'] },
  salon: { bg:'#fff0ed', soft:'#f7eceb', accent:'#b85f70', deep:'#402027', image:'/assets/demo-media/salon-hero.jpg', gallery:['/assets/demo-media/salon-1.jpg','/assets/demo-media/salon-2.jpg','/assets/demo-media/salon-3.jpg'] },
  consultant: { bg:'#fff8f1', soft:'#f6efe7', accent:'#24556c', deep:'#1e3d4d', image:'/assets/demo-media/consultant-hero.jpg', gallery:['/assets/demo-media/consultant-1.jpg','/assets/demo-media/consultant-2.jpg','/assets/demo-media/consultant-3.jpg'] },
  shop: { bg:'#fff8cf', soft:'#fff4df', accent:'#111111', deep:'#261c05', image:'/assets/demo-media/shop-hero.jpg', gallery:['/assets/demo-media/shop-1.jpg','/assets/demo-media/shop-2.jpg','/assets/demo-media/shop-3.jpg'] },
  'holiday-let': { bg:'#edf6f5', soft:'#fff8f1', accent:'#238081', deep:'#173f45', image:'/assets/demo-media/holiday-let-hero.jpg', gallery:['/assets/demo-media/holiday-let-1.jpg','/assets/demo-media/holiday-let-2.jpg','/assets/demo-media/holiday-let-3.jpg'] }
};
const copy = {
  cafe: { name:'Purbeck Table', hero:'A warm, image-led café website with bookings and local charm.', intro:'Show atmosphere, menu highlights, opening times and the next booking step without clutter.', cta:'Book a table', services:['Breakfast & brunch','Fresh coffee','Takeaway treats'] },
  trades: { name:'Purbeck Trade Co', hero:'A trustworthy local service website that drives quote requests.', intro:'Make service areas, proof, repairs and enquiry routes obvious from the first scroll.', cta:'Request a quote', services:['Repairs','Installations','Maintenance'] },
  salon: { name:'Coastal Salon', hero:'A calm salon website for treatments, bookings and trust.', intro:'Present services, prices, gallery details and appointment routes in a polished mobile-first flow.', cta:'Book appointment', services:['Hair styling','Beauty treatments','Wellness care'] },
  consultant: { name:'Mackintosh Projects', hero:'A polished service website that builds authority and enquiries.', intro:'Explain expertise, outcomes, proof and the practical route to a first conversation.', cta:'Book a call', services:['Strategy sessions','Operational systems','Ongoing support'] },
  shop: { name:'Purbeck Provisions', hero:'A clean retail website with products, proof and a checkout path.', intro:'Highlight product value, trust, checkout routes and customer support in one guided experience.', cta:'Shop now', services:['Gift boxes','Local favourites','Seasonal picks'] },
  'holiday-let': { name:'Purbeck View Stay', hero:'A visual stay website with amenities, area info and enquiry flow.', intro:'Show the setting, practical details, guest confidence and availability route before customers have to ask.', cta:'Check availability', services:['Coastal stays','Guest amenities','Local guide'] }
};
function row(key, s, i){ return { id:`${key}_${s.section_type}_${i}_${uuid()}`, section_order:i, type:s.section_type, layout:s.layout || 'standard', padding:s.padding || 'comfortable', align:s.align || 'left', hidden:0, animation:s.animation || 'rise', radius:s.radius || 'soft', visibility:'all', body_json:s.body_json || body(s), ...s }; }
function cardsFor(key){ const c = copy[key] || copy.consultant; return c.services.map(title => ({ title, text:`${title} explained as a clear customer benefit with one simple next step.` })); }
function featuresFor(key){
  if (key === 'trades') return ['Service area clear','Quote route visible','Trust signals upfront','Emergency info easy to find'];
  if (key === 'shop') return ['Products easy to scan','Checkout route ready','Support visible','Offers presented cleanly'];
  if (key === 'holiday-let') return ['Stay shown visually','Amenities clear','Booking route simple','Local reasons to visit'];
  return ['Offer clear in seconds','Proof built into the flow','Mobile-first section order','Customer action repeated'];
}
function processFor(key){
  if (key === 'shop') return [{title:'Browse',text:'Show products and categories cleanly.'},{title:'Choose',text:'Explain value and suitability.'},{title:'Buy',text:'Send customers into a clear checkout route.'}];
  if (key === 'holiday-let') return [{title:'View',text:'Lead with the stay and setting.'},{title:'Check',text:'Show amenities, dates and suitability.'},{title:'Enquire',text:'Make availability questions simple.'}];
  return [{title:'Understand',text:'Customers see what you do quickly.'},{title:'Trust',text:'Useful proof removes hesitation.'},{title:'Act',text:'The next step is obvious.'}];
}
function faqsFor(key){
  if (key === 'shop') return [{q:'Can customers buy online?',a:'Yes, Plus retail sections connect into shop and checkout tools.'},{q:'Can products change?',a:'Yes, products and sections can be edited as the business changes.'},{q:'When do I pay?',a:'Build free, then pay only when ready to publish.'}];
  return [{q:'Can this be edited later?',a:'Yes, sections can be changed, reordered, hidden or expanded.'},{q:'Is it mobile-friendly?',a:'Yes, the section layouts are designed for phone and desktop viewing.'},{q:'When does payment happen?',a:'Customers build free and choose a package at publish.'}];
}
function sectionText(items){ return items.map((item)=>`${item.title}::${item.text}`).join('|'); }
function premiumTemplate(key){
  key = normaliseKey(key);
  const p = palette[key] || palette.consultant;
  const c = copy[key] || copy.consultant;
  const features = featuresFor(key);
  const sections = [
    { section_type:'navBar', title:c.name, text:'Home|Services|Proof|Questions|Contact', button:c.cta, image:'/assets/pbi-header-logo-no-bg-20260502c.png?v=20260502c', layout:'standard', background:'#fffdf8', accent:p.accent, padding:'compact', radius:'pill', animation:'none' },
    { section_type:'splitHero', title:c.hero, text:c.intro, button:c.cta, image:p.image, layout:'split', background:p.bg, accent:p.accent, padding:'spacious', align:'left', body_json:body({ eyebrow:'Premium starting layout', visual:'framed' }) },
    { section_type:'trustBand', title:'Customer confidence at a glance', text:'Clear offer::Visitors understand what you do quickly|Proof built in::Trust appears before hesitation|Easy next step::The action is obvious', button:'', image:'', layout:'cards', background:'#ffffff', accent:p.accent, padding:'compact', align:'center', animation:'fade' },
    { section_type:'logoCloud', title:'Designed for real local businesses', text:'Cafés|Trades|Salons|Retail|Consultants|Holiday lets', button:'', image:'', layout:'centered', background:p.soft, accent:p.accent, padding:'compact', align:'center', animation:'fade' },
    { section_type:'services', title:'What customers can do here', text:sectionText(cardsFor(key)), button:'View services', image:'', layout:'cards', background:p.soft, accent:p.accent, padding:'comfortable', body_json:body({ cards:cardsFor(key), cardStyle:'elevated' }) },
    { section_type:'process', title:'A simple route from interest to action', text:sectionText(processFor(key)), button:'', image:'', layout:'cards', background:p.bg, accent:p.accent, padding:'comfortable', animation:'slide', body_json:body({ steps:processFor(key) }) },
    { section_type:'featureGrid', title:'Why this website flow works', text:features.map(item => `${item}::A focused proof point written for quick scanning.`).join('|'), button:'', image:'', layout:'bento', background:'#ffffff', accent:p.accent, padding:'comfortable', body_json:body({ cards:features.map(item => ({ title:item, text:'A focused proof point written for quick scanning.', icon:'✓' })) }) },
    { section_type:'gallery', title:'A visual feel for the business', text:p.gallery.join('|'), button:'', image:p.gallery[0], layout:'masonry', background:p.soft, accent:p.accent, padding:'comfortable', align:'center', animation:'scale' },
    { section_type:'testimonial', title:'Proof that feels human', text:'“Clear, useful and easy to navigate. The website explains the offer properly and makes the next step simple.”', button:'', image:'', layout:'centered', background:p.deep, accent:'#f2b66d', padding:'spacious', align:'center', animation:'fade' },
    { section_type:'faq', title:'Helpful answers before customers ask', text:faqsFor(key).map(f => `${f.q}|${f.a}`).join('\n'), button:'Ask a question', image:'', layout:'standard', background:p.bg, accent:p.accent, padding:'comfortable', body_json:body({ items:faqsFor(key) }) },
    { section_type:key==='cafe'||key==='consultant'?'booking':key==='holiday-let'?'map':'contact', title:key==='holiday-let'?'Local area and arrival details':key==='cafe'?'Make booking feel simple':'Make the next step simple', text:'Give customers a clean route to call, book, check availability, send an enquiry or visit the business.', button:c.cta, image:p.image, layout:'spotlight', background:p.soft, accent:p.accent, padding:'comfortable', align:'center' },
    { section_type:'pricing', title:'Choose a package at publish', text:'Starter::£12.99/month::Simple launch tools|Business::£24.99/month::More sections, images and SEO support|Plus::£39.99/month::Retail, AI and premium controls', button:'Compare packages', image:'', layout:'cards', background:'#fffdf8', accent:p.accent, padding:'comfortable' },
    { section_type:'cta', title:'Build free, publish when ready', text:'Customers can shape the site first, then choose the right package only when the website is ready to go live.', button:'Continue to publish', image:'', layout:'centered', background:p.accent, accent:'#ffffff', padding:'spacious', align:'center', animation:'scale' }
  ];
  if (key === 'shop') sections.splice(7,0,{ section_type:'productGrid', title:'Products customers can scan quickly', text:'Local favourite::£12::Short product highlight|Gift bundle::£24::Good for gifting or repeat orders|Seasonal pick::£18::Limited or current offer', button:'Shop now', image:p.image, layout:'cards', background:p.bg, accent:p.accent, padding:'comfortable' });
  if (key === 'consultant') sections.splice(8,0,{ section_type:'cmsList', title:'Latest insights and case studies', text:'Case study::How the business helped a customer|Guide::What to know before getting started|Update::A useful piece of local news', button:'Read more', image:'', layout:'cards', background:p.soft, accent:p.accent, padding:'comfortable' });
  return sections.filter((s) => ALL_TYPES.includes(s.section_type)).map((s,i)=>row(key,s,i));
}
async function projectPlan(env, projectId, fallback='starter'){
  const fb = cleanPlan(fallback);
  if(!env?.DB || !projectId) return fb;
  for (const table of ['projects','user_projects','pbi_projects']) {
    try { const r = await env.DB.prepare(`SELECT plan FROM ${table} WHERE id=? LIMIT 1`).bind(projectId).first(); if (r?.plan) return cleanPlan(r.plan); } catch (_) {}
  }
  return fb;
}
async function ensure(env){
  if (!env?.DB) return false;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS project_sections (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,section_order INTEGER DEFAULT 0,section_type TEXT NOT NULL,title TEXT,text TEXT,button TEXT,image TEXT,layout TEXT DEFAULT 'standard',background TEXT DEFAULT '#fff8f1',accent TEXT DEFAULT '#bf5c29',padding TEXT DEFAULT 'comfortable',align TEXT DEFAULT 'left',hidden INTEGER DEFAULT 0,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
  return true;
}
export async function onRequestGet({ request }){
  const u = new URL(request.url);
  const key = normaliseKey(u.searchParams.get('template') || u.searchParams.get('template_key') || 'consultant');
  const plan = cleanPlan(u.searchParams.get('plan') || 'starter');
  return json({ ok:true, template_key:key, sections:filterSectionsForPlan(premiumTemplate(key), plan) });
}
export async function onRequestPost({ request, env }){
  const b = await readBody(request);
  const key = normaliseKey(b.template_key || b.template || 'consultant');
  const project = String(b.project_id || '');
  const plan = await projectPlan(env, project, b.plan || 'starter');
  const sections = filterSectionsForPlan(premiumTemplate(key), plan);
  if (!project || !env?.DB) return json({ ok:true, template_key:key, sections });
  try {
    await ensure(env);
    const ex = await env.DB.prepare(`SELECT COUNT(*) count FROM project_sections WHERE project_id=?`).bind(project).first();
    if (!b.force && ex?.count > 0) {
      const r = await env.DB.prepare(`SELECT * FROM project_sections WHERE project_id=? ORDER BY section_order ASC`).bind(project).all();
      return json({ ok:true, existing:true, sections:filterSectionsForPlan(r.results || [], plan) });
    }
    await env.DB.prepare(`DELETE FROM project_sections WHERE project_id=?`).bind(project).run();
    for (const s of sections) {
      await env.DB.prepare(`INSERT INTO project_sections (id,project_id,section_order,section_type,title,text,button,image,layout,background,accent,padding,align,hidden,body_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(s.id,project,s.section_order,s.section_type,s.title,s.text,s.button,s.image,s.layout,s.background,s.accent,s.padding,s.align,s.hidden,s.body_json || body(s)).run();
    }
  } catch (_) {}
  return json({ ok:true, template_key:key, sections });
}
