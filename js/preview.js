// preview.js — Go to Element live preview screen
// Reads sessionStorage written by results.js. Core scan logic untouched.

const scanHtml      = sessionStorage.getItem('scanHtml');
const target        = sessionStorage.getItem('previewTarget') || '';
const issueTitle    = sessionStorage.getItem('previewIssueTitle') || '';
const previewFrame  = document.getElementById('previewFrame');
const previewIssueLabel = document.getElementById('previewIssueLabel');
const cardNote      = document.getElementById('previewCardNote');

// Document-level selectors — no specific element to point to
const DOC_LEVEL_TARGETS = ['html', 'body', 'document', '', ':root'];
const isDocLevel = !target || DOC_LEVEL_TARGETS.includes(target.trim().toLowerCase());

if (!scanHtml) {
  // No HTML saved (scan too large or old session)
  document.querySelector('.preview-page').innerHTML = `
    <a href="results.html" class="back-link">&larr; Back to Results</a>
    <h1>Preview Unavailable</h1>
    <p>The live preview for this scan isn't available. Try scanning the site again.</p>
  `;
} else {
  // Set the top label
  previewIssueLabel.textContent = issueTitle
    ? `Highlighting: ${issueTitle}`
    : 'Live preview of the scanned page';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (isDocLevel) {
    // ── Document-level issue ──
    // No single element to point to — show the page but explain why
    cardNote.innerHTML = `
      <span style="color:var(--accent-gold-deep); font-weight:700;">📄 Document-level issue</span>
      — This issue applies to the whole page structure, not one specific element.
      No element to highlight. Check the WCAG guideline link in the Full Report for how to fix it.
    `;
    previewFrame.setAttribute('sandbox', 'allow-same-origin');
    previewFrame.srcdoc = scanHtml;

  } else {
    // ── Element-level issue — scroll + highlight ──
    cardNote.textContent = 'Links and forms inside the preview are disabled — this is a diagnostic view only.';

    previewFrame.setAttribute('sandbox', 'allow-same-origin');

    previewFrame.onload = () => {
      const doc = previewFrame.contentDocument;
      if (!doc) return;

      let targetEl = null;

      // Try the stored CSS selector first
      try {
        targetEl = doc.querySelector(target);
      } catch (e) { /* invalid selector — fall through */ }

      // If axe gave us a compound selector array-string like '["#foo > span"]'
      // strip the JSON brackets and try again
      if (!targetEl && target.startsWith('[')) {
        try {
          const inner = JSON.parse(target)[0];
          targetEl = doc.querySelector(inner);
        } catch (e) {}
      }

      if (!targetEl) {
        // Element genuinely not found in saved HTML (dynamic / hidden content)
        cardNote.innerHTML = `
          <span style="color:var(--accent-gold-deep); font-weight:700;">⚠️ Element not visible</span>
          — This element may be dynamically generated or hidden in the saved snapshot.
          The full issue details are in the report.
        `;
        return;
      }

      // Scroll to and highlight the element
      setTimeout(() => {
        targetEl.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center'
        });

        // Coral pulsing outline — 3 flashes then stays on
        targetEl.style.outline         = '3px solid #e56f61';
        targetEl.style.outlineOffset   = '3px';
        targetEl.style.borderRadius    = '3px';
        targetEl.style.transition      = 'box-shadow 0.3s ease';
        targetEl.style.boxShadow       = '0 0 0 6px rgba(229,111,97,0.25)';
        targetEl.style.backgroundColor = 'rgba(229,111,97,0.08)';

        if (!reduceMotion) {
          // Pulse the highlight 3 times so it's impossible to miss
          let count = 0;
          const pulse = setInterval(() => {
            targetEl.style.outlineColor = count % 2 === 0 ? 'transparent' : '#e56f61';
            count++;
            if (count >= 6) {
              clearInterval(pulse);
              targetEl.style.outlineColor = '#e56f61'; // final solid state
            }
          }, 280);
        }
      }, reduceMotion ? 0 : 200);
    };

    previewFrame.srcdoc = scanHtml;
  }
}
