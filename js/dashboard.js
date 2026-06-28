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
    good: '#edc05b',      // gold — brand accent
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
// ── Persona Points ──
(function () {
  const ptsEl = document.getElementById('personaPts');
  if (!ptsEl) return;
  // pts earned = minorCount*2 pts improvement for screen readers
  // We'll update this after score is loaded
  window.addEventListener('load', function () {
    const lbl = document.getElementById('scoreLabel');
    if (!lbl) return;
    // derive a simple pts badge from score band
    const band = lbl.classList.contains('good') ? 8 : lbl.classList.contains('moderate') ? 4 : 1;
    ptsEl.textContent = `+${band} pts`;
  });
})();

// ── Build Recommendations from violations ──
(function () {
  window.addEventListener('load', function () {
    const recList = document.getElementById('recList');
    if (!recList) return;
    const violations = JSON.parse(sessionStorage.getItem('scanResults') || '[]');
    if (!violations.length) return;

    // Sort by severity: high first, then moderate, then minor
    const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    const sorted = violations.slice().sort(function (a, b) {
      return (severityOrder[a.impact] || 3) - (severityOrder[b.impact] || 3);
    });

    // Deduplicate by help text, take top 5
    const seen = new Set();
    const recs = [];
    for (var i = 0; i < sorted.length && recs.length < 5; i++) {
      const label = sorted[i].help || sorted[i].id || 'Review Issue';
      if (!seen.has(label)) {
        seen.add(label);
        recs.push({ label: label, url: sorted[i].helpUrl || '' });
      }
    }

    recList.innerHTML = recs.map(function (r) {
      const inner = r.url
        ? `<a href="${r.url}" target="_blank" rel="noopener" class="rec-link">${r.label}</a>`
        : r.label;
      return `<li><span class="rec-check">✓</span> ${inner}</li>`;
    }).join('');
  });
})();

// ── Score History Chart ──
(function () {
  function drawHistoryChart() {
    const canvas = document.getElementById('historyCanvas');
    const xLabels = document.getElementById('historyXLabels');
    const emptyMsg = document.getElementById('historyEmpty');
    if (!canvas) return;

    function normalizeUrl(u) {
      return (u || '').trim().toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '');
    }
    function getHistory() {
      try { return JSON.parse(localStorage.getItem('ac_scan_history') || '{}'); } catch { return {}; }
    }

    const url = sessionStorage.getItem('scanUrl');
    const key = normalizeUrl(url);
    const history = getHistory();
    const pastScans = history[key] || [];

    if (pastScans.length < 2) {
      if (emptyMsg) emptyMsg.hidden = false;
      canvas.style.display = 'none';
      return;
    }

    const ctx = canvas.getContext('2d');
    // getBoundingClientRect avoids offsetWidth=0 race condition on load
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : 600;
    const h = 140;
    canvas.width = w;
    canvas.height = h;

    const scores = pastScans.map(function (s) { return s.score; });
    const dates = pastScans.map(function (s) {
      const d = new Date(s.timestamp);
      const mo = d.getMonth() + 1;
      const day = d.getDate();
      const hr = d.getHours();
      const mn = String(d.getMinutes()).padStart(2, '0');
      const ampm = hr >= 12 ? 'pm' : 'am';
      const h12 = (hr % 12) || 12;
      return (mo + '/' + day) + '\n' + h12 + ':' + mn + ampm;
    });

    const minRaw = Math.min.apply(null, scores);
    const maxRaw = Math.max.apply(null, scores);

    var minScore, maxScore;
    if (minRaw === maxRaw) {
      minScore = Math.max(0, minRaw - 20);
      maxScore = Math.min(100, minRaw + 5);
    } else {
      minScore = Math.max(0, minRaw - 10);
      maxScore = Math.min(100, maxRaw + 5);
    }

    const pad = { t: 20, r: 16, b: 36, l: 34 };
    const chartW = w - pad.l - pad.r;
    const chartH = h - pad.t - pad.b;

    function xPos(i) { return pad.l + (i / (scores.length - 1)) * chartW; }
    function yPos(v) {
      return pad.t + chartH - ((v - minScore) / (maxScore - minScore)) * chartH;
    }

    // y grid lines
    ctx.strokeStyle = '#eef0f2';
    ctx.lineWidth = 1;
    const tickStep = (maxScore - minScore) <= 20 ? 5 : 25;
    const tickStart = Math.ceil(minScore / tickStep) * tickStep;
    for (var tv = tickStart; tv <= maxScore; tv += tickStep) {
      const y = yPos(tv);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.fillStyle = '#bbb';
      ctx.font = '9px sans-serif';
      ctx.fillText(tv, 2, y + 3);
    }

    // Area fill — gold tint
    ctx.beginPath();
    scores.forEach(function (s, i) {
      if (i === 0) ctx.moveTo(xPos(i), yPos(s));
      else ctx.lineTo(xPos(i), yPos(s));
    });
    ctx.lineTo(xPos(scores.length - 1), pad.t + chartH);
    ctx.lineTo(pad.l, pad.t + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(237,192,91,0.12)';
    ctx.fill();

    // Line — gold
    ctx.beginPath();
    scores.forEach(function (s, i) {
      if (i === 0) ctx.moveTo(xPos(i), yPos(s));
      else ctx.lineTo(xPos(i), yPos(s));
    });
    ctx.strokeStyle = '#edc05b';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots + score labels
    scores.forEach(function (s, i) {
      ctx.beginPath();
      ctx.arc(xPos(i), yPos(s), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#edc05b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s, xPos(i), yPos(s) - 9);
    });

    // X labels
    if (xLabels) {
      xLabels.innerHTML = dates.map(function (d) {
        const parts = d.split('\n');
        return '<span style="display:flex;flex-direction:column;align-items:center;line-height:1.2">'
          + '<span>' + parts[0] + '</span>'
          + '<span style="color:#bbb;font-size:0.58rem">' + parts[1] + '</span>'
          + '</span>';
      }).join('');
    }
  }

  // Use requestAnimationFrame after load so canvas has correct dimensions
  if (document.readyState === 'complete') {
    requestAnimationFrame(drawHistoryChart);
  } else {
    window.addEventListener('load', function () {
      requestAnimationFrame(drawHistoryChart);
    });
  }
})();
