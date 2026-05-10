import { findProjectByPublicSlug, renderProjectResponse, renderSuspendedLanding } from '../../_lib/site-renderer.js';

function htmlResponse(html, status = 404) {
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts[2] || '';

  if (!slug) {
    return htmlResponse(renderSuspendedLanding({ name: 'This website' }, env), 404);
  }

  const project = await findProjectByPublicSlug(env, decodeURIComponent(slug));
  if (!project) {
    return htmlResponse(renderSuspendedLanding({ name: 'This website' }, env), 404);
  }

  return renderProjectResponse(project, env);
}
