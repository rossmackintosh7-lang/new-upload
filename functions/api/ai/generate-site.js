import { json } from '../../_lib/json.js';

export async function onRequestPost({ request }) {
  const body = await request.json().catch(() => ({}));
  const brief = String(body.brief || 'small business').trim();
  const title = `Website built around ${brief}`;
  const text = 'A clear, conversion-focused small-business website with services, proof, FAQs and one enquiry route.';
  return json({ ok: true, source: 'fallback', canvas: {
    business_name: 'Small Business',
    templateId: body.template || 'cafe',
    plan: body.plan || 'starter',
    page_main_heading: title,
    sub_heading: text,
    selected_pages: ['home','about','services','gallery','faq','contact'],
    pages: { home: { label: 'Home', title, body: text } },
    blocksByPage: { home: [
      { id: 'hero-1', type: 'hero', title, text, image: '/assets/demo-media/cafe-hero.jpg', button: 'Send enquiry', layout: 'split', positionMode: 'flow', publishable: true },
      { id: 'services-1', type: 'services', title: 'Services made simple', text: 'Main service | Fast enquiry | Local support | Friendly follow-up', layout: 'cards', positionMode: 'flow', publishable: true },
      { id: 'contact-1', type: 'contact', title: 'Ready to get started?', text: 'Give visitors one clear route to enquire.', button: 'Send enquiry', positionMode: 'flow', publishable: true }
    ] },
    seo: { title, description: text, indexable: true }
  } });
}
