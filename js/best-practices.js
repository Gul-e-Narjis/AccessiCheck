// Screen 08 — Best Practices
// Static educational content. Only "core" data this touches is a NEW,
// separate localStorage key (ac_best_practices_progress) — does not read
// or write anything scanning.js / dashboard.js already use.

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'ac_best_practices_progress';
  const items = Array.from(document.querySelectorAll('.bp-item'));
  const fill = document.getElementById('bpProgressFill');
  const countLabel = document.getElementById('bpProgressCount');

  function getDone() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function setDone(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function updateProgress() {
    const done = getDone();
    const pct = Math.round((done.length / items.length) * 100);
    fill.style.width = pct + '%';
    countLabel.textContent = `${done.length} / ${items.length} reviewed`;
    items.forEach(item => {
      const id = item.dataset.bpId;
      item.classList.toggle('done', done.includes(id));
      const checkLabel = item.querySelector('.bp-item-check');
      if (checkLabel) checkLabel.textContent = done.includes(id) ? '✓ Reviewed' : 'Not reviewed';
      const markBtn = item.querySelector('.bp-mark-done-btn');
      if (markBtn) markBtn.textContent = done.includes(id) ? '✓ Marked as reviewed' : '✓ Mark as reviewed';
    });
  }

  items.forEach(item => {
    const header = item.querySelector('.bp-item-header');
    const panel = item.querySelector('.bp-item-panel');
    header.addEventListener('click', () => {
      const isOpen = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      panel.classList.toggle('open', !isOpen);
    });

    const markBtn = item.querySelector('.bp-mark-done-btn');
    if (markBtn) {
      markBtn.addEventListener('click', () => {
        const id = item.dataset.bpId;
        let done = getDone();
        if (done.includes(id)) {
          done = done.filter(d => d !== id);
        } else {
          done.push(id);
          if (window.showToast) window.showToast('Marked as reviewed ✓');
        }
        setDone(done);
        updateProgress();
      });
    }
  });

  updateProgress();
});
