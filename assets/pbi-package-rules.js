window.PBIPackageRules = (() => {
  const TYPES = {
    base: ['navBar','hero','splitHero','services','process','stats','featureGrid','gallery','testimonial','faq','map','booking','contact','cta','spacer','trustBand'],
    business: ['floatingCard','logoCloud','pricing','productGrid','retail'],
    plus: ['cmsList','customCode','localizedSection','analyticsPanel','automationFlow']
  };

  const limits = {
    starter: { maxPages: 5, freeform: false, cms: false, collab: false, customCode: false, ecommerce: false, animations: ['none','fade','rise'] },
    business: { maxPages: 12, freeform: true, cms: false, collab: false, customCode: false, ecommerce: true, animations: ['none','fade','rise','scale','slide','float','reveal','stagger'] },
    plus: { maxPages: 40, freeform: true, cms: true, collab: true, customCode: true, ecommerce: true, animations: ['none','fade','rise','scale','slide','float','reveal','parallax','stagger','marquee'] }
  };

  function cleanPlan(plan) {
    const p = String(plan || 'starter').toLowerCase();
    return ['starter','business','plus','pro'].includes(p) ? (p === 'pro' ? 'plus' : p) : 'starter';
  }

  function allowedTypes(plan) {
    plan = cleanPlan(plan);
    const base = [...TYPES.base];
    if (plan === 'business') return [...base, ...TYPES.business];
    if (plan === 'plus') return [...base, ...TYPES.business, ...TYPES.plus];
    return base;
  }

  function blockAllowed(block, plan) {
    return allowedTypes(plan).includes(block?.type || 'hero');
  }

  function enforce(state, plan, options = {}) {
    plan = cleanPlan(plan || state?.plan);
    const clone = JSON.parse(JSON.stringify(state || {}));
    clone.plan = plan;
    clone.package = plan;
    clone.packageAudit = clone.packageAudit || [];
    clone.packageWarnings = [];

    const limit = limits[plan] || limits.starter;
    const pages = clone.selected_pages || clone.selectedPages || Object.keys(clone.pages || { home: {} });
    clone.selected_pages = pages.slice(0, limit.maxPages);

    const lockedPages = pages.slice(limit.maxPages);
    if (lockedPages.length) {
      clone.lockedPages = lockedPages;
      clone.packageWarnings.push(`${lockedPages.length} page(s) are locked on ${plan}.`);
    }

    clone.blocksByPage = clone.blocksByPage || {};
    for (const page of Object.keys(clone.blocksByPage)) {
      const pageAllowed = clone.selected_pages.includes(page);
      clone.blocksByPage[page] = (clone.blocksByPage[page] || []).map((block) => {
        const b = { ...block };
        const allowed = pageAllowed && blockAllowed(b, plan);
        b.requiredPlan = !blockAllowed(b, 'business') && blockAllowed(b, 'plus') ? 'plus'
          : !blockAllowed(b, 'starter') ? 'business' : 'starter';

        if (!allowed) {
          b.packageLocked = true;
          b.publishable = false;
          b.lockedReason = pageAllowed
            ? `${b.type} is not included in ${plan}.`
            : `This page is above the ${plan} page limit.`;
          clone.packageWarnings.push(`${b.title || b.type} locked: ${b.lockedReason}`);
        } else {
          b.packageLocked = false;
          b.publishable = true;
          delete b.lockedReason;
        }

        if (!limit.freeform && b.positionMode === 'free') {
          b.positionMode = 'flow';
          b.freeformConverted = true;
          clone.packageWarnings.push(`${b.title || b.type} was converted from freeform to flow on Starter.`);
        }

        if (!limit.animations.includes(b.animation || 'none')) {
          b.animation = 'none';
          b.motionLocked = true;
        }

        if (options.forPublish && b.packageLocked) {
          b.hiddenOnPublish = true;
        }
        return b;
      });
    }

    return clone;
  }

  function publishableBlocks(state, page) {
    const plan = cleanPlan(state?.plan);
    return ((state?.blocksByPage || {})[page] || []).filter((block) => {
      const locked = block.packageLocked || block.hiddenOnPublish || block.publishable === false;
      return !locked && blockAllowed(block, plan);
    });
  }

  function checklist(state) {
    const plan = cleanPlan(state?.plan);
    const checked = enforce(state, plan, { forPublish: true });
    const pages = checked.selected_pages || ['home'];
    const blocks = pages.flatMap((page) => (checked.blocksByPage?.[page] || []));
    const liveBlocks = blocks.filter((block) => !block.packageLocked && block.publishable !== false);
    const issues = [];
    const warnings = [...(checked.packageWarnings || [])];

    if (!liveBlocks.some((b) => b.type === 'hero')) issues.push('Add a hero section before publishing.');
    if (!liveBlocks.some((b) => ['contact','booking'].includes(b.type))) issues.push('Add a contact or booking section before publishing.');
    if (liveBlocks.some((b) => !String(b.title || '').trim())) issues.push('Some live sections have missing titles.');
    if (liveBlocks.some((b) => b.image && !String(b.image).trim())) warnings.push('One or more image fields are blank.');
    if (!checked.seo?.title && !checked.seo_title) warnings.push('SEO title is missing.');
    if (!checked.seo?.description && !checked.seo_description) warnings.push('SEO description is missing.');
    if (checked.packageWarnings?.length) warnings.push('Package rules were applied before publish.');

    return {
      ok: issues.length === 0,
      plan,
      issues,
      warnings,
      score: Math.max(10, 100 - issues.length * 20 - warnings.length * 6),
      checked
    };
  }

  return { limits, cleanPlan, allowedTypes, enforce, blockAllowed, publishableBlocks, checklist };
})();