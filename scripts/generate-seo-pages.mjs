import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BASE = 'https://www.purbeckbusinessinnovations.co.uk';
const LOGO = `${BASE}/assets/pbi-brand-logo-20260505.png`;

const images = {
  websites: '/assets/demo-media/consultant-hero.jpg',
  builder: '/assets/demo-media/shop-hero.jpg',
  automation: '/assets/demo-media/consultant-1.jpg',
  seo: '/assets/demo-media/trades-hero.jpg',
  restaurant: '/assets/demo-media/restaurant-hero.jpg',
  cafe: '/assets/demo-media/cafe-hero.jpg',
  pub: '/assets/demo-media/holiday-let-hero.jpg',
  butcher: '/assets/demo-media/shop-1.jpg',
  retail: '/assets/demo-media/shop-hero.jpg',
  trades: '/assets/demo-media/trades-hero.jpg',
  salon: '/assets/demo-media/salon-hero.jpg',
  local: '/assets/demo-media/consultant-2.jpg'
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function route(slug) {
  return `/${slug.replace(/^\/|\/$/g, '')}/`;
}

function titleCase(slug) {
  return slug.replace(/^\/|\/$/g, '').split('-').map((word) => word ? word[0].toUpperCase() + word.slice(1) : '').join(' ');
}

function page(data) {
  const slug = data.slug.replace(/^\/|\/$/g, '');
  return {
    slug,
    path: route(slug),
    title: data.title,
    description: data.description,
    tier: data.tier,
    eyebrow: data.eyebrow || data.tier,
    h1: data.h1,
    intro: data.intro,
    image: data.image || images.websites,
    imageAlt: data.imageAlt || `${data.h1} by PBI`,
    areaServed: data.areaServed || 'United Kingdom',
    chips: data.chips || ['UK small business', 'AI-assisted', 'SEO ready', 'Operational systems'],
    features: data.features,
    sections: data.sections,
    workflow: data.workflow || [
      'Clarify the commercial goal and the customer journey.',
      'Structure pages, data capture and operational hand-offs.',
      'Build the site with SEO, accessibility and mobile checks.',
      'Launch, measure and keep improving the system.'
    ],
    fit: data.fit || [
      'Clear service pages and enquiry routes',
      'Practical automations behind the website',
      'Mobile-first design and launch support',
      'Structured content for national search'
    ],
    faqs: data.faqs,
    related: data.related,
    cta: data.cta || 'Build a stronger website and operating system with PBI.'
  };
}

const pages = [
  page({
    tier: 'Tier 1 national money page',
    slug: 'ai-website-builder',
    title: 'AI Website Builder for UK Small Businesses | PBI',
    description: 'Use PBI as an AI website builder for UK small businesses, with guided setup, editable pages, SEO foundations, domains, payments and launch support.',
    eyebrow: 'AI website builder UK',
    h1: 'AI website builder for UK small businesses that need a practical launch route.',
    intro: 'PBI combines AI-assisted setup with human-friendly editing, website structure, SEO checks and operational thinking. It is built for businesses that want a professional site without starting from a blank screen or losing control of the final wording, layout and launch choices.',
    image: images.builder,
    chips: ['AI website builder', 'Canvas editing', 'SEO checks', 'UK support'],
    features: [
      ['Guided first draft', 'The builder turns business details into a sensible first version with pages, calls to action, service wording and launch tasks arranged around a real customer journey.'],
      ['Editable by the business', 'AI helps with structure and copy, while the business keeps control over tone, services, images, prices, forms and publishing choices.'],
      ['Launch-ready foundations', 'Each build route connects page titles, descriptions, internal links, image prompts, mobile checks, domain choices and payment options before publication.']
    ],
    sections: [
      ['Built for business outcomes', 'A website builder should do more than produce a nice page. PBI focuses on enquiries, bookings, quote requests, product sales and follow-up workflows so the website supports daily operations as well as search visibility.'],
      ['AI assistance without generic copy', 'The AI layer is used to organise information, improve headings, suggest useful sections and keep wording clear. The output is editable and designed to avoid keyword stuffing, copied templates and vague marketing language.'],
      ['Connected to the wider platform', 'PBI links the website journey to domains, Stripe payments, project management, launch readiness checks, SEO Care and custom build support when a business wants a more hands-on route.']
    ],
    faqs: [
      ['Can I edit the AI-generated website?', 'Yes. PBI creates a starting structure, then you can edit wording, sections, links, images and launch settings before publishing.'],
      ['Is this only for Dorset businesses?', 'No. PBI is focused nationally across the UK, with local pages used only as supporting search resources.'],
      ['Can PBI build the site for me instead?', 'Yes. The AI builder sits alongside done-for-you website builds, assisted setup and ongoing website management.']
    ],
    related: [['/website-builder-uk/', 'Website builder UK'], ['/small-business-websites/', 'Small business websites'], ['/ai-business-tools/', 'AI business tools'], ['/seo-for-small-businesses/', 'SEO for small businesses']]
  }),
  page({
    tier: 'Tier 1 national money page',
    slug: 'small-business-websites',
    title: 'Small Business Websites UK | PBI',
    description: 'Professional small business websites for UK companies that need clear service pages, enquiries, payments, SEO foundations and operational support.',
    eyebrow: 'Small business websites',
    h1: 'Small business websites built around customers, operations and growth.',
    intro: 'PBI helps UK small businesses turn a website into a useful operating asset: a clear place to explain services, prove trust, capture enquiries, take payments and support the daily flow of work.',
    image: images.websites,
    chips: ['Service pages', 'Enquiry flow', 'Payments', 'Launch support'],
    features: [
      ['Clear customer journeys', 'Pages are planned around what visitors need to understand before they enquire, book, buy or request a quote.'],
      ['Operational fit', 'Forms, payment routes, service menus, project requests and follow-up steps are considered from the start rather than bolted on later.'],
      ['SEO foundations', 'Every page needs a unique purpose, descriptive headings, internal links, schema and useful answers that support national search demand.']
    ],
    sections: [
      ['A website that explains the business quickly', 'Small businesses often lose enquiries because the site is unclear, slow, outdated or too thin. PBI structures pages so visitors can understand the offer, compare options and take the next step without hunting.'],
      ['From brochure site to operating system', 'A modern small business website can trigger forms, collect project details, route enquiries, sell services, handle deposits and support repeatable admin. PBI builds with those workflows in mind.'],
      ['Designed to keep improving', 'Launch is not the finish line. PBI supports content improvements, SEO tasks, internal linking, analytics review and practical updates as services, prices and operations change.']
    ],
    faqs: [
      ['What should a small business website include?', 'At minimum it should explain services, show proof, include clear contact routes, work well on mobile, load quickly and give search engines structured context.'],
      ['Can PBI add payments or booking routes?', 'Yes. PBI can support Stripe payments, enquiry forms, booking calls, deposits and other operational routes depending on the business model.'],
      ['Can I start small and expand later?', 'Yes. A focused first website can be expanded into industry pages, resources, automation and SEO content as the business grows.']
    ],
    related: [['/website-design-for-small-businesses/', 'Website design for small businesses'], ['/affordable-business-websites/', 'Affordable business websites'], ['/small-business-automation/', 'Small business automation'], ['/contact/', 'Talk to PBI']]
  }),
  page({
    tier: 'Tier 1 national money page',
    slug: 'website-design-for-small-businesses',
    title: 'Website Design for Small Businesses UK | PBI',
    description: 'Website design for UK small businesses that need clear messaging, mobile layouts, conversion-focused pages, SEO structure and automation-ready systems.',
    eyebrow: 'Website design for small businesses',
    h1: 'Website design for small businesses that need clarity, trust and action.',
    intro: 'PBI designs websites around the practical moments that matter: explaining what you do, removing doubt, making contact easy and connecting the website to the systems that keep the business moving.',
    image: images.websites,
    chips: ['Conversion flow', 'Mobile layout', 'Service clarity', 'SEO structure'],
    features: [
      ['Design with a job to do', 'Each section is planned around decision making, not decoration. Visitors should know what you offer, who it is for and what to do next.'],
      ['Responsive by default', 'Layouts are built for mobile scanning, thumb-friendly actions, readable copy and fast access to calls, forms or booking steps.'],
      ['Content structure', 'Headings, FAQs, schema, internal links and supporting sections help users and search engines understand the business.']
    ],
    sections: [
      ['Good design is operational', 'A small business website has to reduce questions, avoid wasted admin and support sales or enquiries. PBI treats design as a working system rather than a static brochure.'],
      ['Built around proof and confidence', 'Trust markers, case examples, service details, pricing guidance, process explanations and FAQs can all reduce friction before a customer gets in touch.'],
      ['Room for growth', 'The design system can expand into industry pages, local support pages, knowledge articles, customer portals or automation tools without needing to restart from scratch.']
    ],
    faqs: [
      ['Is this a custom design service or a builder?', 'Both routes are available. PBI can build the website for you or support a guided AI builder route.'],
      ['Do small business websites need lots of pages?', 'Not always. The right structure depends on services, search demand, proof, locations and operational needs.'],
      ['Will the design be SEO friendly?', 'The design includes SEO foundations such as clear headings, metadata, internal links, schema and mobile performance checks.']
    ],
    related: [['/small-business-websites/', 'Small business websites'], ['/website-refurbishment/', 'Website refurbishment'], ['/seo-for-small-businesses/', 'SEO for small businesses'], ['/pricing/', 'Service packages']]
  }),
  page({
    tier: 'Tier 1 national money page',
    slug: 'website-refurbishment',
    title: 'Website Refurbishment for UK Small Businesses | PBI',
    description: 'Refurbish an outdated small business website with improved structure, SEO, content, mobile design, redirects, speed and automation-ready workflows.',
    eyebrow: 'Website refurbishment',
    h1: 'Website refurbishment for small businesses with outdated sites.',
    intro: 'PBI refurbishes older websites that no longer reflect the business, convert enquiries or support search visibility. The work can include structure, wording, technical SEO, mobile usability and operational improvements.',
    image: images.seo,
    chips: ['Refresh old sites', 'Redirect planning', 'Content repair', 'Mobile upgrade'],
    features: [
      ['Audit before changing', 'Existing pages, rankings, backlinks, forms and conversion paths are reviewed so useful equity is protected before redesign decisions are made.'],
      ['Repair the content base', 'Thin pages, duplicated titles, weak intros, missing FAQs and unclear service sections are improved with specific, useful content.'],
      ['Modernise the workflow', 'Refurbishment can add better forms, quote capture, booking steps, payment routes and admin hand-offs instead of only changing visuals.']
    ],
    sections: [
      ['Protect what already works', 'A website refurbishment should not throw away search value. PBI considers canonical URLs, redirects, metadata, internal links and existing content before replacing pages.'],
      ['Fix the reasons visitors leave', 'Common issues include vague headlines, poor mobile layouts, no proof, slow pages, hidden contact options and forms that ask the wrong questions. Each improvement is tied to a user or operational reason.'],
      ['Turn the site into a stronger platform', 'Once the core site is improved, PBI can add supporting pages, content clusters, automation, analytics review and technical SEO monitoring.']
    ],
    faqs: [
      ['Can PBI refurbish a website without changing the domain?', 'Yes. The existing domain can usually be retained while the website structure and content are improved.'],
      ['Will old pages be redirected?', 'Redirect planning is part of a proper refurbishment where URLs change or old content is consolidated.'],
      ['Can refurbishment include new automations?', 'Yes. Forms, quote requests, payments, bookings and operational notifications can be improved as part of the rebuild.']
    ],
    related: [['/website-design-for-small-businesses/', 'Website design for small businesses'], ['/business-automation-tools/', 'Business automation tools'], ['/seo-for-small-businesses/', 'SEO for small businesses'], ['/website-management/', 'Website management']]
  }),
  page({
    tier: 'Tier 1 national money page',
    slug: 'business-automation-tools',
    title: 'Business Automation Tools for UK Small Businesses | PBI',
    description: 'Business automation tools for UK small businesses, including enquiry routing, quote workflows, payments, reminders, dashboards and AI-assisted operations.',
    eyebrow: 'Business automation tools',
    h1: 'Business automation tools that connect the website to the work behind it.',
    intro: 'PBI helps small businesses use practical automation where it saves time, reduces missed enquiries and gives clearer visibility. The aim is not complexity for its own sake, but simpler repeatable workflows.',
    image: images.automation,
    chips: ['Enquiry routing', 'Quote workflows', 'AI support', 'Dashboards'],
    features: [
      ['Lead handling', 'Capture useful details, route enquiries, trigger replies, organise requests and reduce the number of manual follow-up steps.'],
      ['Operational workflows', 'Support bookings, deposits, stock checks, order requests, project stages, documents and customer updates.'],
      ['Management visibility', 'Dashboards and structured records make it easier to see what needs attention, what has been paid and where work is stuck.']
    ],
    sections: [
      ['Start with the repeated work', 'The best automation opportunities are usually the tasks that happen every week: chasing information, sending similar messages, copying data, checking payments and managing small admin hand-offs.'],
      ['Use AI where it is useful', 'AI can help rewrite enquiry replies, summarise project briefs, suggest website updates, draft FAQs and turn customer information into structured next steps.'],
      ['Keep humans in control', 'PBI automation is built around review, approval and editable outputs. Important content, customer communication and business decisions remain under human control.']
    ],
    faqs: [
      ['What should a small business automate first?', 'Start with missed enquiries, repeated admin, quote collection, booking reminders or payment confirmation because these usually have clear value.'],
      ['Does automation replace staff?', 'No. The goal is to reduce avoidable admin so people can focus on customers, service quality and decisions.'],
      ['Can automation connect to my website?', 'Yes. Website forms, payments and customer journeys can trigger structured operational workflows.']
    ],
    related: [['/small-business-automation/', 'Small business automation'], ['/ai-business-tools/', 'AI business tools'], ['/small-business-websites/', 'Small business websites'], ['/hospitality-business-systems/', 'Hospitality business systems']]
  }),
  page({
    tier: 'Tier 1 national money page',
    slug: 'seo-for-small-businesses',
    title: 'SEO for Small Businesses UK | PBI',
    description: 'SEO for UK small businesses focused on helpful content, technical structure, metadata, internal links, schema, page speed and sustainable national visibility.',
    eyebrow: 'SEO for small businesses',
    h1: 'SEO for small businesses without spam, doorway pages or keyword stuffing.',
    intro: 'PBI approaches SEO as an operations discipline: useful pages, clear structure, technical health, internal links, schema and ongoing tasks that make the website easier for people and search engines to understand.',
    image: images.seo,
    chips: ['Technical SEO', 'Helpful content', 'Internal links', 'Schema'],
    features: [
      ['Audit and prioritise', 'The SEO Agent scans live pages for titles, descriptions, headings, alt text, canonicals, schema, internal links, thin content and broken routes.'],
      ['Improve useful content', 'Recommendations focus on better answers, clearer service pages, FAQs, authority clusters and operational expertise instead of repetitive keyword pages.'],
      ['Track and adapt', 'Keyword groups, page scores, internal link opportunities and reports help the site keep improving after launch.']
    ],
    sections: [
      ['National first, local support second', 'PBI targets national UK demand for AI-powered websites, automation and business systems. Location pages support the architecture where they are genuinely useful, but they are not the main strategy.'],
      ['Technical foundations matter', 'Fast pages, responsive layouts, clean URLs, canonical tags, robots rules, sitemap coverage, schema and OpenGraph metadata all help reduce avoidable SEO friction.'],
      ['Content should prove expertise', 'Good small business SEO explains real workflows, choices, trade-offs, costs, systems and customer needs. The pages should be valuable even if the visitor never notices the target keyword.']
    ],
    faqs: [
      ['Can SEO guarantee rankings?', 'No. Ethical SEO improves structure, content quality and visibility signals, but rankings depend on competition, search behaviour and ongoing performance.'],
      ['Does PBI create local pages?', 'Yes, but only as supporting pages with useful local context and links back to national service pages.'],
      ['Can AI write SEO content safely?', 'AI can help draft and organise content, but outputs should be reviewed, edited and kept useful for real readers.']
    ],
    related: [['/ai-website-builder/', 'AI website builder'], ['/website-builder-uk/', 'Website builder UK'], ['/business-automation-tools/', 'Business automation tools'], ['/google-seo/', 'Google SEO guide']]
  }),
  page({
    tier: 'Tier 1 national money page',
    slug: 'affordable-business-websites',
    title: 'Affordable Business Websites UK | PBI',
    description: 'Affordable business websites for UK small businesses that need clear structure, SEO basics, mobile design and a sensible route from launch to improvement.',
    eyebrow: 'Affordable business websites',
    h1: 'Affordable business websites that still need to work properly.',
    intro: 'PBI keeps affordability practical by focusing on the pages, systems and launch steps that matter most first, then allowing the website to grow as the business proves what it needs.',
    image: images.builder,
    chips: ['Clear packages', 'Build free route', 'SEO basics', 'Scalable structure'],
    features: [
      ['Start with the essentials', 'A focused site can cover services, proof, contact routes, FAQs and core SEO without pretending every small business needs a huge build immediately.'],
      ['Avoid false economy', 'Cheap websites become expensive when they miss mobile usability, metadata, content ownership, forms, analytics, security or a route for updates.'],
      ['Grow in stages', 'PBI can start with a practical first site, then add content clusters, automation, e-commerce or custom systems as the business grows.']
    ],
    sections: [
      ['Affordability needs scope control', 'The right first version should be clear about what is included, what can wait and what would create real business value. PBI separates core launch needs from later improvements.'],
      ['Ownership and maintainability matter', 'A business website should be easy to update, structured clearly and supported by a platform that can handle domains, pages, payments and launch checks.'],
      ['Useful SEO from the beginning', 'Even an affordable build should include unique titles, descriptions, heading structure, sitemap coverage, internal links and copy that explains the offer.']
    ],
    faqs: [
      ['What makes a business website affordable?', 'A sensible scope, clear priorities, reusable systems and phased improvements usually matter more than cutting essential quality.'],
      ['Can I use PBI before paying to publish?', 'The builder route allows businesses to start free and only pay when publishing.'],
      ['Can an affordable site rank on Google?', 'It can have strong foundations, but ranking depends on competition, content quality, authority, technical performance and ongoing improvement.']
    ],
    related: [['/small-business-websites/', 'Small business websites'], ['/website-builder-uk/', 'Website builder UK'], ['/pricing/', 'Pricing'], ['/website-refurbishment/', 'Website refurbishment']]
  }),
  page({
    tier: 'Tier 1 national money page',
    slug: 'website-builder-uk',
    title: 'Website Builder UK for Small Businesses | PBI',
    description: 'A UK website builder for small businesses with AI setup, editable templates, domains, Stripe payments, SEO structure and optional done-for-you support.',
    eyebrow: 'Website builder UK',
    h1: 'Website builder UK: practical sites, payments, domains and SEO foundations.',
    intro: 'PBI is a UK-focused website builder and support platform for small businesses that want practical launch tools, optional human help and operational systems beyond a basic template.',
    image: images.builder,
    chips: ['UK-focused', 'Domains', 'Stripe', 'SEO-ready pages'],
    features: [
      ['Built around UK small business needs', 'PBI supports service pages, enquiry forms, pricing guidance, domain choices, Stripe payments and content written for UK customers.'],
      ['Builder and custom build routes', 'Businesses can self-build with AI guidance or ask PBI to handle a done-for-you website build.'],
      ['Search-friendly setup', 'The platform supports metadata, clean URLs, schema, sitemap coverage, responsive pages and internal linking.']
    ],
    sections: [
      ['A builder should reduce uncertainty', 'Many small businesses know they need a better site but do not know what pages, sections, forms or SEO settings to create. PBI guides those decisions with practical prompts.'],
      ['UK operations, not generic templates', 'From VAT-aware pricing language to booking, enquiry and payment flows, PBI is shaped around the way UK small businesses describe, sell and deliver services.'],
      ['Support when the build becomes more complex', 'If the website needs e-commerce, custom pages, automation, redirects or content strategy, PBI can step in without forcing the business to move platform.']
    ],
    faqs: [
      ['Is PBI a UK website builder?', 'Yes. PBI is focused on UK small businesses while keeping the platform accessible online.'],
      ['Can I connect a custom domain?', 'Yes. PBI supports domain setup and publishing routes for business websites.'],
      ['Can I accept payments?', 'PBI supports Stripe payment routes where the business model needs checkout, deposits or online orders.']
    ],
    related: [['/ai-website-builder/', 'AI website builder'], ['/small-business-websites/', 'Small business websites'], ['/affordable-business-websites/', 'Affordable business websites'], ['/onboarding/', 'Start building']]
  }),
  page({
    tier: 'Tier 1 national money page',
    slug: 'ai-business-tools',
    title: 'AI Business Tools for UK Small Businesses | PBI',
    description: 'AI business tools for UK small businesses, including website generation, content improvement, SEO tasks, enquiry support and operations workflows.',
    eyebrow: 'AI business tools',
    h1: 'AI business tools that help small businesses work with better structure.',
    intro: 'PBI uses AI to support practical work: generating website drafts, improving content, shaping SEO tasks, summarising enquiries and suggesting operational improvements that stay editable and human-reviewed.',
    image: images.automation,
    chips: ['AI content support', 'SEO tasks', 'Enquiry summaries', 'Operations'],
    features: [
      ['Website and content support', 'AI can help turn messy business notes into page sections, FAQs, service descriptions and clearer calls to action.'],
      ['SEO operations', 'The SEO Agent uses structured audits and AI-assisted fixes to improve metadata, headings, schema, content and internal links.'],
      ['Business workflow support', 'AI can help summarise briefs, draft replies, identify missing information and support repeatable admin processes.']
    ],
    sections: [
      ['AI should be useful, not noisy', 'The best AI tools remove friction from real tasks. PBI focuses on outputs that can be reviewed, edited and connected to website or operations workflows.'],
      ['Keep brand and judgement intact', 'AI suggestions should support the business voice rather than replace it. PBI keeps generated content editable and avoids publishing unreviewed automated text.'],
      ['Connect AI to systems', 'AI becomes more valuable when it is connected to forms, projects, keyword tracking, content planning and business dashboards.']
    ],
    faqs: [
      ['What can AI do inside PBI?', 'It can support website drafts, content improvements, SEO fixes, page ideas and operational summaries.'],
      ['Will AI publish changes automatically?', 'SEO fixes are previewable and editable before approval. Important content remains under human control.'],
      ['Is AI useful for very small businesses?', 'Yes, when it is focused on repeated work such as content drafting, enquiry handling and operational prompts.']
    ],
    related: [['/business-automation-tools/', 'Business automation tools'], ['/ai-website-builder/', 'AI website builder'], ['/seo-for-small-businesses/', 'SEO for small businesses'], ['/small-business-automation/', 'Small business automation']]
  }),
  page({
    tier: 'Tier 1 national money page',
    slug: 'small-business-automation',
    title: 'Small Business Automation UK | PBI',
    description: 'Small business automation for UK firms, connecting websites, enquiries, payments, reminders, project workflows and AI-assisted operations.',
    eyebrow: 'Small business automation',
    h1: 'Small business automation that starts with the work you already repeat.',
    intro: 'PBI helps small businesses automate practical steps around enquiries, bookings, payments, project information, follow-up and reporting. The result is a website and operations layer that work together.',
    image: images.automation,
    chips: ['Lead capture', 'Project flow', 'Payments', 'Reporting'],
    features: [
      ['Map the workflow', 'Before building automation, PBI looks at what happens from first visitor to enquiry, quote, payment, delivery and follow-up.'],
      ['Automate with boundaries', 'Useful automations save time while keeping approvals, customer context and important decisions visible.'],
      ['Improve over time', 'Reports and task queues help the business identify where automation should be adjusted as demand changes.']
    ],
    sections: [
      ['Website first, operations next', 'Many automation opportunities begin on the website: quote forms, booking requests, payment confirmations, product interest, support messages and uploaded details.'],
      ['Reduce avoidable admin', 'Automation can reduce repeated typing, missed replies, duplicated records and unclear hand-offs. That gives owners and staff more time for skilled work.'],
      ['Build only what has value', 'PBI avoids complicated systems for their own sake. The first automation should have a clear purpose, a measurable benefit and a simple fallback route.']
    ],
    faqs: [
      ['How do I know what to automate?', 'Look for repeated tasks, missed enquiries, manual copying, payment chasing and customer updates that follow a predictable pattern.'],
      ['Can automation work with a small website?', 'Yes. Even a simple site can trigger useful workflows if forms and calls to action are structured properly.'],
      ['Can PBI automate industry-specific workflows?', 'Yes. Hospitality, retail, trades, salons and service businesses all have different operational patterns that can be supported.']
    ],
    related: [['/business-automation-tools/', 'Business automation tools'], ['/ai-business-tools/', 'AI business tools'], ['/hospitality-business-systems/', 'Hospitality business systems'], ['/small-business-websites/', 'Small business websites']]
  }),
  page({
    tier: 'Tier 2 industry authority page',
    slug: 'restaurant-website-design',
    title: 'Restaurant Website Design UK | Menus, Bookings and Systems | PBI',
    description: 'Restaurant website design for UK operators, covering menus, bookings, allergens, events, gift vouchers, payments, local SEO and operational workflows.',
    eyebrow: 'Restaurant website design',
    h1: 'Restaurant website design built around menus, bookings and daily service.',
    intro: 'Restaurant websites need to handle more than attractive food photography. PBI plans pages around bookings, menus, opening times, allergens, events, gift vouchers, private dining, reviews and the operational flow behind each enquiry.',
    image: images.restaurant,
    chips: ['Menus', 'Bookings', 'Allergens', 'Gift vouchers'],
    features: [
      ['Menu structure', 'Food, drink, set menus, allergen notes and seasonal updates should be easy to maintain and easy for guests to scan.'],
      ['Booking and enquiry flow', 'The site can route table bookings, private dining enquiries, deposits, event requests and cancellations with clearer information capture.'],
      ['Search and trust signals', 'Schema, reviews, opening hours, local context, FAQs and internal links help search engines understand the restaurant offer.']
    ],
    sections: [
      ['Operational workflows', 'A restaurant site should reduce phone interruptions by answering common questions, showing up-to-date menus and sending guests to the correct booking or enquiry route.'],
      ['Automation opportunities', 'Useful automations include booking confirmations, event enquiry summaries, voucher payment routes, seasonal menu updates and prompts when key pages need review.'],
      ['Content that proves the experience', 'Strong restaurant pages explain food style, service format, private dining, accessibility, dietary handling and what guests should expect before arriving.']
    ],
    faqs: [
      ['Can PBI support online restaurant bookings?', 'PBI can design the route and connect booking links, forms or third-party systems depending on how the restaurant operates.'],
      ['Can menus be updated easily?', 'Yes. Menu pages can be structured so updates are easier and less likely to break the layout.'],
      ['Does restaurant SEO need local pages?', 'Local context is useful, but strong menu, booking, event and experience pages are usually more valuable than doorway-style location pages.']
    ],
    related: [['/hospitality-business-systems/', 'Hospitality business systems'], ['/cafe-website-builder/', 'Cafe website builder'], ['/pub-website-design/', 'Pub website design'], ['/seo-for-small-businesses/', 'SEO for small businesses']]
  }),
  page({
    tier: 'Tier 2 industry authority page',
    slug: 'cafe-website-builder',
    title: 'Cafe Website Builder UK | Menus, Pre-Orders and Loyalty | PBI',
    description: 'Cafe website builder for UK cafes, coffee shops and bakeries needing menus, opening times, pre-orders, loyalty prompts, events and local search support.',
    eyebrow: 'Cafe website builder',
    h1: 'Cafe website builder for coffee shops, bakeries and food-led independents.',
    intro: 'A cafe website should make it easy to check opening times, view menus, order ahead, find the location, understand dietary options and discover events or catering. PBI builds the site around those small but important customer moments.',
    image: images.cafe,
    chips: ['Opening times', 'Menus', 'Order ahead', 'Events'],
    features: [
      ['Fast customer answers', 'Visitors need opening hours, address, menus, table information, accessibility details and contact options without digging.'],
      ['Operational support', 'Pre-order forms, catering enquiries, loyalty prompts, event pages and staff-friendly menu updates can reduce repeated manual messages.'],
      ['Local and national search support', 'Cafe SEO works best when pages are useful, specific and connected to wider hospitality and small business content clusters.']
    ],
    sections: [
      ['Daily updates without friction', 'Menus, seasonal drinks, bakery items and opening times change often. The website structure should make these updates simple and visible.'],
      ['Automation opportunities', 'Cafes can use structured forms for catering, cake orders, wholesale enquiries, loyalty signups and event interest, with clear routing for staff.'],
      ['Content that reflects the real cafe', 'Useful cafe pages describe food style, suppliers, seating, takeaway, dietary handling, events and community use rather than relying on generic lifestyle copy.']
    ],
    faqs: [
      ['Can PBI help with cafe menus?', 'Yes. PBI can structure menu pages for scanning, updates, dietary notes and search visibility.'],
      ['Can a cafe take pre-orders through the site?', 'PBI can support enquiry or payment routes for pre-orders depending on the cafe process.'],
      ['Should a cafe website include events?', 'If events, tastings, pop-ups or catering matter commercially, they should be easy to find and update.']
    ],
    related: [['/restaurant-website-design/', 'Restaurant website design'], ['/hospitality-business-systems/', 'Hospitality business systems'], ['/small-business-websites/', 'Small business websites'], ['/business-automation-tools/', 'Business automation tools']]
  }),
  page({
    tier: 'Tier 2 industry authority page',
    slug: 'pub-website-design',
    title: 'Pub Website Design UK | Events, Food, Rooms and Bookings | PBI',
    description: 'Pub website design for UK pubs needing events, menus, table bookings, rooms, sports fixtures, private hire, SEO structure and operational workflows.',
    eyebrow: 'Pub website design',
    h1: 'Pub website design for events, food, rooms and community trade.',
    intro: 'Pubs often run several businesses at once: food, drink, events, sport, private hire, rooms, takeaway, vouchers and local community updates. PBI structures pub websites so each offer has a clear route.',
    image: images.pub,
    chips: ['Events', 'Food menus', 'Private hire', 'Rooms'],
    features: [
      ['Event visibility', 'Quiz nights, live music, sports screenings and seasonal events need dedicated content, not hidden social posts only.'],
      ['Booking routes', 'Table bookings, room enquiries, private hire and larger groups should collect the right details and reduce back-and-forth.'],
      ['Operational clarity', 'Opening hours, kitchen times, menus, dog policy, accessibility and parking information should be obvious.']
    ],
    sections: [
      ['A pub site has multiple customer journeys', 'Someone booking Sunday lunch needs different information from someone checking room availability or planning a private event. The site should guide each journey cleanly.'],
      ['Automation opportunities', 'Useful workflows include event enquiry forms, voucher payments, table request routing, room enquiry summaries and reminders to update fixture or menu pages.'],
      ['SEO with genuine local usefulness', 'Pub SEO should include useful local context, but it should also build authority around food, events, rooms, hospitality systems and customer questions.']
    ],
    faqs: [
      ['Can PBI build event pages for a pub?', 'Yes. Events can be structured as clear pages or sections with dates, booking routes and internal links.'],
      ['Can pub menus and kitchen hours be separated?', 'Yes. Separating bar hours, kitchen hours and menus can reduce customer confusion.'],
      ['Can PBI support accommodation pages?', 'Yes. Room pages can include facilities, booking links, local context and FAQs.']
    ],
    related: [['/restaurant-website-design/', 'Restaurant website design'], ['/hospitality-business-systems/', 'Hospitality business systems'], ['/small-business-automation/', 'Small business automation'], ['/website-refurbishment/', 'Website refurbishment']]
  }),
  page({
    tier: 'Tier 2 industry authority page',
    slug: 'butcher-shop-websites',
    title: 'Butcher Shop Websites UK | Orders, Seasonal Ranges and Local SEO | PBI',
    description: 'Butcher shop websites for UK butchers needing product ranges, Christmas orders, click and collect, allergens, local SEO and stock-aware workflows.',
    eyebrow: 'Butcher shop websites',
    h1: 'Butcher shop websites for orders, seasonal demand and customer trust.',
    intro: 'Butchers need websites that explain product quality, make ordering easier, handle seasonal peaks and support local customer habits. PBI plans pages around real retail operations, not generic shop templates.',
    image: images.butcher,
    chips: ['Product ranges', 'Christmas orders', 'Click and collect', 'Local trust'],
    features: [
      ['Range clarity', 'Meat boxes, counter ranges, deli items, cooked food, wholesale and seasonal products should be clearly separated.'],
      ['Order workflows', 'Christmas orders, BBQ packs, click and collect and special requests can be routed through structured forms or payment flows.'],
      ['Trust and compliance content', 'Sourcing, preparation, allergens, storage guidance and collection information help customers buy with confidence.']
    ],
    sections: [
      ['Seasonal operations matter', 'Peak periods can create admin pressure. A well-structured website can collect the right order details, set expectations and reduce phone queries.'],
      ['Automation opportunities', 'Order summaries, deposit routes, collection slot prompts, product enquiry forms and repeat seasonal pages can all support shop workflow.'],
      ['Useful content beats generic retail copy', 'Pages should explain cuts, cooking guidance, provenance, storage, order deadlines and what customers need to know before visiting.']
    ],
    faqs: [
      ['Can PBI support Christmas order pages?', 'Yes. Seasonal order pages can include deadlines, product ranges, deposit routes and collection instructions.'],
      ['Can a butcher website include online payments?', 'PBI can support Stripe payment routes where products, deposits or order flows need checkout.'],
      ['Is this different from a normal retail website?', 'Yes. Butcher shop workflows often involve seasonal demand, custom orders, collection slots and product education.']
    ],
    related: [['/retail-business-websites/', 'Retail business websites'], ['/business-automation-tools/', 'Business automation tools'], ['/small-business-websites/', 'Small business websites'], ['/seo-for-small-businesses/', 'SEO for small businesses']]
  }),
  page({
    tier: 'Tier 2 industry authority page',
    slug: 'retail-business-websites',
    title: 'Retail Business Websites UK | Stock, Payments and Local Search | PBI',
    description: 'Retail business websites for UK shops needing product pages, click and collect, stock-aware workflows, payments, SEO content and customer updates.',
    eyebrow: 'Retail business websites',
    h1: 'Retail business websites that connect products, stock and customer action.',
    intro: 'Independent retail websites need more than a gallery of products. PBI helps shops plan product categories, click and collect routes, stock-aware messaging, payments, content and local search signals.',
    image: images.retail,
    chips: ['Product pages', 'Click and collect', 'Stock workflow', 'Payments'],
    features: [
      ['Product discovery', 'Categories, featured ranges, seasonal collections and buying guidance help customers find the right item faster.'],
      ['Operational routes', 'Click and collect, product enquiries, deposits, delivery notes and payment flows should be practical for staff to manage.'],
      ['Content and SEO', 'Retail SEO can include category pages, buying guides, FAQs, local context and internal links to related services.']
    ],
    sections: [
      ['Retail websites must match how the shop works', 'A small shop may not need a full warehouse-style system immediately. It may need clear ranges, availability messaging and a practical enquiry or checkout route.'],
      ['Automation opportunities', 'Useful automation can include low-stock prompts, enquiry summaries, abandoned order follow-up, collection instructions and customer update emails.'],
      ['Build authority around products', 'Buying guides, care information, comparisons and FAQs can help customers choose and support search visibility without creating thin category pages.']
    ],
    faqs: [
      ['Can PBI build e-commerce for retailers?', 'Yes. PBI supports e-commerce routes where online checkout is part of the business model.'],
      ['Can click and collect be added?', 'Yes. Click and collect can be supported with structured order or enquiry flows.'],
      ['Do retailers need SEO content?', 'Helpful category pages, product guidance and FAQs can support both customers and search visibility.']
    ],
    related: [['/butcher-shop-websites/', 'Butcher shop websites'], ['/e-commerce/', 'E-commerce websites'], ['/business-automation-tools/', 'Business automation tools'], ['/affordable-business-websites/', 'Affordable business websites']]
  }),
  page({
    tier: 'Tier 2 industry authority page',
    slug: 'tradesperson-websites',
    title: 'Tradesperson Websites UK | Quotes, Coverage and Job Flow | PBI',
    description: 'Tradesperson websites for UK plumbers, electricians, builders and service teams needing quote forms, coverage pages, proof, SEO and workflow automation.',
    eyebrow: 'Tradesperson websites',
    h1: 'Tradesperson websites built around quote quality, trust and job flow.',
    intro: 'Trades websites need to turn visitors into useful enquiries. PBI structures pages around services, coverage, proof, urgency, job details, quote routing and operational follow-up.',
    image: images.trades,
    chips: ['Quote requests', 'Coverage', 'Proof', 'Job workflow'],
    features: [
      ['Better enquiry quality', 'Forms can collect service type, location, urgency, photos, access notes and preferred times so fewer calls start from scratch.'],
      ['Service clarity', 'Each core service should explain what is included, what affects cost and when to request a quote.'],
      ['Trust and compliance', 'Qualifications, insurance, reviews, before-and-after work and safety information can all reduce customer doubt.']
    ],
    sections: [
      ['Coverage pages need substance', 'Useful coverage content explains response routes, typical work, service limits and how enquiries are handled. It should not be a doorway page repeated for every town.'],
      ['Automation opportunities', 'Trade businesses can automate enquiry summaries, photo collection, quote reminders, job status prompts and payment links.'],
      ['SEO built around services', 'The strongest trade SEO usually comes from clear service pages, FAQs, project examples and local support content that links back to national service architecture.']
    ],
    faqs: [
      ['What should a tradesperson website include?', 'Core services, coverage, proof, qualifications, quote routes, FAQs and easy mobile contact options.'],
      ['Can PBI add photo uploads to quote forms?', 'PBI can support structured enquiry routes that request useful project details and assets.'],
      ['Are location pages useful for trades?', 'They can be useful when they contain genuine coverage information and are linked to strong service pages.']
    ],
    related: [['/small-business-websites/', 'Small business websites'], ['/business-automation-tools/', 'Business automation tools'], ['/seo-for-small-businesses/', 'SEO for small businesses'], ['/website-design-for-small-businesses/', 'Website design for small businesses']]
  }),
  page({
    tier: 'Tier 2 industry authority page',
    slug: 'salon-website-builder',
    title: 'Salon Website Builder UK | Bookings, Deposits and Treatment Menus | PBI',
    description: 'Salon website builder for UK hair, beauty and wellness businesses needing service menus, bookings, deposits, reminders, galleries and SEO structure.',
    eyebrow: 'Salon website builder',
    h1: 'Salon website builder for bookings, treatment menus and client confidence.',
    intro: 'A salon website should make services clear, support bookings, explain prices, show proof and reduce repetitive messages. PBI structures salon pages around the client journey from discovery to appointment.',
    image: images.salon,
    chips: ['Treatment menus', 'Bookings', 'Deposits', 'Gallery proof'],
    features: [
      ['Service menu clarity', 'Treatments, durations, pricing, patch test notes, deposits and aftercare guidance should be easy to scan.'],
      ['Booking support', 'The website can connect booking systems, enquiry forms, cancellation policies, consultation routes and reminder workflows.'],
      ['Visual proof', 'Galleries, reviews, staff profiles and treatment explanations help clients choose with confidence.']
    ],
    sections: [
      ['A salon site is a booking support system', 'Visitors often need reassurance before booking. Clear treatment pages, policies, pricing guidance and proof reduce uncertainty and manual questions.'],
      ['Automation opportunities', 'Salons can use booking prompts, deposit links, consultation forms, aftercare messages, review requests and reminders to improve flow.'],
      ['SEO around real services', 'Strong salon SEO needs specific treatment content, FAQs, staff expertise, local context and internal links rather than generic beauty wording.']
    ],
    faqs: [
      ['Can PBI connect online booking?', 'Yes. PBI can link to booking systems or structure enquiry routes depending on the salon workflow.'],
      ['Should prices be shown?', 'Clear pricing or starting prices often improve booking quality and reduce repetitive messages.'],
      ['Can galleries help SEO?', 'Galleries help trust, and image alt text plus relevant service pages can support search understanding.']
    ],
    related: [['/small-business-websites/', 'Small business websites'], ['/business-automation-tools/', 'Business automation tools'], ['/seo-for-small-businesses/', 'SEO for small businesses'], ['/website-builder-uk/', 'Website builder UK']]
  }),
  page({
    tier: 'Tier 2 industry authority page',
    slug: 'hospitality-business-systems',
    title: 'Hospitality Business Systems UK | Websites and Automation | PBI',
    description: 'Hospitality business systems for UK restaurants, cafes, pubs and venues, connecting websites, menus, bookings, events, stock, reviews and automation.',
    eyebrow: 'Hospitality business systems',
    h1: 'Hospitality business systems that connect websites with daily operations.',
    intro: 'Hospitality businesses need websites, bookings, menus, events, payments, reviews and operational updates to work together. PBI helps build the digital layer around real service pressure.',
    image: images.restaurant,
    chips: ['Menus', 'Bookings', 'Events', 'Automation'],
    features: [
      ['Joined-up customer journeys', 'Guests should be able to move from menu to booking, event to enquiry, or voucher to payment without confusion.'],
      ['Operational resilience', 'Opening times, menu changes, allergens, events and policy updates need a simple route for staff to maintain.'],
      ['Performance and search', 'Hospitality pages need speed, mobile clarity, schema, image care, review signals and useful FAQs.']
    ],
    sections: [
      ['Hospitality is operationally dense', 'Restaurants, cafes, pubs and venues manage time-sensitive changes, customer questions and service constraints every day. The website should reduce pressure, not add to it.'],
      ['Automation opportunities', 'PBI can support event enquiries, booking prompts, voucher payments, customer updates, menu review tasks, internal notes and SEO content planning.'],
      ['Authority through expertise', 'Useful hospitality content explains booking policies, menu formats, dietary handling, private hire, event planning and customer expectations.']
    ],
    faqs: [
      ['What is a hospitality business system?', 'It is the connected digital setup behind the customer journey, including website pages, menus, bookings, payments, updates and admin workflows.'],
      ['Can PBI help restaurants and cafes differently?', 'Yes. Each hospitality type has different workflows, from table bookings to catering, events, rooms or seasonal menus.'],
      ['Can the system support SEO?', 'Yes. Clear page structure, schema, FAQs, internal links and content clusters help search engines understand hospitality services.']
    ],
    related: [['/restaurant-website-design/', 'Restaurant website design'], ['/cafe-website-builder/', 'Cafe website builder'], ['/pub-website-design/', 'Pub website design'], ['/business-automation-tools/', 'Business automation tools']]
  }),
  page({
    tier: 'Tier 3 supporting location page',
    slug: 'dorset-website-design',
    areaServed: 'Dorset',
    title: 'Dorset Website Design with National UK Systems | PBI',
    description: 'Dorset website design support from PBI for small businesses that need websites, automation, SEO foundations and a route into national UK growth.',
    eyebrow: 'Dorset website design',
    h1: 'Dorset website design support connected to a national UK platform.',
    intro: 'PBI has Dorset roots but the platform is built for UK-wide small business growth. This page supports local Dorset search with useful context while linking into the national website, automation and SEO architecture.',
    image: images.local,
    chips: ['Dorset support', 'UK-wide service', 'Small business websites', 'Automation'],
    features: [
      ['Local context', 'Dorset businesses often balance tourism, hospitality, trades, independent retail and seasonal demand. Website structure should reflect those operating realities.'],
      ['National capability', 'The service is not limited to local web design. PBI supports UK-wide AI websites, automation and operational systems.'],
      ['Useful local SEO', 'Location content should be helpful, specific and connected to stronger national service pages rather than duplicated doorway pages.']
    ],
    sections: [
      ['Dorset businesses need practical digital systems', 'Hospitality, retail, trades and service businesses often need clear opening times, booking routes, seasonal updates, local trust and mobile-first customer journeys.'],
      ['Support beyond the county', 'PBI uses Dorset as part of its story, but the SEO strategy targets national UK searches first. Local pages work as supporting resources.'],
      ['Build once, improve continuously', 'A Dorset business can start with a focused site, then expand into industry pages, SEO content, automation and management support over time.']
    ],
    faqs: [
      ['Is PBI based around Dorset only?', 'No. PBI supports UK small businesses nationally, with Dorset pages acting as useful local support content.'],
      ['Can Dorset businesses use the AI builder?', 'Yes. Dorset businesses can use the same AI website builder, custom build and support options as any UK business.'],
      ['Can PBI help tourism and hospitality businesses?', 'Yes. Hospitality workflows, bookings, menus, events and seasonal content are a strong fit for PBI systems.']
    ],
    related: [['/website-builder-uk/', 'Website builder UK'], ['/small-business-websites/', 'Small business websites'], ['/hospitality-business-systems/', 'Hospitality business systems'], ['/seo-for-small-businesses/', 'SEO for small businesses']]
  }),
  page({
    tier: 'Tier 3 supporting location page',
    slug: 'london-small-business-websites',
    areaServed: 'London',
    title: 'London Small Business Websites | PBI',
    description: 'London small business websites with clear service pages, national SEO structure, automation, payments and practical digital operations support from PBI.',
    eyebrow: 'London small business websites',
    h1: 'London small business websites for crowded markets and faster decisions.',
    intro: 'London businesses often compete in dense search results and fast-moving customer journeys. PBI supports clear positioning, practical page structure, automation and national SEO foundations for small businesses operating in and beyond the capital.',
    image: images.local,
    chips: ['London support', 'Competitive search', 'Service clarity', 'Automation'],
    features: [
      ['Sharper positioning', 'Clear service pages help London customers quickly understand fit, location relevance, proof and next steps.'],
      ['Efficient enquiry handling', 'Structured forms and automation can reduce low-quality leads and speed up follow-up in busy markets.'],
      ['National search connection', 'London pages support the wider PBI architecture by linking to national website, SEO and automation services.']
    ],
    sections: [
      ['London search is competitive', 'Thin location copy is unlikely to help. Pages need useful detail about services, workflows, proof, response routes and customer expectations.'],
      ['Automation supports speed', 'London small businesses can benefit from enquiry triage, booking prompts, payment links, project summaries and faster admin hand-offs.'],
      ['Local support without doorway pages', 'This page exists to help London businesses understand the offer while pointing to the national service pages that carry the main SEO strategy.']
    ],
    faqs: [
      ['Does PBI work with London businesses?', 'Yes. PBI supports small businesses across the UK, including London.'],
      ['Can PBI help competitive service businesses?', 'Yes. Strong service structure, proof, technical SEO and useful content are important in competitive markets.'],
      ['Is this a local-only service?', 'No. London pages support the wider national PBI service architecture.']
    ],
    related: [['/small-business-websites/', 'Small business websites'], ['/seo-for-small-businesses/', 'SEO for small businesses'], ['/business-automation-tools/', 'Business automation tools'], ['/website-design-for-small-businesses/', 'Website design for small businesses']]
  }),
  page({
    tier: 'Tier 3 supporting location page',
    slug: 'manchester-website-design',
    areaServed: 'Manchester',
    title: 'Manchester Website Design for Small Businesses | PBI',
    description: 'Manchester website design support for small businesses needing AI-powered websites, SEO structure, automation and operational systems from PBI.',
    eyebrow: 'Manchester website design',
    h1: 'Manchester website design support for ambitious small businesses.',
    intro: 'Manchester has a strong mix of independent retail, hospitality, professional services, trades and digital businesses. PBI supports these businesses with practical websites, automation and SEO architecture that can compete beyond one local area.',
    image: images.local,
    chips: ['Manchester support', 'Service pages', 'Operational systems', 'National SEO'],
    features: [
      ['Business-first pages', 'Service, booking, quote and proof sections are planned around what customers need before taking action.'],
      ['Automation-ready structure', 'PBI can connect forms, payments, enquiries and follow-up workflows so the website supports the back office.'],
      ['Supportive local content', 'Manchester content should help real businesses while linking into the main national service and industry pages.']
    ],
    sections: [
      ['A website should match the market', 'Manchester businesses often need a strong balance of credibility, speed, useful content and clear calls to action.'],
      ['Operational detail matters', 'Quote routes, appointment requests, stock messages, menus, project briefs and payment steps can all shape the website structure.'],
      ['National growth from a local base', 'PBI treats local pages as satellites that support wider UK-focused pages on websites, SEO and automation.']
    ],
    faqs: [
      ['Can PBI support Manchester businesses remotely?', 'Yes. PBI is built as a UK-wide digital platform and can support businesses remotely.'],
      ['Can the website target more than Manchester?', 'Yes. The structure can include national service pages, industry pages and useful local support content.'],
      ['Can automation be added after launch?', 'Yes. Automation can be phased in as the business learns where time is being lost.']
    ],
    related: [['/website-builder-uk/', 'Website builder UK'], ['/business-automation-tools/', 'Business automation tools'], ['/retail-business-websites/', 'Retail business websites'], ['/tradesperson-websites/', 'Tradesperson websites']]
  }),
  page({
    tier: 'Tier 3 supporting location page',
    slug: 'bristol-web-design',
    areaServed: 'Bristol',
    title: 'Bristol Web Design for Small Businesses | PBI',
    description: 'Bristol web design support for small businesses needing useful websites, SEO foundations, automation tools and operational systems from PBI.',
    eyebrow: 'Bristol web design',
    h1: 'Bristol web design support for independent businesses and practical growth.',
    intro: 'Bristol businesses often need websites that communicate clearly, support bookings or enquiries and reflect a strong independent identity. PBI connects those needs to a national platform for websites, SEO and automation.',
    image: images.local,
    chips: ['Bristol support', 'Independent businesses', 'SEO foundations', 'Automation'],
    features: [
      ['Clear customer pathways', 'Pages should make services, prices, proof, availability and contact routes easy to understand on mobile.'],
      ['Practical systems', 'The website can support enquiries, bookings, payments, project requests, content updates and SEO tasks.'],
      ['Useful local support', 'Bristol content should add context and link to national pages rather than repeat the same generic local wording.']
    ],
    sections: [
      ['Bristol businesses need personality and structure', 'Design should reflect the business while still helping customers make decisions quickly. PBI balances identity, clarity and operational usefulness.'],
      ['Automation supports consistency', 'Follow-up workflows, enquiry summaries, booking links, payment routes and review prompts can help small teams stay organised.'],
      ['Local pages as part of a bigger architecture', 'This page supports Bristol search interest while strengthening the national PBI positioning around AI websites and business systems.']
    ],
    faqs: [
      ['Does PBI work with Bristol businesses?', 'Yes. PBI supports small businesses across the UK, including Bristol.'],
      ['Can a Bristol business use PBI for automation as well as web design?', 'Yes. Websites and automation can be planned together or phased in over time.'],
      ['Will the page strategy include national SEO?', 'Yes. National service pages remain the core strategy, with useful local pages supporting them.']
    ],
    related: [['/small-business-websites/', 'Small business websites'], ['/ai-website-builder/', 'AI website builder'], ['/small-business-automation/', 'Small business automation'], ['/seo-for-small-businesses/', 'SEO for small businesses']]
  })
];

function navHtml() {
  return `
  <nav class="nav">
    <div class="container nav-inner">
      <a class="brand brand-logo-only" href="/"><img src="/assets/pbi-brand-logo-20260505.png" alt="Purbeck Business Innovations logo" class="header-logo pbi-header-logo-on-light"></a>
      <div class="row pbi-main-nav" aria-label="Primary navigation">
        <a class="btn-ghost" href="/custom-websites/">Website Builds</a>
        <a class="btn-ghost" href="/ai-website-builder/">AI Builder</a>
        <a class="btn-ghost" href="/business-automation-tools/">Automation</a>
        <a class="btn-ghost" href="/seo-for-small-businesses/">SEO</a>
        <a class="btn-ghost" href="/pricing/">Packages</a>
        <a class="btn" href="/onboarding/">Start building</a>
      </div>
    </div>
  </nav>`;
}

function footerHtml() {
  return `
  <footer class="site-footer">
    <div class="container footer-mega">
      <div>
        <strong>PBI</strong>
        <p>Purbeck Business Innovations</p>
        <p class="muted">AI-powered websites, automation and operational systems for UK small businesses.</p>
      </div>
      <div>
        <h4>National services</h4>
        <a href="/ai-website-builder/">AI website builder</a>
        <a href="/small-business-websites/">Small business websites</a>
        <a href="/business-automation-tools/">Business automation tools</a>
        <a href="/seo-for-small-businesses/">SEO for small businesses</a>
      </div>
      <div>
        <h4>Industries</h4>
        <a href="/restaurant-website-design/">Restaurants</a>
        <a href="/cafe-website-builder/">Cafes</a>
        <a href="/tradesperson-websites/">Tradespeople</a>
        <a href="/retail-business-websites/">Retail</a>
      </div>
      <div>
        <h4>Next steps</h4>
        <a href="/pricing/">Pricing</a>
        <a href="/custom-build/">Request a website build</a>
        <a href="/onboarding/">Start building</a>
        <a href="/contact/">Contact PBI</a>
      </div>
    </div>
  </footer>`;
}

function schema(pageData) {
  const url = `${BASE}${pageData.path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE}/#organization`,
        name: 'Purbeck Business Innovations',
        url: BASE,
        logo: LOGO
      },
      {
        '@type': ['LocalBusiness', 'ProfessionalService'],
        '@id': `${BASE}/#localbusiness`,
        name: 'Purbeck Business Innovations',
        url: BASE,
        image: LOGO,
        logo: LOGO,
        areaServed: 'United Kingdom',
        priceRange: 'GBP'
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        name: 'Purbeck Business Innovations',
        url: BASE,
        publisher: { '@id': `${BASE}/#organization` }
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: pageData.title,
        description: pageData.description,
        isPartOf: { '@id': `${BASE}/#website` },
        about: { '@id': `${url}#service` },
        inLanguage: 'en-GB'
      },
      {
        '@type': 'Service',
        '@id': `${url}#service`,
        name: pageData.h1,
        serviceType: pageData.eyebrow,
        provider: { '@id': `${BASE}/#organization` },
        areaServed: pageData.areaServed,
        description: pageData.description,
        url
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: pageData.faqs.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer }
        }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
          { '@type': 'ListItem', position: 2, name: pageData.eyebrow, item: url }
        ]
      }
    ]
  };
}

