const API_BASE = 'http://localhost:5000/api';
const form = document.getElementById('scanForm');

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const url = document.getElementById('urlInput').value;
  const token = localStorage.getItem('ac_token');

  sessionStorage.setItem('scanUrl', url);

  // Agar token hai toh backend scan karo
  if (token) {
    sessionStorage.setItem('useBackend', 'true');
  } else {
    sessionStorage.setItem('useBackend', 'false');
  }

  window.location.href = 'scanning.html';
});