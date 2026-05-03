(() => {
  const ADMIN_EMAILS = [
    "rossmackintosh7@icloud.com",
    "info@purbeckbusinessinnovations.co.uk"
  ];

  const retailWords = ["retail", "shop", "boutique", "products", "basket", "ecommerce", "e-commerce"];

  function lower(value) {
    return String(value || "").trim().toLowerCase();
  }

  function containsRetail(value) {
    const text = lower(value);
    return retailWords.some((word) => text.includes(word));
  }

  function isRetailProject(project) {
    if (!project || typeof project !== "object") return false;

    if (project.retail_enabled || project.has_retail || project.shop_enabled) return true;

    const simpleFields = [
      project.template,
      project.template_slug,
      project.preset,
      project.type,
      project.business_type,
      project.industry,
      project.name,
      project.title
    ];

    if (simpleFields.some(containsRetail)) return true;

    const features = Array.isArray(project.features) ? project.features : [];
    if (features.some(containsRetail)) return true;

    const pages = Array.isArray(project.pages) ? project.pages : [];
    return pages.some((page) => {
      if (typeof page === "string") return containsRetail(page);
      return containsRetail(page?.type) || containsRetail(page?.name) || containsRetail(page?.title);
    });
  }

  function getStoredProjects() {
    const projects = [];
    for (const key of Object.keys(localStorage)) {
      if (!/pbi|project|builder/i.test(key)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(value)) projects.push(...value.filter(Boolean));
        else if (value && typeof value === "object") {
          if (Array.isArray(value.projects)) projects.push(...value.projects);
          else projects.push(value);
        }
      } catch (_) {}
    }
    return projects;
  }

  async function fetchJson(endpoint) {
    try {
      const response = await fetch(endpoint, { credentials: "same-origin" });
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  async function fetchProjects() {
    const endpoints = ["/api/projects", "/api/dashboard/projects"];
    for (const endpoint of endpoints) {
      const data = await fetchJson(endpoint);
      if (!data) continue;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.projects)) return data.projects;
      if (Array.isArray(data.items)) return data.items;
    }
    return [];
  }

  function findRetailNavItems() {
    const items = new Set();

    document.querySelectorAll("[data-retail-orders-nav], .retail-orders-nav-item").forEach((el) => items.add(el));

    document.querySelectorAll("a, button, li, .sidebar-link, .nav-link").forEach((el) => {
      const text = lower(el.textContent);
      const href = lower(el.getAttribute("href"));
      if (text.includes("retail orders") || href.includes("retail-orders")) {
        items.add(el.closest("li, .nav-item, .sidebar-link, a, button") || el);
      }
    });

    return [...items];
  }

  function setVisible(visible) {
    findRetailNavItems().forEach((item) => {
      item.style.display = visible ? "" : "none";
      item.setAttribute("aria-hidden", visible ? "false" : "true");
    });

    document.documentElement.classList.toggle("retail-orders-visible", visible);
    document.documentElement.classList.toggle("retail-orders-hidden", !visible);
  }

  async function init() {
    setVisible(false);

    const session = await fetchJson("/api/auth/session");
    const email = lower(session?.user?.email || session?.email || window.PBI_USER_EMAIL || "");
    if (ADMIN_EMAILS.includes(email)) {
      setVisible(true);
      return;
    }

    const url = new URL(window.location.href);
    const preset = `${url.searchParams.get("preset") || ""} ${url.searchParams.get("template") || ""}`;
    if (containsRetail(preset)) {
      setVisible(true);
      return;
    }

    const projects = [...getStoredProjects(), ...(await fetchProjects())];
    setVisible(projects.some(isRetailProject));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
