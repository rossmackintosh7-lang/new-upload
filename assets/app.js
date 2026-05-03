const templates = {
  food: {
    name: "Food & Hospitality",
    description: "Menus, produce, bookings, gallery and warm local wording.",
    accent: "#f97316",
    businessName: "Purbeck Pantry Co.",
    tagline: "Local food, fresh ideas and friendly service.",
    town: "Swanage & Dorset",
    headline: "Fresh local flavour, served with proper care.",
    cta: "Book or enquire",
    services: ["Seasonal menus", "Event catering", "Local produce boxes"],
    pages: {
      home: { title: "Welcome", body: "We bring together local ingredients, friendly service and a simple way for customers to discover what you offer." },
      services: { title: "Food, events and local produce", body: "Showcase menus, catering, specials, produce boxes, events and any regular offers customers can order or book." },
      about: { title: "A local business with a proper story", body: "Tell customers who you are, where you started and why your food or hospitality experience matters." },
      contact: { title: "Book, order or ask a question", body: "Give customers a clear route to contact you, make an enquiry, find your opening times or visit your location." }
    }
  },
  trade: {
    name: "Trades & Services",
    description: "Clear service areas, quote requests and trust-building sections.",
    accent: "#2f6f95",
    businessName: "Purbeck Property Care",
    tagline: "Reliable local work for homes and businesses.",
    town: "Dorset & surrounding areas",
    headline: "Straightforward services, clear quotes and reliable results.",
    cta: "Request a quote",
    services: ["Repairs & maintenance", "Emergency call-outs", "Planned work"],
    pages: {
      home: { title: "Reliable local help", body: "Give visitors a clear first impression, show what you do and make it easy to ask for a quote." },
      services: { title: "Services built around your customers", body: "List core services, explain what is included and make the next step simple for mobile visitors." },
      about: { title: "Trust, experience and practical standards", body: "Use this page to explain your experience, insurance, approach and the areas you cover." },
      contact: { title: "Get a quote", body: "Make enquiries easy with phone, email and service-area details visible without hunting around." }
    }
  },
  professional: {
    name: "Professional Support",
    description: "Consultancy, operations, admin, coaching and clean credibility.",
    accent: "#0f6b4b",
    businessName: "Mackintosh Operations",
    tagline: "Systems, strategy and practical business support.",
    town: "UK-wide support",
    headline: "Sharper systems for businesses that want to move properly.",
    cta: "Arrange a call",
    services: ["Operations review", "Process setup", "Training & support"],
    pages: {
      home: { title: "Practical support for growing businesses", body: "Position your offer clearly, show credibility and guide visitors towards a call or enquiry." },
      services: { title: "Support that turns busy into structured", body: "Break down consulting, audits, systems, training, setup work and ongoing support in plain English." },
      about: { title: "Experience-led and hands-on", body: "Explain your background, results and working style so prospects understand why you can help." },
      contact: { title: "Start the conversation", body: "Use this page to capture enquiries and explain what happens after someone gets in touch." }
    }
  },
  wellness: {
    name: "Wellness & Personal",
    description: "Friendly pages for therapists, coaches, salons and wellbeing.",
    accent: "#a855f7",
    businessName: "Shoreline Wellness",
    tagline: "Calm, practical support for everyday wellbeing.",
    town: "Purbeck & online",
    headline: "A calmer way for clients to find and trust you.",
    cta: "Make an enquiry",
    services: ["One-to-one sessions", "Group workshops", "Online support"],
    pages: {
      home: { title: "A welcoming first step", body: "Create a warm introduction that explains who you help and what clients can expect." },
      services: { title: "Support options", body: "Make your sessions, packages and booking route clear without overwhelming new visitors." },
      about: { title: "Your approach", body: "Share your background, values and way of working so clients feel comfortable getting in touch." },
      contact: { title: "Ask a question", body: "Give visitors a gentle, simple way to ask about availability, pricing or suitability." }
    }
  }
};

