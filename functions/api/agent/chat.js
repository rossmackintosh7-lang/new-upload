import { json, requireUser, ensureCoreTables, loadProjectContext, callOpenAi } from './_shared.js';

const PBI_KNOWLEDGE = [
  {
    topic: 'PBI positioning',
    keywords: ['pbi', 'positioning', 'different', 'compare', 'website builder', 'local business', 'small business', 'base44', 'wix', 'squarespace'],
    summary: 'PBI is positioned as the website builder for local businesses that helps them actually launch, not just design. It combines templates, guided editing, Goose, domains, payments, SEO support, Assisted Setup and custom builds.',
    links: ['/compare-website-builders/', '/website-builder-for-small-businesses/', '/ai-website-builder-uk/'],
    actions: ['Explain the PBI launch path', 'Compare PBI with large builders']
  },
  {
    topic: 'Getting started and templates',
    keywords: ['start', 'starting', 'template', 'templates', 'example', 'examples', 'cafe', 'trade', 'trades', 'salon', 'consultant', 'shop', 'holiday', 'cleaner', 'restaurant', 'pet', 'fitness'],
    summary: 'Customers can start with real business templates and examples for cafes, trades, salons, consultants, shops, holiday lets, pet services, cleaners, personal trainers and restaurants, then open the chosen template in the canvas builder.',
    links: ['/start-here/', '/templates/', '/canvas-builder/'],
    actions: ['Choose a template', 'Open the canvas builder']
  },
  {
    topic: 'Pricing and billing',
    keywords: ['price', 'pricing', 'cost', 'billing', 'pay', 'payment', 'starter', 'business', 'plus', 'plan', 'package', 'subscription'],
    summary: 'PBI is build-free until publish. Starter is GBP 12.99/month once published, Business is GBP 24.99/month once published, and Plus is GBP 39.99/month once published. Billing starts when the user publishes.',
    links: ['/pricing/', '/signup/'],
    actions: ['Compare pricing', 'Check publish payment status']
  },
  {
    topic: 'Assisted Setup and custom builds',
    keywords: ['assisted', 'setup', 'custom', 'custom build', 'done for you', 'human help', 'support', 'build it for me', 'hands on', 'bespoke'],
    summary: 'Assisted Setup is optional help polishing wording, page flow, image choices and launch readiness. Custom Build is the hands-on route where PBI scopes, quotes, builds, reviews and launches a more tailored website.',
    links: ['/custom-build/?type=assisted_setup', '/custom-build/', '/custom-websites/', '/pricing/#packages'],
    actions: ['Request Assisted Setup', 'Start a custom build enquiry']
  },
  {
    topic: 'Publishing and launch readiness',
    keywords: ['publish', 'launch', 'live', 'go live', 'ready', 'readiness', 'checklist', 'qa', 'prepublish', 'checkout'],
    summary: 'Before publishing, save the project, run readiness checks, confirm the contact or booking route works, confirm Stripe/payment readiness, then publish after checkout. PBI marks the project as published and stores the live slug.',
    links: ['/help/publish-website/', '/qa/', '/pricing/'],
    actions: ['Run a launch check', 'Review publish steps']
  },
  {
    topic: 'Domains and DNS',
    keywords: ['domain', 'domains', 'dns', 'subdomain', 'custom domain', 'renewal', 'renewals', 'availability', 'checker', 'connect domain'],
    summary: 'PBI supports a PBI subdomain route and custom domain connection. The domain checker helps test availability and guide the user toward registration, connection, DNS and renewal steps.',
    links: ['/canvas-builder/', '/help/domain-renewals/', '/website-builder-for-small-businesses/'],
    actions: ['Open the domain tools', 'Review domain renewal steps']
  },
  {
    topic: 'SEO and content',
    keywords: ['seo', 'google', 'search', 'ranking', 'title', 'meta', 'description', 'alt', 'copy', 'content', 'keywords', 'seo care'],
    summary: 'PBI helps with SEO titles, meta descriptions, page structure, internal links, image alt text, useful local wording and optional monthly SEO Care. It cannot guarantee rankings, but it can make the site cleaner for customers and search engines.',
    links: ['/website-builder-with-seo-support/', '/seo-care/', '/features/seo-agent/', '/google-seo/'],
    actions: ['Review SEO title and description', 'Suggest a local SEO page']
  },
  {
    topic: 'Retail, Stripe and payments',
    keywords: ['stripe', 'retail', 'shop', 'checkout', 'order', 'orders', 'product', 'products', 'ecommerce', 'payment link'],
    summary: 'PBI includes small retail starter tools for suitable businesses, Stripe checkout support, product-led pages and order tracking. Stripe variables and live price IDs must be configured before real payments are accepted.',
    links: ['/help/retail-stripe-setup/', '/pricing/', '/features/retail-starter/'],
    actions: ['Check Stripe setup', 'Review retail readiness']
  },
  {
    topic: 'Admin and operations',
    keywords: ['admin', 'dashboard', 'users', 'requests', 'projects', 'notifications', 'lead', 'leads', 'customer', 'command centre', 'manage'],
    summary: 'The PBI admin area includes command centre priorities, users, requests, projects, notifications, launch queue, billing pulse, universal search and Goose admin brief.',
    links: ['/admin/', '/admin/users/', '/admin/requests/', '/admin/projects/', '/admin/notifications/'],
    actions: ['Open admin command centre', 'Review requests and launch queue']
  },
  {
    topic: 'Goose',
    keywords: ['goose', 'agent', 'assistant', 'secret agent', 'help me', 'ask', 'question', 'autopilot', 'harmony', 'action mode'],
    summary: 'Goose is PBI private agent. Goose can answer PBI questions, explain product routes, suggest launch fixes, help with SEO and copy, and point to the right admin or customer next step. Inside the canvas builder, Goose action mode can apply local project changes such as launch autopilot, business systems, local SEO pages, responsive sweeps, accessibility passes and customer dashboard preparation.',
    links: ['/dashboard/', '/canvas-builder/', '/admin/'],
    actions: ['Ask Goose for the next best action', 'Run Goose launch autopilot', 'Ask Goose to explain a PBI feature']
  }
];

