import { json, readBody, getUserFromSession } from "../projects/_shared.js";

const SUPPORTED_TYPES = [
  "navBar", "hero", "splitHero", "floatingCard", "trustBand", "logoCloud", "services", "process", "featureGrid", "stats",
  "gallery", "testimonial", "pricing", "productGrid", "cmsList", "faq", "map", "booking", "contact", "retail", "cta", "spacer"
];
const SUPPORTED_LAYOUTS = ["standard", "split", "centered", "cards", "fullBleed", "masonry", "spotlight", "bento"];
const SUPPORTED_ANIMATIONS = ["none", "fade", "rise", "scale", "slide", "float", "reveal", "parallax", "stagger", "marquee"];

function uid() {
  return crypto.randomUUID();
}

function bodyJson(value) {
  return JSON.stringify(value || {});
}

function safeJsonParse(value) {
  const text = String(value || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(text); } catch (_) {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1));
    throw new Error("AI response was not valid JSON.");
  }
}

function slugify(value) {
  return String(value || "page").toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
}

function chooseKind(body = {}) {
  const hay = `${body.business_type || body.businessType || ""} ${body.brief || body.prompt || ""}`.toLowerCase();
  if (/shop|retail|product|sell|ecommerce|e-commerce/.test(hay)) return "shop";
  if (/cafe|restaurant|food|coffee|bakery|brunch/.test(hay)) return "cafe";
  if (/plumb|electric|trade|builder|landscap|heating|roof|carpenter/.test(hay)) return "trades";
  if (/salon|beauty|hair|wellness|spa|massage/.test(hay)) return "salon";
  if (/holiday|glamping|let|stay|accommodation|bnb|guest/.test(hay)) return "holiday";
  return "consultant";
}

function palette(kind) {
  return {
    cafe: { bg: "#fff4eb", soft: "#f6efe7", accent: "#b85f32", deep: "#2d160d", image: "/assets/demo-media/cafe-hero.jpg", gallery: ["/assets/demo-media/cafe-1.jpg", "/assets/demo-media/cafe-2.jpg", "/assets/demo-media/cafe-3.jpg"] },
    trades: { bg: "#f3f7f4", soft: "#edf3ef", accent: "#256b5b", deep: "#173f35", image: "/assets/demo-media/trades-hero.jpg", gallery: ["/assets/demo-media/trades-1.jpg", "/assets/demo-media/trades-2.jpg", "/assets/demo-media/trades-3.jpg"] },
    salon: { bg: "#fff0ed", soft: "#f7eceb", accent: "#b85f70", deep: "#402027", image: "/assets/demo-media/salon-hero.jpg", gallery: ["/assets/demo-media/salon-1.jpg", "/assets/demo-media/salon-2.jpg", "/assets/demo-media/salon-3.jpg"] },
    shop: { bg: "#fff8cf", soft: "#fff4df", accent: "#111111", deep: "#261c05", image: "/assets/demo-media/shop-hero.jpg", gallery: ["/assets/demo-media/shop-1.jpg", "/assets/demo-media/shop-2.jpg", "/assets/demo-media/shop-3.jpg"] },
    holiday: { bg: "#edf6f5", soft: "#fff8f1", accent: "#238081", deep: "#173f45", image: "/assets/demo-media/holiday-let-hero.jpg", gallery: ["/assets/demo-media/holiday-let-1.jpg", "/assets/demo-media/holiday-let-2.jpg", "/assets/demo-media/holiday-let-3.jpg"] },
    consultant: { bg: "#fff8f1", soft: "#f6efe7", accent: "#24556c", deep: "#1e3d4d", image: "/assets/demo-media/consultant-hero.jpg", gallery: ["/assets/demo-media/consultant-1.jpg", "/assets/demo-media/consultant-2.jpg", "/assets/demo-media/consultant-3.jpg"] }
  }[kind] || palette("consultant");
}

function cards(items) {
  return items.map((item) => `${item.title}::${item.text}`).join("|");
}

