import { json, readBody } from '../projects/_shared.js';

const PLAN_RANK = { starter: 1, business: 2, plus: 3 };
function cleanPlan(value) { value = String(value || '').toLowerCase(); return PLAN_RANK[value] ? value : 'starter'; }
function sectionMinPlan(type) { return ({ gallery: 'business', featureGrid: 'business', stats: 'business', cta: 'business', testimonial: 'plus', faq: 'plus', retail: 'plus' })[type] || 'starter'; }
function planAllows(plan, min) { return PLAN_RANK[cleanPlan(plan)] >= PLAN_RANK[cleanPlan(min)]; }
function filterSectionsForPlan(sections, plan) {
  const p = cleanPlan(plan);
  return (sections || []).filter((s) => planAllows(p, sectionMinPlan(s.section_type || s.type))).map((s) => {
    const out = { ...s };
    if (p === 'starter' && !['hero', 'splitHero'].includes(out.section_type)) out.image = '';
    return out;
  });
}
function normaliseKey(value) {
  value = String(value || '').toLowerCase();
  if (['cafe', 'trades', 'salon', 'consultant', 'shop', 'holiday-let'].includes(value)) return value;
  if (value.includes('holiday')) return 'holiday-let';
  if (value.includes('trade')) return 'trades';
  if (value.includes('shop') || value.includes('retail')) return 'shop';
  if (value.includes('salon') || value.includes('beauty')) return 'salon';
  if (value.includes('cafe') || value.includes('food')) return 'cafe';
  return 'consultant';
}
function uuid() { return crypto.randomUUID(); }
function body(value) { return JSON.stringify(value || {}); }

const palette = {
  cafe: { accent: '#b85f32', bg: '#fff4eb', soft: '#f6efe7', deep: '#2d160d', image: '/assets/demo-media/cafe-hero.jpg', gallery: ['/assets/demo-media/cafe-1.jpg', '/assets/demo-media/cafe-2.jpg', '/assets/demo-media/cafe-3.jpg'] },
  trades: { accent: '#256b5b', bg: '#f3f7f4', soft: '#edf3ef', deep: '#173f35', image: '/assets/demo-media/trades-hero.jpg', gallery: ['/assets/demo-media/trades-1.jpg', '/assets/demo-media/trades-2.jpg', '/assets/demo-media/trades-3.jpg'] },
  salon: { accent: '#b85f70', bg: '#fff0ed', soft: '#f7eceb', deep: '#402027', image: '/assets/demo-media/salon-hero.jpg', gallery: ['/assets/demo-media/salon-1.jpg', '/assets/demo-media/salon-2.jpg', '/assets/demo-media/salon-3.jpg'] },
  consultant: { accent: '#24556c', bg: '#fff8f1', soft: '#f6efe7', deep: '#1e3d4d', image: '/assets/demo-media/consultant-hero.jpg', gallery: ['/assets/demo-media/consultant-1.jpg', '/assets/demo-media/consultant-2.jpg', '/assets/demo-media/consultant-3.jpg'] },
  shop: { accent: '#111111', bg: '#fff8cf', soft: '#fff4df', deep: '#261c05', image: '/assets/demo-media/shop-hero.jpg', gallery: ['/assets/demo-media/shop-1.jpg', '/assets/demo-media/shop-2.jpg', '/assets/demo-media/shop-3.jpg'] },
  'holiday-let': { accent: '#238081', bg: '#edf6f5', soft: '#fff8f1', deep: '#173f45', image: '/assets/demo-media/holiday-let-hero.jpg', gallery: ['/assets/demo-media/holiday-let-1.jpg', '/assets/demo-media/holiday-let-2.jpg', '/assets/demo-media/holiday-let-3.jpg'] }
};

const copy = {
  cafe: { name: 'Harbour Table', hero: 'Fresh local food, good coffee and a warm welcome.', intro: 'A relaxed café and brunch spot serving seasonal dishes, house-baked treats and quality coffee by the coast.', cta: 'Book a table', services: ['Breakfast & brunch', 'Fresh pastries', 'Takeaway coffee'] },
  trades: { name: 'South Coast Plumbing & Heating', hero: 'Reliable local plumbing and heating services you can trust.', intro: 'A clear, trustworthy website for services, quotes, local reputation and customer confidence.', cta: 'Request a quote', services: ['Boiler installs', 'Bathroom fitting', 'Emergency repairs'] },
  salon: { name: 'Coastal Glow Studio', hero: 'Treatments, style and booking made beautifully simple.', intro: 'A calm, elegant salon website that presents services, gallery, trust and bookings with less friction.', cta: 'Book appointment', services: ['Hair styling', 'Beauty treatments', 'Wellness appointments'] },
  consultant: { name: 'Harbour Strategy', hero: 'Practical support that helps businesses run better.', intro: 'A premium service-business layout for explaining expertise, systems, support and clear calls.', cta: 'Book a call', services: ['Strategy sessions', 'Operational systems', 'Ongoing support'] },
  shop: { name: 'Purbeck Provisions', hero: 'Local products presented clearly and ready to buy.', intro: 'A retail-led website that highlights product value, trust, checkout routes and customer support.', cta: 'Shop now', services: ['Gift boxes', 'Local favourites', 'Seasonal picks'] },
  'holiday-let': { name: 'Purbeck View Stay', hero: 'Show the stay, the setting and the simple booking route.', intro: 'A visual, reassuring holiday-let layout for amenities, location, guest confidence and enquiries.', cta: 'Check availability', services: ['Coastal stays', 'Guest amenities', 'Local guide'] }
};

