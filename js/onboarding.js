const total = 3;
let current = 1;

const slides  = document.querySelectorAll('.slide');
const dots    = document.querySelectorAll('.ob-dot');
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');

function render(prev) {
  slides.forEach(s => {
    const isActive = +s.dataset.slide === current;
    s.classList.toggle('active', isActive);
    // Play/pause video
    const vid = s.querySelector('video');
    if (vid) {
      if (isActive) { vid.play().catch(() => {}); }
      else { vid.pause(); }
    }
  });

  dots.forEach(d => d.classList.toggle('active', +d.dataset.dot === current));

  backBtn.disabled = current === 1;
  const isLast = current === total;
  nextBtn.textContent = isLast ? '✦ Start Scanning' : 'Next →';
  nextBtn.classList.toggle('last', isLast);
}

nextBtn.addEventListener('click', () => {
  if (current === total) {
    localStorage.setItem('ob_done', '1');
    window.location.href = 'index.html';
    return;
  }
  current++;
  render();
});

backBtn.addEventListener('click', () => {
  if (current === 1) return;
  current--;
  render();
});

dots.forEach(d => d.addEventListener('click', () => {
  current = +d.dataset.dot;
  render();
}));

document.getElementById('skipLink').addEventListener('click', () => {
  localStorage.setItem('ob_done', '1');
});

// Keyboard arrow navigation
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' && current < total) { current++; render(); }
  if (e.key === 'ArrowLeft'  && current > 1)     { current--; render(); }
  if (e.key === 'Enter' && current === total) nextBtn.click();
});

render();
