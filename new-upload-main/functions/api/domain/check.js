import { json, error } from '../../_lib/json.js';

const SESSION_COOKIE_NAME = 'session_id';

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';

  const cookies = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex === -1) continue;

    const cookieName = cookie.slice(0, separatorIndex);
    const cookieValue = cookie.slice(separatorIndex + 1);

    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }

  return '';
}

async function getUserFromSession(env, request) {
  const sessionId = getCookie(request, SESSION_COOKIE_NAME);

  if (!sessionId) return null;

  return await env.DB
    .prepare(
      `SELECT sessions.id, sessions.user_id, users.email
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?`
    )
    .bind(sessionId)
    .first();
}

function cleanDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .replace(/[^a-z0-9.-]/g, '');
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(env, request);

  if (!user) {
    return error('Unauthorized.', 401);
  }

  let body = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const domain = cleanDomain(body.domain);

  if (!domain || !domain.includes('.')) {
    return error('A valid domain is required.', 400);
  }

  if (!env.CLOUDFLARE_ACCOUNT_ID) {
    return error('Missing CLOUDFLARE_ACCOUNT_ID environment variable.', 500);
  }

  if (!env.CLOUDFLARE_API_TOKEN) {
    return error('Missing CLOUDFLARE_API_TOKEN environment variable.', 500);
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/registrar/domain-check`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domains: [domain]
      })
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    const message =
      result.errors?.[0]?.message ||
      result.messages?.[0]?.message ||
      `Cloudflare domain check failed with status ${response.status}`;

    return error(message, response.status || 500);
  }

  return json({
    ok: true,
    domain,
    result: result.result,
    cloudflare: result
  });
}
