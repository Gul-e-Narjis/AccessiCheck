// Screen 11 — Vision Simulator
// Reads the SAME sessionStorage.scanHtml that preview.js already writes
// (read-only). Loads it into its own sandboxed iframe (separate from
// preview.html's #previewFrame) and applies CSS filters to approximate
// how the page looks under different vision conditions. Does not touch
// preview.html, preview.js, or scanning.js in any way.

const FILTERS = {
  normal:      { label: 'Normal Vision',         css: 'none',                         dot: '#14817b' },
  protanopia:  { label: 'Protanopia (red-blind)', css: 'url(#vsProtanopia)',          dot: '#c0392b' },
  deuteranopia:{ label: 'Deuteranopia (green-blind)', css: 'url(#vsDeuteranopia)',     dot: '#b8650b' },
  tritanopia:  { label: 'Tritanopia (blue-blind)', css: 'url(#vsTritanopia)',          dot: '#1a5fb4' },
  lowvision:   { label: 'Low Vision (blur)',       css: 'blur(2.5px) contrast(0.9)',   dot: '#8e7336' },
  monochrome:  { label: 'Monochromacy (grayscale)', css: 'grayscale(1) contrast(1.05)', dot: '#4a4a4a' }
};

document.addEventListener('DOMContentLoaded', () => {
  const scanHtml = sessionStorage.getItem('scanHtml');
  const frame = document.getElementById('vsFrame');
  const badge = document.getElementById('vsFrameBadge');
  const noScanState = document.getElementById('noScanState');
  const simulatorArea = document.getElementById('simulatorArea');
  const toggleRow = document.getElementById('vsToggleRow');

  if (!scanHtml) {
    noScanState.hidden = false;
    simulatorArea.hidden = true;
    return;
  }

  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.srcdoc = scanHtml;

  function setMode(key) {
    const mode = FILTERS[key];
    if (!mode) return;
    frame.style.filter = mode.css;
    badge.textContent = mode.label;
    toggleRow.querySelectorAll('.vs-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === key);
      btn.setAttribute('aria-pressed', btn.dataset.mode === key ? 'true' : 'false');
    });
  }

  toggleRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.vs-toggle-btn');
    if (!btn) return;
    setMode(btn.dataset.mode);
  });

  setMode('normal');
});
