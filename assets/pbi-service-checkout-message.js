(() => {
  const labels = {
    basic_build: 'Basic Build',
    standard_build: 'Standard Build',
    premium_build: 'Premium Build',
    ecommerce_build: 'E-Commerce Build',
    complex_build: 'Complex Build',
    website_care_plan: 'Website Care Plan',
    seo_care_plan: 'SEO Care Plan'
  };

  function normalise(value) {
    return String(value || '').trim().toLowerCase().replace(/-/g, '_');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const key = normalise(params.get('checkout'));
    if (!key || !labels[key]) return;

    const target = document.querySelector('[data-service-checkout-message]');
    if (!target) return;

    const success = params.get('success') === '1';
    const cancelled = params.get('cancelled') === '1';
    if (!success && !cancelled) return;

    target.style.display = '';
    target.className = `notice ${success ? 'domain-success' : 'domain-warning'}`;
    target.textContent = success
      ? `${labels[key]} payment received. PBI has been notified and will follow up with the next steps.`
      : `${labels[key]} checkout was cancelled. No payment was taken.`;
  });
})();