const PBI_TERMS = new Set([
  'pbi', 'purbeck', 'website', 'builder', 'template', 'templates', 'canvas', 'domain', 'dns',
  'pricing', 'price', 'billing', 'publish', 'launch', 'seo', 'google', 'stripe', 'retail',
  'admin', 'dashboard', 'project', 'projects', 'goose', 'agent', 'custom', 'assisted',
  'setup', 'support', 'logo', 'brand', 'user', 'users', 'request', 'requests', 'payment',
  'cost', 'plan', 'plans', 'package', 'packages', 'starter', 'business', 'plus', 'subscription',
  'autopilot', 'harmony', 'responsive', 'accessibility', 'business-system'
]);

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'what', 'when', 'where', 'why', 'how',
  'can', 'you', 'are', 'does', 'do', 'to', 'of', 'in', 'on', 'is', 'it', 'i', 'me',
  'my', 'a', 'an', 'be', 'or', 'as', 'we', 'our', 'your', 'about', 'any', 'all'
]);

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function cardScore(card, message, tokens) {
  const lower = String(message || '').toLowerCase();
  let score = 0;
  for (const keyword of card.keywords) {
    const key = keyword.toLowerCase();
    if (lower.includes(key)) score += key.includes(' ') ? 6 : 3;
  }
  for (const token of tokens) {
    if (card.keywords.some((keyword) => keyword.toLowerCase().includes(token))) score += 1;
    if (card.summary.toLowerCase().includes(token)) score += 0.5;
  }
  return score;
}

