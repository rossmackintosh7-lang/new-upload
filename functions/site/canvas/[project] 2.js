
import { renderCanvasPage } from "../../_lib/canvas-renderer.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const projectId = params.project || params.id || new URL(request.url).searchParams.get("project_id");
    if (!projectId) return new Response("Missing project id", { status: 400 });

    const row = await env.DB.prepare(`
      SELECT published_json, canvas_json FROM project_canvas WHERE project_id=? LIMIT 1
    `).bind(projectId).first();

    if (!row) return new Response("Canvas site not found", { status: 404 });

    const canvas = JSON.parse(row.published_json || row.canvas_json || "{}");
    const html = renderCanvasPage(canvas, { title: canvas.title || "PBI Website" });

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (err) {
    return new Response(err?.message || "Could not render site", { status: 500 });
  }
}
