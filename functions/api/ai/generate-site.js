import { json } from '../../_lib/json.js';

const TYPES = {
  cafe: { label: 'cafe or food business', image: '/assets/demo-media/cafe-hero.jpg', accent: '#b86a3a' },
  trades: { label: 'local trade or service business', image: '/assets/demo-media/trades-hero.jpg', accent: '#1d7a61' },
  salon: { label: 'salon, beauty or wellness business', image: '/assets/demo-media/salon-hero.jpg', accent: '#b56b82' },
  consultant: { label: 'consultant or professional service', image: '/assets/demo-media/consultant-hero.jpg', accent: '#215d7a' },
  shop: { label: 'shop or product-led business', image: '/assets/demo-media/shop-hero.jpg', accent: '#e0aa1c' },
  'holiday-let': { label: 'holiday let or accommodation business', image: '/assets/demo-media/holiday-let-hero.jpg', accent: '#227d82' }
};

function clean(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim().slice(0, 600);
}

function titleCase(value) {
  return clean(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function normaliseType(value) {
  const key = clean(value || 'cafe').toLowerCase();
  if (key.includes('trade') || key.includes('service')) return 'trades';
  if (key.includes('salon') || key.includes('beauty') || key.includes('wellness')) return 'salon';
  if (key.includes('consult')) return 'consultant';
  if (key.includes('shop') || key.includes('retail')) return 'shop';
  if (key.includes('holiday') || key.includes('accommodation')) return 'holiday-let';
  return TYPES[key] ? key : 'cafe';
}

function fallbackCanvas(body = {}) {
  const typeKey = normaliseType(body.businessType || body.business_type || body.template);
  const type = TYPES[typeKey] || TYPES.cafe;
  const business = clean(body.businessName || body.business_name, `${titleCase(typeKey)} business`);
  const location = clean(body.location || body.area);
  const offer = clean(body.offer || body.brief, `a clear ${type.label} website with services, proof and one easy enquiry route`);
  const area = location ? ` in ${location}` : '';
  const title = `${business} made clear online`;
  const text = `${business} helps customers${area} understand ${offer} and take the next step with confidence.`;
  const pages = {
    home: { label: 'Home', title, body: text },
    about: { label: 'About', title: `About ${business}`, body: `Tell customers what ${business} does, who it helps and why they can trust it.` },
    services: { label: 'Services', title: 'Services and offers', body: offer },
    gallery: { label: 'Proof', title: 'Proof and examples', body: 'Add real images, reviews, projects or helpful examples that support the offer.' },
    faq: { label: 'FAQ', title: 'Common questions', body: 'Answer the questions customers usually ask before they enquire.' },
    contact: { label: 'Contact', title: 'Get in touch', body: 'Make the next step simple with a phone number, email, booking link or enquiry form.' }
  };
  return {
    business_name: business,
    project_name: `${business} website`,
    templateId: typeKey,
    template_preset: typeKey,
    template: typeKey,
    plan: clean(body.plan, 'starter'),
    page_main_heading: title,
    sub_heading: text,
    selected_pages: Object.keys(pages),
    selectedPages: Object.keys(pages),
    pages,
    heroImage: type.image,
    gallery_images: [type.image],
    accent_color: type.accent,
    background_color: '#fffaf4',
    text_color: '#2f1b12',
    button_color: type.accent,
    button_text_color: '#ffffff',
    blocksByPage: {
      home: [
        { id: 'ai-hero', type: 'hero', title, text, image: type.image, button: 'Send enquiry', layout: 'split', positionMode: 'flow', publishable: true },
        { id: 'ai-services', type: 'services', title: 'Services made simple', text: offer, layout: 'cards', positionMode: 'flow', publishable: true },
        { id: 'ai-proof', type: 'trustBand', title: 'Why customers can feel confident', text: 'Clear offer | Practical details | Easy contact route', layout: 'cards', positionMode: 'flow', publishable: true },
        { id: 'ai-contact', type: 'contact', title: 'Ready to get started?', text: 'Give visitors one clear route to enquire.', button: 'Send enquiry', layout: 'spotlight', positionMode: 'flow', publishable: true }
      ],
      about: [{ id: 'ai-about', type: 'featureGrid', title: `About ${business}`, text: pages.about.body, layout: 'cards', positionMode: 'flow', publishable: true }],
      services: [{ id: 'ai-service-page', type: 'services', title: pages.services.title, text: offer, layout: 'bento', positionMode: 'flow', publishable: true }],
      gallery: [{ id: 'ai-gallery', type: 'gallery', title: pages.gallery.title, text: pages.gallery.body, image: type.image, layout: 'masonry', positionMode: 'flow', publishable: true }],
      faq: [{ id: 'ai-faq', type: 'faq', title: pages.faq.title, text: 'What do you offer? | Where do you work? | How do customers get started?', layout: 'checklist', positionMode: 'flow', publishable: true }],
      contact: [{ id: 'ai-contact-page', type: 'contact', title: pages.contact.title, text: pages.contact.body, button: 'Send enquiry', layout: 'spotlight', positionMode: 'flow', publishable: true }]
    },
    seo: { title: `${business} | ${titleCase(typeKey)}`, description: text.slice(0, 155), indexable: true }
  };
}

async function openAiCanvas(env, body) {
  if (!env.OPENAI_API_KEY) return null;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5.5',
      input: [
        { role: 'system', content: 'Return only compact JSON for a small-business website canvas. Include page_main_heading, sub_heading, pages, selected_pages and short blocksByPage arrays. Use plain customer-friendly English.' },
        { role: 'user', content: JSON.stringify(body).slice(0, 8000) }
      ]
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('') || '';
  try { return JSON.parse(text); } catch { return null; }
}

function hasUsablePages(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function hasUsableBlocks(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).some((blocks) => Array.isArray(blocks) && blocks.some((block) => block && typeof block === 'object' && block.type));
}

function normaliseCanvas(ai, fallback) {
  if (!ai || typeof ai !== 'object' || Array.isArray(ai)) return fallback;
  const merged = { ...fallback, ...ai };
  if (!hasUsablePages(ai.pages)) merged.pages = fallback.pages;
  if (!Array.isArray(ai.selected_pages) || ai.selected_pages.some((page) => !fallback.pages[page])) merged.selected_pages = fallback.selected_pages;
  if (!Array.isArray(ai.selectedPages) || ai.selectedPages.some((page) => !fallback.pages[page])) merged.selectedPages = fallback.selectedPages;
  if (!hasUsableBlocks(ai.blocksByPage)) merged.blocksByPage = fallback.blocksByPage;
  merged.templateId = fallback.templateId;
  merged.template_preset = fallback.template_preset;
  merged.template = fallback.template;
  merged.seo = { ...fallback.seo, ...(hasUsablePages(ai.seo) ? ai.seo : {}) };
  return merged;
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const fallback = fallbackCanvas(body);
  const ai = await openAiCanvas(env || {}, body).catch(() => null);
  const canvas = normaliseCanvas(ai, fallback);
  return json({ ok: true, source: ai ? 'openai' : 'fallback', canvas });
}
