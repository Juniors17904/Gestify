// ===== PWA =====

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.log('SW error:', err));
  });
}

// Prompt de instalación
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Mostrar botón de instalar si no está instalado
  const installBtn = document.getElementById('installBtn');
  if (installBtn) installBtn.classList.remove('hidden');
});

async function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('App instalada');
  }
  deferredPrompt = null;
}