function cardsFor(key) {
  const c = copy[key] || copy.consultant;
  return c.services.map((title) => ({ title, text: `${title} explained as a clear customer benefit with one easy next step.`, icon: '✓' }));
}
function featuresFor(key) {
  if (key === 'trades') return ['Service area clear', 'Quote route visible', 'Trust signals upfront', 'Emergency info easy to find'];
  if (key === 'shop') return ['Products easy to scan', 'Checkout route ready', 'Support visible', 'Offers presented cleanly'];
  if (key === 'holiday-let') return ['Stay shown visually', 'Amenities clear', 'Booking route simple', 'Local reasons to visit'];
  return ['Offer clear in seconds', 'Proof built into the flow', 'Mobile-first section order', 'Customer action repeated'];
}
function processFor(key) {
  if (key === 'shop') return [{ title: 'Browse', text: 'Show products and categories cleanly.' }, { title: 'Choose', text: 'Explain value and suitability.' }, { title: 'Buy', text: 'Send customers into a clear checkout route.' }];
  if (key === 'holiday-let') return [{ title: 'View', text: 'Lead with the stay and setting.' }, { title: 'Check', text: 'Show amenities, dates and suitability.' }, { title: 'Enquire', text: 'Make availability questions simple.' }];
  return [{ title: 'Understand', text: 'Customers see what you do quickly.' }, { title: 'Trust', text: 'Useful proof removes hesitation.' }, { title: 'Act', text: 'The next step is obvious.' }];
}
function faqsFor(key) {
  if (key === 'shop') return [{ q: 'Can customers buy online?', a: 'Yes, retail sections connect into Plus shop and checkout tools.' }, { q: 'Can products change?', a: 'Yes, products and sections can be edited as the business changes.' }, { q: 'When do I pay?', a: 'Build free, then pay only when ready to publish.' }];
  return [{ q: 'Can this be edited later?', a: 'Yes, sections can be changed, reordered, hidden or expanded.' }, { q: 'Is it mobile-friendly?', a: 'Yes, the section layouts are designed for phone and desktop viewing.' }, { q: 'When does payment happen?', a: 'Customers build free and choose a package at publish.' }];
}
function sec(key, section, index) {
  return {
    id: `${key}_${section.section_type}_${index}_${uuid()}`,
    section_order: index,
    type: section.section_type,
    layout: section.layout || 'standard',
    padding: section.padding || 'comfortable',
    align: section.align || 'left',
    hidden: 0,
    body_json: '{}',
    ...section
  };
}
function premiumTemplate(key) {
  key = normaliseKey(key);
  const p = palette[key] || palette.consultant;
  const c = copy[key] || copy.consultant;
  const features = featuresFor(key);
  const sections = [
    { section_type: 'splitHero', title: c.hero, text: c.intro, button: c.cta, image: p.image, layout: 'split', background: p.bg, accent: p.accent, padding: 'spacious', align: 'left', body_json: body({ eyebrow: 'Premium starting layout', visual: 'framed' }) },
    { section_type: 'trustBand', title: 'Customer confidence at a glance', text: features.slice(0, 3).join('|'), button: '', image: '', layout: 'cards', background: '#ffffff', accent: p.accent, padding: 'compact', align: 'center', body_json: body({ stats: [{ value: 'Clear', label: 'offer' }, { value: 'Fast', label: 'next step' }, { value: 'Mobile', label: 'ready' }] }) },
    { section_type: 'services', title: 'What customers can do here', text: cardsFor(key).map((item) => `${item.title}::${item.text}`).join('|'), button: 'View services', image: '', layout: 'cards', background: p.soft, accent: p.accent, padding: 'comfortable', align: 'left', body_json: body({ cards: cardsFor(key), cardStyle: 'elevated' }) },
    { section_type: 'process', title: 'A simple route from interest to action', text: processFor(key).map((item) => `${item.title}::${item.text}`).join('|'), button: '', image: '', layout: 'cards', background: p.bg, accent: p.accent, padding: 'comfortable', align: 'left', body_json: body({ steps: processFor(key) }) },
    { section_type: 'featureGrid', title: 'Why this website flow works', text: features.map((item) => `${item}::A focused proof point written for quick scanning.`).join('|'), button: '', image: '', layout: 'cards', background: '#ffffff', accent: p.accent, padding: 'comfortable', align: 'left', body_json: body({ cards: features.map((item) => ({ title: item, text: 'A focused proof point written for quick scanning.', icon: '✓' })) }) },
    { section_type: 'gallery', title: 'A visual feel for the business', text: p.gallery.join('|'), button: '', image: p.gallery[0], layout: 'cards', background: p.soft, accent: p.accent, padding: 'comfortable', align: 'center', body_json: body({ captions: ['Atmosphere', 'Detail', 'Customer experience'] }) },
    { section_type: 'testimonial', title: 'Proof that feels human', text: '“Clear, useful and easy to navigate. The website explains the offer properly and makes the next step simple.”', button: '', image: '', layout: 'centered', background: p.deep, accent: '#f2b66d', padding: 'spacious', align: 'center' },
    { section_type: 'faq', title: 'Helpful answers before customers ask', text: faqsFor(key).map((f) => `${f.q}|${f.a}`).join('\n'), button: 'Ask a question', image: '', layout: 'standard', background: p.bg, accent: p.accent, padding: 'comfortable', align: 'left', body_json: body({ items: faqsFor(key) }) },
    { section_type: 'contact', title: 'Make the next step simple', text: 'Add address, opening hours, phone, email and the best way for customers to make an enquiry.', button: c.cta, image: p.image, layout: 'split', background: '#ffffff', accent: p.accent, padding: 'comfortable', align: 'left' },
    { section_type: 'cta', title: 'Build free, publish when ready', text: 'Customers can shape the site first, then choose the right package only when the website is ready to go live.', button: 'Continue to publish', image: '', layout: 'centered', background: p.accent, accent: '#ffffff', padding: 'spacious', align: 'center' }
  ];
  if (key === 'shop') {
    sections.splice(4, 0, { section_type: 'retail', title: 'Featured products customers can understand quickly', text: 'Local favourite - £12::Short product highlight|Gift bundle - £24::Good for gifting or repeat orders|Seasonal pick - £18::Limited or current offer', button: 'Shop now', image: p.image, layout: 'cards', background: '#fff8cf', accent: '#111111', padding: 'comfortable', align: 'left' });
  }
  return sections.map((section, index) => sec(key, section, index));
}