const packages = {
  starter: {
    name: "Starter Site",
    price: "£249",
    suffix: "one-off",
    badge: "Lean launch",
    summary: "For a simple online presence that looks professional and gives customers the essentials.",
    features: [
      "One-page mobile-friendly website",
      "AI-assisted wording starter",
      "Contact section and clear call-to-action",
      "Basic local SEO setup",
      "Launch checklist included"
    ],
    checkoutLabel: "Choose Starter"
  },
  business: {
    name: "Business Site",
    price: "£499",
    suffix: "one-off",
    badge: "Most useful",
    summary: "For businesses that need proper pages, stronger structure and a cleaner customer journey.",
    features: [
      "Up to five core pages",
      "Logo and image placement support",
      "Services, about and contact pages",
      "Local SEO foundations",
      "Editable structure for future changes"
    ],
    checkoutLabel: "Choose Business",
    featured: true
  },
  growth: {
    name: "Growth Site",
    price: "£899",
    suffix: "one-off",
    badge: "For scaling",
    summary: "For businesses that want more content, better conversion sections and stronger search foundations.",
    features: [
      "Up to eight pages",
      "Advanced homepage and service sections",
      "SEO page structure and metadata plan",
      "Gallery, reviews and trust sections",
      "Post-launch improvement guidance"
    ],
    checkoutLabel: "Choose Growth"
  },
  assisted: {
    name: "Assisted Setup Launch Offer",
    price: "£149",
    suffix: "launch offer",
    badge: "Setup help",
    summary: "For customers who want PBI to help shape the first version instead of doing everything alone.",
    features: [
      "Guided setup session",
      "Template choice and first edit support",
      "Logo, hero and gallery setup help",
      "Initial SEO and wording pass",
      "Best next-step recommendation"
    ],
    checkoutLabel: "Choose Assisted Setup"
  },
  domain: {
    name: "Domain Management Yearly",
    price: "£99",
    suffix: "per year",
    badge: "Add-on",
    summary: "For customers who want help keeping domain, DNS and website connection tidy after launch.",
    features: [
      "Domain connection support",
      "DNS record management guidance",
      "Renewal and setup reminders",
      "Email routing signposting",
      "Cloudflare connection support"
    ],
    checkoutLabel: "Choose Domain Management"
  }
};