function block(type, values = {}) {
  return {
    id: uid(),
    type,
    title: "",
    text: "",
    button: "",
    image: "",
    layout: "standard",
    background: "#fff8f1",
    accent: "#bf5c29",
    padding: "comfortable",
    align: "left",
    animation: "rise",
    radius: "soft",
    visibility: "all",
    positionMode: "flow",
    x: 40,
    y: 40,
    width: 520,
    rotate: 0,
    z: 10,
    duration: 650,
    delay: 0,
    easing: "cubic-bezier(.2,.9,.2,1)",
    body_json: "{}",
    ...values
  };
}

function fallbackCanvas(body = {}) {
  const kind = chooseKind(body);
  const p = palette(kind);
  const businessName = String(body.business_name || body.businessName || "").trim() || "Your business";
  const brief = String(body.brief || body.prompt || "").trim();
  const cta = kind === "shop" ? "Shop now" : kind === "holiday" ? "Check availability" : kind === "cafe" ? "Book a table" : "Get in touch";
  const services = kind === "shop" ? ["Featured products", "Gift bundles", "Seasonal offers"]
    : kind === "trades" ? ["Repairs", "Installations", "Maintenance"]
    : kind === "cafe" ? ["Breakfast & brunch", "Fresh coffee", "Takeaway treats"]
    : kind === "holiday" ? ["The stay", "Amenities", "Local guide"]
    : ["Core service", "Practical support", "Ongoing help"];
  const serviceCards = services.map((title) => ({ title, text: `${title} explained as a clear customer benefit with a simple next step.` }));
  const process = kind === "shop" ? [{ title: "Browse", text: "Show products and categories cleanly." }, { title: "Choose", text: "Explain value and suitability." }, { title: "Buy", text: "Move into checkout without confusion." }]
    : kind === "holiday" ? [{ title: "View", text: "Lead with the stay and setting." }, { title: "Check", text: "Show amenities and suitability." }, { title: "Enquire", text: "Make availability questions simple." }]
    : [{ title: "Understand", text: "Customers see the offer quickly." }, { title: "Trust", text: "Proof and useful details remove doubt." }, { title: "Act", text: "A clear CTA appears at the right moments." }];

  const homeBlocks = [
    block("navBar", { title: businessName, text: "Home|Services|Proof|Questions|Contact", button: cta, image: "/assets/pbi-header-logo-no-bg-20260502c.png?v=20260502c", background: "#fffdf8", accent: p.accent, padding: "compact", radius: "pill", animation: "none" }),
    block("splitHero", { title: `${businessName}: a premium website customers understand quickly.`, text: brief || "Explain what the business does, who it helps and why customers should take the next step.", button: cta, image: p.image, layout: "split", background: p.bg, accent: p.accent, padding: "spacious", animation: "reveal", body_json: bodyJson({ eyebrow: "AI generated premium layout", visual: "framed image" }) }),
    block("floatingCard", { title: "Local proof", text: "Freeform layer. Drag this badge anywhere in Visual Studio.", button: "See proof", positionMode: "free", x: 72, y: 210, width: 320, rotate: -2, z: 22, background: "#ffffff", accent: p.accent, padding: "compact", animation: "float" }),
    block("trustBand", { title: "Customer confidence at a glance", text: "Clear offer::Visitors understand what you do quickly|Proof built in::Trust appears before hesitation|Easy next step::The action is obvious", layout: "cards", background: "#ffffff", accent: p.accent, padding: "compact", align: "center", animation: "stagger" }),
    block("logoCloud", { title: "Designed for real local businesses", text: "Cafés|Trades|Salons|Retail|Consultants|Holiday lets", layout: "centered", background: p.soft, accent: p.accent, padding: "compact", align: "center", animation: "marquee" }),
    block("services", { title: "What customers can do here", text: cards(serviceCards), button: "View services", layout: "cards", background: p.soft, accent: p.accent, padding: "comfortable", animation: "rise", body_json: bodyJson({ cards: serviceCards }) }),
    block("process", { title: "A simple route from interest to action", text: cards(process), layout: "cards", background: p.bg, accent: p.accent, padding: "comfortable", animation: "slide", body_json: bodyJson({ steps: process }) }),
    block("featureGrid", { title: "Why this page feels premium", text: "Strong first impression::The hero has message, image and CTA|Richer sections::Proof, process, answers and conversion are included|Mobile-first flow::Every section is readable on small screens|Publish-ready structure::The journey ends with a clear action", layout: "bento", background: "#ffffff", accent: p.accent, padding: "comfortable", animation: "stagger" }),
    block(kind === "shop" ? "productGrid" : "gallery", { title: kind === "shop" ? "Products customers can scan quickly" : "A visual feel for the business", text: kind === "shop" ? "Local favourite::£12::Short product highlight|Gift bundle::£24::Good for gifting|Seasonal pick::£18::Limited offer" : p.gallery.join("|"), button: kind === "shop" ? "Shop now" : "", image: kind === "shop" ? p.image : p.gallery[0], layout: kind === "shop" ? "cards" : "masonry", background: p.soft, accent: p.accent, padding: "comfortable", animation: "scale" }),
    block("testimonial", { title: "Proof that feels human", text: "“Clear, useful and easy to navigate. The website explains the offer properly and makes the next step simple.”", layout: "centered", background: p.deep, accent: "#f2b66d", padding: "spacious", align: "center", animation: "fade" }),
    block("faq", { title: "Helpful answers before customers ask", text: "Can this be edited later?|Yes, sections can be changed, reordered, hidden or expanded.\nIs it mobile-friendly?|Yes, the layout is designed for phone and desktop viewing.\nWhen does payment happen?|Customers build free and pay only when ready to publish.", button: "Ask a question", layout: "standard", background: p.bg, accent: p.accent, padding: "comfortable", animation: "fade" }),
    block(kind === "cafe" || kind === "consultant" ? "booking" : kind === "holiday" ? "map" : "contact", { title: kind === "holiday" ? "Local area and arrival details" : kind === "cafe" ? "Make booking feel simple" : "Make the next step simple", text: "Give customers a clean route to call, book, check availability, send an enquiry or visit the business.", button: cta, layout: "spotlight", background: p.soft, accent: p.accent, padding: "comfortable", align: "center", animation: "reveal" }),
    block("pricing", { title: "Choose a package at publish", text: "Starter::£12.99/month::Simple launch tools|Business::£24.99/month::More sections, images and SEO support|Plus::£39.99/month::Retail, AI and premium controls", button: "Compare packages", layout: "cards", background: "#fffdf8", accent: p.accent, padding: "comfortable", animation: "stagger" }),
    block("cta", { title: "Build free, publish when ready", text: "Shape the website first, then choose the right package only when it is ready to go live.", button: "Continue to publish", layout: "centered", background: p.accent, accent: "#ffffff", padding: "spacious", align: "center", animation: "scale" })
  ];

  const servicesPage = [
    block("navBar", { title: businessName, text: "Home|Services|Contact", button: cta, image: "/assets/pbi-header-logo-no-bg-20260502c.png?v=20260502c", background: "#fffdf8", accent: p.accent, padding: "compact", radius: "pill", animation: "none" }),
    block("hero", { title: "Services explained clearly", text: "A dedicated page for service details, trust signals and FAQs.", button: cta, layout: "centered", background: p.bg, accent: p.accent, padding: "spacious", align: "center", animation: "rise" }),
    block("services", { title: "Service options", text: cards(serviceCards), button: "Ask about services", layout: "cards", background: p.soft, accent: p.accent, animation: "stagger" }),
    block("faq", { title: "Service questions", text: "How do customers start?|Send an enquiry with a few details.\nWhat area is covered?|Use this section to explain service areas.\nCan the site change later?|Yes, pages and CMS entries can be edited.", button: "Ask a question", background: p.bg, accent: p.accent })
  ];

  const contactPage = [
    block("navBar", { title: businessName, text: "Home|Services|Contact", button: cta, image: "/assets/pbi-header-logo-no-bg-20260502c.png?v=20260502c", background: "#fffdf8", accent: p.accent, padding: "compact", radius: "pill", animation: "none" }),
    block("contact", { title: "Ready to talk?", text: "Tell customers exactly how to contact, book, visit or ask a question.", button: cta, layout: "split", background: p.soft, accent: p.accent, animation: "reveal" }),
    block("map", { title: "Location and service area", text: "Explain where the business works, delivers or welcomes customers.", button: "Check coverage", layout: "split", background: p.bg, accent: p.accent })
  ];

  return {
    title: `${businessName} premium website`,
    theme: { background: p.bg, accent: p.accent, text: "#26160f", font: "warm", density: "airy" },
    blocks: homeBlocks,
    activePageId: "page_home",
    pages: [
      { id: "page_home", title: "Home", slug: "home", blocks: homeBlocks },
      { id: "page_services", title: "Services", slug: "services", blocks: servicesPage },
      { id: "page_contact", title: "Contact", slug: "contact", blocks: contactPage }
    ]
  };
}

