
import { json } from '../projects/_shared.js';

function present(value) {
  const text = String(value || '').trim();
  return Boolean(text && !/^your_|^add_|^todo|placeholder/i.test(text));
}

export async function onRequestGet({ env }) {
  const prices = {
    starter: present(env.STRIPE_PRICE_STARTER),
    business: present(env.STRIPE_PRICE_BUSINESS),
    plus: present(env.STRIPE_PRICE_PLUS),
    assisted_setup: present(env.STRIPE_PRICE_ASSISTED_SETUP),
    custom_deposit: present(env.STRIPE_PRICE_CUSTOM_DEPOSIT),
    domain_management_yearly: present(env.STRIPE_PRICE_DOMAIN_MANAGEMENT_YEARLY)
  };
  const stripeSecret = present(env.STRIPE_SECRET_KEY) && /^sk_(test|live)_/.test(String(env.STRIPE_SECRET_KEY).trim());
  const webhook = present(env.STRIPE_WEBHOOK_SECRET);
  const paymentRequired = env.PBI_REQUIRE_PAYMENT_TO_PUBLISH !== 'false';
  return json({
    ok: true,
    payment_required: paymentRequired,
    stripe_secret_key: stripeSecret,
    webhook_secret: webhook,
    prices,
    ready_for_live_checkout: stripeSecret && prices.starter && prices.business && prices.plus,
    recommended_next_step: stripeSecret ? 'Run a test checkout from the payment page.' : 'Add STRIPE_SECRET_KEY as a Cloudflare Secret for Production and Preview.'
  });
}