const state = {
  template: "food",
  package: "business",
  currentPage: "home",
  logoData: null,
  heroData: null,
  galleryData: [],
  pages: JSON.parse(JSON.stringify(templates.food.pages))
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function init() {
  $("#year").textContent = new Date().getFullYear();
  renderTemplates();
  renderPricing();
  bindNavigation();
  bindPanels();
  bindInputs();
  applyTemplate("food");
  updatePackageMini();
  updatePreview();
}

function renderTemplates() {
  const grid = $("#templateGrid");
  grid.innerHTML = Object.entries(templates).map(([key, template]) => `
    <button type="button" class="template-card ${key === state.template ? "active" : ""}" data-template="${key}">
      <span class="template-swatch" style="background: linear-gradient(135deg, ${template.accent}, #0f6b4b)"></span>
      <span>
        <strong>${template.name}</strong>
        <small>${template.description}</small>
      </span>
    </button>
  `).join("");

  $$(".template-card").forEach(button => {
    button.addEventListener("click", () => applyTemplate(button.dataset.template));
  });
}

function renderPricing() {
  const grid = $("#pricingGrid");
  grid.innerHTML = Object.entries(packages).map(([key, item]) => `
    <article class="price-card ${item.featured ? "featured" : ""}" id="price-${key}">
      <span class="badge">${item.badge}</span>
      <h3>${item.name}</h3>
      <div class="price">${item.price} <small>${item.suffix}</small></div>
      <p>${item.summary}</p>
      <ul>
        ${item.features.map(feature => `<li>${feature}</li>`).join("")}
      </ul>
      <div class="price-actions">
        <button class="checkout-button" type="button" data-checkout="${key}">${item.checkoutLabel}</button>
        <a class="select-builder-button" href="#builder" data-package-shortcut="${key}">Use in builder</a>
      </div>
    </article>
  `).join("");

  $$("[data-package-shortcut]").forEach(link => {
    link.addEventListener("click", () => {
      state.package = link.dataset.packageShortcut;
      $("#packageSelect").value = state.package;
      updatePackageMini();
      updatePreviewStatus();
    });
  });

  $$("[data-checkout]").forEach(button => {
    button.addEventListener("click", () => startCheckout(button.dataset.checkout));
  });
}

function bindNavigation() {
  $(".nav-toggle").addEventListener("click", () => {
    const nav = $("#site-nav");
    const open = nav.classList.toggle("open");
    $(".nav-toggle").setAttribute("aria-expanded", String(open));
  });

  $$(".site-nav a").forEach(link => {
    link.addEventListener("click", () => $("#site-nav").classList.remove("open"));
  });

  $$("[data-template-shortcut]").forEach(link => {
    link.addEventListener("click", () => applyTemplate(link.dataset.templateShortcut));
  });

  $$("[data-preview-nav]").forEach(link => {
    link.addEventListener("click", event => {
      const page = link.dataset.previewNav;
      setCurrentPage(page);
      event.preventDefault();
      $("#previewPageContent").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  $$(".device").forEach(button => {
    button.addEventListener("click", () => {
      $$(".device").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      $("#livePreview").classList.toggle("mobile", button.dataset.device === "mobile");
      $("#livePreview").classList.toggle("desktop", button.dataset.device === "desktop");
    });
  });
}

function bindPanels() {
  $$(".panel-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
      toggle.closest(".builder-panel").classList.toggle("open");
    });
  });

  $$(".step-pill").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.stepTarget;
      $$(".step-pill").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      $$(".builder-panel").forEach(panel => panel.classList.remove("open"));
      $(`#panel-${target}`).classList.add("open");
      $(`#panel-${target}`).scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  $$(".tab").forEach(button => {
    button.addEventListener("click", () => setCurrentPage(button.dataset.page));
  });
}

function bindInputs() {
  const liveFields = [
    "businessName",
    "businessTagline",
    "businessTown",
    "businessEmail",
    "businessPhone",
    "brandColour",
    "heroHeadline",
    "ctaText",
    "seoTitle",
    "seoDescription",
    "serviceList"
  ];

  liveFields.forEach(id => {
    $(`#${id}`).addEventListener("input", updatePreview);
  });

  $("#pageTitle").addEventListener("input", () => {
    state.pages[state.currentPage].title = $("#pageTitle").value;
    updatePreview();
  });

  $("#pageBody").addEventListener("input", () => {
    state.pages[state.currentPage].body = $("#pageBody").value;
    updatePreview();
  });

  $("#packageSelect").addEventListener("change", event => {
    state.package = event.target.value;
    updatePackageMini();
    updatePreviewStatus();
    highlightPriceCard();
  });

  $("#logoUpload").addEventListener("change", event => readSingleImage(event, data => {
    state.logoData = data;
    updatePreview();
  }));

  $("#heroUpload").addEventListener("change", event => readSingleImage(event, data => {
    state.heroData = data;
    updatePreview();
  }));

  $("#galleryUpload").addEventListener("change", event => readMultipleImages(event, dataList => {
    state.galleryData = dataList.slice(0, 6);
    updatePreview();
  }));
}

function applyTemplate(key) {
  const template = templates[key];
  if (!template) return;

  state.template = key;
  state.pages = JSON.parse(JSON.stringify(template.pages));
  $("#businessName").value = template.businessName;
  $("#businessTagline").value = template.tagline;
  $("#businessTown").value = template.town;
  $("#brandColour").value = template.accent;
  $("#heroHeadline").value = template.headline;
  $("#ctaText").value = template.cta;
  $("#serviceList").value = template.services.join("\n");

  setCurrentPage("home", false);
  renderTemplates();
  openPanel("details");
  updatePreview();
  showToast(`${template.name} style loaded into the live preview.`);
}

function openPanel(name) {
  $$(".builder-panel").forEach(panel => panel.classList.remove("open"));
  $(`#panel-${name}`).classList.add("open");
  $$(".step-pill").forEach(button => button.classList.toggle("active", button.dataset.stepTarget === name));
}

function setCurrentPage(page, shouldUpdate = true) {
  state.currentPage = page;
  $$(".tab").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  $("#pageTitle").value = state.pages[page]?.title || "";
  $("#pageBody").value = state.pages[page]?.body || "";
  if (shouldUpdate) updatePreview();
}

function updatePreview() {
  const accent = $("#brandColour").value || templates[state.template].accent;
  document.documentElement.style.setProperty("--preview-accent", accent);

  $("#previewName").textContent = $("#businessName").value || "Your business";
  $("#previewTagline").textContent = $("#businessTagline").value || "Your short business tagline.";
  $("#previewTown").textContent = $("#businessTown").value || "Your service area";
  $("#previewEmail").textContent = $("#businessEmail").value || "hello@example.co.uk";
  $("#previewPhone").textContent = $("#businessPhone").value || "01929 000000";
  $("#previewHeadline").textContent = $("#heroHeadline").value || "A better website for a better local business.";
  $("#previewCta").textContent = $("#ctaText").value || "Ask for a quote";
  $("#previewPageTitle").textContent = state.pages[state.currentPage]?.title || "Page title";
  $("#previewPageBody").textContent = state.pages[state.currentPage]?.body || "Page wording will appear here.";

  $("#previewLogo").src = state.logoData || "assets/pbi-logo.svg";

  const hero = $("#previewHeroImage");
  if (state.heroData) {
    hero.classList.add("has-image");
    hero.style.backgroundImage = `url(${state.heroData})`;
  } else {
    hero.classList.remove("has-image");
    hero.style.backgroundImage = "";
  }

  updateServices();
  updateGallery();
  updateMeta();
  updateReadiness();
  updatePreviewStatus();
}

function updateServices() {
  const services = ($("#serviceList").value || "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 6);

  $("#previewServices").innerHTML = services.map((service, index) => `
    <article>
      <strong>${service}</strong>
      <small>${index === 0 ? "Clear, useful and easy to understand." : "A simple section customers can act on."}</small>
    </article>
  `).join("");
}

function updateGallery() {
  const gallery = $("#previewGallery");
  if (state.galleryData.length) {
    gallery.innerHTML = state.galleryData.map(data => `<div style="background-image:url('${data}')"></div>`).join("");
  } else {
    gallery.innerHTML = "<div></div><div></div><div></div>";
  }
}

function updateMeta() {
  document.title = $("#seoTitle").value || "PBI Website Preview";
  let desc = document.querySelector("meta[name='description']");
  desc.setAttribute("content", $("#seoDescription").value || "A friendly, professional website for a growing local business.");
}

function updatePackageMini() {
  const item = packages[state.package];
  $("#packageMini").innerHTML = `
    <strong>${item.name} · ${item.price}</strong>
    <p>${item.summary}</p>
  `;
  updatePreviewStatus();
}

function updatePreviewStatus() {
  const item = packages[state.package];
  $("#previewStatus").textContent = `${item.name} selected`;
}

function highlightPriceCard() {
  $$(".price-card").forEach(card => card.classList.remove("selected"));
  const card = $(`#price-${state.package}`);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function updateReadiness() {
  let score = 48;
  if ($("#businessName").value.trim()) score += 8;
  if ($("#businessTagline").value.trim()) score += 6;
  if ($("#businessEmail").value.trim()) score += 6;
  if ($("#businessPhone").value.trim()) score += 4;
  if ($("#heroHeadline").value.trim()) score += 6;
  if ($("#serviceList").value.split("\n").filter(Boolean).length >= 3) score += 8;
  if (state.logoData) score += 7;
  if (state.heroData) score += 7;
  if (state.galleryData.length) score += 5;
  score = Math.min(score, 100);
  $("#readinessText").textContent = `${score}% ready to launch`;
  $("#readinessBar").style.width = `${score}%`;
}

function readSingleImage(event, callback) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

function readMultipleImages(event, callback) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  Promise.all(files.map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  }))).then(callback);
}

async function startCheckout(plan) {
  const item = packages[plan];
  showToast(`Checking out: ${item.name}. Stripe is ready to wire in via /api/checkout.`);

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Checkout endpoint not configured yet.");
    }

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    showToast("Stripe checkout is not connected yet. Add Stripe env vars in Cloudflare, then these buttons will redirect to payment.");
  }
}

function showToast(message) {
  const existing = $(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

init();
