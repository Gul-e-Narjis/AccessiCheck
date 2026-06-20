const url = sessionStorage.getItem('scanUrl');
document.getElementById('scanningUrl').textContent = url || '';

const PROXIES = [
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${u}`,
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
        if (html && html.length > 100) {
          console.log(`Proxy ${i + 1} worked!`);
          return html;
        }
      }
    } catch (err) {
      console.warn(`Proxy ${i + 1} failed, trying next...`, err);
    }
  }
  throw new Error('All proxies failed');
}

function finishScan(error, violations) {
  if (error) {
    sessionStorage.setItem('scanError', 'true');
  } else {
    sessionStorage.setItem('scanResults', JSON.stringify(violations));
    sessionStorage.removeItem('scanError');
  }
  window.location.href = 'dashboard.html';
}

async function runScan() {
  try {
    let html = await fetchWithFallback(url);
    html = html.replace(/<head>/i, `<head><base href="${url}">`);

    const scannerScriptTag = `
      <script>
        (function() {
          var axeScript = document.createElement('script');
          axeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js';
          axeScript.onload = function() {
            axe.run(document, {}, function(err, results) {
              if (err) {
                parent.postMessage({ source: 'accessicheck-scan', error: true }, '*');
              } else {
                parent.postMessage({ source: 'accessicheck-scan', violations: results.violations }, '*');
              }
            });
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
      finishScan(event.data.error, event.data.violations);
    });

    iframe.srcdoc = html;

  } catch (err) {
    console.error(err);
    finishScan(true);
  }
}

runScan();