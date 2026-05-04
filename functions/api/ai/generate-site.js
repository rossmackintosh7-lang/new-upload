
import { json, error, readBody, getUserFromSession } from "../projects/_shared.js";

function safeJsonParse(value) {
  const text = String(value || "").trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(text);
  } catch (_) {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1));
    throw new Error("AI response was not valid JSON.");
  }
}

function fallbackCanvas(body = {}) {
  const brief = String(body.brief || body.prompt || "").trim();
  const businessType = String(body.business_type || body.businessType || "consultant").toLowerCase();
  const image = businessType.includes("shop") ? "/assets/demo-media/shop-hero.jpg"
    : businessType.includes("cafe") || businessType.includes("food") ? "/assets/demo-media/cafe-hero.jpg"
    : businessType.includes("trade") ? "/assets/demo-media/trades-hero.jpg"
    : businessType.includes("salon") ? "/assets/demo-media/salon-hero.jpg"
    : businessType.includes("holiday") ? "/assets/demo-media/holiday-let-hero.jpg"
    : "/assets/demo-media/consultant-hero.jpg";

  return {
    title: body.business_name || "AI generated PBI website",
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "splitHero",
        title: body.business_name ? `${body.business_name}: clear, professional and easy to contact.` : "A clear website built around your business.",
        text: brief || "Tell customers what you do, where you work and what they should do next.",
        button: "Get in touch",
        image,
        layout: "split",
        background: "#fff8f1",
        accent: "#bf5c29",
        padding: "spacious",
        align: "left"
      },
      {
        id: crypto.randomUUID(),
        type: "services",
        title: "What we can help with",
        text: "Main service|Customer benefit|Clear next step",
        button: "View services",
        image: "",
        layout: "cards",
        background: "#f6efe7",
        accent: "#256b5b",
        padding: "comfortable",
        align: "left"
      },
      {
        id: crypto.randomUUID(),
        type: "featureGrid",
        title: "Why customers choose us",
        text: "Helpful service|Clear communication|Reliable support|Easy enquiry route",
        button: "",
        image: "",
        layout: "cards",
        background: "#fff8f1",
        accent: "#bf5c29",
        padding: "comfortable",
        align: "left"
      },
      {
        id: crypto.randomUUID(),
        type: "faq",
        title: "Common questions",
        text: "How do we get started?|Send an enquiry and we will guide the next step.\nCan I ask questions first?|Yes, use the contact form and include useful details.\nCan the website improve over time?|Yes, pages can be edited, expanded and supported with SEO Care.",
        button: "Ask a question",
        image: "",
        layout: "standard",
        background: "#fff8f1",
        accent: "#bf5c29",
        padding: "comfortable",
        align: "left"
      },
      {
        id: crypto.randomUUID(),
        type: "cta",
        title: "Ready to take the next step?",
        text: "Make it easy for customers to contact, book, buy or ask a question.",
        button: "Contact us",
        image: "",
        layout: "centered",
        background: "#bf5c29",
        accent: "#ffffff",
        padding: "spacious",
        align: "center"
      }
    ]
  };
}

function normaliseCanvas(canvas = {}) {
  const safeBlocks = Array.isArray(canvas.blocks) ? canvas.blocks : [];
  return {
    title: String(canvas.title || "AI generated PBI website").slice(0, 120),
    blocks: safeBlocks.slice(0, 12).map((block) => ({
      id: block.id || crypto.randomUUID(),
      type: String(block.type || "hero"),
      title: String(block.title || "").slice(0, 180),
      text: String(block.text || "").slice(0, 2500),
      button: String(block.button || "").slice(0, 80),
      image: String(block.image || "").slice(0, 300),
      layout: String(block.layout || "standard"),
      background: String(block.background || "#fff8f1"),
      accent: String(block.accent || "#bf5c29"),
      padding: String(block.padding || "comfortable"),
      align: String(block.align || "left")
    }))
  };
}

async function logGeneration(env, user, body, result, status = "complete") {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS ai_generation_logs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        user_id TEXT,
        generation_type TEXT,
        prompt TEXT,
        response_json TEXT,
        status TEXT DEFAULT 'complete',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    await env.DB.prepare(`
      INSERT INTO ai_generation_logs
      (id, project_id, user_id, generation_type, prompt, response_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      crypto.randomUUID(),
      String(body.project_id || ""),
      user?.id || null,
      String(body.generation_type || "canvas"),
      String(body.brief || body.prompt || ""),
      JSON.stringify(result),
      status
    ).run();
  } catch (_) {}
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request).catch(() => null);
  const body = await readBody(request);
  const fallback = fallbackCanvas(body);

  if (!env.OPENAI_API_KEY) {
    await logGeneration(env, user, body, fallback, "fallback_no_key");
    return json({
      ok: true,
      mode: "fallback_no_key",
      model: env.OPENAI_MODEL || "gpt-5.5",
      message: "OPENAI_API_KEY is not configured, so PBI used the safe local generator.",
      canvas: fallback
    });
  }

  const model = env.OPENAI_MODEL || "gpt-5.5";

  try {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        blocks: {
          type: "array",
          minItems: 4,
          maxItems: 12,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: ["hero", "splitHero", "services", "featureGrid", "gallery", "testimonial", "faq", "contact", "retail", "cta", "spacer"] },
              title: { type: "string" },
              text: { type: "string" },
              button: { type: "string" },
              image: { type: "string" },
              layout: { type: "string", enum: ["standard", "split", "centered", "cards", "fullBleed"] },
              background: { type: "string" },
              accent: { type: "string" },
              padding: { type: "string", enum: ["compact", "comfortable", "spacious"] },
              align: { type: "string", enum: ["left", "center", "right"] }
            },
            required: ["id", "type", "title", "text", "button", "image", "layout", "background", "accent", "padding", "align"]
          }
        }
      },
      required: ["title", "blocks"]
    };

    const input = [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are PBI's senior website architect. Generate practical, polished small-business website canvas JSON. Keep sections clear, conversion-focused, mobile-friendly and honest. Use realistic UK small-business wording. Return only schema-valid JSON."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Business name: ${body.business_name || ""}\nBusiness type: ${body.business_type || body.businessType || ""}\nLocation: ${body.location || ""}\nBrief: ${body.brief || body.prompt || ""}\nGoals: ${body.goals || ""}\nTone: ${body.tone || "clear, practical and professional"}\n\nCreate a full PBI canvas page with strong hero, service/offer section, trust/proof, FAQ/contact or retail section where relevant, and final CTA.`
          }
        ]
      }
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input,
        reasoning: { effort: "medium" },
        text: {
          verbosity: "medium",
          format: {
            type: "json_schema",
            name: "pbi_canvas_site",
            schema,
            strict: true
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "OpenAI Responses request failed");

    const outputText =
      data.output_text ||
      data.output?.flatMap((item) => item.content || [])
        ?.filter((part) => part.type === "output_text" || part.type === "text")
        ?.map((part) => part.text)
        ?.join("\n") ||
      "";

    const parsed = normaliseCanvas(safeJsonParse(outputText));
    await logGeneration(env, user, body, parsed, "responses_complete");

    return json({
      ok: true,
      mode: "responses",
      model,
      response_id: data.id,
      canvas: parsed
    });
  } catch (err) {
    await logGeneration(env, user, body, fallback, "fallback_error");
    return json({
      ok: true,
      mode: "fallback_error",
      model,
      message: err?.message || "AI generation failed, so PBI used the local generator.",
      canvas: fallback
    });
  }
}
