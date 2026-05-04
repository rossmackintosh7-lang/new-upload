(() => {
  function qs(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function show(form, type, text) {
    const target = form.querySelector("[data-enquiry-message]");
    if (!target) return;
    target.style.display = "block";
    target.className = `notice ${type}`;
    target.textContent = text;
  }

  function normaliseType(value) {
    return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }

  async function submitForm(form) {
    const submit = form.querySelector("button[type='submit']");
    const originalText = submit?.textContent || "Send enquiry";
    const data = Object.fromEntries(new FormData(form).entries());

    data.type = data.type || qs("type") || "general";
    data.subject = data.subject || qs("subject") || normaliseType(data.type);
    data.pageUrl = window.location.href;
    data.turnstileToken = data["cf-turnstile-response"] || "";

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Sending...";
    }

    show(form, "info", "Sending your enquiry...");

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(data)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || `Request failed with ${response.status}`);

      form.reset();
      if (window.turnstile) window.turnstile.reset();
      show(form, "success", result.message || "Your enquiry has been sent.");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      if (window.turnstile) window.turnstile.reset();
      show(form, "error", err.message || "Could not send your enquiry. Please try again.");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = originalText;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-pbi-enquiry-form]").forEach((form) => {
      const type = qs("type");
      const subject = qs("subject");

      const typeField = form.querySelector("[name='type']");
      if (type && typeField) typeField.value = type;

      const subjectField = form.querySelector("[name='subject']");
      if (subject && subjectField) subjectField.value = subject;

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitForm(form);
      });
    });
  });
})();
