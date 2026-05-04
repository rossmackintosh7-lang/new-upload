
import { json, readBody, getUserFromSession } from "../projects/_shared.js";

const SUPPORTED_TYPES = ["hero", "splitHero", "trustBand", "services", "process", "featureGrid", "stats", "gallery", "testimonial", "faq", "contact", "retail", "cta", "spacer"];
const SUPPORTED_LAYOUTS = ["standard", "split", "centered", "cards", "fullBleed", "masonry", "spotlight"];

function safeJsonParse(value) {
  const text = String(value || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(text); } catch (_) {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1));
    throw new Error("AI response was not valid JSON.");
  }
}
function uid() { return crypto.randomUUID(); }
function chooseKind(body = {}) {
  const hay = `${body.business_type || body.businessType || ""} ${body.brief || body.prompt || ""}`.toLowerCase();
  if (/shop|retail|product|sell|ecommerce|e-commerce/.test(hay)) return "shop";
  if (/cafe|restaurant|food|coffee|bakery|brunch/.test(hay)) return "cafe";
  if (/plumb|electric|trade|builder|landscap|heating|roof|carpenter/.test(hay)) return "trades";
  if (/salon|beauty|hair|wellness|spa|massage/.test(hay)) return "salon";
  if (/holiday|glamping|let|stay|accommodation|bnb|guest/.test(hay)) return "holiday-let";
  return "consultant";
}
function palette(kind) {
  return {
    cafe: { bg: "#fff4eb", soft: "#f6efe7", accent: "#b85f32", deep: "#2d160d", image: "/assets/demo-media/cafe-hero.jpg", gallery: ["/assets/demo-media/cafe-1.jpg", "/assets/demo-media/cafe-2.jpg", "/assets/demo-media/cafe-3.jpg"] },
    trades: { bg: "#f3f7f4", soft: "#edf3ef", accent: "#256b5b", deep: "#173f35", image: "/assets/demo-media/trades-hero.jpg", gallery: ["/assets/demo-media/trades-1.jpg", "/assets/demo-media/trades-2.jpg", "/assets/demo-media/trades-3.jpg"] },
    salon: { bg: "#fff0ed", soft: "#f7eceb", accent: "#b85f70", deep: "#402027", image: "/assets/demo-media/salon-hero.jpg", gallery: ["/assets/demo-media/salon-1.jpg", "/assets/demo-media/salon-2.jpg", "/assets/demo-media/salon-3.jpg"] },
    shop: { bg: "#fff8cf", soft: "#fff4df", accent: "#111111", deep: "#261c05", image: "/assets/demo-media/shop-hero.jpg", gallery: ["/assets/demo-media/shop-1.jpg", "/assets/demo-media/shop-2.jpg", "/assets/demo-media/shop-3.jpg"] },
    "holiday-let": { bg: "#edf6f5", soft: "#fff8f1", accent: "#238081", deep: "#173f45", image: "/assets/demo-media/holiday-let-hero.jpg", gallery: ["/assets/demo-media/holiday-let-1.jpg", "/assets/demo-media/holiday-let-2.jpg", "/assets/demo-media/holiday-let-3.jpg"] },
    consultant: { bg: "#fff8f1", soft: "#f6efe7", accent: "#24556c", deep: "#1e3d4d", image: "/assets/demo-media/consultant-hero.jpg", gallery: ["/assets/demo-media/consultant-1.jpg", "/assets/demo-media/consultant-2.jpg", "/assets/demo-media/consultant-3.jpg"] }
  }[kind] || palette("consultant");
}
function bodyJson(value) { return JSON.stringify(value || {}); }
function fallbackCanvas(body = {}) {
  const kind = chooseKind(body);
  const p = palette(kind);
  const businessName = String(body.business_name || body.businessName || "").trim() || "Your business";
  const brief = String(body.brief || body.prompt || "").trim();
  const services = kind === "shop" ? ["Featured products", "Gift bundles", "Seasonal offers"]
    : kind === "trades" ? ["Repairs", "Installations", "Maintenance"]
    : kind === "cafe" ? ["Breakfast & brunch", "Fresh coffee", "Takeaway treats"]
    : kind === "holiday-let" ? ["The stay", "Amenities", "Local guide"]
    : ["Core service", "Practical support", "Ongoing help"];
  const serviceCards = services.map((title) => ({ title, text: `${title} explained as a clear benefit with a simple next step.`, icon: "✓" }));
  const process = kind === "shop" ? [{ title: "Browse", text: "Show products clearly." }, { title: "Choose", text: "Explain what suits each customer." }, { title: "Buy", text: "Move into checkout without confusion." }]
    : [{ title: "Understand", text: "Customers see the offer quickly." }, { title: "Trust", text: "Proof and useful details remove doubt." }, { title: "Act", text: "A clear CTA appears at the right moments." }];
  const blocks = [
    { id: uid(), type: "splitHero", title: `${businessName}: a clear website customers understand quickly.`, text: brief || "Explain what the business does, who it helps and why customers should take the next step.", button: kind === "shop" ? "Shop now" : "Get in touch", image: p.image, layout: "split", background: p.bg, accent: p.accent, padding: "spacious", align: "left", body_json: bodyJson({ eyebrow: "AI generated premium layout" }) },
    { id: uid(), type: "trustBand", title: "Customer confidence at a glance", text: "Clear offer|Useful proof|Easy next step", button: "", image: "", layout: "cards", background: "#ffffff", accent: p.accent, padding: "compact", align: "center", body_json: bodyJson({ stats: [{ value: "Clear", label: "offer" }, { value: "Fast", label: "next step" }, { value: "Mobile", label: "ready" }] }) },
    { id: uid(), type: "services", title: "What customers can do here", text: serviceCards.map((card) => `${card.title}::${card.text}`).join("|"), button: "View services", image: "", layout: "cards", background: p.soft, accent: p.accent, padding: "comfortable", align: "left", body_json: bodyJson({ cards: serviceCards }) },
    { id: uid(), type: "process", title: "A simple route from interest to action", text: process.map((step) => `${step.title}::${step.text}`).join("|"), button: "", image: "", layout: "cards", background: p.bg, accent: p.accent, padding: "comfortable", align: "left", body_json: bodyJson({ steps: process }) },
    { id: uid(), type: "featureGrid", title: "Why this page feels premium", text: "Strong first impression::The hero has message, image and CTA|Richer sections::The page includes proof, process and answers|Mobile-first flow::Every section is readable on small screens|Publish-ready structure::The journey ends with a clear action", button: "", image: "", layout: "cards", background: "#ffffff", accent: p.accent, padding: "comfortable", align: "left", body_json: bodyJson({ cards: [{ title: "Strong first impression", text: "The hero has message, image and CTA", icon: "✓" }, { title: "Richer sections", text: "The page includes proof, process and answers", icon: "✓" }, { title: "Mobile-first flow", text: "Every section is readable on small screens", icon: "✓" }, { title: "Publish-ready structure", text: "The journey ends with a clear action", icon: "✓" }] }) },
    { id: uid(), type: "gallery", title: "A visual feel for the business", text: p.gallery.join("|"), button: "", image: p.gallery[0] || p.image, layout: "masonry", background: p.soft, accent: p.accent, padding: "comfortable", align: "center", body_json: bodyJson({ captions: ["Atmosphere", "Detail", "Customer experience"] }) },
    { id: uid(), type: "testimonial", title: "Proof that feels human", text: "“Clear, useful and easy to navigate. The website explains the offer properly and makes the next step simple.”", button: "", image: "", layout: "centered", background: p.deep, accent: "#f2b66d", padding: "spacious", align: "center" },
    { id: uid(), type: "faq", title: "Helpful answers before customers ask", text: "Can this be edited later?|Yes, sections can be changed, reordered, hidden or expanded.\nIs it mobile-friendly?|Yes, the layout is designed for phone and desktop viewing.\nWhen does payment happen?|Customers build free and pay only when ready to publish.", button: "Ask a question", image: "", layout: "standard", background: p.bg, accent: p.accent, padding: "comfortable", align: "left", body_json: bodyJson({ items: [{ q: "Can this be edited later?", a: "Yes, sections can be changed, reordered, hidden or expanded." }, { q: "Is it mobile-friendly?", a: "Yes, the layout is designed for phone and desktop viewing." }, { q: "When does payment happen?", a: "Customers build free and pay only when ready to publish." }] }) },
    { id: uid(), type: "cta", title: "Ready to publish when the site is right?", text: "Build the website first, then choose the package only when it is ready to go live.", button: "Continue to publish", image: "", layout: "centered", background: p.accent, accent: "#ffffff", padding: "spacious", align: "center" }
  ];
  if (kind === "shop") blocks.splice(4, 0, { id: uid(), type: "retail", title: "Featured products customers can understand quickly", text: "Local favourite - £12::Short product highlight|Gift bundle - £24::Good for gifting|Seasonal pick - £18::Limited offer", button: "Shop now", image: p.image, layout: "cards", background: "#fff8cf", accent: "#111111", padding: "comfortable", align: "left" });
  return { title: `${businessName} premium website`, blocks };
}
function normaliseCanvas(canvas = {}) {
  const safeBlocks = Array.isArray(canvas.blocks) ? canvas.blocks : [];
  return {
    title: String(canvas.title || "AI generated PBI website").slice(0, 120),
    blocks: safeBlocks.slice(0, 12).map((block) => ({
      id: block.id || uid(),
      type: SUPPORTED_TYPES.includes(String(block.type)) ? String(block.type) : "services",
      title: String(block.title || "").slice(0, 180),
      text: String(block.text || "").slice(0, 2500),
      button: String(block.button || "").slice(0, 80),
      image: String(block.image || "").slice(0, 300),
      layout: SUPPORTED_LAYOUTS.includes(String(block.layout)) ? String(block.layout) : "standard",
      background: String(block.background || "#fff8f1").slice(0, 40),
      accent: String(block.accent || "#bf5c29").slice(0, 40),
      padding: ["compact", "comfortable", "spacious"].includes(String(block.padding)) ? String(block.padding) : "comfortable",
      align: ["left", "center", "right"].includes(String(block.align)) ? String(block.align) : "left",
      body_json: typeof block.body_json === "string" ? block.body_json : bodyJson(block.body_json || {})
    }))
  };
}
async function logGeneration(env, user, body, result, status = "complete") {
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ai_generation_logs (id TEXT PRIMARY KEY, project_id TEXT, user_id TEXT, generation_type TEXT, prompt TEXT, response_json TEXT, status TEXT DEFAULT 'complete', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
    await env.DB.prepare(`INSERT INTO ai_generation_logs (id, project_id, user_id, generation_type, prompt, response_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(uid(), String(body.project_id || ""), user?.id || null, String(body.generation_type || "canvas"), String(body.brief || body.prompt || ""), JSON.stringify(result), status).run();
  } catch (_) {}
}
export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request).catch(() => null);
  const body = await readBody(request);
  const fallback = fallbackCanvas(body);
  if (!env.OPENAI_API_KEY) {
    await logGeneration(env, user, body, fallback, "fallback_no_key");
    return json({ ok: true, mode: "fallback_no_key", model: env.OPENAI_MODEL || "gpt-5.5", message: "OPENAI_API_KEY is not configured, so PBI used the premium local layout generator.", canvas: fallback });
  }
  const model = env.OPENAI_MODEL || "gpt-5.5";
  try {
    const schema = {
      type: "object", additionalProperties: false,
      properties: {
        title: { type: "string" },
        blocks: { type: "array", minItems: 7, maxItems: 12, items: { type: "object", additionalProperties: false, properties: {
          id: { type: "string" }, type: { type: "string", enum: SUPPORTED_TYPES }, title: { type: "string" }, text: { type: "string" }, button: { type: "string" }, image: { type: "string" }, layout: { type: "string", enum: SUPPORTED_LAYOUTS }, background: { type: "string" }, accent: { type: "string" }, padding: { type: "string", enum: ["compact", "comfortable", "spacious"] }, align: { type: "string", enum: ["left", "center", "right"] }, body_json: { type: "string" }
        }, required: ["id", "type", "title", "text", "button", "image", "layout", "background", "accent", "padding", "align", "body_json"] } }
      }, required: ["title", "blocks"]
    };
    const input = [{ role: "system", content: [{ type: "input_text", text: "You are PBI's senior website architect. Generate schema-valid JSON for a genuinely polished UK small-business website. Do not just rewrite content. Create a rich section layout with split hero, trust band, services with card details, process steps, feature proof, gallery or testimonial, FAQ/contact and final CTA. Keep claims honest, mobile-first and conversion-focused. body_json must be JSON string data for cards, steps, stats, faq items or captions where useful." }] }, { role: "user", content: [{ type: "input_text", text: `Business name: ${body.business_name || body.businessName || ""}\nBusiness type: ${body.business_type || body.businessType || ""}\nLocation: ${body.location || ""}\nBrief: ${body.brief || body.prompt || ""}\nGoals: ${body.goals || "website, enquiries, SEO"}\nTone: ${body.tone || "clear, practical and professional"}\nStyle direction: ${body.style_direction || "premium, warm, flowing, not blocky"}\n\nCreate a full premium PBI canvas page. Use varied section types and layouts, not repeated plain text blocks.` }] }];
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, input, reasoning: { effort: "medium" }, text: { verbosity: "medium", format: { type: "json_schema", name: "pbi_premium_canvas_site", schema, strict: true } } }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "OpenAI Responses request failed");
    const outputText = data.output_text || data.output?.flatMap((item) => item.content || [])?.filter((part) => part.type === "output_text" || part.type === "text")?.map((part) => part.text)?.join("\n") || "";
    const parsed = normaliseCanvas(safeJsonParse(outputText));
    await logGeneration(env, user, body, parsed, "responses_complete");
    return json({ ok: true, mode: "responses", model, response_id: data.id, canvas: parsed });
  } catch (err) {
    await logGeneration(env, user, body, fallback, "fallback_error");
    return json({ ok: true, mode: "fallback_error", model, message: err?.message || "AI generation failed, so PBI used the premium local generator.", canvas: fallback });
  }
}
