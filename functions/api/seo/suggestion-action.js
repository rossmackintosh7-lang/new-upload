import { jsonResponse, readJson, cleanText, nowIso } from "../_lib/http.js";
import { ensureSeoTables } from "../_lib/seo.js";
import { requireAdmin } from "../_lib/admin-auth.js";

function esc(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(value = "") {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function pathFromUrl(value = "") {
  try {
    const url = new URL(value);
    return url.pathname || "/";
  } catch {
    return String(value || "/");
  }
}

function pageLabel(pageUrl = "") {
  const path = pathFromUrl(pageUrl);
  if (path.includes("trades")) return "websites for tradespeople";
  if (path.includes("cafes")) return "websites for cafés";
  if (path.includes("salons")) return "websites for salons";
  if (path.includes("shops")) return "websites for shops";
  if (path.includes("consultants")) return "websites for consultants";
  if (path.includes("holiday")) return "websites for holiday lets";
  if (path.includes("pricing")) return "website pricing";
  if (path.includes("builder")) return "AI website builder";
  if (path.includes("custom-build")) return "custom website build support";
  if (path === "/" || path === "") return "AI website builder for local businesses";
  return "small business websites";
}

function buildSchema(pageUrl, suggestion) {
  const label = pageLabel(pageUrl);
  const path = pathFromUrl(pageUrl);
  const name = label.charAt(0).toUpperCase() + label.slice(1);
  const description = stripHtml(suggestion.suggested_value || suggestion.reasoning || `Helpful ${label} information from Purbeck Business Innovations.`).slice(0, 220);

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "Purbeck Business Innovations",
        "url": "https://www.purbeckbusinessinnovations.co.uk/"
      },
      {
        "@type": "WebPage",
        "name": name,
        "url": pageUrl,
        "description": description,
        "isPartOf": {
          "@type": "WebSite",
          "name": "Purbeck Business Innovations",
          "url": "https://www.purbeckbusinessinnovations.co.uk/"
        }
      },
      {
        "@type": "Service",
        "name": name,
        "provider": {
          "@type": "Organization",
          "name": "Purbeck Business Innovations"
        },
        "areaServed": "United Kingdom",
        "description": description
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://www.purbeckbusinessinnovations.co.uk/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": name,
            "item": pageUrl
          }
        ]
      }
    ]
  }, null, 2);
}

function contentBlockHtml(suggestion) {
  const heading = suggestion.suggestion_type === "content_expansion" ? "Helpful information" : "Page improvement note";
  const text = stripHtml(suggestion.suggested_value || "");
  if (!text) return "";
  return `<section class="pbi-seo-approved-block" data-seo-agent-applied="content">
    <div class="container">
      <p class="eyebrow">PBI SEO Agent improvement</p>
      <h2>${esc(heading)}</h2>
      <p>${esc(text)}</p>
    </div>
  </section>`;
}

function internalLinksHtml() {
  return `<section class="pbi-seo-approved-links" data-seo-agent-applied="internal-links">
    <div class="container">
      <p class="eyebrow">Useful next steps</p>
      <h2>Explore related PBI services</h2>
      <div class="row">
        <a class="btn-ghost" href="/builder/">Try the AI Builder</a>
        <a class="btn-ghost" href="/examples/">View examples</a>
        <a class="btn-ghost" href="/pricing/">Compare pricing</a>
        <a class="btn-ghost" href="/custom-build/">Request custom build help</a>
      </div>
    </div>
  </section>`;
}

function patchForSuggestion(suggestion) {
  const type = String(suggestion.suggestion_type || "").toLowerCase();
  const value = cleanText(suggestion.suggested_value || "", 8000);
  const patch = {};

  if (type.includes("title")) patch.title = value;
  else if (type.includes("meta")) patch.meta_description = value;
  else if (type.includes("h1")) patch.h1 = value;
  else if (type.includes("canonical")) patch.canonical = value.includes("<link") ? "" : value;
  else if (type.includes("schema") || type.includes("structured")) patch.schema_jsonld = buildSchema(suggestion.page_url, suggestion);
  else if (type.includes("image_alt")) patch.image_alt_text = stripHtml(value).slice(0, 220);
  else if (type.includes("internal")) patch.internal_links_html = internalLinksHtml();
  else if (type.includes("content") || type.includes("thin")) patch.content_block_html = contentBlockHtml(suggestion);
  else if (type.includes("robots") || type.includes("noindex")) patch.robots = "index,follow";
  else patch.content_block_html = contentBlockHtml(suggestion);

  return patch;
}

