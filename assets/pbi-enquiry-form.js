(function(){
  const forms = Array.from(document.querySelectorAll('[data-pbi-enquiry-form]'));
  if (!forms.length) return;

  function showPopup(title, message) {
    let popup = document.getElementById('pbiEnquirySentPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'pbiEnquirySentPopup';
      popup.className = 'pbi-modal-backdrop pbi-enquiry-popup';
      popup.innerHTML = `
        <div class="pbi-modal-card" role="dialog" aria-modal="true" aria-labelledby="pbiEnquirySentTitle">
          <button class="pbi-modal-close" type="button" aria-label="Close">x</button>
          <p class="eyebrow">Enquiry sent</p>
          <h2 id="pbiEnquirySentTitle"></h2>
          <p data-popup-message></p>
          <a class="btn" href="/help/">View help guides</a>
        </div>
      `;
      document.body.appendChild(popup);
      popup.addEventListener('click', (event) => {
        if (event.target === popup || event.target.closest('.pbi-modal-close')) popup.hidden = true;
      });
    }
    popup.querySelector('#pbiEnquirySentTitle').textContent = title;
    popup.querySelector('[data-popup-message]').textContent = message;
    popup.hidden = false;
  }

  async function postEnquiry(payload) {
    const response = await fetch('/api/contact/enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `Request failed with ${response.status}`);
    return data;
  }

  forms.forEach((form) => {
    const message = form.querySelector('[data-enquiry-message]');
    const submit = form.querySelector('[type="submit"]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.page = location.pathname;
      if (submit) {
        submit.disabled = true;
        submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
        submit.textContent = 'Sending...';
      }
      if (message) {
        message.style.display = 'block';
        message.className = 'notice';
        message.textContent = 'Sending your enquiry to PBI...';
      }
      try {
        await postEnquiry(payload);
        form.reset();
        if (message) {
          message.className = 'notice domain-success';
          message.innerHTML = `<strong>Enquiry sent.</strong> PBI has received your message and will follow up.`;
        }
        showPopup('Thanks, your enquiry has been sent.', `PBI has received your message${payload.subject ? ` about "${payload.subject}"` : ''}.`);
      } catch (error) {
        if (message) {
          message.className = 'notice domain-error';
          message.textContent = error.message || 'Could not send the enquiry. Please try again.';
        }
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = submit.dataset.originalText || 'Send enquiry';
        }
      }
    });
  });
})();
