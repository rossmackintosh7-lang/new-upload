export const PACKAGE_LIMITS = {
  starter: {
    maxPages: 5,
    freeform: false,
    cms: false,
    collab: false,
    customCode: false,
    ecommerce: false,
    animations: ['none', 'fade', 'rise'],
    allowedTypes: ['navBar','hero','splitHero','services','process','stats','featureGrid','gallery','testimonial','faq','map','booking','contact','cta','spacer','trustBand']
  },
  business: {
    maxPages: 12,
    freeform: true,
    cms: false,
    collab: false,
    customCode: false,
    ecommerce: true,
    animations: ['none','fade','rise','scale','slide','float','reveal','stagger'],
    allowedTypes: ['navBar','hero','splitHero','services','process','stats','featureGrid','gallery','testimonial','faq','map','booking','contact','cta','spacer','trustBand','floatingCard','logoCloud','pricing','productGrid','retail']
  },
  plus: {
    maxPages: 40,
    freeform: true,
    cms: true,
    collab: true,
    customCode: true,
    ecommerce: true,
    animations: ['none','fade','rise','scale','slide','float','reveal','parallax','stagger','marquee'],
    allowedTypes: ['navBar','hero','splitHero','services','process','stats','featureGrid','gallery','testimonial','faq','map','booking','contact','cta','spacer','trustBand','floatingCard','logoCloud','pricing','productGrid','retail','cmsList','customCode','localizedSection','analyticsPanel','automationFlow']
  }
};

export function cleanPlan(value = 'starter') {
  const plan = String(value || 'starter').trim().toLowerCase();
  if (plan === 'pro') return 'plus';
  return ['starter', 'business', 'plus'].includes(plan) ? plan : 'starter';
}

export function parseData(data) {
  if (!data) return {};
  if (typeof data === 'string') {
    try { return JSON.parse(data || '{}'); } catch { return {}; }
  }
  return data;
}

export function blockAllowed(block, plan) {
  const limit = PACKAGE_LIMITS[cleanPlan(plan)] || PACKAGE_LIMITS.starter;
  return limit.allowedTypes.includes(block?.type || 'hero');
}

export function enforceProjectPackage(input, planValue) {
  const data = parseData(input);
  const plan = cleanPlan(planValue || data.plan || data.package || 'starter');
  const limit = PACKAGE_LIMITS[plan] || PACKAGE_LIMITS.starter;
  const out = JSON.parse(JSON.stringify(data));
  const audit = [];
  const warnings = [];

  out.plan = plan;
  out.package = plan;

  const pages = out.selected_pages || out.selectedPages || Object.keys(out.pages || { home: {} });
  out.selected_pages = pages.slice(0, limit.maxPages);
  const lockedPages = pages.slice(limit.maxPages);
  if (lockedPages.length) {
    out.lockedPages = lockedPages;
    warnings.push(`${lockedPages.length} page(s) exceed the ${plan} page limit and will not publish.`);
  }

  out.blocksByPage = out.blocksByPage || {};
  for (const page of Object.keys(out.blocksByPage)) {
    const pageAllowed = out.selected_pages.includes(page);
    out.blocksByPage[page] = (out.blocksByPage[page] || []).map((block) => {
      const b = { ...block };
      const allowed = pageAllowed && blockAllowed(b, plan);

      if (!allowed) {
        b.packageLocked = true;
        b.publishable = false;
        b.hiddenOnPublish = true;
        b.lockedReason = pageAllowed
          ? `${b.type || 'block'} is not included in ${plan}.`
          : `This page is above the ${plan} page limit.`;
        warnings.push(`${b.title || b.type || 'Block'} locked: ${b.lockedReason}`);
        audit.push({ type: 'locked_block', page, block: b.id || b.type || '', reason: b.lockedReason });
      } else {
        b.packageLocked = false;
        b.publishable = b.publishable !== false;
        delete b.lockedReason;
      }

      if (!limit.freeform && b.positionMode === 'free') {
        b.positionMode = 'flow';
        b.freeformConverted = true;
        audit.push({ type: 'freeform_converted', page, block: b.id || b.type || '' });
      }

      if (!limit.animations.includes(b.animation || 'none')) {
        b.animation = 'none';
        b.motionLocked = true;
        audit.push({ type: 'animation_locked', page, block: b.id || b.type || '' });
      }

      return b;
    });
  }

  if (!limit.cms && out.cmsItems) {
    out.lockedCmsItems = out.cmsItems;
    delete out.cmsItems;
    warnings.push(`CMS content is locked on ${plan}.`);
  }

  if (!limit.collab && out.collaborators) {
    out.lockedCollaborators = out.collaborators;
    delete out.collaborators;
    warnings.push(`Collaboration is locked on ${plan}.`);
  }

  out.packageWarnings = warnings;
  out.packageAudit = [...(out.packageAudit || []), ...audit];
  return out;
}

export function getPublishableData(input, planValue) {
  const data = enforceProjectPackage(input, planValue);
  const publishable = JSON.parse(JSON.stringify(data));
  for (const page of Object.keys(publishable.blocksByPage || {})) {
    publishable.blocksByPage[page] = (publishable.blocksByPage[page] || []).filter((block) => {
      return !block.packageLocked && !block.hiddenOnPublish && block.publishable !== false && blockAllowed(block, publishable.plan);
    });
  }
  publishable.packageWarnings = data.packageWarnings || [];
  publishable.packageAudit = data.packageAudit || [];
  publishable.publish_checked_at = new Date().toISOString();
  return publishable;
}

export function validateProjectForPublish(input, planValue) {
  const data = getPublishableData(input, planValue);
  const pages = data.selected_pages || Object.keys(data.pages || { home: {} });
  const blocks = pages.flatMap((page) => (data.blocksByPage?.[page] || []));
  const issues = [];
  const warnings = [...(data.packageWarnings || [])];

  if (!blocks.some((block) => block.type === 'hero')) issues.push('Add a hero section before publishing.');
  if (!blocks.some((block) => ['contact', 'booking'].includes(block.type))) issues.push('Add a contact or booking section before publishing.');
  if (blocks.some((block) => !String(block.title || '').trim())) issues.push('Some sections are missing titles.');
  if (!data.seo?.title && !data.seo_title) warnings.push('SEO title is missing.');
  if (!data.seo?.description && !data.seo_description) warnings.push('SEO description is missing.');
  if (blocks.some((block) => block.image && !String(block.image).trim())) warnings.push('One or more image fields are blank.');
  if ((data.selected_pages || []).length > (PACKAGE_LIMITS[data.plan] || PACKAGE_LIMITS.starter).maxPages) issues.push('Too many pages for the selected package.');

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    score: Math.max(10, 100 - issues.length * 20 - warnings.length * 6),
    data
  };
}

export function priceEnvNameForPlan(planValue) {
  const plan = cleanPlan(planValue);
  if (plan === 'plus') return 'STRIPE_PRICE_PLUS';
  if (plan === 'business') return 'STRIPE_PRICE_BUSINESS';
  return 'STRIPE_PRICE_STARTER';
}
