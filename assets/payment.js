document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('project');
  const success = params.get('success') === '1';
  const cancelled = params.get('cancelled') === '1';
  const message = document.getElementById('paymentMessage');
  const selectedDomainSummary = document.getElementById('selectedDomainSummary');
  let projectData = {};

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function showMessage(text, type = 'info') {
    if (!message) return;
    message.textContent = text;
    message.style.display = 'block';
    message.className = `notice domain-${type}`;
    message.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showRichMessage(html, type = 'info') {
    if (!message) return;
    message.innerHTML = html;
    message.style.display = 'block';
    message.className = `notice domain-${type}`;
    message.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setPlanButtons(disabled, activeButton = null, label = 'Working...') {
    document.querySelectorAll('.planBtn').forEach((button) => {
      button.disabled = disabled;
      if (button === activeButton) {
        button.dataset.oldText = button.dataset.oldText || button.textContent;
        button.textContent = label;
      } else if (!disabled && button.dataset.oldText) {
        button.textContent = button.dataset.oldText;
        delete button.dataset.oldText;
      }
    });
  }

  function selectedDomainOption() {
    return document.querySelector('input[name="domainOption"]:checked')?.value || 'pbi_subdomain';
  }

  function selectedDomainRegistration() {
    return projectData.domain_registration || null;
  }

  function priceLabel(domain) {
    const pricing = domain?.pricing || {};
    const registration = pricing.registration_cost || '';
    const currency = pricing.currency || 'GBP';
    return registration ? `${currency} ${registration} first-year registration, plus annual PBI domain management fee at checkout` : 'Price confirmed at checkout';
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    return data;
  }

  function parseProjectData(project) {
    try {
      return typeof project.data_json === 'string' ? JSON.parse(project.data_json || '{}') : (project.data_json || {});
    } catch {
      return {};
    }
  }

  function renderDomainSummary() {
    if (!selectedDomainSummary) return;
    const domain = selectedDomainRegistration();

    if (!domain?.name) {
      selectedDomainSummary.style.display = 'none';
      selectedDomainSummary.innerHTML = '';
      return;
    }

    selectedDomainSummary.style.display = 'block';
    selectedDomainSummary.innerHTML = `
      <div class="domain-selected-box">
        <div>
          <strong>Selected new domain:</strong> ${esc(domain.name)}
          <small>${esc(priceLabel(domain))}</small>
        </div>
        <a class="btn-ghost" href="/builder/?project=${encodeURIComponent(projectId || '')}">Change domain</a>
      </div>
    `;

    const registerRadio = document.querySelector('input[name="domainOption"][value="register_new"]');
    if (registerRadio && (projectData.domain_option === 'register_new' || domain.name)) registerRadio.checked = true;
  }

  async function loadProject() {
    if (!projectId) {
      showMessage('No project was passed to this page. Go back to your dashboard, open a project, then publish again.', 'error');
      return;
    }

    try {
      const data = await api(`/api/projects/get?id=${encodeURIComponent(projectId)}`);
      projectData = parseProjectData(data.project || {});
      renderDomainSummary();
    } catch (error) {
      console.warn('Could not load project domain data:', error);
      showMessage(error.message || 'Could not load this project. Try logging in again.', 'error');
    }
  }

  async function publishProject(plan = 'starter') {
    const data = await api('/api/projects/publish', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        plan,
        domain_option: selectedDomainOption()
      })
    });

    if (data.payment_required && data.payment_url) {
      window.location.href = data.payment_url;
      return;
    }

    if (data.published && data.live_url) {
      const liveUrl = data.live_url;
      showRichMessage(`
        <strong>Your website is live.</strong>
        <p>You can now view the customer-facing website or go back to the dashboard.</p>
        <div class="row" style="margin-top:12px">
          <a class="btn" href="${esc(liveUrl)}" target="_blank" rel="noopener">View live website</a>
          <a class="btn-ghost" href="/dashboard/">Back to dashboard</a>
        </div>
      `, 'success');
      return;
    }

    showMessage(data.message || 'Publish status is unclear. Check your dashboard.', 'info');
  }

  async function createCheckout(plan, button = null) {
    if (!projectId) {
      showMessage('No project selected. Go back to your dashboard and choose a project to publish.', 'error');
      return;
    }

    const domainOption = selectedDomainOption();
    const domainRegistration = selectedDomainRegistration();

    if (domainOption === 'register_new' && !domainRegistration?.name) {
      showMessage('Choose and save an available domain in the builder before selecting “Register a new domain”.', 'error');
      return;
    }

    setPlanButtons(true, button, 'Preparing...');
    showMessage('Preparing your plan...', 'info');

    try {
      const data = await api('/api/billing/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          plan,
          domain_option: domainOption,
          domain_registration: domainRegistration
        })
      });

      if (data.checkout_not_required || data.publish_without_payment) {
        showMessage(data.message || 'Payment is currently switched off. Publishing your website now...', 'info');
        setPlanButtons(true, button, 'Publishing...');
        await publishProject(plan);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.setup_required) {
        showRichMessage(`
          <strong>Stripe is not fully connected yet.</strong>
          <p>${esc(data.message || 'Add the missing Stripe settings, then try again.')}</p>
          <p class="small-note">For live payments, add STRIPE_SECRET_KEY as a Cloudflare Secret and add the relevant STRIPE_PRICE_STARTER / STRIPE_PRICE_BUSINESS / STRIPE_PRICE_PLUS price IDs in GitHub/wrangler.toml.</p>
        `, 'error');
        return;
      }

      showMessage('Checkout was created, but no redirect URL was returned.', 'error');
    } catch (error) {
      showMessage(error.message || 'Could not start checkout.', 'error');
    } finally {
      setPlanButtons(false);
    }
  }

  async function publishAfterPayment() {
    if (!projectId) return;
    showMessage('Checking payment and publishing your website...', 'info');

    try {
      await publishProject(projectData.plan || 'starter');
    } catch (error) {
      showMessage(error.message || 'Could not publish website.', 'error');
    }
  }

  document.querySelectorAll('.planBtn').forEach((button) => {
    button.addEventListener('click', () => createCheckout(button.dataset.plan, button));
  });

  document.querySelectorAll('input[name="domainOption"]').forEach((input) => {
    input.addEventListener('change', renderDomainSummary);
  });

  loadProject().then(() => {
    if (success) publishAfterPayment();
    if (cancelled) showMessage('Checkout was cancelled. Your website is still saved as a draft.', 'info');
  });
});
