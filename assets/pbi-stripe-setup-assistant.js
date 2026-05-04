
(() => {
  const target = document.getElementById('stripeSetupAssistant');
  if (!target) return;
  function badge(ok, warn = false) { return `<span class="pbi-setup-badge ${ok ? 'pass' : (warn ? 'warn' : 'fail')}">${ok ? 'Ready' : (warn ? 'Check' : 'Missing')}</span>`; }
  function esc(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
  async function load() {
    try {
      const res = await fetch('/api/billing/config-status', { credentials: 'include', cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      const rows = [
        ['Cloudflare Secret: STRIPE_SECRET_KEY', data.stripe_secret_key, 'Add this in Cloudflare Pages → Settings → Variables and Secrets.'],
        ['Starter Stripe price', data.prices?.starter, 'STRIPE_PRICE_STARTER'],
        ['Business Stripe price', data.prices?.business, 'STRIPE_PRICE_BUSINESS'],
        ['Plus Stripe price', data.prices?.plus, 'STRIPE_PRICE_PLUS'],
        ['Domain management yearly price', data.prices?.domain_management_yearly, 'Needed only when selling/registering new domains.'],
        ['Stripe webhook secret', data.webhook_secret, 'Recommended before real launch so payment returns update reliably.']
      ];
      target.innerHTML = `<h3>Payment setup status</h3><p class="muted">This checks the live Cloudflare runtime, not just what appears in GitHub.</p><div class="pbi-setup-status">${rows.map(([name, ok, note]) => `<article><span><strong>${esc(name)}</strong><small>${esc(note)}</small></span>${badge(Boolean(ok), name.includes('webhook') && !ok)}</article>`).join('')}</div>${data.ready_for_live_checkout ? '<div class="notice domain-success">Stripe looks ready for live checkout.</div>' : '<div class="notice domain-error">Stripe is not fully ready yet. Add the missing items above, redeploy, then test checkout again.</div>'}`;
    } catch (error) {
      target.innerHTML = `<div class="notice domain-error">Could not check payment setup: ${esc(error.message || 'Unknown error')}</div>`;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
