import './studio.js';

try {
  await import('./app.js');
} catch (error) {
  console.error('KoduDisain could not start:', error);
  document.getElementById('status-text').textContent = 'Tööala ei käivitunud. Kontrolli internetiühendust ja WebGL tuge ning värskenda lehte.';
  const message = document.createElement('div');
  message.className = 'startup-error';
  const title = document.createElement('strong');
  title.textContent = 'Tööala ei saanud avada';
  const description = document.createElement('p');
  description.textContent = '3D-vaade vajab WebGL tuge ja internetiühendust. Selles brauseris salvestatud töölaud jääb alles.';
  const retry = document.createElement('button');
  retry.textContent = 'Proovi uuesti'; retry.className = 'primary';
  retry.addEventListener('click', () => location.reload());
  message.append(title, description, retry);
  document.getElementById('viewport').append(message);
}
