document.addEventListener('DOMContentLoaded', () => {
  function removeOldDomainRegistrationBlock() {
    document.querySelectorAll('section, article, div.card').forEach((block) => {
      const heading = block.querySelector('h1, h2, h3, h4');

      if (!heading) return;

      const headingText = heading.textContent.trim().toLowerCase();

      if (headingText === 'domain registration') {
        block.remove();
      }
    });
  }

  removeOldDomainRegistrationBlock();

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('project');
  const success = params.get('success') === '1';
  const cancelled = params.get('cancelled') === '1';

  const message = document.getElementById('paymentMessage');
  const assistedSetup = document.getElementById('assistedSetup');

  const customBuildRequestBtn = document.getElementById('customBuildRequestBtn');
  const customBuildFormSection = document.getElementById('customBuildFormSection');
  const customBuildForm = document.getElementById('customBuildForm');
  const customBuildSubmitBtn = document.getElementById('customBuildSubmitBtn');
  const customBuildCancelBtn = document.getElementById('customBuildCancelBtn');
  const customBuildDepositSection = document.getElementById('customBuildDepositSection');

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
    const response = await fetch(path, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    }

    return data;
  }

  function formToObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  async function createCheckout(plan) {
    if (!projectId) {
      showMessage('No project selected. Go back to your dashboard and choose a project to publish.', 'error');
      return;
    }

    showMessage('Preparing checkout...', 'info');

    try {
      const data = await api('/api/billing/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          plan,
          domain_option: selectedDomainOption(),
          assisted_setup: Boolean(assistedSetup?.checked)
        })
      });

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.setup_required) {
        showMessage(
          data.message || 'Stripe is not connected yet. Add Stripe environment variables to enable live checkout.',
          'info'
        );
        return;
      }

      showMessage('Checkout was created, but no redirect URL was returned.', 'error');
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Could not start checkout.', 'error');
    }
  }

  async function publishAfterPayment() {
    if (!projectId) return;

    showMessage('Checking payment and publishing your website...', 'info');

    try {
      const data = await api('/api/projects/publish', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          domain_option: selectedDomainOption()
        })
      });

      if (data.published) {
        showMessage(`Your website is live: ${data.live_url}`, 'success');
        return;
      }

      if (data.payment_required) {
        showMessage(
          'Payment is not active yet. If you have just paid, wait a few seconds and refresh this page.',
          'info'
        );
        return;
      }

      showMessage(data.message || 'Publish status is unclear.', 'info');
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Could not publish website.', 'error');
    }
  }

  async function submitCustomBuildForm(event) {
    event.preventDefault();

    if (!projectId) {
      showMessage('No project selected. Go back to your dashboard and choose a project first.', 'error');
      return;
    }

    if (!customBuildForm) return;

    const payload = formToObject(customBuildForm);
    payload.project_id = projectId;
    payload.domain_option = selectedDomainOption();

    if (customBuildSubmitBtn) {
      customBuildSubmitBtn.disabled = true;
      customBuildSubmitBtn.textContent = 'Submitting...';
    }

    showMessage('Submitting your custom build request...', 'info');

    try {
      await api('/api/custom-build/enquiry', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showMessage(
        'Your custom build request has been received. You can now pay the £500 deposit to secure the project slot.',
        'success'
      );

      if (customBuildFormSection) {
        customBuildFormSection.style.display = 'none';
      }

      if (customBuildDepositSection) {
        customBuildDepositSection.style.display = 'block';
        customBuildDepositSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Could not submit custom build request.', 'error');
    } finally {
      if (customBuildSubmitBtn) {
        customBuildSubmitBtn.disabled = false;
        customBuildSubmitBtn.textContent = 'Submit Custom Build Request';
      }
    }
  }

  document.querySelectorAll('.planBtn').forEach((button) => {
    button.addEventListener('click', () => {
      createCheckout(button.dataset.plan);
    });
  });

  if (customBuildRequestBtn) {
    customBuildRequestBtn.addEventListener('click', () => {
      if (customBuildFormSection) {
        customBuildFormSection.style.display = 'block';
        customBuildFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (customBuildCancelBtn) {
    customBuildCancelBtn.addEventListener('click', () => {
      if (customBuildFormSection) {
        customBuildFormSection.style.display = 'none';
      }
    });
  }

  if (customBuildForm) {
    customBuildForm.addEventListener('submit', submitCustomBuildForm);
  }

  if (success) {
    publishAfterPayment();
  }

  if (cancelled) {
    showMessage('Checkout was cancelled. Your website is still saved as a draft.', 'info');
  }
});
