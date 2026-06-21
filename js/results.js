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

// Same formula as dashboard.js — keeps score consistent across pages
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
    helpUrl: v.helpUrl || '',
    ruleId: v.id || '',
    nodeHtml: (v.nodes && v.nodes[0] && v.nodes[0].html) || '',
    target: (v.nodes && v.nodes[0] && v.nodes[0].target && v.nodes[0].target[0]) || '',
    nodeCount: v.nodes.length
  }));

  const highCount = issues.filter(i => i.severity === 'high').length;
  const moderateCount = issues.filter(i => i.severity === 'moderate').length;
  const minorCount = issues.filter(i => i.severity === 'minor').length;

  document.getElementById('totalCount').textContent = issues.length;
  document.getElementById('highCount').textContent = highCount;
  document.getElementById('moderateCount').textContent = moderateCount;
  document.getElementById('minorCount').textContent = minorCount;

  // ── Live preview setup (powers "Go to Element") ──
  const scanHtml = sessionStorage.getItem('scanHtml');
  const previewAvailable = !!scanHtml;
  if (previewAvailable) {
    const previewFrame = document.getElementById('previewFrame');
    const previewPanel = document.getElementById('previewPanel');
    previewFrame.setAttribute('sandbox', 'allow-same-origin');
    previewFrame.srcdoc = scanHtml;
    previewPanel.hidden = false;
  }

 if (issues.length === 0) {
    issuesList.innerHTML = `
      <div class="no-issues-box">
        <div class="success-icon">✓</div>
        <h2>Great job!</h2>
        <p>No accessibility issues were found on this page.</p>
      </div>
    `;
} else {
    issues.forEach((issue, idx) => {
      const card = document.createElement('div');
      card.className = `issue-card ${issue.severity}`;

      const gotoBtn = (previewAvailable && issue.target)
        ? `<button type="button" class="goto-element-btn" data-idx="${idx}">📍 Go to Element</button>`
        : '';

      card.innerHTML = `
        <span class="badge ${issue.severity}">${issue.severity.toUpperCase()}</span>
        <h2>${escapeHtml(issue.title)}</h2>
        <p>${escapeHtml(issue.description)} (${issue.nodeCount} element${issue.nodeCount !== 1 ? 's' : ''} affected)</p>
        <div class="issue-card-actions">
          <button type="button" class="try-it-btn" data-idx="${idx}">
            🔧 How to Fix — See Example
          </button>
          ${gotoBtn}
        </div>
      `;

      issuesList.appendChild(card);
    });
  }

  // ── Interactive Fix Simulator ──
  let lastFocusedTrigger = null;

  function getFocusableEls(container) {
    return Array.from(
      container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(el => !el.disabled && el.offsetParent !== null);
  }

  function trapFixModalFocus(e) {
    if (e.key === 'Escape') {
      closeFixModal();
      return;
    }
    if (e.key !== 'Tab') return;
    const modal = document.getElementById('fixModal');
    const focusable = getFocusableEls(modal);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openFixModal(issue) {
    const data = (typeof FIX_DATA !== 'undefined' && FIX_DATA[issue.ruleId]) || FIX_DATA_GENERIC;

    const badge = document.getElementById('fixModalBadge');
    badge.textContent = issue.severity.toUpperCase();
    badge.className = `badge ${issue.severity}`;

    const modalEl = document.getElementById('fixModal');
    modalEl.classList.remove('fix-modal--high', 'fix-modal--moderate', 'fix-modal--minor');
    modalEl.classList.add(`fix-modal--${issue.severity}`);

    document.getElementById('fixModalTitle').textContent = issue.title;
    document.getElementById('fixModalFact').textContent = data.fact;
    document.getElementById('fixModalWhy').textContent = data.why || 'Refer to WCAG guidelines for full detail.';
    document.getElementById('fixModalWrongCode').textContent =
      issue.nodeHtml || 'Specific code snippet not available for this issue.';
    document.getElementById('fixModalRightCode').textContent =
      data.fixedExample || `See the reference link below for a worked example of the fix.`;

    const learnLink = document.getElementById('fixModalLearnLink');
    if (issue.helpUrl) {
      learnLink.href = issue.helpUrl;
      learnLink.hidden = false;
    } else {
      learnLink.hidden = true;
    }

    document.getElementById('fixModalCopiedMsg').hidden = true;

    lastFocusedTrigger = document.activeElement;
    const overlay = document.getElementById('fixModalOverlay');
    overlay.hidden = false;
    document.getElementById('fixModalClose').focus();
    document.addEventListener('keydown', trapFixModalFocus);
  }

  function closeFixModal() {
    document.getElementById('fixModalOverlay').hidden = true;
    document.removeEventListener('keydown', trapFixModalFocus);
    if (lastFocusedTrigger) lastFocusedTrigger.focus();
  }

  issuesList.querySelectorAll('.try-it-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      openFixModal(issues[idx]);
    });
  });

  document.getElementById('fixModalClose').addEventListener('click', closeFixModal);
  document.getElementById('fixModalOverlay').addEventListener('click', e => {
    if (e.target.id === 'fixModalOverlay') closeFixModal();
  });

  document.getElementById('fixModalCopyBtn').addEventListener('click', () => {
    const text = document.getElementById('fixModalRightCode').textContent;
    const copiedMsg = document.getElementById('fixModalCopiedMsg');
    navigator.clipboard.writeText(text).then(() => {
      copiedMsg.hidden = false;
      setTimeout(() => { copiedMsg.hidden = true; }, 2000);
    }).catch(() => {
      alert('Copy nahi ho saka — code ko manually select karke copy kar lo.');
    });
  });

  // ── Interactive Contextual Navigation ("Go to Element") ──
  const reduceMotionPref = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function goToElement(selector) {
    const previewFrame = document.getElementById('previewFrame');
    const previewPanel = document.getElementById('previewPanel');

    previewPanel.scrollIntoView({ behavior: reduceMotionPref ? 'auto' : 'smooth', block: 'start' });

    // Always force a fresh reload of the original scanned HTML before
    // searching for the element. This makes "Go to Element" self-healing:
    // even if the preview somehow ended up on a different page (e.g. a
    // blocked navigation), every click resets it back to the real scan.
    previewFrame.onload = () => {
      previewFrame.onload = null; // run once per click

      let targetEl;
      try {
        targetEl = previewFrame.contentDocument.querySelector(selector);
      } catch (e) {
        alert('Live preview load nahi ho saki — dobara try karo.');
        return;
      }

      if (!targetEl) {
        alert('Ye element live preview mein nahi mila — ho sakta hai page scan ke baad dynamically badal gaya ho.');
        return;
      }

      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: reduceMotionPref ? 'auto' : 'smooth', block: 'center' });
        targetEl.style.outline = '4px solid #e56f61';
        targetEl.style.outlineOffset = '2px';
      }, reduceMotionPref ? 0 : 150);
    };
    previewFrame.srcdoc = scanHtml;
  }

  issuesList.querySelectorAll('.goto-element-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      goToElement(issues[idx].target);
    });
  });

  // ── PDF Report Generation (jsPDF, client-side only) ──
  function generatePDF() {
    if (!window.jspdf) {
      alert('PDF library load nahi ho saki — internet connection check karo aur dobara try karo.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44;
    const contentWidth = pageWidth - margin * 2;
    const severityColors = {
      high: [192, 57, 43],
      moderate: [184, 101, 11],
      minor: [26, 95, 180]
    };

    function checkPageBreak(neededSpace) {
      if (y + neededSpace > pageHeight - 50) {
        doc.addPage();
        y = margin;
      }
    }

    // ── Letterhead header band ──
    doc.setFillColor(15, 94, 94); // teal-dark
    doc.rect(0, 0, pageWidth, 86, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('AccessiCheck', margin, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text('Accessibility Audit Report', margin, 64);

    let y = 86 + 36;

    // Meta info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`Website: ${url || 'N/A'}`, margin, y); y += 20;
    doc.text(`Scan date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, y); y += 28;

    const score = calculateScore(highCount, moderateCount, minorCount);
    const band = scoreBand(score);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`Overall Score: ${score} / 100  (${band.label})`, margin, y);
    y += 24;

    // ── Visual score breakdown bar ──
    const barH = 22;
    const total = issues.length;
    if (total === 0) {
      doc.setFillColor(15, 94, 94);
      doc.roundedRect(margin, y, contentWidth, barH, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('No issues found — perfect score!', margin + 10, y + barH / 2 + 3);
    } else {
      let bx = margin;
      const segments = [
        { count: highCount, color: severityColors.high },
        { count: moderateCount, color: severityColors.moderate },
        { count: minorCount, color: severityColors.minor }
      ];
      segments.forEach(seg => {
        if (seg.count === 0) return;
        const segW = (seg.count / total) * contentWidth;
        doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
        doc.rect(bx, y, segW, barH, 'F');
        bx += segW;
      });
      doc.setDrawColor(255, 255, 255);
    }
    y += barH + 14;

    // Legend swatches
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const legend = [
      { label: `High: ${highCount}`, color: severityColors.high },
      { label: `Moderate: ${moderateCount}`, color: severityColors.moderate },
      { label: `Minor: ${minorCount}`, color: severityColors.minor }
    ];
    let lx = margin;
    legend.forEach(item => {
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(lx, y - 8, 10, 10, 'F');
      doc.setTextColor(40, 40, 40);
      doc.text(item.label, lx + 14, y);
      lx += doc.getTextWidth(item.label) + 44;
    });
    y += 30;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`Total Issues: ${issues.length}`, margin, y);
    y += 30;

    // ── Issues list ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    checkPageBreak(24);
    doc.text('Issues Found', margin, y); y += 24;

    if (issues.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(70, 70, 70);
      doc.text('No accessibility issues were found on this page. Great work!', margin, y);
      y += 20;
    } else {
      issues.forEach((issue, index) => {
        checkPageBreak(70);
        const c = severityColors[issue.severity] || [40, 40, 40];

        // Badge — width measured dynamically so the title never overlaps it
        const badgeText = `[${issue.severity.toUpperCase()}]`;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(c[0], c[1], c[2]);
        doc.text(badgeText, margin, y);
        const badgeWidth = doc.getTextWidth(badgeText);
        const titleStartX = margin + badgeWidth + 10;

        doc.setTextColor(20, 20, 20);
        const titleLines = doc.splitTextToSize(`${index + 1}. ${issue.title}`, contentWidth - badgeWidth - 10);
        doc.text(titleLines, titleStartX, y);
        y += titleLines.length * 16 + 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(70, 70, 70);
        const descLines = doc.splitTextToSize(
          `${issue.description} (${issue.nodeCount} element${issue.nodeCount !== 1 ? 's' : ''} affected)`,
          contentWidth
        );
        checkPageBreak(descLines.length * 13 + 30);
        doc.text(descLines, margin, y);
        y += descLines.length * 13 + 8;

        if (issue.helpUrl) {
          doc.setTextColor(15, 94, 94);
          doc.setFontSize(10.5);
          doc.textWithLink(`Reference: ${issue.helpUrl}`, margin, y, { url: issue.helpUrl });
          y += 18;
        }

        y += 8;
        doc.setDrawColor(225, 225, 225);
        doc.line(margin, y - 4, pageWidth - margin, y - 4);
        y += 14;
      });
    }

    // ── Next Steps closing section ──
    checkPageBreak(120);
    doc.setFillColor(230, 244, 243); // teal-light
    const boxH = 108;
    doc.roundedRect(margin, y, contentWidth, boxH, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 94, 94);
    doc.text('Next Steps', margin + 16, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(50, 50, 50);
    const steps = issues.length === 0 ? [
      '1. Great work — no issues found on this scan!',
      "2. Re-scan periodically as your site changes to make sure it stays accessible.",
      '3. Your Dashboard keeps a history of every scan for this URL automatically.'
    ] : [
      '1. Fix the issues listed above, starting with High severity items.',
      "2. Use AccessiCheck's in-app 'How to Fix' button on each issue for a side-by-side code example.",
      '3. Re-scan this URL anytime — your Dashboard automatically tracks your improvement over time.'
    ];
    let stepY = y + 42;
    steps.forEach(line => {
      const lines = doc.splitTextToSize(line, contentWidth - 32);
      doc.text(lines, margin + 16, stepY);
      stepY += lines.length * 14;
    });
    y += boxH + 20;

    // Footer on every page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by AccessiCheck — Page ${i} of ${pageCount}`, margin, pageHeight - 20);
    }

    const safeName = (url || 'accessicheck-report')
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
    doc.save(`accessicheck-report-${safeName}.pdf`);
  }

  const downloadBtn = document.getElementById('downloadPdfBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', generatePDF);
  }
}