function isPbiRelated(message, tokens) {
  const lower = String(message || '').toLowerCase();
  if (lower.includes('purbeck business innovations') || lower.includes('pbi')) return true;
  return tokens.some((token) => PBI_TERMS.has(token));
}

function selectKnowledgeCards(message, body = {}) {
  const tokens = tokenize([
    message,
    body.page,
    body.page_title,
    body.page_context?.headings?.join(' '),
    body.page_context?.buttons?.join(' ')
  ].join(' '));
  const contextualQuestion = /\b(this|that|here|page|screen|project|site|next|improve|fix|check|review|help)\b/i.test(message || '') && Boolean(body.page);
  if (!isPbiRelated(message, tokenize(message)) && !contextualQuestion) return [];

  const scored = PBI_KNOWLEDGE
    .map((card) => ({ card, score: cardScore(card, message, tokens) }))
    .sort((a, b) => b.score - a.score);
  const picked = scored.filter((item) => item.score > 0).slice(0, 4).map((item) => item.card);
  if (picked.length) return picked;
  if (isPbiRelated(message, tokens)) {
    return [PBI_KNOWLEDGE[0], PBI_KNOWLEDGE[1], PBI_KNOWLEDGE[4], PBI_KNOWLEDGE[8]];
  }
  return [];
}

function projectSummary(project) {
  if (!project) return '';
  const data = project.data || {};
  const bits = [
    `Project: ${project.name || data.business_name || project.id}`,
    project.status ? `status ${project.status}` : '',
    project.plan ? `plan ${project.plan}` : '',
    project.billing_status ? `billing ${project.billing_status}` : '',
    project.published ? 'published' : 'not published',
    project.public_slug ? `slug ${project.public_slug}` : '',
    data.business_name ? `business ${data.business_name}` : '',
    data.template_preset || data.template ? `template ${data.template_preset || data.template}` : '',
    data.custom_domain ? `custom domain ${data.custom_domain}` : ''
  ].filter(Boolean);
  return bits.join('; ');
}

