// js/nav.js
// Drawer + dropdown behavior with accessibility: ESC closes, backdrop click closes, focus trap, scroll lock.
// Fix: stop using [hidden] for drawer/backdrop so animation + click handling stays reliable.
(function () {
  const drawer = document.querySelector('[data-drawer]');
  const backdrop = document.querySelector('[data-backdrop]');
  const openBtn = document.querySelector('[data-drawer-open]');
  const closeBtn = document.querySelector('[data-drawer-close]');

  const dropdownRoot = document.querySelector('[data-dropdown]');
  const dropdownBtn = document.querySelector('[data-dropdown-button]');
  const dropdownPanel = document.querySelector('[data-dropdown-panel]');

  let lastFocused = null;

  function setScrollLock(lock) {
    document.documentElement.style.overflow = lock ? 'hidden' : '';
  }

  function isDrawerOpen() {
    return !!drawer && drawer.dataset.open === 'true';
  }

  function openDrawer() {
    if (!drawer || !backdrop || !openBtn) return;
    lastFocused = document.activeElement;

    drawer.dataset.open = 'true';
    backdrop.dataset.open = 'true';
    drawer.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');

    setScrollLock(true);

    // Focus first focusable
    const focusable = drawer.querySelectorAll('a, button, input, select, textarea');
    if (focusable.length) {
      focusable[0].focus({ preventScroll: true });
    }
  }

  function closeDrawer() {
    if (!drawer || !backdrop || !openBtn) return;

    drawer.dataset.open = 'false';
    backdrop.dataset.open = 'false';
    drawer.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');

    setScrollLock(false);

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function trapFocus(e) {
    if (!isDrawerOpen() || e.key !== 'Tab') return;
    const focusable = drawer.querySelectorAll('a, button, input, select, textarea');
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function closeDropdown() {
    if (!dropdownPanel || !dropdownBtn) return;
    dropdownPanel.dataset.open = 'false';
    dropdownBtn.setAttribute('aria-expanded', 'false');
  }

  function openDropdown() {
    if (!dropdownPanel || !dropdownBtn) return;
    dropdownPanel.dataset.open = 'true';
    dropdownBtn.setAttribute('aria-expanded', 'true');
  }

  function toggleDropdown() {
    if (!dropdownPanel) return;
    const isOpen = dropdownPanel.dataset.open === 'true';
    if (isOpen) closeDropdown();
    else openDropdown();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (isDrawerOpen()) closeDrawer();
      closeDropdown();
    }
    trapFocus(e);
  }

  // Drawer events
  if (openBtn) openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (isDrawerOpen()) closeDrawer();
    });
    // prevent accidental scroll on backdrop (mobile)
    backdrop.addEventListener('touchmove', (e) => {
      if (isDrawerOpen()) e.preventDefault();
    }, { passive: false });
  }

  document.addEventListener('keydown', onKeyDown);

  // Dropdown (desktop)
  if (dropdownBtn && dropdownPanel) {
    dropdownBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleDropdown();
    });

    // Click outside closes dropdown
    document.addEventListener('click', (e) => {
      if (!dropdownRoot) return;
      if (!dropdownRoot.contains(e.target)) closeDropdown();
    });

    // Keyboard support: open then focus first item
    dropdownBtn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        openDropdown();
        const firstItem = dropdownPanel.querySelector('a');
        if (firstItem) firstItem.focus();
      }
    });

    dropdownPanel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        const items = dropdownPanel.querySelectorAll('a');
        if (!items.length) return;
        if (document.activeElement === items[0]) {
          e.preventDefault();
          dropdownBtn.focus();
        }
      }
    });
  }

  // Ensure initial state is closed (defensive)
  if (drawer) {
    drawer.dataset.open = 'false';
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (backdrop) backdrop.dataset.open = 'false';
  if (openBtn) openBtn.setAttribute('aria-expanded', 'false');

  // Year stamp
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();
