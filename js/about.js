// Screen 15 — About / Help
// Static page. Only behavior is the FAQ accordion toggle (reuses the
// .bp-item accordion styles from Best Practices, no localStorage needed).

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.bp-item').forEach(item => {
    const header = item.querySelector('.bp-item-header');
    const panel = item.querySelector('.bp-item-panel');
    header.addEventListener('click', () => {
      const isOpen = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      panel.classList.toggle('open', !isOpen);
    });
  });
});