function sentenceList(items, limit = 3) {
  const unique = [];
  for (const item of items.flat().filter(Boolean)) {
    if (!unique.includes(item)) unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}

function fallbackAnswer(message, project, cards, body = {}) {
  const name = project?.name || project?.data?.business_name || 'this project';
  const tokens = tokenize(message);
  if (!String(message || '').trim()) {
    return 'Ask me anything about PBI: pricing, templates, domains, publishing, SEO, Stripe, admin, Assisted Setup, custom builds, or the next best action for a project.';
  }
  if (!cards.length && !isPbiRelated(message, tokens)) {
    return 'I am built for PBI questions, so I can help best with the website builder, templates, pricing, domains, publishing, SEO, Stripe, admin, Assisted Setup or custom builds. Ask me in that direction and I will give you a useful next step.';
  }

  const top = cards[0] || PBI_KNOWLEDGE[0];
  const supporting = cards.slice(1, 3).map((card) => `${card.topic}: ${card.summary}`);
  const actions = sentenceList(cards.map((card) => card.actions), 4);
  const links = sentenceList(cards.map((card) => card.links), 4);
  const page = body.page ? `\nCurrent page: ${body.page}` : '';
  const projectLine = project ? `\nProject context: ${projectSummary(project)}` : '';

  return [
    `Goose answer: ${top.summary}`,
    supporting.length ? `Also relevant: ${supporting.join(' ')}` : '',
    project ? `For ${name}, I would use that as project-specific context before changing copy, SEO, domain or publish settings.` : '',
    actions.length ? `Useful next moves: ${actions.join('; ')}.` : '',
    links.length ? `Helpful PBI routes: ${links.join(', ')}.` : '',
    `${projectLine}${page}`.trim()
  ].filter(Boolean).join('\n\n');
}

function moodForMessage(message, answer) {
  const lower = `${message || ''} ${answer || ''}`.toLowerCase();
  if (/error|failed|could not|blocked|missing|risk|broken|problem|urgent|issue/.test(lower)) return 'alert';
  if (/passed|done|success|quickest|fastest|win/.test(lower)) return 'success';
  if (/launch|publish|live|ready|payment|stripe/.test(lower)) return 'excited';
  if (/seo|title|description|copy|rewrite|improve/.test(lower)) return 'wink';
  return 'answer';
}

function suggestedActionsFor(message, cards) {
  const lower = String(message || '').toLowerCase();
  if (/price|pricing|billing|plan|cost/.test(lower)) return ['Compare pricing', 'Explain which plan fits', 'Check publish billing status'];
  if (/domain|dns|subdomain|renewal/.test(lower)) return ['Open domain tools', 'Explain DNS next step', 'Review renewal reminders'];
  if (/publish|launch|live|ready/.test(lower)) return ['Run a readiness check', 'Review publish steps', 'Check Stripe/payment status'];
  if (/seo|google|copy|content|keyword/.test(lower)) return ['Review SEO title and description', 'Suggest stronger page copy', 'Plan a local SEO page'];
  if (/admin|request|user|project|notification/.test(lower)) return ['Open admin command centre', 'Review requests', 'Check launch queue'];
  const actions = sentenceList(cards.map((card) => card.actions), 3);
  return actions.length ? actions : ['Explain PBI launch path', 'Find the right PBI route', 'Suggest the next best action'];
}

function buildSystemPrompt() {
  return [
    'You are Goose, PBI private website operations agent.',
    'Answer any question that is related to PBI, PBI Design Studio, the PBI website builder, customer projects, pricing, domains, publishing, templates, SEO, Stripe, admin operations, Assisted Setup, custom builds or launch support.',
    'Be warm, direct, practical and lightly characterful without being silly.',
    'Use the supplied PBI knowledge as the source of truth. If something is not in the knowledge or project/page context, say what you can infer and what you would check next.',
    'When page context says the user is in the canvas builder, you may explain Goose action mode and recommend launch autopilot, business systems, local SEO pages, responsive sweep, accessibility pass or dashboard preparation.',
    'Do not claim that you changed data, published a site, charged a payment or updated a project unless a tool explicitly did it.',
    'If the user asks something unrelated to PBI, politely steer them back to PBI-related help.',
    'Prefer concise answers with concrete next steps and useful PBI route links.'
  ].join(' ');
}

export async function onRequestPost({ request, env }) {
  await ensureCoreTables(env);
  const auth = await requireUser(env, request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const message = String(body.message || body.prompt || '').trim();
  const projectId = String(body.project_id || body.projectId || '').trim();
  const project = await loadProjectContext(env, auth.user.id, projectId);
  const knowledgeCards = selectKnowledgeCards(message, body);
  const fallback = fallbackAnswer(message, project, knowledgeCards, body);

  const ai = await callOpenAi(env, [
    {
      role: 'system',
      content: buildSystemPrompt()
    },
    {
      role: 'user',
      content: JSON.stringify({
        message,
        page: body.page || '',
        page_title: body.page_title || '',
        page_url: body.page_url || '',
        page_context: body.page_context || null,
        project: project ? {
          id: project.id,
          name: project.name,
          status: project.status,
          plan: project.plan,
          billing_status: project.billing_status,
          published: project.published,
          public_slug: project.public_slug,
          data: project.data
        } : null,
        project_summary: projectSummary(project),
        pbi_knowledge: knowledgeCards
      }).slice(0, 18000)
    }
  ], fallback);

  const answer = ai?.text || fallback;
  const mood = moodForMessage(message, answer);
  return json({
    ok: true,
    reply: {
      answer,
      mood,
      suggestedActions: suggestedActionsFor(message, knowledgeCards),
      topics: knowledgeCards.map((card) => card.topic)
    },
    source: ai?.text && !ai?.error ? 'openai' : 'fallback'
  });
}
