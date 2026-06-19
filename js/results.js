// Escape any HTML tags inside text so they show as literal text (no broken rendering)
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Map axe-core's impact levels to our 3 severity buckets
function mapSeverity(impact) {
  if (impact === 'critical' || impact === 'serious') return 'high';
  if (impact === 'moderate') return 'moderate';
  return 'minor';
}

const url = sessionStorage.getItem('scanUrl');
document.getElementById('scannedUrl').textContent = url ? `Scanned: ${url}` : '';

const scanError = sessionStorage.getItem('scanError');
const issuesList = document.getElementById('issuesList');

if (scanError === 'true') {
  // Simple inline error for now — dedicated Error screen agle step mein banayenge
  document.querySelector('.results-page').innerHTML = `
    <h1>Scan Failed</h1>
    <p>We couldn't scan this website. It may be blocking automated access, or the URL might be incorrect.</p>
    <a href="index.html" class="back-link">&larr; Try another URL</a>
  `;
} else {
  const violations = JSON.parse(sessionStorage.getItem('scanResults') || '[]');

  const issues = violations.map(v => ({
    severity: mapSeverity(v.impact),
    title: v.help,
    description: v.description,
    fix: v.helpUrl ? `See detailed guidance: ${v.helpUrl}` : 'Refer to WCAG guidelines for this issue.',
    nodeCount: v.nodes.length
  }));

  const highCount = issues.filter(i => i.severity === 'high').length;
  const moderateCount = issues.filter(i => i.severity === 'moderate').length;
  const minorCount = issues.filter(i => i.severity === 'minor').length;

  document.getElementById('totalCount').textContent = issues.length;
  document.getElementById('highCount').textContent = highCount;
  document.getElementById('moderateCount').textContent = moderateCount;
  document.getElementById('minorCount').textContent = minorCount;

 if (issues.length === 0) {
    issuesList.innerHTML = `
      <div class="no-issues-box">
        <div class="success-icon">✓</div>
        <h2>Great job!</h2>
        <p>No accessibility issues were found on this page.</p>
      </div>
    `;
} else {
    issues.forEach(issue => {
      const card = document.createElement('div');
      card.className = `issue-card ${issue.severity}`;

      card.innerHTML = `
        <span class="badge ${issue.severity}">${issue.severity.toUpperCase()}</span>
        <h2>${escapeHtml(issue.title)}</h2>
        <p>${escapeHtml(issue.description)} (${issue.nodeCount} element${issue.nodeCount !== 1 ? 's' : ''} affected)</p>
        <div class="fix-box">
          <strong>How to fix:</strong> ${escapeHtml(issue.fix)}
        </div>
      `;

      issuesList.appendChild(card);
    });
  }
}