function normaliseBlock(item = {}) {
  return {
    id: String(item.id || uid()).slice(0, 90),
    type: SUPPORTED_TYPES.includes(String(item.type)) ? String(item.type) : "services",
    title: String(item.title || "").slice(0, 220),
    text: String(item.text || "").slice(0, 4000),
    button: String(item.button || "").slice(0, 90),
    image: String(item.image || "").slice(0, 320),
    layout: SUPPORTED_LAYOUTS.includes(String(item.layout)) ? String(item.layout) : "standard",
    background: String(item.background || "#fff8f1").slice(0, 40),
    accent: String(item.accent || "#bf5c29").slice(0, 40),
    padding: ["compact", "comfortable", "spacious"].includes(String(item.padding)) ? String(item.padding) : "comfortable",
    align: ["left", "center", "right"].includes(String(item.align)) ? String(item.align) : "left",
    animation: SUPPORTED_ANIMATIONS.includes(String(item.animation)) ? String(item.animation) : "rise",
    radius: ["soft", "square", "pill"].includes(String(item.radius)) ? String(item.radius) : "soft",
    visibility: ["all", "desktop", "mobile"].includes(String(item.visibility)) ? String(item.visibility) : "all",
    positionMode: ["flow", "free"].includes(String(item.positionMode || item.position_mode)) ? String(item.positionMode || item.position_mode) : "flow",
    x: Number(item.x || 40),
    y: Number(item.y || 40),
    width: Math.max(180, Number(item.width || 520)),
    rotate: Number(item.rotate || 0),
    z: Number(item.z || 10),
    duration: Number(item.duration || 650),
    delay: Number(item.delay || 0),
    easing: String(item.easing || "cubic-bezier(.2,.9,.2,1)").slice(0, 80),
    body_json: typeof item.body_json === "string" ? item.body_json : bodyJson(item.body_json || {})
  };
}

