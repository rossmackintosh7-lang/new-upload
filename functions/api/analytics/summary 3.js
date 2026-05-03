
import { json, error, getUserFromSession } from "../projects/_shared.js";

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(env, request).catch(() => null);
  if (!user) return error("Log in first.", 401);

  try {
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

    const byType = await env.DB.prepare(`
      SELECT event_type, COUNT(*) AS count
      FROM analytics_events
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 20
    `).all();

    const topPages = await env.DB.prepare(`
      SELECT page_path, COUNT(*) AS count
      FROM analytics_events
      WHERE page_path IS NOT NULL
      GROUP BY page_path
      ORDER BY count DESC
      LIMIT 10
    `).all();

    return json({
      ok: true,
      by_type: byType.results || [],
      top_pages: topPages.results || []
    });
  } catch (err) {
    return json({
      ok: true,
      by_type: [],
      top_pages: [],
      message: "Analytics table has no data yet."
    });
  }
}
