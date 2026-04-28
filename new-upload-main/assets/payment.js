document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('project');
  const success = params.get('success') === '1';
  const cancelled = params.get('cancelled') === '1';
  const message = document.getElementById('paymentMessage');

  function showMessage(text, type = 'info') {
    if (!message) return;
    message.textContent = text;
    message.style.display = 'block';
    message.className = `notice domain-${type}`;
  }

  function selectedDomainOption() {
    return document.querySelector('input[name="domainOption"]:checked')?.value || 'pbi_subdomain';
  }

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    return data;
  }

  async function createCheckout(plan) {
    if (!projectId) return showMessage('No project selected. Go back to your dashboard and choose a project to publish.', 'error');
    showMessage('Preparing checkout...', 'info');
    try {
      const data = await api('/api/billing/create-checkout', { method: 'POST', body: JSON.stringify({ project_id: projectId, plan, domain_option: selectedDomainOption() }) });
      if (data.url) { window.location.href = data.url; return; }
      if (data.setup_required) { showMessage(data.message || 'Stripe is not connected yet.', 'info'); return; }
      showMessage('Checkout was created, but no redirect URL was returned.', 'error');
    } catch (error) { showMessage(error.message || 'Could not start checkout.', 'error'); }
  }

  async function publishAfterPayment() {
    if (!projectId) return;
    showMessage('Checking payment and publishing your website...', 'info');
    try {
      const data = await api('/api/projects/publish', { method: 'POST', body: JSON.stringify({ project_id: projectId, domain_option: selectedDomainOption() }) });
      if (data.published) { showMessage(`Your website is live: ${data.live_url}`, 'success'); return; }
      if (data.payment_required) { showMessage('Payment is not active yet. If you have just paid, wait a few seconds and refresh this page.', 'info'); return; }
      showMessage(data.message || 'Publish status is unclear.', 'info');
    } catch (error) { showMessage(error.message || 'Could not publish website.', 'error'); }
  }

  document.querySelectorAll('.planBtn').forEach((button) => button.addEventListener('click', () => createCheckout(button.dataset.plan)));
  if (success) publishAfterPayment();
  if (cancelled) showMessage('Checkout was cancelled. Your website is still saved as a draft.', 'info');
});