function normaliseCanvas(canvas = {}) {
  const fallbackBlocks = Array.isArray(canvas.blocks) ? canvas.blocks.map(normaliseBlock).filter(Boolean).slice(0, 24) : [];
  const pages = Array.isArray(canvas.pages) ? canvas.pages.map((page, index) => ({
    id: String(page.id || `page_${index + 1}`).slice(0, 90),
    title: String(page.title || `Page ${index + 1}`).slice(0, 120),
    slug: slugify(page.slug || page.title || `page-${index + 1}`).slice(0, 100),
    blocks: Array.isArray(page.blocks) ? page.blocks.map(normaliseBlock).filter(Boolean).slice(0, 24) : []
  })).filter((page) => page.blocks.length) : [];
  const safePages = pages.length ? pages : [{ id: "page_home", title: "Home", slug: "home", blocks: fallbackBlocks }];
  return {
    title: String(canvas.title || "AI generated PBI website").slice(0, 140),
    theme: {
      background: String(canvas.theme?.background || "#fff8f1").slice(0, 40),
      accent: String(canvas.theme?.accent || "#bf5c29").slice(0, 40),
      text: String(canvas.theme?.text || "#26160f").slice(0, 40),
      font: ["warm", "modern", "editorial"].includes(String(canvas.theme?.font)) ? String(canvas.theme.font) : "warm",
      density: ["airy", "balanced", "tight"].includes(String(canvas.theme?.density)) ? String(canvas.theme.density) : "airy"
    },
    activePageId: String(canvas.activePageId || safePages[0]?.id || "page_home"),
    blocks: safePages[0]?.blocks || fallbackBlocks,
    pages: safePages
  };
}

