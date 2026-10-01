const url = sessionStorage.getItem('scanUrl');
document.getElementById('scanningUrl').textContent = url || '';

// NOTE on proxy order (based on real console testing):
// - corsproxy.io works on 127.0.0.1/localhost (whitelisted dev origin) but
//   has a strict rate limit — can return 429 if hit too often in a short time.
// - codetabs wants the target URL RAW (not encodeURIComponent'd), otherwise
//   it returns 400 Bad Request.
// - thingproxy.freeboard.io's DNS isn't resolving anymore (service looks
//   discontinued) — kept only as a last-ditch fallback.
const PROXIES = [
  (u) => `https://api.codetabs.com/v1/proxy?quest=${u}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`
];

async function fetchWithFallback(targetUrl) {
  for (let i = 0; i < PROXIES.length; i++) {
    try {
      const proxyUrl = PROXIES[i](targetUrl);
      console.log(`Trying proxy ${i + 1}...`, proxyUrl);
      const response = await fetch(proxyUrl);

      if (response.ok) {
        const html = await response.text();
        // Some proxies (esp. corsproxy.io on a blocked origin) return a 200
        // status but with a plain-text/JSON error message instead of the
        // actual page — guard against treating that as a real scan target.
        const looksLikeHtml = /<html[\s>]|<!doctype html/i.test(html);
        if (html && html.length > 100 && looksLikeHtml) {
          console.log(`Proxy ${i + 1} worked!`);
          return html;
        } else {
          console.warn(`Proxy ${i + 1} returned non-HTML/blocked response, trying next...`);
        }
      }
    } catch (err) {
      console.warn(`Proxy ${i + 1} failed, trying next...`, err);
    }
  }
  throw new Error('All proxies failed');
}

function finishScan(error, violations, cleanHtml) {
  if (error) {
    sessionStorage.setItem('scanError', 'true');
    sessionStorage.removeItem('scanHtml');
  } else {
    sessionStorage.setItem('scanResults', JSON.stringify(violations));
    sessionStorage.removeItem('scanError');
    try {
      sessionStorage.setItem('scanHtml', cleanHtml || '');
    } catch (e) {
      console.warn('Could not store scanHtml (quota exceeded) — live preview will be unavailable.', e);
      sessionStorage.removeItem('scanHtml');
    }

    // ── Backend mein save karo (additive — core logic untouched) ──
  // ── Backend mein save karo (additive — core logic untouched) ──
// Backend mein frontend results save karo
    const token = localStorage.getItem('ac_token');
    if (token && violations) {
      const critical = violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length;
      const moderate = violations.filter(v => v.impact === 'moderate').length;
      const minor = violations.filter(v => v.impact === 'minor' || v.impact === 'low').length;
      const score = Math.max(0, 100 - (critical * 10 + moderate * 5 + minor * 2));

      fetch('https://accessicheck-backend.vercel.app/api/scan/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url, score, critical, moderate, minor, issues: violations })
      }).catch(err => console.warn('Backend save failed:', err));
    }
  }
  window.location.href = 'dashboard.html';
}

async function runScan() {
  try {
    // Optional WCAG-level preference from the new Settings screen.
    // Defaults to axe-core's full default rule set (identical to prior
    // behavior) when no preference has been saved — nothing changes
    // unless the user explicitly picks a level in Settings.
    // Only A and AA are supported (AAA removed from UI — fall back to AA if stale value found)
    const rawLevel = localStorage.getItem('ac_wcag_level') || 'aa';
    const wcagLevel = (rawLevel === 'a') ? 'a' : 'aa';
    // 'best-practice' is ALWAYS included regardless of WCAG level —
    // removing it caused sites with only best-practice violations to show 0 issues / score 100.
    const wcagTagMap = {
      a:  ['wcag2a', 'wcag21a', 'best-practice'],
      aa: ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa', 'best-practice']
    };
    const axeOptions = wcagTagMap[wcagLevel]
      ? { runOnly: { type: 'tag', values: wcagTagMap[wcagLevel] } }
      : {};

    let html = await fetchWithFallback(url);
    html = html.replace(/<head>/i, `<head><base href="${url}">`);

    // Strip Content-Security-Policy meta tags — they can block axe-core loading
    // from cdnjs.cloudflare.com, causing a silent scan failure (0 violations → score 100).
    html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, '');

    // Keep an unmodified copy (no scanner script) for the live preview iframe
    const cleanHtml = html;

    const scannerScriptTag = `
      <script>
        (function() {
          var axeScript = document.createElement('script');
          axeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js';
          axeScript.onload = function() {
            // 500ms delay — lets the page's own scripts initialize before axe scans,
            // preventing SPAs / JS-rendered sites from showing 0 violations.
            setTimeout(function() {
              axe.run(document, ${JSON.stringify(axeOptions)}, function(err, results) {
                if (err) {
                  parent.postMessage({ source: 'accessicheck-scan', error: true }, '*');
                } else {
                  parent.postMessage({ source: 'accessicheck-scan', violations: results.violations }, '*');
                }
              });
            }, 500);
          };
          axeScript.onerror = function() {
            parent.postMessage({ source: 'accessicheck-scan', error: true }, '*');
          };
          document.head.appendChild(axeScript);
        })();
      </script>
    `;

    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${scannerScriptTag}</body>`);
    } else {
      html += scannerScriptTag;
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    document.body.appendChild(iframe);

    let finished = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        finishScan(true);
      }
    }, 20000);

    window.addEventListener('message', function handleMessage(event) {
      if (!event.data || event.data.source !== 'accessicheck-scan') return;
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      finishScan(event.data.error, event.data.violations, cleanHtml);
    });

    iframe.srcdoc = html;

  } catch (err) {
    console.error(err);
    finishScan(true);
  }
}

runScan();