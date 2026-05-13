(function(){
  const form = document.getElementById('pbiOnboardingWizard');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('[data-step]'));
  const dots = Array.from(form.querySelectorAll('[data-step-dot]'));
  const back = document.getElementById('wizardBack');
  const next = document.getElementById('wizardNext');
  const start = document.getElementById('wizardStart');
  const recommendation = document.getElementById('wizardRecommendation');
  const summary = document.getElementById('wizardSummary');
  let index = 0;

  const typeMap = {
    cafe: { template: 'cafe', label: 'cafe, restaurant or food website', image: '/assets/demo-media/cafe-hero.jpg', accent: '#b86a3a', bg: '#fff6ee' },
    trades: { template: 'trades', label: 'local service website', image: '/assets/demo-media/trades-hero.jpg', accent: '#1d7a61', bg: '#eff8f3' },
    salon: { template: 'salon', label: 'salon and wellness website', image: '/assets/demo-media/salon-hero.jpg', accent: '#b56b82', bg: '#fff4f7' },
    consultant: { template: 'consultant', label: 'consultant or professional service website', image: '/assets/demo-media/consultant-hero.jpg', accent: '#215d7a', bg: '#f2f8fb' },
    shop: { template: 'shop', label: 'shop or product-led website', image: '/assets/demo-media/shop-hero.jpg', accent: '#e0aa1c', bg: '#fff9df' },
    'holiday-let': { template: 'holiday-let', label: 'holiday let or accommodation website', image: '/assets/demo-media/holiday-let-hero.jpg', accent: '#227d82', bg: '#eef9f8' }
  };

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function values() {
    const data = new FormData(form);
    return {
      businessName: String(data.get('businessName') || '').trim(),
      location: String(data.get('location') || '').trim(),
      businessType: String(data.get('businessType') || 'cafe'),
      offer: String(data.get('offer') || '').trim(),
      goals: data.getAll('goals'),
      tone: String(data.get('tone') || 'friendly'),
      assets: data.getAll('assets'),
      notes: String(data.get('notes') || '').trim()
    };
  }

  function activeType() {
    return typeMap[values().businessType] || typeMap.cafe;
  }

  function render() {
    steps.forEach((step, stepIndex) => step.classList.toggle('active', stepIndex === index));
    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex <= index));
    if (back) back.style.visibility = index === 0 ? 'hidden' : 'visible';
    if (next) next.style.display = index === steps.length - 1 ? 'none' : '';
    if (start) start.style.display = index === steps.length - 1 ? '' : 'none';
    if (index === steps.length - 1) renderRecommendation();
  }

  function renderRecommendation() {
    const v = values();
    const type = activeType();
    const business = v.businessName || 'your business';
    const goals = v.goals.length ? v.goals.join(', ') : 'enquiries';
    if (recommendation) {
      recommendation.innerHTML = `<strong>Recommended route:</strong> start with the ${esc(type.label)}, then PBI will prepare home, about, services, proof, FAQ and contact sections around ${esc(business)}.`;
    }
    if (summary) {
      summary.innerHTML = `
        <article><strong>Business</strong><span>${esc(business)}</span></article>
        <article><strong>Location</strong><span>${esc(v.location || 'Add in the builder')}</span></article>
        <article><strong>Main goal</strong><span>${esc(goals)}</span></article>
        <article><strong>Tone</strong><span>${esc(v.tone)}</span></article>
      `;
    }
  }

  function validateCurrentStep() {
    const fields = Array.from(steps[index].querySelectorAll('input, select, textarea'));
    return fields.every((field) => !field.required || field.reportValidity());
  }

  function titleCase(value) {
    return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()).trim();
  }

  function fallbackCanvas(v) {
    const type = activeType();
    const business = v.businessName || `${titleCase(v.businessType)} business`;
    const area = v.location ? ` in ${v.location}` : '';
    const offer = v.offer || 'clear services, useful information and a simple enquiry route';
    const heroTitle = `${business} made clear online`;
    const heroText = `${business} helps customers${area} understand ${offer} and take the next step with confidence.`;
    const pages = {
      home: { label: 'Home', title: heroTitle, body: heroText },
      about: { label: 'About', title: `About ${business}`, body: `Explain what ${business} does, who it helps and why customers can trust it.` },
      services: { label: 'Services', title: 'Services and offers', body: offer },
      gallery: { label: 'Proof', title: 'Proof and examples', body: 'Add images, testimonials, projects or useful examples that help customers feel sure.' },
      faq: { label: 'FAQ', title: 'Questions before getting started', body: 'Answer the questions customers usually ask before they enquire.' },
      contact: { label: 'Contact', title: 'Get in touch', body: 'Make the next step simple with one clear contact route.' }
    };
    return {
      project_name: `${business} website`,
      business_name: business,
      page_main_heading: heroTitle,
      sub_heading: heroText,
      templateId: type.template,
      template_preset: type.template,
      template: type.template,
      selected_pages: Object.keys(pages),
      selectedPages: Object.keys(pages),
      activePage: 'home',
      pages,
      heroImage: type.image,
      gallery_images: [type.image],
      accent_color: type.accent,
      background_color: type.bg,
      text_color: '#2f1b12',
      nav_color: '#ffffff',
      button_color: type.accent,
      button_text_color: '#ffffff',
      tagline: `${titleCase(v.businessType)} website`,
      servicesList: offer.split(/[,\n|]+/).map((item) => item.trim()).filter(Boolean).slice(0, 4),
      blocksByPage: {
        home: [
          { id: 'onboard-hero', type: 'hero', title: heroTitle, text: heroText, image: type.image, button: v.goals.includes('bookings') ? 'Book now' : 'Send enquiry', layout: 'split', animation: 'rise', positionMode: 'flow', publishable: true },
          { id: 'onboard-services', type: 'services', title: 'What customers can do next', text: offer, layout: 'cards', animation: 'rise', positionMode: 'flow', publishable: true },
          { id: 'onboard-proof', type: 'trustBand', title: 'Why customers can feel confident', text: 'Clear offer | Practical details | Easy contact route', layout: 'cards', animation: 'rise', positionMode: 'flow', publishable: true },
          { id: 'onboard-contact', type: 'contact', title: 'Ready to get started?', text: 'Use this section for phone, email, booking link or enquiry form details.', button: 'Contact', layout: 'spotlight', animation: 'rise', positionMode: 'flow', publishable: true }
        ],
        about: [{ id: 'onboard-about', type: 'featureGrid', title: `About ${business}`, text: pages.about.body, layout: 'cards', positionMode: 'flow', publishable: true }],
        services: [{ id: 'onboard-service-list', type: 'services', title: 'Services and offers', text: offer, layout: 'bento', positionMode: 'flow', publishable: true }],
        gallery: [{ id: 'onboard-gallery', type: 'gallery', title: 'Proof and examples', text: pages.gallery.body, image: type.image, layout: 'masonry', positionMode: 'flow', publishable: true }],
        faq: [{ id: 'onboard-faq', type: 'faq', title: 'Common questions', text: 'What do you offer? | Where do you work? | How do customers get started?', layout: 'checklist', positionMode: 'flow', publishable: true }],
        contact: [{ id: 'onboard-contact-page', type: 'contact', title: 'Get in touch', text: pages.contact.body, button: 'Send enquiry', layout: 'spotlight', positionMode: 'flow', publishable: true }]
      },
      seo: { title: `${business} | ${titleCase(v.businessType)}`, description: heroText.slice(0, 155), indexable: true }
    };
  }

  async function generateCanvas(v) {
    const fallback = fallbackCanvas(v);
    try {
      const response = await fetch('/api/ai/generate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, template: fallback.templateId, brief: `${v.businessName}. ${v.offer}. ${v.notes}` })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.canvas) return fallback;
      return { ...fallback, ...data.canvas, blocksByPage: data.canvas.blocksByPage || fallback.blocksByPage };
    } catch {
      return fallback;
    }
  }

  function showMagic() {
    let modal = document.getElementById('pbiMagicBuildModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pbiMagicBuildModal';
      modal.className = 'pbi-modal-backdrop pbi-magic-modal';
      modal.innerHTML = '<div class="pbi-modal-card"><p class="eyebrow">Building your starting point</p><h2>Wait while the magic happens.</h2><p data-magic-line>PBI is reading your answers and preparing a first website draft.</p><div class="pbi-magic-bar"><span></span></div></div>';
      document.body.appendChild(modal);
    }
    modal.hidden = false;
    const line = modal.querySelector('[data-magic-line]');
    const messages = [
      'Choosing the best template route.',
      'Preparing pages, sections and wording.',
      'Saving the draft into PBI Designer.'
    ];
    messages.forEach((message, messageIndex) => setTimeout(() => { if (line) line.textContent = message; }, 650 * (messageIndex + 1)));
  }

  back?.addEventListener('click', () => { index = Math.max(0, index - 1); render(); });
  next?.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    index = Math.min(steps.length - 1, index + 1);
    render();
  });
  form.addEventListener('input', () => { if (index === steps.length - 1) renderRecommendation(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    const v = values();
    showMagic();
    const canvas = await generateCanvas(v);
    const type = activeType();
    const projectId = `local-${Date.now()}`;
    const state = {
      ...canvas,
      project_id: projectId,
      id: projectId,
      plan: 'starter',
      package: 'starter',
      templateId: canvas.templateId || type.template,
      template_preset: canvas.template_preset || type.template,
      activePage: 'home',
      domain_option: 'pbi_subdomain',
      onboarding_brief: v,
      analytics: { enabled: true, events: [] },
      cmsItems: [],
      leadForms: []
    };
    localStorage.setItem('pbi_canvas_state', JSON.stringify(state));
    localStorage.setItem('pbi_active_project_id', projectId);
    localStorage.setItem('pbi_selected_template', state.templateId);
    localStorage.setItem('pbi_plan', 'starter');
    setTimeout(() => {
      location.href = `/canvas-builder/?project=${encodeURIComponent(projectId)}&preset=${encodeURIComponent(state.templateId)}&template=${encodeURIComponent(state.templateId)}&plan=starter&from=onboarding`;
    }, 1900);
  });

  render();
})();
