// Map axe-core's impact levels to our 3 severity buckets (same logic as results.js)
function mapSeverity(impact) {
  if (impact === 'critical' || impact === 'serious') return 'high';
  if (impact === 'moderate') return 'moderate';
  return 'minor';
}

// Score formula: start at 100, subtract weighted penalty per issue, floor at 0
function calculateScore(highCount, moderateCount, minorCount) {
  const penalty = (highCount * 10) + (moderateCount * 5) + (minorCount * 2);
  return Math.max(0, 100 - penalty);
}

function scoreBand(score) {
  if (score >= 80) return { key: 'good', label: 'Good' };
  if (score >= 50) return { key: 'moderate', label: 'Needs Improvement' };
  return { key: 'poor', label: 'Poor' };
}

const url = sessionStorage.getItem('scanUrl');
document.getElementById('scannedUrl').textContent = url ? `Scanned: ${url}` : '';

const scanError = sessionStorage.getItem('scanError');

if (scanError === 'true') {
  document.getElementById('scoreState').hidden = true;
  document.getElementById('errorState').hidden = false;
} else {
  const violations = JSON.parse(sessionStorage.getItem('scanResults') || '[]');

  const severities = violations.map(v => mapSeverity(v.impact));
  const highCount = severities.filter(s => s === 'high').length;
  const moderateCount = severities.filter(s => s === 'moderate').length;
  const minorCount = severities.filter(s => s === 'minor').length;

  const score = calculateScore(highCount, moderateCount, minorCount);
  const band = scoreBand(score);

  document.getElementById('highCount').textContent = highCount;
  document.getElementById('moderateCount').textContent = moderateCount;
  document.getElementById('minorCount').textContent = minorCount;

  const scoreLabel = document.getElementById('scoreLabel');
  scoreLabel.textContent = band.label;
  scoreLabel.classList.add(band.key);

  // ── Accessibility Debt Tracker (gamification, localStorage-based) ──
  function normalizeUrl(u) {
    return (u || '').trim().toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '');
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('ac_scan_history') || '{}');
    } catch {
      return {};
    }
  }

  function saveHistory(history) {
    localStorage.setItem('ac_scan_history', JSON.stringify(history));
  }

  const totalIssues = highCount + moderateCount + minorCount;
  const history = getHistory();
  const key = normalizeUrl(url);
  const pastScans = history[key] || [];
  const lastScan = pastScans[pastScans.length - 1];

  const progressCard = document.getElementById('progressCard');
  const progressIcon = document.getElementById('progressIcon');
  const progressText = document.getElementById('progressText');

  progressCard.hidden = false;

  if (lastScan) {
    const scoreDelta = score - lastScan.score;
    const issuesDelta = lastScan.total - totalIssues; // positive = fixed

    if (issuesDelta > 0) {
      progressCard.className = 'progress-card up';
      progressIcon.textContent = '🎉';
      progressText.textContent = `${issuesDelta} issue${issuesDelta !== 1 ? 's' : ''} fixed since last scan! Score ${scoreDelta >= 0 ? '+' : ''}${scoreDelta} (${lastScan.score} → ${score}).`;
    } else if (issuesDelta < 0) {
      progressCard.className = 'progress-card down';
      progressIcon.textContent = '⚠️';
      progressText.textContent = `${Math.abs(issuesDelta)} new issue${Math.abs(issuesDelta) !== 1 ? 's' : ''} since last scan. Score ${scoreDelta} (${lastScan.score} → ${score}).`;
    } else {
      progressCard.className = 'progress-card same';
      progressIcon.textContent = '➖';
      progressText.textContent = `No change since last scan — still ${totalIssues} issue${totalIssues !== 1 ? 's' : ''}.`;
    }
  } else {
    progressCard.className = 'progress-card same';
    progressIcon.textContent = '✨';
    progressText.textContent = 'First scan of this site — scan it again later to track your progress here.';
  }

  // Save this scan into history (keep last 10 per URL)
  pastScans.push({
    timestamp: Date.now(),
    score,
    total: totalIssues,
    high: highCount,
    moderate: moderateCount,
    minor: minorCount
  });
  history[key] = pastScans.slice(-10);
  saveHistory(history);

  const gaugeFg = document.getElementById('gaugeFg');
  const colorMap = {
    good: '#14817b',      // var(--teal-primary)
    moderate: '#b8650b',  // var(--severity-moderate)
    poor: '#c0392b'       // var(--severity-high)
  };
  gaugeFg.style.stroke = colorMap[band.key];

  const totalLength = gaugeFg.getTotalLength();
  const targetOffset = totalLength * (1 - score / 100);

  const scoreNumberText = document.getElementById('scoreNumberText');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Skip animation entirely, just show the final state
    gaugeFg.style.strokeDasharray = totalLength;
    gaugeFg.style.strokeDashoffset = targetOffset;
    scoreNumberText.textContent = score;
  } else {
    gaugeFg.style.strokeDasharray = totalLength;
    gaugeFg.style.strokeDashoffset = totalLength; // start empty

    requestAnimationFrame(() => {
      gaugeFg.style.transition = 'stroke-dashoffset 1s ease-out';
      gaugeFg.style.strokeDashoffset = targetOffset;
    });

    // Animate the number counting up alongside the arc
    let current = 0;
    const step = Math.max(1, Math.round(score / 25));
    const countInterval = setInterval(() => {
      current = Math.min(score, current + step);
      scoreNumberText.textContent = current;
      if (current >= score) clearInterval(countInterval);
    }, 25);
  }

  document.getElementById('errorState').hidden = true;
}