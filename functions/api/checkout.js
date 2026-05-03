const PRICE_ENV_BY_PLAN = {
  starter: "STRIPE_PRICE_STARTER_SITE",
  business: "STRIPE_PRICE_BUSINESS_SITE",
  growth: "STRIPE_PRICE_GROWTH_SITE",
  assisted: "STRIPE_PRICE_ASSISTED_SETUP",
  domain: "STRIPE_PRICE_DOMAIN_MANAGEMENT_YEARLY"
};

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Missing STRIPE_SECRET_KEY in Cloudflare environment variables." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const plan = body.plan;
  const envName = PRICE_ENV_BY_PLAN[plan];

  if (!envName) {
    return json({ error: "Unknown checkout plan." }, 400);
  }

  const priceId = env[envName];

  if (!priceId) {
    return json({ error: `Missing ${envName} in Cloudflare environment variables.` }, 500);
  }

  const origin = new URL(request.url).origin;
  const params = new URLSearchParams();
  params.append("mode", plan === "domain" ? "subscription" : "payment");
  params.append("line_items[0][price]", priceId);
  params.append("line_items[0][quantity]", "1");
  params.append("success_url", `${origin}/?checkout=success#builder`);
  params.append("cancel_url", `${origin}/?checkout=cancelled#pricing`);
  params.append("allow_promotion_codes", "true");

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  const data = await stripeResponse.json();

  if (!stripeResponse.ok) {
    return json({ error: data.error?.message || "Stripe checkout failed." }, 500);
  }

  return json({ url: data.url });
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
