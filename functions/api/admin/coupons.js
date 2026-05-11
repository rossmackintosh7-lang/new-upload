import { json, error, requireAdmin, ensurePbiOpsTables, audit } from './_shared.js';

const VALID_DURATIONS = new Set(['once', 'forever', 'repeating']);
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf',
  'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'
]);

function cleanCode(value) {
  const fallback = `PBI-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return String(value || fallback)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || fallback;
}

function toMinor(value, currency) {
  const text = String(value || '').replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!text) return 0;
  const [wholeRaw, fractionRaw = ''] = text.split('.');
  const whole = Number.parseInt(wholeRaw || '0', 10);
  if (!Number.isFinite(whole)) return 0;
  if (ZERO_DECIMAL_CURRENCIES.has(String(currency || '').toLowerCase())) return whole;
  const fraction = Number.parseInt((fractionRaw + '00').slice(0, 2), 10) || 0;
  return (whole * 100) + fraction;
}

function unixDate(value) {
  if (!value) return 0;
  const date = new Date(value);
  const seconds = Math.floor(date.getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  return Number.isFinite(seconds) && seconds > now ? seconds : 0;
}

function appendIf(params, key, value) {
  if (value !== undefined && value !== null && String(value) !== '') params.append(key, String(value));
}

async function stripePost(env, path, params) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || `Stripe request failed with ${response.status}`;
    const err = new Error(message);
    err.stripe = data.error || data;
    throw err;
  }
  return data;
}

function couponParams(input) {
  const params = new URLSearchParams();
  const currency = String(input.currency || 'gbp').trim().toLowerCase();
  const durationInput = String(input.duration || 'once').toLowerCase();
  const duration = VALID_DURATIONS.has(durationInput) ? durationInput : 'once';
  const percent = Number(input.percent_off || 0);
  const amount = toMinor(input.amount_off || input.amount, currency);
  const months = Number.parseInt(input.duration_in_months || '0', 10);
  const maxRedemptions = Number.parseInt(input.max_redemptions || '0', 10);
  const redeemBy = unixDate(input.redeem_by);

  appendIf(params, 'name', String(input.name || input.code || 'PBI discount').slice(0, 80));
  params.append('duration', duration);
  if (duration === 'repeating') appendIf(params, 'duration_in_months', Math.max(1, months || 3));
  if (percent > 0) {
    params.append('percent_off', String(Math.min(100, Math.max(1, percent))));
  } else {
    params.append('amount_off', String(Math.max(1, amount)));
    params.append('currency', currency);
  }
  if (maxRedemptions > 0) appendIf(params, 'max_redemptions', maxRedemptions);
  if (redeemBy) appendIf(params, 'redeem_by', redeemBy);
  return { params, amount_off: percent > 0 ? 0 : Math.max(1, amount), percent_off: percent > 0 ? Math.min(100, Math.max(1, percent)) : 0, currency, duration, duration_in_months: duration === 'repeating' ? Math.max(1, months || 3) : 0, max_redemptions: maxRedemptions, redeem_by: redeemBy ? new Date(redeemBy * 1000).toISOString() : '' };
}

async function createPromotionCode(env, couponId, code, input = {}) {
  const maxRedemptions = Number.parseInt(input.max_redemptions || '0', 10);
  const expiresAt = unixDate(input.redeem_by);
  const modern = new URLSearchParams();
  modern.append('promotion[type]', 'coupon');
  modern.append('promotion[coupon]', couponId);
  modern.append('code', code);
  if (maxRedemptions > 0) modern.append('max_redemptions', String(maxRedemptions));
  if (expiresAt) modern.append('expires_at', String(expiresAt));

  try {
    return await stripePost(env, 'promotion_codes', modern);
  } catch (err) {
    const legacy = new URLSearchParams();
    legacy.append('coupon', couponId);
    legacy.append('code', code);
    if (maxRedemptions > 0) legacy.append('max_redemptions', String(maxRedemptions));
    if (expiresAt) legacy.append('expires_at', String(expiresAt));
    return await stripePost(env, 'promotion_codes', legacy);
  }
}

async function listCoupons(env) {
  await ensurePbiOpsTables(env);
  const rows = await env.DB.prepare(`
    SELECT id,stripe_coupon_id,stripe_promotion_code_id,code,name,percent_off,amount_off,currency,duration,duration_in_months,max_redemptions,redeem_by,created_by,created_at
    FROM admin_coupons
    ORDER BY datetime(created_at) DESC
    LIMIT 30
  `).all();
  return rows.results || [];
}

export async function onRequestGet({ request, env }) {
  const { response } = await requireAdmin(env, request);
  if (response) return response;
  return json({
    ok: true,
    stripe_connected: Boolean(env.STRIPE_SECRET_KEY),
    coupons: await listCoupons(env)
  });
}

export async function onRequestPost({ request, env }) {
  const { response, admin } = await requireAdmin(env, request);
  if (response) return response;
  if (!env.STRIPE_SECRET_KEY) return error('STRIPE_SECRET_KEY is missing, so PBI cannot create Stripe coupons yet.', 400);

  await ensurePbiOpsTables(env);
  const body = await request.json().catch(() => ({}));
  const code = cleanCode(body.code);
  const hasPercent = Number(body.percent_off || 0) > 0;
  const hasAmount = Number(body.amount_off || body.amount || 0) > 0;
  if (!hasPercent && !hasAmount) return error('Enter either a percentage discount or a fixed amount discount.', 400);
  const existing = await env.DB.prepare(`SELECT id FROM admin_coupons WHERE code = ? LIMIT 1`).bind(code).first();
  if (existing) return error('That coupon code already exists in PBI. Use a different code.', 409);

  const prepared = couponParams({ ...body, code });
  const coupon = await stripePost(env, 'coupons', prepared.params);
  const promotion = await createPromotionCode(env, coupon.id, code, body);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO admin_coupons (id,stripe_coupon_id,stripe_promotion_code_id,code,name,percent_off,amount_off,currency,duration,duration_in_months,max_redemptions,redeem_by,created_by,body_json,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  `).bind(
    id,
    coupon.id || '',
    promotion.id || '',
    code,
    String(body.name || coupon.name || 'PBI discount').slice(0, 80),
    prepared.percent_off,
    prepared.amount_off,
    prepared.currency,
    prepared.duration,
    prepared.duration_in_months,
    prepared.max_redemptions || null,
    prepared.redeem_by,
    admin.email || '',
    JSON.stringify({ coupon, promotion })
  ).run();

  await audit(env, admin, 'coupon.created', { code, stripe_coupon_id: coupon.id || '', stripe_promotion_code_id: promotion.id || '' });

  return json({
    ok: true,
    coupon: {
      id,
      code,
      stripe_coupon_id: coupon.id || '',
      stripe_promotion_code_id: promotion.id || '',
      name: body.name || coupon.name || 'PBI discount',
      percent_off: prepared.percent_off,
      amount_off: prepared.amount_off,
      currency: prepared.currency,
      duration: prepared.duration,
      max_redemptions: prepared.max_redemptions || null,
      redeem_by: prepared.redeem_by
    },
    coupons: await listCoupons(env)
  });
}
