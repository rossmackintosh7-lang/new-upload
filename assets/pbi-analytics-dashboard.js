
(() => {
  const root = document.getElementById("pbiAnalyticsLiveSummary");
  if (!root) return;

  function bar(label, count, max) {
    const width = max ? Math.max(4, Math.round((count / max) * 100)) : 4;
    return `<div class="pbi-chart-row"><span>${label}</span><strong>${count}</strong><i style="width:${width}%"></i></div>`;
  }

  async function load() {
    try {
      const response = await fetch("/api/analytics/summary", { credentials: "include" });
      const data = await response.json();
      const types = data.by_type || [];
      const pages = data.top_pages || [];
      const maxType = Math.max(1, ...types.map((x) => Number(x.count || 0)));
      const maxPage = Math.max(1, ...pages.map((x) => Number(x.count || 0)));

      root.innerHTML = `
        <div class="card readable-card"><h2>Events by type</h2>${types.length ? types.map((x) => bar(x.event_type || "event", Number(x.count || 0), maxType)).join("") : "<p>No analytics events yet.</p>"}</div>
        <div class="card readable-card"><h2>Top pages</h2>${pages.length ? pages.map((x) => bar(x.page_path || "/", Number(x.count || 0), maxPage)).join("") : "<p>No page views yet.</p>"}</div>
      `;
    } catch (_) {
      root.innerHTML = `<div class="card readable-card"><h2>Analytics waiting for data</h2><p>Once the site is live and traffic arrives, this panel can show visits, top pages and conversion signals.</p></div>`;
    }
  }

  load();
})();
