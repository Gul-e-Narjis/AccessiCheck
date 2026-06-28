// Shared helper for the new report/utility screens (Critical, Warnings, Best
// Practices, Vision Simulator, Settings, About). Does not touch scan logic —
// purely UI plumbing: scroll-reveal, toast popups, scroll-to-top, info popovers.

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Scroll reveal ----
  // window.revealObserve(elements) is exposed so pages that inject cards
  // dynamically (after this script's own DOMContentLoaded already ran)
  // can still register the new elements for the same fade-up animation.
  let revealIO = null;

  function revealOne(el) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      el.classList.add('in-view');
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }
    revealIO.observe(el);
  }

  window.revealObserve = function (elOrList) {
    const els = (elOrList instanceof Element) ? [elOrList] : Array.from(elOrList || []);
    els.forEach(revealOne);
  };

  function initReveal() {
    window.revealObserve(document.querySelectorAll('.reveal'));
  }

  // ---- Scroll-to-top FAB ----
  function initFab() {
    const fab = document.getElementById('fabTop');
    if (!fab) return;
    window.addEventListener('scroll', () => {
      fab.classList.toggle('show', window.scrollY > 480);
    }, { passive: true });
    fab.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  // ---- Info popovers ("?" buttons) ----
  function initInfoPopovers() {
    document.querySelectorAll('.info-btn').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll('.info-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
        btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.info-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.info-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      }
    });
  }

  // ---- Toast (global helper: window.showToast('message')) ----
  function initToast() {
    let toastEl = document.getElementById('globalToast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'globalToast';
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    let hideTimer = null;
    window.showToast = function (message) {
      toastEl.textContent = message;
      toastEl.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
    };
  }

  // ---- Subnav pill counts (read-only mirror of scanResults) ----
  function initNavCounts() {
    const critEl = document.getElementById('navCriticalCount');
    const warnEl = document.getElementById('navWarningCount');
    if (!critEl && !warnEl) return;
    let violations = [];
    try { violations = JSON.parse(sessionStorage.getItem('scanResults') || '[]'); } catch (e) {}
    let high = 0, moderate = 0;
    violations.forEach(v => {
      if (v.impact === 'critical' || v.impact === 'serious') high++;
      else if (v.impact === 'moderate') moderate++;
    });
    if (critEl) critEl.textContent = high;
    if (warnEl) warnEl.textContent = moderate;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initFab();
    initInfoPopovers();
    initToast();
    initNavCounts();
  });
})();
