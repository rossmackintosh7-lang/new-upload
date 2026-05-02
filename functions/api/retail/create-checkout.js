import { json, error, readBody } from '../projects/_shared.js';

function parseJson(value, fallback = {}) {
  try {
    if (!value) return fallback;
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function encodeForm(data) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
  }
  return params;
}

function moneyToMinor(value) {
  const cleaned = String(value || '').replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const [whole, decimals = ''] = cleaned.split('.');
  return Number(whole || 0) * 100 + Number((decimals + '00').slice(0, 2));
}

function esc(value = '') {
  return String(value ?? '').trim().slice(0, 500);
}

async function ensureRetailTables(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS retail_orders (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    user_id TEXT,
    site_slug TEXT,
    customer_email TEXT,
    customer_name TEXT,
    status TEXT DEFAULT 'pending',
    currency TEXT DEFAULT 'gbp',
    subtotal_minor INTEGER DEFAULT 0,
    shipping_minor INTEGER DEFAULT 0,
    tax_minor INTEGER DEFAULT 0,
    total_minor INTEGER DEFAULT 0,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    body_json TEXT,
    items_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS retail_order_events (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    event_type TEXT,
    body_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function getAutoConnectedAccount(env, userId) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS retail_connect_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email TEXT,
    stripe_account_id TEXT NOT NULL UNIQUE,
    country TEXT DEFAULT 'GB',
    business_type TEXT DEFAULT 'company',
    charges_enabled INTEGER DEFAULT 0,
    payouts_enabled INTEGER DEFAULT 0,
    details_submitted INTEGER DEFAULT 0,
    onboarding_complete INTEGER DEFAULT 0,
    capabilities_json TEXT DEFAULT '{}',
    requirements_json TEXT DEFAULT '{}',
    last_project_id TEXT,
    status TEXT DEFAULT 'created',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  if (!userId) return null;

  return env.DB
    .prepare(`SELECT * FROM retail_connect_accounts WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first();
}

function retailFromData(data) {
  const products = Array.isArray(data.retail_products) ? data.retail_products : [];
  return {
    enabled: Boolean(data.retail_enabled || data.template === 'retail' || products.length),
    currency: String(data.retail_currency || 'gbp').toLowerCase(),
    connectedAccountId: String(data.retail_stripe_account_id || '').trim(),
    taxEnabled: Boolean(data.retail_tax_enabled),
    shippingLabel: String(data.retail_shipping_label || 'UK standard delivery').trim(),
    shippingAmount: String(data.retail_shipping_amount || '0').trim(),
    products: products.filter((p) => p && p.active !== false && String(p.name || '').trim()).slice(0, 10)
  };
}

function getOrigin(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function cleanCartItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 10).map((item) => ({
    id: String(item.id || '').trim(),
    quantity: Math.max(1, Math.min(99, Number(item.quantity || 1)))
  })).filter((item) => item.id);
}

export async function onRequestPost({ request, env }) {
  await ensureRetailTables(env);

  const body = await readBody(request);
  const slug = String(body.slug || '').trim();
  const cartItems = cleanCartItems(body.items);

  if (!slug) return error('Missing site slug.', 400);
  if (!cartItems.length) return error('Your basket is empty.', 400);

  const project = await env.DB
    .prepare(`SELECT * FROM projects WHERE public_slug = ? AND published = 1 LIMIT 1`)
    .bind(slug)
    .first();

  if (!project) return error('This shop is not published yet.', 404);

  const data = parseJson(project.data_json, {});
  const retail = retailFromData(data);

  if (!retail.enabled) return error('Retail checkout is not enabled for this website.', 400);

  const productsById = new Map(retail.products.map((product, index) => [String(product.id || `product_${index + 1}`), { ...product, id: String(product.id || `product_${index + 1}`) }]));
  const orderItems = [];

  for (const item of cartItems) {
    const product = productsById.get(item.id);
    if (!product) return error('One of the products in your basket is no longer available.', 400);

    const stock = Number(product.stock ?? 0);
    if (product.track_stock !== false && item.quantity > stock) {
      return error(`${product.name} only has ${stock} available.`, 400);
    }

    const amountMinor = moneyToMinor(product.price);
    if (amountMinor < 50) return error(`${product.name} needs a valid price before checkout.`, 400);

    orderItems.push({
      id: product.id,
      name: esc(product.name),
      description: esc(product.description || ''),
      sku: esc(product.sku || ''),
      quantity: item.quantity,
      amount_minor: amountMinor,
      image: product.image || '',
      stripe_price_id: String(product.stripe_price_id || '').trim(),
      payment_url: String(product.payment_url || '').trim(),
      track_stock: product.track_stock !== false
    });
  }

  if (!env.STRIPE_SECRET_KEY) {
    return error('Retail checkout needs STRIPE_SECRET_KEY set as a Cloudflare Secret before live payments can work.', 500);
  }

  const autoConnected = !retail.connectedAccountId ? await getAutoConnectedAccount(env, project.user_id || '') : null;
  const connectedAccountId = retail.connectedAccountId || autoConnected?.stripe_account_id || '';

  if (connectedAccountId && env.PBI_RETAIL_CONNECT_ENABLED !== 'true') {
    return error('Retail checkout is connected to Stripe, but PBI_RETAIL_CONNECT_ENABLED is not true. Set PBI_RETAIL_CONNECT_ENABLED=true in wrangler.toml to allow automated connected-account checkout.', 500);
  }

  if (connectedAccountId && autoConnected && !autoConnected.onboarding_complete) {
    return error('This shop owner still needs to finish Stripe onboarding before customer checkout can run.', 400);
  }

  if (!connectedAccountId && env.PBI_RETAIL_ALLOW_PLATFORM_PAYMENTS !== 'true') {
    return error('This shop owner needs to connect Stripe before customers can checkout. Ask them to open the builder and click “Connect Stripe”.', 400);
  }

  const orderId = crypto.randomUUID();
  const subtotalMinor = orderItems.reduce((sum, item) => sum + item.amount_minor * item.quantity, 0);
  const shippingMinor = moneyToMinor(retail.shippingAmount);
  const origin = getOrigin(request);

  await env.DB.prepare(`INSERT INTO retail_orders (id, project_id, user_id, site_slug, status, currency, subtotal_minor, shipping_minor, total_minor, body_json, items_json, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(orderId, project.id, project.user_id || '', slug, retail.currency, subtotalMinor, shippingMinor, subtotalMinor + shippingMinor, JSON.stringify({ source: 'site_checkout' }), JSON.stringify(orderItems))
    .run();

  const form = {
    mode: 'payment',
    success_url: `${origin}/site/${encodeURIComponent(slug)}/?retail_success=1&order=${encodeURIComponent(orderId)}`,
    cancel_url: `${origin}/site/${encodeURIComponent(slug)}/?retail_cancelled=1&order=${encodeURIComponent(orderId)}`,
    client_reference_id: orderId,
    'metadata[retail]': 'true',
    'metadata[retail_order_id]': orderId,
    'metadata[project_id]': project.id,
    'metadata[user_id]': project.user_id || '',
    'metadata[site_slug]': slug,
    'metadata[business_name]': data.business_name || project.name || '',
    billing_address_collection: 'auto',
    'phone_number_collection[enabled]': 'true'
  };

  if (retail.taxEnabled) {
    form['automatic_tax[enabled]'] = 'true';
  }

  if (shippingMinor > 0) {
    form['shipping_address_collection[allowed_countries][0]'] = env.RETAIL_ALLOWED_COUNTRY_1 || 'GB';
    form['shipping_options[0][shipping_rate_data][type]'] = 'fixed_amount';
    form['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] = shippingMinor;
    form['shipping_options[0][shipping_rate_data][fixed_amount][currency]'] = retail.currency;
    form['shipping_options[0][shipping_rate_data][display_name]'] = retail.shippingLabel || 'Delivery';
  }

  orderItems.forEach((item, index) => {
    // Use dynamic price_data so PBI does not depend on sellers copying product Price IDs correctly.
    // If you later want platform-managed Stripe Products, you can replace this with line_items[index][price].
    form[`line_items[${index}][price_data][currency]`] = retail.currency;
    form[`line_items[${index}][price_data][unit_amount]`] = item.amount_minor;
    form[`line_items[${index}][price_data][product_data][name]`] = item.name;
    if (item.description) form[`line_items[${index}][price_data][product_data][description]`] = item.description;
    if (/^https?:\/\//.test(item.image)) form[`line_items[${index}][price_data][product_data][images][0]`] = item.image;
    form[`line_items[${index}][quantity]`] = item.quantity;
  });

  if (connectedAccountId && env.PBI_RETAIL_CONNECT_ENABLED === 'true') {
    form['payment_intent_data[transfer_data][destination]'] = connectedAccountId;
    const feePercent = Number(env.PBI_RETAIL_APPLICATION_FEE_PERCENT || 0);
    if (feePercent > 0) {
      form['payment_intent_data[application_fee_amount]'] = Math.round(subtotalMinor * (feePercent / 100));
    }
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeForm(form)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    await env.DB.prepare(`UPDATE retail_orders SET status='checkout_failed', body_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(JSON.stringify(result), orderId).run();
    return error(result.error?.message || 'Stripe Checkout could not be created.', 500);
  }

  await env.DB.prepare(`UPDATE retail_orders SET stripe_session_id=?, status='checkout_started', updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(result.id || '', orderId).run();

  return json({ ok: true, url: result.url, order_id: orderId, session_id: result.id });
}

export async function onRequestGet() {
  return error('Method not allowed.', 405);
}
