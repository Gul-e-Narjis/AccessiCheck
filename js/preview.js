const scanHtml = sessionStorage.getItem('scanHtml');
const target = sessionStorage.getItem('previewTarget') || '';
const issueTitle = sessionStorage.getItem('previewIssueTitle') || '';
const previewFrame = document.getElementById('previewFrame');
const previewIssueLabel = document.getElementById('previewIssueLabel');

if (!scanHtml) {
  document.querySelector('.preview-page').innerHTML = `
    <a href="results.html" class="back-link">&larr; Back to Results</a>
    <h1>Preview Unavailable</h1>
    <p>The live preview for this scan isn't available (it may have been too large to save, or this scan is old). Try scanning the site again.</p>
  `;
} else {
  previewIssueLabel.textContent = issueTitle
    ? `Highlighting: ${issueTitle}`
    : 'Live preview of the scanned page';

  const reduceMotionPref = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  previewFrame.setAttribute('sandbox', 'allow-same-origin');

  previewFrame.onload = () => {
    if (!target) return;

    let targetEl;
    try {
      targetEl = previewFrame.contentDocument.querySelector(target);
    } catch (e) {
      return;
    }
    if (!targetEl) return;

    setTimeout(() => {
      targetEl.scrollIntoView({ behavior: reduceMotionPref ? 'auto' : 'smooth', block: 'center' });
      targetEl.style.outline = '4px solid #e56f61';
      targetEl.style.outlineOffset = '2px';
    }, reduceMotionPref ? 0 : 200);
  };

  previewFrame.srcdoc = scanHtml;
}