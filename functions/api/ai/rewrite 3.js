
import { json, readBody, getUserFromSession } from "../projects/_shared.js";

function localRewrite(text, mode) {
  text = String(text || "").trim();
  if (!text) return "Clear, helpful wording goes here.";

  if (mode === "shorter") return text.split(/\s+/).slice(0, 45).join(" ");
  if (mode === "seo") return `${text}\n\nThis page explains the service clearly, uses local wording naturally and gives customers an easy way to make an enquiry.`;
  if (mode === "friendly") return `${text}\n\nWe keep the process simple, helpful and easy to understand from the first question to the next step.`;
  return text.replace(/welcome to our website/gi, "Here is what we do").replace(/we are passionate about/gi, "we help customers with");
}

function extractOutputText(data) {
  return data.output_text ||
    data.output?.flatMap((item) => item.content || [])
      ?.filter((part) => part.type === "output_text" || part.type === "text")
      ?.map((part) => part.text)
      ?.join("\n") ||
    "";
}

export async function onRequestPost({ request, env }) {
  await getUserFromSession(env, request).catch(() => null);
  const body = await readBody(request);
  const text = String(body.text || "");
  const mode = String(body.mode || "clearer");
  const model = env.OPENAI_MODEL || "gpt-5.5";

  if (!env.OPENAI_API_KEY) {
    return json({ ok: true, mode: "fallback_no_key", model, text: localRewrite(text, mode) });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Rewrite small-business website copy for PBI. Keep it clear, honest, practical, conversion-focused and suitable for UK small businesses. Return only the rewritten copy."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Rewrite mode: ${mode}\n\nCopy:\n${text}`
              }
            ]
          }
        ],
        reasoning: { effort: "low" },
        text: { verbosity: mode === "shorter" ? "low" : "medium" }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "OpenAI Responses rewrite failed");

    const rewritten = extractOutputText(data).trim() || localRewrite(text, mode);

    return json({
      ok: true,
      mode: "responses",
      model,
      response_id: data.id,
      text: rewritten
    });
  } catch (err) {
    return json({
      ok: true,
      mode: "fallback_error",
      model,
      text: localRewrite(text, mode),
      message: err?.message || "AI rewrite fallback used."
    });
  }
}
