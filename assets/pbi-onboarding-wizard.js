
(() => {
  const form = document.getElementById("pbiOnboardingWizard");
  if (!form) return;

  let step = 1;
  const maxStep = 4;
  const templateLabels = {
    "cafe": "Café / Restaurant",
    "trades": "Tradesperson",
    "salon": "Salon / Beauty",
    "consultant": "Consultant / Service Business",
    "shop": "Shop / Retail",
    "holiday-let": "Holiday Let / Glamping"
  };

  function values(name) {
    return [...form.querySelectorAll(`[name="${name}"]:checked`)].map((el) => el.value);
  }

  function data() {
    const fd = new FormData(form);
    return {
      businessName: String(fd.get("businessName") || "").trim(),
      location: String(fd.get("location") || "").trim(),
      businessType: String(fd.get("businessType") || "consultant"),
      offer: String(fd.get("offer") || "").trim(),
      goals: values("goals"),
      tone: String(fd.get("tone") || "friendly"),
      assets: values("assets"),
      notes: String(fd.get("notes") || "").trim()
    };
  }

  function update() {
    form.querySelectorAll(".pbi-wizard-step").forEach((el) => el.classList.toggle("active", Number(el.dataset.step) === step));
    form.querySelectorAll("[data-step-dot]").forEach((el) => el.classList.toggle("active", Number(el.dataset.stepDot) <= step));

    document.getElementById("wizardBack").style.display = step === 1 ? "none" : "";
    document.getElementById("wizardNext").style.display = step === maxStep ? "none" : "";
    document.getElementById("wizardStart").style.display = step === maxStep ? "" : "none";

    if (step === maxStep) renderRecommendation();
  }

  function renderRecommendation() {
    const d = data();
    const template = d.businessType || "consultant";
    const label = templateLabels[template] || "Consultant / Service Business";
    const goals = d.goals.length ? d.goals.join(", ") : "enquiries";
    const assets = d.assets.length ? d.assets.join(", ") : "not supplied yet";

    document.getElementById("wizardRecommendation").innerHTML = `
      <strong>Recommended template:</strong> ${label}<br>
      <span>Suggested route: ${d.goals.includes("products") || template === "shop" ? "Retail starter with Stripe setup" : "Enquiry-led website with SEO support"}</span>
    `;

    document.getElementById("wizardSummary").innerHTML = `
      <div><strong>Business:</strong><span>${escapeHtml(d.businessName || "Unnamed project")}</span></div>
      <div><strong>Location:</strong><span>${escapeHtml(d.location || "Not added")}</span></div>
      <div><strong>Offer:</strong><span>${escapeHtml(d.offer || "Add this in the builder")}</span></div>
      <div><strong>Goals:</strong><span>${escapeHtml(goals)}</span></div>
      <div><strong>Assets:</strong><span>${escapeHtml(assets)}</span></div>
    `;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  document.getElementById("wizardBack").addEventListener("click", () => {
    step = Math.max(1, step - 1);
    update();
  });

  document.getElementById("wizardNext").addEventListener("click", () => {
    step = Math.min(maxStep, step + 1);
    update();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const d = data();
    const template = d.businessType || "consultant";
    const params = new URLSearchParams({
      template_preset: template,
      onboarding: "1",
      business_name: d.businessName,
      location: d.location,
      offer: d.offer,
      goals: d.goals.join(","),
      tone: d.tone,
      notes: d.notes
    });

    // If already logged in, try to create the project directly. If not, go to signup with the setup attached.
    try {
      const me = await fetch("/api/auth/me", { credentials: "include" }).then((r) => r.ok ? r.json() : null).catch(() => null);
      if (me?.user) {
        const response = await fetch("/api/projects/create", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: d.businessName || `${templateLabels[template] || "PBI"} website`,
            template_preset: template,
            onboarding_brief: d
          })
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.project?.id) {
          window.location.href = `/builder/?project=${encodeURIComponent(result.project.id)}&preset=${encodeURIComponent(template)}&onboarding=1`;
          return;
        }
      }
    } catch (_) {}

    window.location.href = `/signup/?${params.toString()}`;
  });

  update();
})();
