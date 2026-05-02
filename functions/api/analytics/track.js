
import { json } from "../_lib/json.js";

function clean(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

async function ensureAnalyticsTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      site_slug TEXT,
      event_type TEXT,
      page_path TEXT,
      referrer TEXT,
      user_agent TEXT,
      body_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, message: "DB binding missing" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    await ensureAnalyticsTable(env);

    const id = crypto.randomUUID();
    const url = new URL(request.url);

    await env.DB.prepare(`
      INSERT INTO analytics_events
      (id, project_id, site_slug, event_type, page_path, referrer, user_agent, body_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      id,
      clean(body.projectId || body.project_id, 120) || null,
      clean(body.siteSlug || body.site_slug || url.hostname, 180),
      clean(body.eventType || body.event_type || "page_view", 80),
      clean(body.pagePath || body.page_path || "/", 500),
      clean(body.referrer || "", 500),
      clean(request.headers.get("User-Agent") || "", 500),
      JSON.stringify(body || {})
    ).run();

    return json({ ok: true, id });
  } catch (err) {
    return json({ ok: false, message: err?.message || "Analytics failed" }, { status: 500 });
  }
}
