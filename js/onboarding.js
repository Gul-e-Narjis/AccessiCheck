const steps = document.querySelectorAll('.onboarding-step');
const dots = document.querySelectorAll('.progress-dots span');
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');

let current = 1;
const totalSteps = steps.length;

function render() {
  steps.forEach(step => {
    step.classList.toggle('active', Number(step.dataset.step) === current);
  });
  dots.forEach(dot => {
    dot.classList.toggle('active', Number(dot.dataset.dot) === current);
  });

  backBtn.disabled = current === 1;
  nextBtn.textContent = current === totalSteps ? 'Get Started' : 'Next';
}

nextBtn.addEventListener('click', () => {
  if (current === totalSteps) {
    window.location.href = 'index.html';
    return;
  }
  current += 1;
  render();
});

backBtn.addEventListener('click', () => {
  if (current === 1) return;
  current -= 1;
  render();
});

render();
