import { error, requireAdmin, parseProjectData } from './_shared.js';
import { renderPublishedSite } from '../../_lib/site-renderer.js';

const encoder = new TextEncoder();
let crcTable;

function cleanName(value = '') {
  return String(value || 'website')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'website';
}

function asBytes(value) {
  return value instanceof Uint8Array ? value : encoder.encode(String(value ?? ''));
}

function concatBytes(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function write16(out, offset, value) {
  out[offset] = value & 255;
  out[offset + 1] = (value >>> 8) & 255;
}

function write32(out, offset, value) {
  out[offset] = value & 255;
  out[offset + 1] = (value >>> 8) & 255;
  out[offset + 2] = (value >>> 16) & 255;
  out[offset + 3] = (value >>> 24) & 255;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(bytes) {
  crcTable ||= makeCrcTable();
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipDate() {
  const now = new Date();
  const year = Math.max(now.getFullYear(), 1980);
  const date = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  return { date, time };
}

function createZip(files) {
  const chunks = [];
  const central = [];
  const { date, time } = zipDate();
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(String(file.name || '').replace(/^\/+/, ''));
    const data = asBytes(file.content);
    const crc = crc32(data);
    const local = new Uint8Array(30);
    write32(local, 0, 0x04034b50);
    write16(local, 4, 20);
    write16(local, 6, 0);
    write16(local, 8, 0);
    write16(local, 10, time);
    write16(local, 12, date);
    write32(local, 14, crc);
    write32(local, 18, data.length);
    write32(local, 22, data.length);
    write16(local, 26, nameBytes.length);
    write16(local, 28, 0);

    chunks.push(local, nameBytes, data);
    central.push({ nameBytes, crc, size: data.length, offset });
    offset += local.length + nameBytes.length + data.length;
  }

  const centralStart = offset;
  for (const file of central) {
    const header = new Uint8Array(46);
    write32(header, 0, 0x02014b50);
    write16(header, 4, 20);
    write16(header, 6, 20);
    write16(header, 8, 0);
    write16(header, 10, 0);
    write16(header, 12, time);
    write16(header, 14, date);
    write32(header, 16, file.crc);
    write32(header, 20, file.size);
    write32(header, 24, file.size);
    write16(header, 28, file.nameBytes.length);
    write16(header, 30, 0);
    write16(header, 32, 0);
    write16(header, 34, 0);
    write16(header, 36, 0);
    write32(header, 38, 0);
    write32(header, 42, file.offset);
    chunks.push(header, file.nameBytes);
    offset += header.length + file.nameBytes.length;
  }

  const end = new Uint8Array(22);
  write32(end, 0, 0x06054b50);
  write16(end, 8, central.length);
  write16(end, 10, central.length);
  write32(end, 12, offset - centralStart);
  write32(end, 16, centralStart);
  write16(end, 20, 0);
  chunks.push(end);

  return concatBytes(chunks);
}

async function all(env, sql, ...binds) {
  try {
    return (await env.DB.prepare(sql).bind(...binds).all()).results || [];
  } catch {
    return [];
  }
}

function pickPublishedHtml(row = {}) {
  return row.html || row.site_html || row.html_content || row.content_html || row.rendered_html || '';
}

function makeReadme(project, data, domains) {
  const title = data.business_name || data.businessName || project.name || project.id;
  return [
    `${title} - PBI website export`,
    '',
    `Project ID: ${project.id}`,
    `Customer: ${project.user_email || project.user_id || 'Unknown'}`,
    `Plan: ${project.plan || 'Not set'}`,
    `Status: ${project.status || 'draft'}`,
    `Billing status: ${project.billing_status || 'not active'}`,
    `Public slug: ${project.public_slug || 'Not set'}`,
    `Custom domain: ${project.custom_domain || data.custom_domain || 'Not set'}`,
    `Exported: ${new Date().toISOString()}`,
    '',
    'Files included:',
    '- index.html: static HTML rendered from the project data.',
    '- site-data/project.json: project record and builder data.',
    '- site-data/site.json: clean builder/site data only.',
    '- site-data/domain-records.json: domain records known to PBI.',
    '- site-data/published-site.json: latest hosting record, if one exists.',
    '',
    domains.length ? `Known domains: ${domains.map((item) => item.domain || item.domain_name).filter(Boolean).join(', ')}` : 'Known domains: none recorded yet.',
    ''
  ].join('\n');
}

export async function onRequestGet({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  if (!env.DB) return error('Database binding is missing.', 500);

  const url = new URL(request.url);
  const projectId = String(url.searchParams.get('project_id') || '').trim();
  if (!projectId) return error('Missing project_id.', 400);

  const project = await env.DB.prepare(`
    SELECT projects.*, users.email AS user_email
    FROM projects
    LEFT JOIN users ON users.id = projects.user_id
    WHERE projects.id = ?
    LIMIT 1
  `).bind(projectId).first();

  if (!project) return error('Project not found.', 404);

  const data = parseProjectData(project);
  const publishedSites = await all(env, `SELECT * FROM published_sites WHERE project_id = ? ORDER BY datetime(COALESCE(updated_at, created_at, '1970-01-01')) DESC LIMIT 1`, projectId);
  const siteId = publishedSites[0]?.id || '';
  const domains = siteId
    ? await all(env, `SELECT * FROM site_domains WHERE site_id = ? ORDER BY is_primary DESC, datetime(COALESCE(updated_at, created_at, '1970-01-01')) DESC`, siteId)
    : [];
  const sections = await all(env, `SELECT * FROM project_sections WHERE project_id = ? ORDER BY section_order ASC, created_at ASC`, projectId);
  const leads = await all(env, `SELECT * FROM leads WHERE project_id = ? ORDER BY datetime(created_at) DESC LIMIT 200`, projectId);
  const analytics = await all(env, `SELECT * FROM analytics_events WHERE project_id = ? ORDER BY datetime(created_at) DESC LIMIT 200`, projectId);

  const latestPublishedHtml = pickPublishedHtml(publishedSites[0]);
  const files = [
    { name: 'README.txt', content: makeReadme(project, data, domains) },
    { name: 'index.html', content: renderPublishedSite({ ...project, published: 1 }, env) },
    { name: 'site-data/site.json', content: JSON.stringify(data, null, 2) },
    { name: 'site-data/project.json', content: JSON.stringify({ ...project, data }, null, 2) },
    { name: 'site-data/domain-records.json', content: JSON.stringify(domains, null, 2) },
    { name: 'site-data/project-sections.json', content: JSON.stringify(sections, null, 2) },
    { name: 'site-data/leads.json', content: JSON.stringify(leads, null, 2) },
    { name: 'site-data/analytics-events.json', content: JSON.stringify(analytics, null, 2) }
  ];

  if (publishedSites[0]) files.push({ name: 'site-data/published-site.json', content: JSON.stringify(publishedSites[0], null, 2) });
  if (latestPublishedHtml) files.push({ name: 'published-index.html', content: latestPublishedHtml });

  const zip = createZip(files);
  const filename = `${cleanName(data.business_name || data.businessName || project.name || project.id)}-pbi-website.zip`;

  return new Response(zip, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}
