import { json } from '../../_lib/json.js';

function cleanPlan(value) {
  const p = String(value || 'starter').toLowerCase();
  return ['starter', 'business', 'plus'].includes(p) ? p : 'starter';
}

function infer(brief) {
  const lower = String(brief || '').toLowerCase();
  if (/dog|groom|pet|puppy/.test(lower)) return ['dog-groomer', 'Dog Grooming', ['Full groom', 'Bath and brush', 'Nail trim', 'Puppy intro'], 'Book a groom'];
  if (/cafe|coffee|brunch|restaurant|food|table|dinner|romantic/.test(lower)) return ['cafe', 'Café / Restaurant', ['Seasonal brunch', 'Private tables', 'Takeaway coffee', 'Evening menu'], 'Book a table'];
  if (/salon|beauty|hair|nail|treatment/.test(lower)) return ['salon', 'Salon', ['Signature treatment', 'Cut and styling', 'Nail care', 'Consultation'], 'Book appointment'];
  if (/shop|retail|product|gift/.test(lower)) return ['shop', 'Shop', ['New arrivals', 'Gift-ready products', 'Local collection', 'Secure checkout'], 'Shop now'];
  if (/holiday|stay|glamping|cottage|let/.test(lower)) return ['holiday-let', 'Holiday Let', ['Comfortable stays', 'Local guide', 'Family amenities', 'Easy enquiry'], 'Check availability'];
  if (/trade|builder|plumb|electric|mechanic|quote/.test(lower)) return ['trades', 'Local Service', ['Quote request', 'Repairs', 'Maintenance', 'Local coverage'], 'Request quote'];
  if (/clean|housekeep/.test(lower)) return ['cleaner', 'Cleaning Business', ['Regular cleans', 'Deep cleans', 'Commercial cleaning', 'End-of-tenancy cleans'], 'Request quote'];
  if (/trainer|fitness|gym|coach/.test(lower)) return ['personal-trainer', 'Fitness Coach', ['1:1 sessions', 'Progress plans', 'Nutrition support', 'Consultation'], 'Book session'];
  return ['cafe', 'Small Business', ['Main service', 'Fast enquiry', 'Local support', 'Friendly follow-up'], 'Send enquiry'];
}

function block(type, extra = {}) {
  return {
    id: `${type}-${crypto.randomUUID().slice(0, 8)}`,
    type,
    layout: 'standard',
    animation: 'rise',
    background: '#fffaf4',
    accent: '#bf5c29',
    positionMode: 'flow',
    publishable: true,
    ...extra
  };
}

function fallbackCanvas(body = {}) {
  const brief = String(body.brief || 'small business').trim();
  const [template, type, services, cta] = infer(brief);
  const name = type;
  const title = `${type} website built around ${brief.replace(/[.!?]+$/, '')}`;
  const text = `A clear, conversion-focused ${type.toLowerCase()} website with useful services, trust signals, real imagery, FAQs and one simple enquiry route.`;
  const img = '/assets/demo-media/cafe-hero.jpg';
  return {
    business_name: name,
    templateId: template,
    plan: cleanPlan(body.plan),
    tagline: `${type} · built with PBI`,
    page_main_heading: title,
    sub_heading: text,
    heroImage: img,
    selected_pages: ['home', 'about', 'services', 'gallery', 'faq', 'contact'],
    activePage: 'home',
    pages: {
      home: { label: 'Home', title, body: text },
      about: { label: 'About', title: `About ${name}`, body: 'Tell the story, build trust and show why customers should enquire.' },
      services: { label: 'Services', title: 'Services', body: 'Show the main offers clearly.' },
      gallery: { label: 'Gallery', title: 'Gallery', body: 'Use real images to build confidence.' },
      faq: { label: 'FAQ', title: 'Questions', body: 'Answer common questions before enquiry.' },
      contact: { label: 'Contact', title: 'Contact', body: 'Make the next step easy.' }
    },
    blocksByPage: {
      home: [
        block('hero', { eyebrow: `${type} · built with PBI`, title, text, image: img, button: cta, layout: 'split' }),
        block('trustBand', { title: 'Why customers choose this', text: 'Clear service | Real proof | Local trust | Easy enquiry' }),
        block('services', { title: 'Services made simple', text: services.join(' | '), layout: 'cards' }),
        block('gallery', { title: 'Show the real experience', text: 'Upload real photos, then drag them freely into the page.', image: img }),
        block('faq', { title: 'Helpful answers', text: 'What do you offer? | Where are you based? | How do I enquire? | What happens next?' }),
        block('contact', { title: 'Ready to get started?', text: 'Give visitors one clear route to book, call or send an enquiry.', button: cta })
      ]
    },
    seo: { title: `${name} | ${type} Website`, description: text, ogTitle: name, ogDescription: text, indexable: true },
    aiGenerated: true,
    aiSource: 'fallback'
  };
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const fallback = fallbackCanvas(body);

  if (!env.OPENAI_API_KEY) return json({ ok: true, canvas: fallback, source: 'fallback' });

  try {
    const prompt = `Create a concise structured website draft for PBI. Return JSON only with business_name, page_main_heading, sub_heading, services array, faq array, cta, seo_title, seo_description. Brief: ${body.brief}. Style: ${body.mood || body.style || 'professional'}.`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });
    const data = await response.json().catch(() => ({}));
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const canvas = fallbackCanvas({ ...body, brief: parsed.business_name || body.brief });
    canvas.business_name = parsed.business_name || canvas.business_name;
    canvas.page_main_heading = parsed.page_main_heading || canvas.page_main_heading;
    canvas.sub_heading = parsed.sub_heading || canvas.sub_heading;
    canvas.blocksByPage.home[0].title = canvas.page_main_heading;
    canvas.blocksByPage.home[0].text = canvas.sub_heading;
    if (Array.isArray(parsed.services)) canvas.blocksByPage.home[2].text = parsed.services.join(' | ');
    if (Array.isArray(parsed.faq)) canvas.blocksByPage.home[4].text = parsed.faq.join(' | ');
    if (parsed.cta) canvas.blocksByPage.home[5].button = parsed.cta;
    canvas.seo = { title: parsed.seo_title || canvas.seo.title, description: parsed.seo_description || canvas.seo.description, indexable: true };
    canvas.aiSource = 'openai';
    return json({ ok: true, canvas, source: 'openai' });
  } catch (_) {
    return json({ ok: true, canvas: fallback, source: 'fallback' });
  }
}