function renderPage(pageData) {
  const url = `${BASE}${pageData.path}`;
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(pageData.title)}</title>
  <meta name="description" content="${esc(pageData.description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:title" content="${esc(pageData.title)}">
  <meta property="og:description" content="${esc(pageData.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(LOGO)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(pageData.title)}">
  <meta name="twitter:description" content="${esc(pageData.description)}">
  <meta name="twitter:image" content="${esc(LOGO)}">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#b95624">
  <link rel="stylesheet" href="/assets/styles.css?v=20260520-national-seo">
  <link rel="stylesheet" href="/assets/pbi-seo-national.css?v=20260520-national-seo">
  <script type="application/ld+json">${JSON.stringify(schema(pageData))}</script>
</head>
<body class="pbi-seo-national-page">
${navHtml()}
  <main>
    <section class="hero pbi-seo-hero">
      <div class="container pbi-seo-hero-grid">
        <div class="pbi-seo-hero-copy">
          <p class="eyebrow">${esc(pageData.eyebrow)}</p>
          <h1>${esc(pageData.h1)}</h1>
          <p class="hero-text">${esc(pageData.intro)}</p>
          <div class="hero-actions">
            <a class="btn" href="/custom-build/">Discuss a website build</a>
            <a class="btn-ghost" href="/onboarding/">Start with the AI builder</a>
          </div>
          <div class="pbi-seo-trust-row">${pageData.chips.map((chip) => `<span>${esc(chip)}</span>`).join('')}</div>
        </div>
        <figure class="pbi-seo-media-panel">
          <img src="${esc(pageData.image)}" alt="${esc(pageData.imageAlt)}" width="900" height="675">
          <figcaption>${esc(pageData.cta)}</figcaption>
        </figure>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="pbi-seo-section-head">
          <p class="eyebrow">What PBI builds</p>
          <h2>Useful pages, operational workflows and SEO foundations in one structure.</h2>
          <p>PBI is positioned nationally as a platform for AI-powered websites, automation and operational systems for UK small businesses. These pages support that architecture with practical content and clear routes into the wider platform.</p>
        </div>
        <div class="pbi-seo-feature-grid">
          ${pageData.features.map(([heading, body]) => `<article><h2>${esc(heading)}</h2><p>${esc(body)}</p></article>`).join('\n          ')}
        </div>
      </div>
    </section>

    <section class="section soft-section">
      <div class="container pbi-seo-two-column">
        <div class="pbi-seo-rich-copy">
          ${pageData.sections.map(([heading, body]) => `<section><h2>${esc(heading)}</h2><p>${esc(body)}</p></section>`).join('\n          ')}
        </div>
        <aside class="pbi-seo-side-panel">
          <p class="eyebrow">Best fit</p>
          <h2>Good fit when you need</h2>
          <ul>${pageData.fit.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
          <a class="btn" href="/contact/">Talk to PBI</a>
          <a class="btn-ghost" href="/pricing/">View packages</a>
        </aside>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="pbi-seo-section-head">
          <p class="eyebrow">Workflow</p>
          <h2>How PBI turns the website into a working system.</h2>
        </div>
        <div class="pbi-seo-workflow-grid">
          ${pageData.workflow.map((step, index) => `<article><strong>${index + 1}</strong><h3>${esc(step.split('.')[0])}</h3><p>${esc(step)}</p></article>`).join('\n          ')}
        </div>
      </div>
    </section>

    <section class="section soft-section">
      <div class="container">
        <div class="pbi-seo-section-head">
          <p class="eyebrow">Related PBI pages</p>
          <h2>Strengthen the search path with connected service and industry pages.</h2>
        </div>
        <div class="pbi-seo-related-links">
          ${pageData.related.map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`).join('\n          ')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="pbi-seo-section-head">
          <p class="eyebrow">FAQs</p>
          <h2>Common questions</h2>
        </div>
        <div class="pbi-seo-faq-list">
          ${pageData.faqs.map(([question, answer]) => `<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join('\n          ')}
        </div>
      </div>
    </section>

    <section class="section pbi-seo-cta-band">
      <div class="container pbi-seo-cta-inner">
        <div>
          <p class="eyebrow">Next step</p>
          <h2>${esc(pageData.cta)}</h2>
        </div>
        <div class="hero-actions">
          <a class="btn" href="/custom-build/">Request a build</a>
          <a class="btn-ghost" href="/ai-website-builder/">Explore AI builder</a>
        </div>
      </div>
    </section>
  </main>
${footerHtml()}
  <script src="/assets/pbi-cookie-banner.js" defer></script>
  <script src="/assets/pbi-analytics.js" defer></script>
</body>
</html>
`;
}

async function writePages() {
  for (const item of pages) {
    const dir = path.join(ROOT, item.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderPage(item), 'utf8');
  }
}

function sitemapUrl(pathname) {
  return `  <url><loc>${BASE}${pathname}</loc><changefreq>weekly</changefreq><priority>${pathname === '/' ? '1.0' : '0.85'}</priority></url>`;
}

async function updateSitemap() {
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  let current = '';
  try { current = await readFile(sitemapPath, 'utf8'); } catch (_) {}
  const paths = new Set(['/']);
  for (const match of current.matchAll(/<loc>https:\/\/www\.purbeckbusinessinnovations\.co\.uk([^<]*)<\/loc>/g)) {
    paths.add(match[1] || '/');
  }
  for (const item of pages) paths.add(item.path);
  const preferredOrder = [
    '/',
    '/ai-website-builder/',
    '/small-business-websites/',
    '/website-design-for-small-businesses/',
    '/website-refurbishment/',
    '/business-automation-tools/',
    '/seo-for-small-businesses/',
    '/affordable-business-websites/',
    '/website-builder-uk/',
    '/ai-business-tools/',
    '/small-business-automation/',
    '/restaurant-website-design/',
    '/cafe-website-builder/',
    '/pub-website-design/',
    '/butcher-shop-websites/',
    '/retail-business-websites/',
    '/tradesperson-websites/',
    '/salon-website-builder/',
    '/hospitality-business-systems/',
    '/dorset-website-design/',
    '/london-small-business-websites/',
    '/manchester-website-design/',
    '/bristol-web-design/'
  ];
  const ordered = [
    ...preferredOrder.filter((pathname) => paths.has(pathname)),
    ...[...paths].filter((pathname) => !preferredOrder.includes(pathname)).sort()
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ordered.map(sitemapUrl).join('\n')}
</urlset>
`;
  await writeFile(sitemapPath, xml, 'utf8');
}

await writePages();
await updateSitemap();
console.log(`Generated ${pages.length} SEO pages and updated sitemap.xml.`);
