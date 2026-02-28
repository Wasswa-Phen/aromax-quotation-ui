// js/nav.js
// Drawer + dropdown behavior with accessibility: ESC closes, backdrop click closes, focus management.
(function () {
  const header = document.querySelector('[data-header]');
  const drawer = document.querySelector('[data-drawer]');
  const backdrop = document.querySelector('[data-backdrop]');
  const openBtn = document.querySelector('[data-drawer-open]');
  const closeBtn = document.querySelector('[data-drawer-close]');

  const dropdownRoot = document.querySelector('[data-dropdown]');
  const dropdownBtn = document.querySelector('[data-dropdown-button]');
  const dropdownPanel = document.querySelector('[data-dropdown-panel]');

  let lastFocused = null;

  function isOpen() {
    return drawer && drawer.dataset.open === 'true';
  }

  function openDrawer() {
    if (!drawer || !backdrop || !openBtn) return;
    lastFocused = document.activeElement;

    drawer.hidden = false;
    backdrop.hidden = false;

    requestAnimationFrame(() => {
      drawer.dataset.open = 'true';
      openBtn.setAttribute('aria-expanded', 'true');
      drawer.setAttribute('aria-hidden', 'false');
      backdrop.classList.add('is-on');
      lockScroll(true);
      focusFirstInDrawer();
    });
  }

  function closeDrawer() {
    if (!drawer || !backdrop || !openBtn) return;

    drawer.dataset.open = 'false';
    openBtn.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');

    lockScroll(false);

    // Allow transition to finish before hiding
    window.setTimeout(() => {
      drawer.hidden = true;
      backdrop.hidden = true;
    }, 160);

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  function lockScroll(lock) {
    document.documentElement.style.overflow = lock ? 'hidden' : '';
  }

  function focusFirstInDrawer() {
    const focusable = drawer.querySelectorAll('a, button');
    if (focusable.length) focusable[0].focus();
  }

  function trapFocus(e) {
    if (!isOpen() || e.key !== 'Tab') return;
    const focusable = drawer.querySelectorAll('a, button');
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

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (isOpen()) closeDrawer();
      closeDropdown();
    }
    trapFocus(e);
  }

  // Drawer events
  if (openBtn) openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', onKeyDown);

  // Dropdown events (desktop)
  function openDropdown() {
    if (!dropdownPanel || !dropdownBtn) return;
    dropdownPanel.dataset.open = 'true';
    dropdownBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    if (!dropdownPanel || !dropdownBtn) return;
    dropdownPanel.dataset.open = 'false';
    dropdownBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleDropdown() {
    const isOpen = dropdownPanel && dropdownPanel.dataset.open === 'true';
    if (isOpen) closeDropdown();
    else openDropdown();
  }

  if (dropdownBtn && dropdownPanel) {
    dropdownBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleDropdown();
    });

    // Click outside closes
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!dropdownRoot) return;
      if (!dropdownRoot.contains(target)) closeDropdown();
    });

    // Keyboard navigation within dropdown
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

  // Year stamp (shared convenience)
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();
