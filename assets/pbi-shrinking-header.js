(function(){
  const body = document.body;
  if (!body || body.classList.contains('pbi-app-page')) return;

  function cleanLabel(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function makeSelect(label, className) {
    const wrap = document.createElement('label');
    wrap.className = className + '-wrap';
    const text = document.createElement('span');
    text.className = 'pbi-mobile-select-label';
    text.textContent = label;
    const select = document.createElement('select');
    select.className = className;
    select.setAttribute('aria-label', label);
    wrap.append(text, select);
    return { wrap, select };
  }

  function enhancePublicNav() {
    document.querySelectorAll('.pbi-public-links, .pbi-main-nav').forEach((nav) => {
      if (nav.dataset.mobileDropdown === 'true') return;
      const links = Array.from(nav.querySelectorAll('a[href]'))
        .filter((link) => cleanLabel(link.textContent) && !link.hasAttribute('data-no-mobile-menu'));
      if (links.length < 2) return;

      const { wrap, select } = makeSelect('Site menu', 'pbi-mobile-menu-select');
      select.append(new Option('Menu', ''));
      links.forEach((link) => {
        const option = new Option(cleanLabel(link.textContent), link.href);
        if (link.href === window.location.href || link.pathname === window.location.pathname) {
          option.selected = true;
        }
        select.append(option);
      });
      select.addEventListener('change', () => {
        if (select.value) window.location.href = select.value;
      });

      nav.dataset.mobileDropdown = 'true';
      nav.classList.add('has-mobile-dropdown');
      const host = nav.closest('.pbi-public-nav-inner, .nav-inner') || nav.parentElement;
      if (host) host.append(wrap);
    });
  }

  function enhanceButtonGroup(group) {
    if (!group || group.dataset.mobileDropdown === 'true') return;
    const buttons = Array.from(group.querySelectorAll(':scope > button'))
      .filter((button) => cleanLabel(button.textContent) && !button.disabled);
    if (buttons.length < 2) return;

    const label = cleanLabel(group.getAttribute('aria-label')) || cleanLabel(group.id) || 'Options';
    const { wrap, select } = makeSelect(label, 'pbi-mobile-tab-select');

    buttons.forEach((button, index) => {
      const option = new Option(cleanLabel(button.textContent), String(index));
      if (
        button.classList.contains('active') ||
        button.getAttribute('aria-selected') === 'true' ||
        button.getAttribute('aria-pressed') === 'true'
      ) {
        option.selected = true;
      }
      select.append(option);
    });

    const syncFromButtons = () => {
      const activeIndex = buttons.findIndex((button) => (
        button.classList.contains('active') ||
        button.getAttribute('aria-selected') === 'true' ||
        button.getAttribute('aria-pressed') === 'true'
      ));
      select.value = String(activeIndex >= 0 ? activeIndex : 0);
    };

    select.addEventListener('change', () => {
      const button = buttons[Number(select.value)];
      if (button) button.click();
    });
    buttons.forEach((button) => {
      button.addEventListener('click', () => window.setTimeout(syncFromButtons, 0));
    });

    group.dataset.mobileDropdown = 'true';
    group.classList.add('has-mobile-dropdown');
    if (group.parentElement) group.parentElement.insertBefore(wrap, group);
    syncFromButtons();
  }

  function enhanceDetailsMenuBar(menuBar) {
    if (!menuBar || menuBar.dataset.mobileToolbarDropdown === 'true') return;
    const menus = Array.from(menuBar.querySelectorAll(':scope > details'))
      .filter((menu) => cleanLabel(menu.querySelector('summary')?.textContent));
    if (menus.length < 2) return;

    const { wrap, select } = makeSelect('Editor tools', 'pbi-mobile-toolbar-select');
    select.append(new Option('Editor tools', ''));
    menus.forEach((menu, index) => {
      select.append(new Option(cleanLabel(menu.querySelector('summary')?.textContent), String(index)));
    });

    select.addEventListener('change', () => {
      menus.forEach((menu) => { menu.open = false; });
      if (select.value === '') return;
      const menu = menus[Number(select.value)];
      if (!menu) return;
      menu.open = true;
      menu.querySelector('summary')?.focus({ preventScroll: true });
    });

    menus.forEach((menu, index) => {
      menu.addEventListener('toggle', () => {
        if (menu.open) select.value = String(index);
      });
    });

    menuBar.dataset.mobileToolbarDropdown = 'true';
    menuBar.classList.add('has-mobile-toolbar-dropdown');
    menuBar.parentElement?.insertBefore(wrap, menuBar);
  }

  function enhanceActionStrip(strip) {
    if (!strip || strip.dataset.mobileActionsDropdown === 'true') return;
    const actions = Array.from(strip.querySelectorAll(':scope > button, :scope > a[href]'))
      .filter((action) => cleanLabel(action.textContent) && !action.disabled);
    if (actions.length < 2) return;

    const { wrap, select } = makeSelect('Editor actions', 'pbi-mobile-action-select');
    select.append(new Option('Actions', ''));
    actions.forEach((action, index) => {
      select.append(new Option(cleanLabel(action.textContent), String(index)));
    });

    select.addEventListener('change', () => {
      const action = actions[Number(select.value)];
      select.value = '';
      if (!action) return;
      if (action.tagName === 'A') {
        window.location.href = action.href;
        return;
      }
      action.click();
    });

    strip.dataset.mobileActionsDropdown = 'true';
    strip.classList.add('has-mobile-actions');
    strip.append(wrap);
  }

  function enhanceMobileDropdowns() {
    enhancePublicNav();
    document
      .querySelectorAll('#templateFilters, .pbi-filter-row, .pbi-studio-tabs[role="tablist"], .pbi-device-switcher, .pbi-wix-device-control, .pbi-domain-mode-grid[role="group"], .pbi-plan-control, [role="tablist"]')
      .forEach(enhanceButtonGroup);
    document.querySelectorAll('.pbi-wix-menu-bar').forEach(enhanceDetailsMenuBar);
    document.querySelectorAll('.pbi-wix-action-strip').forEach(enhanceActionStrip);
  }

  enhanceMobileDropdowns();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceMobileDropdowns, { once: true });
  } else {
    window.setTimeout(enhanceMobileDropdowns, 0);
  }

  if (body.classList.contains('pbi-canvas-page')) return;

  body.classList.add('pbi-shrink-header');

  let ticking = false;
  function updateHeaderState() {
    body.classList.toggle('pbi-nav-compact', window.scrollY > 18);
    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateHeaderState);
  }

  updateHeaderState();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
})();
