import { json, error } from '../../_lib/json.js';
import { randomHex, hashPassword } from '../../_lib/crypto.js';
import { verifyTurnstileDetailed } from '../../_lib/turnstile.js';
import { createSession, makeSetCookie } from '../../_lib/session.js';
import { readJson, ensureCoreTables } from '../../_lib/auth.js';
import { sendEmail, publicBaseUrl, escapeHtml } from '../../_lib/email.js';

async function ensureSignupTables(env) {
  await ensureCoreTables(env);

  const alters = [
    `ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN created_at TEXT`,
    `ALTER TABLE users ADD COLUMN updated_at TEXT`,
    `ALTER TABLE projects ADD COLUMN created_at TEXT`,
    `ALTER TABLE projects ADD COLUMN updated_at TEXT`,
    `ALTER TABLE projects ADD COLUMN published INTEGER DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN public_slug TEXT`,
    `ALTER TABLE projects ADD COLUMN plan TEXT DEFAULT 'free_preview'`,
    `ALTER TABLE projects ADD COLUMN billing_status TEXT DEFAULT 'draft'`,
    `ALTER TABLE projects ADD COLUMN domain_option TEXT DEFAULT 'pbi_subdomain'`,
    `ALTER TABLE projects ADD COLUMN custom_domain TEXT`
  ];
  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch {}
  }

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS terms_acceptances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      terms_version TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      accepted_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return error('Database binding missing. Check Cloudflare Pages binding name DB points to d1-template-database.', 500);
    await ensureSignupTables(env);

    const body = await readJson(request);
    if (!body) return error('Invalid request body.');

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const projectName = String(body.project_name || 'Untitled website').trim();
    const templatePreset = String(body.template_preset || '').trim();
<<<<<<< Updated upstream
=======
    const rawPlan = String(body.plan || '').trim().toLowerCase();
    if (!['starter', 'business', 'plus'].includes(rawPlan)) return error('Choose a website package before creating an account.', 400);
    const plan = rawPlan;
>>>>>>> Stashed changes
    const token = String(body.turnstileToken || '');
    const termsAccepted = body.terms_accepted === true;
    const termsVersion = String(body.terms_version || '2026-04-28').trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return error('Enter a valid email address.');
    if (!password || password.length < 8) return error('Password must be at least 8 characters.');
    if (!termsAccepted) return error('You must accept the Terms and Conditions before creating an account.', 400);
    if (!token) return error('Turnstile token missing. Refresh the page and complete the security check again.');

    const turnstile = await verifyTurnstileDetailed(env, token, request.headers.get('CF-Connecting-IP') || '');
    if (!turnstile.success) {
      return error(turnstile.reason || 'Turnstile validation failed.', 400, {
        turnstileCode: turnstile.code || 'unknown',
        turnstileErrors: turnstile.errorCodes || [],
        turnstileHostname: turnstile.hostname || ''
      });
    }

    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first();
    if (existing) return error('An account with that email already exists. Use Login instead.', 409);

    const userId = crypto.randomUUID();
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);

    await env.DB.prepare(`
      INSERT INTO users
      (id, email, password_hash, password_salt, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(userId, email, passwordHash, salt).run();

    const projectId = crypto.randomUUID();
    const projectData = {
      template_preset: templatePreset || '',
      project_name: projectName || 'Untitled website',
<<<<<<< Updated upstream
      created_from_signup: true
=======
      created_from_signup: true,
      selected_plan: plan,
      plan,
      build_is_free: true,
      payment_due: 'publish'
>>>>>>> Stashed changes
    };

    await env.DB.prepare(`
      INSERT INTO projects
<<<<<<< Updated upstream
      (id, user_id, name, status, data_json, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(projectId, userId, projectName || 'Untitled website', JSON.stringify(projectData)).run();
=======
      (id, user_id, name, status, data_json, plan, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(projectId, userId, projectName || 'Untitled website', JSON.stringify(projectData), plan).run();
>>>>>>> Stashed changes

    try {
      await env.DB.prepare(`
        INSERT INTO terms_acceptances
        (id, user_id, email, terms_version, ip_address, user_agent, accepted_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        crypto.randomUUID(),
        userId,
        email,
        termsVersion,
        request.headers.get('CF-Connecting-IP') || '',
        request.headers.get('User-Agent') || ''
      ).run();
    } catch (termsError) {
      console.error('Could not record terms acceptance:', termsError);
    }

    const baseUrl = publicBaseUrl(request, env);
    try {
      await sendEmail(env, {
        to: email,
        subject: 'Welcome to Purbeck Business Innovations',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:680px">
            <h2>Welcome to Purbeck Business Innovations</h2>
            <p>Thanks for signing up. Your PBI dashboard is ready and your first website project has been created.</p>
            <p><a href="${baseUrl}/dashboard/" style="display:inline-block;background:#b85f32;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open your dashboard</a></p>
            <p style="font-size:13px;color:#666">By creating your account you accepted PBI Terms and Conditions version ${escapeHtml(termsVersion)}.</p>
          </div>
        `,
        text: `Welcome to Purbeck Business Innovations. Your dashboard is ready: ${baseUrl}/dashboard/`
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    const session = await createSession(env, userId);
<<<<<<< Updated upstream
    return json({ ok: true, user: { id: userId, email }, project: { id: projectId, name: projectName } }, 200, {
=======
    return json({ ok: true, user: { id: userId, email }, project: { id: projectId, name: projectName, plan } }, 200, {
>>>>>>> Stashed changes
      'Set-Cookie': makeSetCookie('session_id', session.id, 60 * 60 * 24 * 30, true)
    });
  } catch (err) {
    console.error('Signup failed:', err);
    return error(`Signup failed: ${err?.message || 'Unknown server error.'}`, 500);
  }
}
