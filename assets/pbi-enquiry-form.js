(function(){
  const forms = Array.from(document.querySelectorAll('[data-pbi-enquiry-form]'));
  if (!forms.length) return;

  function showPopup(title, message) {
    let popup = document.getElementById('pbiEnquirySentPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'pbiEnquirySentPopup';
      popup.className = 'pbi-modal-backdrop pbi-enquiry-popup';
      const card = document.createElement('div');
      card.className = 'pbi-modal-card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      card.setAttribute('aria-labelledby', 'pbiEnquirySentTitle');

      const close = document.createElement('button');
      close.className = 'pbi-modal-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Close');
      close.textContent = 'x';

      const eyebrow = document.createElement('p');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = 'Enquiry sent';

      const heading = document.createElement('h2');
      heading.id = 'pbiEnquirySentTitle';

      const copy = document.createElement('p');
      copy.dataset.popupMessage = '';

      const guide = document.createElement('a');
      guide.className = 'btn';
      guide.href = '/help/';
      guide.textContent = 'View help guides';

      card.append(close, eyebrow, heading, copy, guide);
      popup.appendChild(card);
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
          message.textContent = 'Enquiry sent. PBI has received your message and will follow up.';
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
