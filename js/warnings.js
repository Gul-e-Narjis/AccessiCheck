// Screen 07 — Warnings List
// Same read-only sessionStorage data as results.js / critical-issues.js.
// Filters to moderate-severity issues.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function mapSeverity(impact) {
  if (impact === 'critical' || impact === 'serious') return 'high';
  if (impact === 'moderate') return 'moderate';
  return 'minor';
}

document.addEventListener('DOMContentLoaded', () => {
  const url = sessionStorage.getItem('scanUrl');
  const scanError = sessionStorage.getItem('scanError');
  const raw = sessionStorage.getItem('scanResults');
  const listEl = document.getElementById('warningList');
  const emptyState = document.getElementById('emptyState');
  const noScanState = document.getElementById('noScanState');

  if (!raw || scanError === 'true') {
    noScanState.hidden = false;
    listEl.hidden = true;
    document.getElementById('summaryStrip').hidden = true;
    return;
  }

  let violations = [];
  try { violations = JSON.parse(raw); } catch (e) { violations = []; }

  const allIssues = violations.map(v => ({
    severity: mapSeverity(v.impact),
    title: v.help,
    description: v.description,
    helpUrl: v.helpUrl || '',
    ruleId: v.id || '',
    nodeCount: v.nodes.length
  }));

  const moderateIssues = allIssues
    .map((issue, idx) => ({ ...issue, originalIdx: idx }))
    .filter(issue => issue.severity === 'moderate');

  document.getElementById('scannedUrlTag').textContent = url ? url.replace(/^https?:\/\//, '') : '';
  document.getElementById('warningCount').textContent = moderateIssues.length;

  if (moderateIssues.length === 0) {
    emptyState.hidden = false;
    listEl.hidden = true;
    return;
  }

  moderateIssues.forEach((issue, i) => {
    const card = document.createElement('div');
    card.className = 'sev-card sev-card--moderate reveal';
    card.style.transitionDelay = (Math.min(i, 6) * 50) + 'ms';
    card.innerHTML = `
      <div class="sev-card-top">
        <span class="badge moderate">WARNING</span>
        ${issue.ruleId ? `<span class="rule-tag">${escapeHtml(issue.ruleId)}</span>` : ''}
      </div>
      <h2>${escapeHtml(issue.title)}</h2>
      <p>${escapeHtml(issue.description)}</p>
      <div class="sev-card-meta">
        <span>⚠️ ${issue.nodeCount} element${issue.nodeCount !== 1 ? 's' : ''} affected</span>
      </div>
      <div class="sev-card-actions">
        <button type="button" class="btn-primary sev-go-btn" data-target="issue-${issue.originalIdx}">
          View Fix &amp; Go to Element →
        </button>
        ${issue.helpUrl ? `<a href="${issue.helpUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary sev-learn-link">WCAG Guideline</a>` : ''}
      </div>
    `;
    listEl.appendChild(card);
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.sev-go-btn');
    if (!btn) return;
    sessionStorage.setItem('focusIssueId', btn.dataset.target);
    window.location.href = 'results.html';
  });

  if (window.revealObserve) window.revealObserve(listEl.querySelectorAll('.reveal'));
});