async function applySuggestion(env, suggestion) {
  const patch = patchForSuggestion(suggestion);
  const now = nowIso();

  const existing = await env.DB
    .prepare(`SELECT * FROM seo_page_overrides WHERE page_url = ? LIMIT 1`)
    .bind(suggestion.page_url)
    .first();

  const merged = {
    title: patch.title ?? existing?.title ?? null,
    meta_description: patch.meta_description ?? existing?.meta_description ?? null,
    h1: patch.h1 ?? existing?.h1 ?? null,
    canonical: patch.canonical ?? existing?.canonical ?? null,
    robots: patch.robots ?? existing?.robots ?? null,
    schema_jsonld: patch.schema_jsonld ?? existing?.schema_jsonld ?? null,
    content_block_html: patch.content_block_html ?? existing?.content_block_html ?? null,
    internal_links_html: patch.internal_links_html ?? existing?.internal_links_html ?? null,
    image_alt_text: patch.image_alt_text ?? existing?.image_alt_text ?? null
  };

  await env.DB.prepare(`
    INSERT INTO seo_page_overrides (
      page_url, title, meta_description, h1, canonical, robots, schema_jsonld,
      content_block_html, internal_links_html, image_alt_text,
      source_suggestion_id, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(page_url) DO UPDATE SET
      title = excluded.title,
      meta_description = excluded.meta_description,
      h1 = excluded.h1,
      canonical = excluded.canonical,
      robots = excluded.robots,
      schema_jsonld = excluded.schema_jsonld,
      content_block_html = excluded.content_block_html,
      internal_links_html = excluded.internal_links_html,
      image_alt_text = excluded.image_alt_text,
      source_suggestion_id = excluded.source_suggestion_id,
      status = 'active',
      updated_at = excluded.updated_at
  `).bind(
    suggestion.page_url,
    merged.title,
    merged.meta_description,
    merged.h1,
    merged.canonical,
    merged.robots,
    merged.schema_jsonld,
    merged.content_block_html,
    merged.internal_links_html,
    merged.image_alt_text,
    suggestion.id,
    now,
    now
  ).run();

  const type = String(suggestion.suggestion_type || "").toLowerCase();
  let issuePattern = "%";
  if (type.includes("title")) issuePattern = "%title%";
  else if (type.includes("meta")) issuePattern = "%meta%";
  else if (type.includes("h1")) issuePattern = "%h1%";
  else if (type.includes("schema") || type.includes("structured")) issuePattern = "%structured%";
  else if (type.includes("image_alt")) issuePattern = "%image_alt%";
  else if (type.includes("internal")) issuePattern = "%internal%";
  else if (type.includes("content") || type.includes("thin")) issuePattern = "%thin%";

  await env.DB
    .prepare(`UPDATE seo_issues SET status='resolved' WHERE page_url = ? AND issue_type LIKE ? AND status='open'`)
    .bind(suggestion.page_url, issuePattern)
    .run();

  await env.DB
    .prepare(`INSERT INTO seo_apply_log (suggestion_id, page_url, action, details_json, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(suggestion.id, suggestion.page_url, "apply", JSON.stringify({ patch: Object.keys(patch) }), now)
    .run();

  return { applied: true, patch: Object.keys(patch) };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const admin = await requireAdmin(context);
  if (!admin.ok) return admin.response;

  await ensureSeoTables(env);

  const body = await readJson(request);
  const id = Number(body.id);
  const action = cleanText(body.action, 30).toLowerCase();
  const allowed = { approve: "applied", apply: "applied", save: "saved", reject: "rejected", pending: "pending" };

  if (!id || !allowed[action]) {
    return jsonResponse({ error: "Valid id and action are required. Use approve/apply, save, reject, or pending." }, 400);
  }

  const suggestion = await env.DB
    .prepare(`SELECT * FROM seo_suggestions WHERE id = ? LIMIT 1`)
    .bind(id)
    .first();

  if (!suggestion) return jsonResponse({ error: "Suggestion was not found." }, 404);

  let applyResult = null;

  if (action === "approve" || action === "apply") {
    applyResult = await applySuggestion(env, suggestion);
  }

  await env.DB
    .prepare(`UPDATE seo_suggestions SET status = ? WHERE id = ?`)
    .bind(allowed[action], id)
    .run();

  return jsonResponse({
    success: true,
    id,
    status: allowed[action],
    applied: Boolean(applyResult?.applied),
    patch: applyResult?.patch || [],
    message: applyResult?.applied
      ? "Suggestion approved and applied to the live page through the SEO override layer. Run Scan again to confirm the issue has resolved."
      : "Suggestion status updated."
  });
}