async function callOpenAI(env, body) {
  if (!env?.OPENAI_API_KEY) return null;
  const kind = chooseKind(body);
  const p = palette(kind);
  const prompt = `Create JSON only for a premium Framer-like local business website builder canvas. The site must feel visually designed, not blocky. Use these exact block types only: ${SUPPORTED_TYPES.join(", ")}. Use these layouts only: ${SUPPORTED_LAYOUTS.join(", ")}. Use | between cards and :: between card title and text. Include a multi-page site with Home, Services and Contact pages. Include navBar, splitHero, floatingCard using positionMode free, trustBand, services, process, featureGrid, gallery/productGrid, testimonial, faq, contact/booking/map, pricing and cta. Use advanced motion values such as rise, reveal, stagger, float, marquee or parallax where useful. Brand palette: background ${p.bg}, soft ${p.soft}, accent ${p.accent}. Brief: ${String(body.brief || body.prompt || "").slice(0, 1200)}. Business name: ${String(body.business_name || "Your business").slice(0, 120)}. Return shape: {"title":"...","theme":{"background":"#...","accent":"#...","text":"#...","font":"warm|modern|editorial","density":"airy|balanced|tight"},"activePageId":"page_home","pages":[{"id":"page_home","title":"Home","slug":"home","blocks":[{"type":"floatingCard","title":"...","text":"...","button":"...","layout":"spotlight","background":"#...","accent":"#...","padding":"compact","align":"left","animation":"float","radius":"soft","visibility":"all","positionMode":"free","x":80,"y":200,"width":320,"rotate":-2,"z":20}]}]}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.5",
      input: prompt,
      text: { format: { type: "json_object" } }
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((part) => part.text || "").join("\n") || "";
  if (!text) return null;
  const parsed = safeJsonParse(text);
  const canvas = normaliseCanvas(parsed);
  if (!canvas.pages?.length && !canvas.blocks?.length) return null;
  return canvas;
}

function toSections(canvas) {
  const activePage = (canvas.pages || []).find((page) => page.id === canvas.activePageId) || (canvas.pages || [])[0];
  const blocks = activePage?.blocks || canvas.blocks || [];
  return blocks.map((item, index) => ({
    id: item.id,
    section_order: index,
    section_type: item.type,
    type: item.type,
    title: item.title,
    text: item.text,
    button: item.button,
    image: item.image,
    layout: item.layout,
    background: item.background,
    accent: item.accent,
    padding: item.padding,
    align: item.align,
    hidden: 0,
    body_json: bodyJson(item)
  }));
}

export async function onRequestPost({ request, env }) {
  const body = await readBody(request);
  try { await getUserFromSession(env, request); } catch (_) {}

  const fallback = fallbackCanvas(body);
  let canvas = null;
  let mode = "fallback";

  try {
    const generated = await callOpenAI(env, body);
    if (generated?.pages?.length || generated?.blocks?.length) {
      canvas = normaliseCanvas(generated);
      mode = "responses";
    }
  } catch (_) {}

  if (!canvas) canvas = normaliseCanvas(fallback);

  return json({
    ok: true,
    mode,
    canvas,
    sections: toSections(canvas),
    message: mode === "responses" ? "AI generated a premium multi-page visual canvas." : "Fallback premium multi-page visual canvas generated without external AI."
  });
}
