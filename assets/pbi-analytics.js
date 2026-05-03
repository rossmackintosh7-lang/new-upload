
(() => {
  const payload = {
    eventType: "page_view",
    pagePath: window.location.pathname,
    referrer: document.referrer || "",
    siteSlug: window.location.hostname
  };

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    } catch (_) {}
  }

  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
})();
