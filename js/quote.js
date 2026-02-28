// js/quote.js
// Stepper, dynamic fields, live summary (safe snippets), per-step validation, WhatsApp message, local submit redirect.
(function () {
  const form = document.querySelector('[data-quote-form]');
  if (!form) return;

  const stepper = document.querySelector('[data-stepper]');
  const panels = Array.from(document.querySelectorAll('[data-step-panel]'));
  const nextBtns = Array.from(document.querySelectorAll('[data-next]'));
  const prevBtns = Array.from(document.querySelectorAll('[data-prev]'));

  const serviceChecks = Array.from(document.querySelectorAll('.service-check'));
  const dynamicFieldsWrap = document.querySelector('[data-dynamic-fields]');
  const dynCards = Array.from(document.querySelectorAll('[data-show-when]'));

  const summaryServices = document.querySelector('[data-summary-services]');
  const summaryPriority = document.querySelector('[data-summary-priority]');
  const summaryBrief = document.querySelector('[data-summary-brief]');
  const summaryContact = document.querySelector('[data-summary-contact]');
  const summaryWa = document.querySelector('[data-summary-wa]');

  const reviewBox = document.querySelector('[data-review]');
  const waSend = document.querySelector('[data-wa-send]');

  const backToTop = document.querySelector('[data-backtotop]');

  const fields = {
    priority: form.querySelector('#priority'),
    message: form.querySelector('#message'),
    fullName: form.querySelector('#full_name'),
    email: form.querySelector('#email'),
    phone: form.querySelector('#phone'),
    org: form.querySelector('#org'),
    consent: form.querySelector('input[name="consent"]'),
    budget: form.querySelector('#budget'),
    timeline: form.querySelector('#timeline')
  };

  let currentStep = 1;
  const totalSteps = 4;

  function setStep(step) {
    currentStep = Math.max(1, Math.min(totalSteps, step));

    // Panels
    panels.forEach(p => {
      const s = Number(p.getAttribute('data-step-panel'));
      const active = s === currentStep;
      p.hidden = !active;
      p.classList.toggle('is-active', active);
    });

    // Stepper UI
    if (stepper) {
      const items = Array.from(stepper.querySelectorAll('.stepper-item'));
      items.forEach(it => {
        const s = Number(it.getAttribute('data-step'));
        it.classList.toggle('is-active', s === currentStep);
        it.classList.toggle('is-done', s < currentStep);
      });
    }

    // Scroll focus
    const activePanel = panels.find(p => Number(p.getAttribute('data-step-panel')) === currentStep);
    if (activePanel) {
      const focusable = activePanel.querySelector('input, select, textarea, button, a');
      if (focusable) focusable.focus({ preventScroll: true });
      activePanel.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
    }

    updateReview();
  }

  function prefersReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function getSelectedServices() {
    return serviceChecks.filter(c => c.checked).map(c => c.value);
  }

  function getSelectedServiceKeys() {
    return serviceChecks.filter(c => c.checked).map(c => c.getAttribute('data-service'));
  }

  function showDynamicCards() {
    const keys = new Set(getSelectedServiceKeys());
    dynCards.forEach(card => {
      const key = card.getAttribute('data-show-when');
      const shouldShow = keys.has(key);
      card.hidden = !shouldShow;
      // Disable inputs when hidden to avoid noisy submission
      card.querySelectorAll('input, select, textarea').forEach(el => {
        el.disabled = !shouldShow;
      });
    });
  }

  function safeSnippet(text, max = 130) {
    const t = (text || '').trim().replace(/\s+/g, ' ');
    if (!t) return '—';
    if (t.length <= max) return t;
    return t.slice(0, max - 1) + '…';
  }

  // Summary must never break layout: ensure we only inject textContent and short snippets.
  function updateSummary() {
    // Services
    const services = getSelectedServices();
    summaryServices.innerHTML = '';
    if (!services.length) {
      const li = document.createElement('li');
      li.className = 'summary-muted';
      li.textContent = 'No services selected yet.';
      summaryServices.appendChild(li);
    } else {
      services.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        summaryServices.appendChild(li);
      });
    }

    // Priority
    summaryPriority.textContent = fields.priority?.value ? fields.priority.value : '—';

    // Brief snippet
    summaryBrief.textContent = safeSnippet(fields.message?.value || '');

    // Contact
    const name = (fields.fullName?.value || '').trim();
    const email = (fields.email?.value || '').trim();
    const phone = (fields.phone?.value || '').trim();
    const contactLine = [name || null, email || null, phone || null].filter(Boolean).join(' • ');
    summaryContact.textContent = contactLine || '—';

    // WhatsApp quick link with prefilled message (even mid-form)
    const msg = buildWhatsAppMessage({ compact: true });
    if (summaryWa) {
      summaryWa.href = 'https://wa.me/256701951404?text=' + encodeURIComponent(msg);
    }

    // Hard safety: force wrap rules for long strings
    [summaryServices, summaryBrief, summaryContact].forEach(node => {
      if (!node) return;
      node.style.wordBreak = 'break-word';
      node.style.overflowWrap = 'anywhere';
    });
  }

  function errorSlotForStep(step) {
    const panel = panels.find(p => Number(p.getAttribute('data-step-panel')) === step);
    if (!panel) return null;
    return panel.querySelector('[data-step-error]');
  }

  function setError(step, message) {
    const slot = errorSlotForStep(step);
    if (slot) slot.textContent = message || '';
  }

  function validateStep(step) {
    setError(step, '');

    if (step === 1) {
      const services = getSelectedServices();
      if (services.length < 1) {
        setError(step, 'Select at least one service to continue.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const priority = (fields.priority?.value || '').trim();
      const message = (fields.message?.value || '').trim();
      if (!priority) {
        setError(step, 'Select a priority to continue.');
        fields.priority?.focus();
        return false;
      }
      if (message.replace(/\s+/g, ' ').length < 12) {
        setError(step, 'Your project brief must be at least 12 characters.');
        fields.message?.focus();
        return false;
      }
      return true;
    }

    if (step === 3) {
      const name = (fields.fullName?.value || '').trim();
      const email = (fields.email?.value || '').trim();
      const phone = (fields.phone?.value || '').trim();
      const consent = !!fields.consent?.checked;

      if (!name) { setError(step, 'Enter your full name.'); fields.fullName?.focus(); return false; }
      if (!isValidEmail(email)) { setError(step, 'Enter a valid email address.'); fields.email?.focus(); return false; }
      if (!phone || phone.length < 7) { setError(step, 'Enter a valid phone/WhatsApp number.'); fields.phone?.focus(); return false; }
      if (!consent) { setError(step, 'Please consent to be contacted so we can respond.'); fields.consent?.focus(); return false; }

      return true;
    }

    return true;
  }

  function isValidEmail(email) {
    // Simple, practical validation (not over-strict)
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function kv(label, value) {
    const v = (value || '').toString().trim();
    return v ? `${label}: ${v}` : '';
  }

  function collectDynamicDetails() {
    // Collect enabled fields only
    const enabledInputs = Array.from(dynamicFieldsWrap.querySelectorAll('input, select, textarea'))
      .filter(el => !el.disabled);

    const pairs = [];
    enabledInputs.forEach(el => {
      const name = el.getAttribute('name');
      if (!name) return;

      let val = '';
      if (el.tagName === 'SELECT') val = el.value;
      else val = el.value;

      if (val && val.toString().trim()) {
        // Human-ish labels: use associated label text if possible
        const id = el.id;
        const labelEl = id ? form.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const label = labelEl ? labelEl.textContent.trim() : name.replace(/_/g, ' ');
        pairs.push({ label, value: val.toString().trim() });
      }
    });

    return pairs;
  }

  function buildWhatsAppMessage(opts = { compact: false }) {
    const services = getSelectedServices();
    const priority = fields.priority?.value || '';
    const budget = fields.budget?.value || '';
    const startDate = fields.timeline?.value || '';
    const message = (fields.message?.value || '').trim();

    const name = (fields.fullName?.value || '').trim();
    const email = (fields.email?.value || '').trim();
    const phone = (fields.phone?.value || '').trim();
    const org = (fields.org?.value || '').trim();

    const dyn = collectDynamicDetails();

    const lines = [];
    lines.push('Hello Aromax, I’d like a quotation request.');
    lines.push('');
    if (services.length) lines.push('Services: ' + services.join(', '));
    if (priority) lines.push('Priority: ' + priority);
    if (budget) lines.push('Budget: ' + budget);
    if (startDate) lines.push('Start date: ' + startDate);
    lines.push('');
    if (message) lines.push('Brief: ' + (opts.compact ? safeSnippet(message, 160) : message));

    if (dyn.length) {
      lines.push('');
      lines.push('Service details:');
      dyn.forEach(item => lines.push(`- ${item.label}: ${item.value}`));
    }

    const contactBits = [];
    if (name) contactBits.push(kv('Name', name));
    if (org) contactBits.push(kv('Org', org));
    if (email) contactBits.push(kv('Email', email));
    if (phone) contactBits.push(kv('Phone', phone));

    if (contactBits.filter(Boolean).length) {
      lines.push('');
      lines.push('Contact:');
      contactBits.filter(Boolean).forEach(b => lines.push('- ' + b));
    }

    lines.push('');
    lines.push('Thank you.');

    return lines.join('\n');
  }

  function updateReview() {
    if (!reviewBox) return;

    const services = getSelectedServices();
    const dyn = collectDynamicDetails();

    const sections = [];
    sections.push(`<div class="review-row"><div class="review-k">Services</div><div class="review-v">${escapeHtml(services.length ? services.join(', ') : '—')}</div></div>`);
    sections.push(`<div class="review-row"><div class="review-k">Priority</div><div class="review-v">${escapeHtml(fields.priority?.value || '—')}</div></div>`);
    sections.push(`<div class="review-row"><div class="review-k">Budget</div><div class="review-v">${escapeHtml(fields.budget?.value || '—')}</div></div>`);
    sections.push(`<div class="review-row"><div class="review-k">Start date</div><div class="review-v">${escapeHtml(fields.timeline?.value || '—')}</div></div>`);
    sections.push(`<div class="review-row"><div class="review-k">Brief</div><div class="review-v">${escapeHtml((fields.message?.value || '').trim() || '—')}</div></div>`);

    if (dyn.length) {
      const list = dyn.map(d => `<li><strong>${escapeHtml(d.label)}:</strong> ${escapeHtml(d.value)}</li>`).join('');
      sections.push(`<div class="review-row"><div class="review-k">Service details</div><div class="review-v"><ul class="review-list">${list}</ul></div></div>`);
    }

    const contact = [];
    contact.push(kv('Name', fields.fullName?.value || ''));
    contact.push(kv('Org', fields.org?.value || ''));
    contact.push(kv('Email', fields.email?.value || ''));
    contact.push(kv('Phone', fields.phone?.value || ''));
    const contactHtml = contact.filter(Boolean).map(c => `<li>${escapeHtml(c)}</li>`).join('');

    sections.push(`<div class="review-row"><div class="review-k">Contact</div><div class="review-v"><ul class="review-list">${contactHtml || '<li>—</li>'}</ul></div></div>`);

    reviewBox.innerHTML = `
      <div class="review-grid">
        ${sections.join('')}
      </div>
    `;

    // Update WhatsApp send link
    if (waSend) {
      waSend.href = 'https://wa.me/256701951404?text=' + encodeURIComponent(buildWhatsAppMessage({ compact: false }));
    }
  }

  function escapeHtml(str) {
    return (str ?? '').toString()
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // Add tiny CSS for review layout (kept in JS to avoid extra file; still clean)
  (function injectReviewCss(){
    const css = `
      .review-grid{ display:grid; gap:10px; }
      .review-row{ display:grid; grid-template-columns: 140px minmax(0,1fr); gap:12px; align-items:start; }
      .review-k{ color: var(--muted); font-weight: 500; font-size: 13px; letter-spacing:.02em; }
      .review-v{ overflow-wrap:anywhere; word-break:break-word; min-width:0; }
      .review-list{ margin:0; padding-left: 16px; color: var(--text); }
      .review-list li{ margin: 6px 0; }
      @media (max-width: 560px){ .review-row{ grid-template-columns: 1fr; } }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // Step buttons
  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!validateStep(currentStep)) return;
      setStep(currentStep + 1);
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => setStep(currentStep - 1));
  });

  // Services + dynamic
  serviceChecks.forEach(chk => {
    chk.addEventListener('change', () => {
      showDynamicCards();
      updateSummary();
      updateReview();
    });
  });

  // Inputs update summary live
  const liveInputs = form.querySelectorAll('input, select, textarea');
  liveInputs.forEach(el => {
    el.addEventListener('input', updateSummary);
    el.addEventListener('change', updateSummary);
  });

  // Back-to-top
  function onScroll() {
    if (!backToTop) return;
    const show = window.scrollY > 500;
    backToTop.hidden = !show;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' });
    });
  }

  // Review WA link click (non-destructive)
  if (waSend) {
    waSend.addEventListener('click', (e) => {
      // Ensure review is current
      updateReview();
    });
  }

  // Netlify-friendly submission but local safe behavior:
  // If running on localhost or file://, prevent POST (avoids 405) and redirect to success.html.
  form.addEventListener('submit', (e) => {
    const proto = window.location.protocol;
    const host = window.location.hostname;

    const isLocal = proto === 'file:' || host === 'localhost' || host === '127.0.0.1';
    if (isLocal) {
      e.preventDefault();
      window.location.href = 'success.html';
      return;
    }

    // Final validation gate
    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s)) {
        e.preventDefault();
        setStep(s);
        return;
      }
    }
  });

  // Init
  showDynamicCards();
  updateSummary();
  setStep(1);

  // Defensive: ensure the layout never shifts horizontally from long text
  // (already addressed via CSS overflow-wrap/word-break + minmax columns).
  // This is a micro-guard to keep the summary height stable on input.
  if (summaryBrief) {
    summaryBrief.style.maxWidth = '100%';
  }

  // Year stamp
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();
