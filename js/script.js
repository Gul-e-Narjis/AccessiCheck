const form = document.getElementById('scanForm');

form.addEventListener('submit', function (e) {
  e.preventDefault();
  const url = document.getElementById('urlInput').value;

  sessionStorage.setItem('scanUrl', url);
  window.location.href = 'scanning.html';
});