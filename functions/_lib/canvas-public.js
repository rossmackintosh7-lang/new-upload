import { renderCanvasPage, renderCmsEntryPage } from './canvas-renderer.js';

const ACTIVE_BILLING_STATUSES = new Set(['active', 'trialing', 'not_required']);

function parseJson(value, fallback = {}) {
  try {
    if (!value) return fallback;
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (_) {
    return fallback;
  }
}

function normaliseSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function notFound(message = 'This website is not published yet.') {
  return new Response(message, {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function isPaymentSafe(project, env) {
  if (env?.PBI_REQUIRE_PAYMENT_TO_PUBLISH === 'false') return true;
  return ACTIVE_BILLING_STATUSES.has(String(project?.billing_status || '').toLowerCase());
}

async function loadPublishedCanvas(env, identifier) {
  if (!env?.DB) return { error: new Response('D1 database binding DB is missing.', { status: 500 }) };
  const key = String(identifier || '').trim();
  if (!key) return { error: new Response('Missing site id.', { status: 400 }) };

  const row = await env.DB.prepare(`
    SELECT
      pc.project_id,
      pc.published_json,
      pc.status AS canvas_status,
      pc.published_at AS canvas_published_at,
      p.id,
      p.name,
      p.public_slug,
      p.published,
      p.billing_status,
      p.plan,
      p.data_json,
      p.custom_domain,
      p.domain_option
    FROM project_canvas pc
    JOIN projects p ON p.id = pc.project_id
    WHERE (pc.project_id = ? OR p.public_slug = ?)
      AND pc.status = 'published'
      AND pc.published_json IS NOT NULL
      AND p.published = 1
    LIMIT 1
  `).bind(key, key).first();

  if (!row) return { error: notFound() };
  if (!isPaymentSafe(row, env)) return { error: notFound() };

  const canvas = parseJson(row.published_json, {});
  const projectData = parseJson(row.data_json, {});
  const cmsRows = await env.DB.prepare(`
    SELECT id, type, title, slug, status, body, excerpt, image, seo_title, seo_description, updated_at, published_at
    FROM project_cms_entries
    WHERE project_id = ? AND status = 'published'
    ORDER BY COALESCE(published_at, updated_at) DESC
    LIMIT 100
  `).bind(row.project_id).all().catch(() => ({ results: [] }));

  const cmsEntries = (cmsRows.results || []).map((entry) => ({
    id: entry.id,
    type: entry.type || 'blog',
    title: entry.title || 'Untitled',
    slug: normaliseSlug(entry.slug || entry.title),
    status: entry.status,
    body: entry.body || '',
    text: entry.body || '',
    excerpt: entry.excerpt || '',
    image: entry.image || '',
    seo_title: entry.seo_title || entry.title || '',
    seo_description: entry.seo_description || entry.excerpt || '',
    updated_at: entry.updated_at,
    published_at: entry.published_at
  }));

  return {
    row,
    canvas: { ...canvas, _cms_entries: cmsEntries },
    cmsEntries,
    projectData,
    siteKey: row.public_slug || row.project_id,
    basePath: `/site/canvas/${encodeURIComponent(row.public_slug || row.project_id)}`
  };
}

function htmlResponse(html) {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    }
  });
}

export async function renderPublishedCanvasRequest({ request, env, params, pageSlug = '' }) {
  try {
    const identifier = params?.project || params?.id || new URL(request.url).searchParams.get('project_id');
    const loaded = await loadPublishedCanvas(env, identifier);
    if (loaded.error) return loaded.error;

    const activePage = normaliseSlug(pageSlug || params?.page || new URL(request.url).searchParams.get('page') || '');
    const html = renderCanvasPage(loaded.canvas, {
      title: loaded.canvas.title || loaded.projectData.business_name || loaded.row.name || 'PBI Website',
      description: loaded.projectData.seo_description || 'A premium website created with Purbeck Business Innovations.',
      url: request.url,
      pageSlug: activePage,
      basePath: loaded.basePath,
      siteKey: loaded.siteKey
    });

    return htmlResponse(html);
  } catch (err) {
    return new Response(err?.message || 'Could not render site', { status: 500 });
  }
}

export async function renderPublishedCmsRequest({ request, env, params }) {
  try {
    const identifier = params?.project || params?.id || '';
    const collection = normaliseSlug(params?.collection || 'blog');
    const slug = normaliseSlug(params?.slug || '');
    if (!slug) return notFound('CMS entry not found.');

    const loaded = await loadPublishedCanvas(env, identifier);
    if (loaded.error) return loaded.error;

    const entry = loaded.cmsEntries.find((item) => normaliseSlug(item.type) === collection && normaliseSlug(item.slug) === slug);
    if (!entry) return notFound('CMS entry not found.');

    const html = renderCmsEntryPage(entry, loaded.canvas, {
      url: request.url,
      basePath: loaded.basePath,
      collection,
      siteTitle: loaded.canvas.title || loaded.projectData.business_name || loaded.row.name || 'PBI Website'
    });

    return htmlResponse(html);
  } catch (err) {
    return new Response(err?.message || 'Could not render CMS page', { status: 500 });
  }
}
