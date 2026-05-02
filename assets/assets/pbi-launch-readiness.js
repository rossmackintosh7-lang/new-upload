
(() => {
  function $(id) { return document.getElementById(id); }

  function hasValue(id, min = 1) {
    return String($(id)?.value || "").trim().length >= min;
  }

  function checked(selector) {
    return Boolean(document.querySelector(selector + ":checked"));
  }

  function updateReadiness() {
    const checks = {
      business: hasValue("businessName", 2),
      heading: hasValue("pageMainHeading", 8),
      content: hasValue("pageBody", 25) || hasValue("subHeading", 25),
      contact: checked('.pageToggle[value="contact"]'),
      images: Boolean($("galleryThumbs")?.querySelector("img")) || Boolean($("logoUpload")?.files?.length) || Boolean($("backgroundUpload")?.files?.length),
      domain: hasValue("subdomainSlug", 2) || hasValue("customDomain", 4),
      retail: $("retailEnabled")?.value !== "true" || Boolean($("retailConnectedAccountView")?.value && $("retailConnectedAccountView").value !== "Not connected yet")
    };

    const keys = Object.keys(checks);
    const complete = keys.filter((key) => checks[key]).length;
    const score = Math.round((complete / keys.length) * 100);

    const scoreEl = $("pbiReadinessScore");
    const barEl = $("pbiReadinessBar");

    if (scoreEl) scoreEl.textContent = `${score}%`;
    if (barEl) barEl.style.width = `${score}%`;

    document.querySelectorAll("#pbiLaunchChecklist [data-check]").forEach((item) => {
      const key = item.dataset.check;
      item.classList.toggle("done", Boolean(checks[key]));
    });
  }

  document.addEventListener("input", updateReadiness, true);
  document.addEventListener("change", updateReadiness, true);
  document.addEventListener("DOMContentLoaded", updateReadiness);
  setTimeout(updateReadiness, 500);
})();
