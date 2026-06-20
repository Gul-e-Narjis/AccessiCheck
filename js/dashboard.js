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