async function projectPlan(env, projectId, fallback = 'starter') {
  const fb = cleanPlan(fallback);
  if (!env?.DB || !projectId) return fb;
  for (const table of ['projects', 'user_projects', 'pbi_projects']) {
    try { const row = await env.DB.prepare(`SELECT plan FROM ${table} WHERE id=? LIMIT 1`).bind(projectId).first(); if (row?.plan) return cleanPlan(row.plan); } catch (_) {}
  }
  return fb;
}

export async function onRequestGet({ request }) {
  const u = new URL(request.url);
  const key = normaliseKey(u.searchParams.get('template') || u.searchParams.get('template_key') || 'consultant');
  const plan = cleanPlan(u.searchParams.get('plan') || 'starter');
  return json({ ok: true, template_key: key, sections: filterSectionsForPlan(premiumTemplate(key), plan) });
}

export async function onRequestPost({ request, env }) {
  const b = await readBody(request);
  const key = normaliseKey(b.template_key || b.template || 'consultant');
  const project = String(b.project_id || '');
  const plan = await projectPlan(env, project, b.plan || 'starter');
  const sections = filterSectionsForPlan(premiumTemplate(key), plan);
  if (!project) return json({ ok: true, template_key: key, sections });
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS project_sections (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,section_order INTEGER DEFAULT 0,section_type TEXT NOT NULL,title TEXT,text TEXT,button TEXT,image TEXT,layout TEXT DEFAULT 'standard',background TEXT DEFAULT '#fff8f1',accent TEXT DEFAULT '#bf5c29',padding TEXT DEFAULT 'comfortable',align TEXT DEFAULT 'left',hidden INTEGER DEFAULT 0,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
    const ex = await env.DB.prepare(`SELECT COUNT(*) count FROM project_sections WHERE project_id=?`).bind(project).first();
    if (!b.force && ex?.count > 0) {
      const r = await env.DB.prepare(`SELECT * FROM project_sections WHERE project_id=? ORDER BY section_order ASC`).bind(project).all();
      return json({ ok: true, existing: true, sections: filterSectionsForPlan(r.results || [], plan) });
    }
    await env.DB.prepare(`DELETE FROM project_sections WHERE project_id=?`).bind(project).run();
    for (const s of sections) {
      await env.DB.prepare(`INSERT INTO project_sections (id,project_id,section_order,section_type,title,text,button,image,layout,background,accent,padding,align,hidden,body_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(s.id, project, s.section_order, s.section_type, s.title, s.text, s.button, s.image, s.layout, s.background, s.accent, s.padding, s.align, s.hidden, s.body_json || JSON.stringify(s)).run();
    }
  } catch (_) {}
  return json({ ok: true, template_key: key, sections });
}
