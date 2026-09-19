let deferredPrompt = null;
let installListeners = [];

/**
 * Registra el Service Worker en el navegador
 */
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado con éxito con scope:', registration.scope);

          // Escuchar nuevas versiones del Service Worker
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nueva versión disponible. Recarga para actualizar.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[PWA] Fallo en registro de Service Worker:', error);
        });
    });

    // Capturar el evento de instalación para botón manual
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir el banner automático inmediato
      e.preventDefault();
      deferredPrompt = e;
      notifyInstallListeners(true);
      console.log('[PWA] Evento beforeinstallprompt capturado y listo para instalar.');
    });

    // Detectar cuando la app se instala con éxito
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      notifyInstallListeners(false);
      console.log('[PWA] Aplicación instalada exitosamente.');
    });
  }
};

/**
 * Invoca el diálogo nativo de instalación de la PWA
 */
export const promptPwaInstallation = async () => {
  if (!deferredPrompt) {
    console.log('[PWA] No hay evento de instalación pendiente o ya está instalada.');
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] Resultado de instalación del usuario: ${outcome}`);

  if (outcome === 'accepted') {
    deferredPrompt = null;
    notifyInstallListeners(false);
    return true;
  }
  return false;
};

/**
 * Suscribirse a cambios de disponibilidad de instalación
 */
export const onInstallStateChange = (callback) => {
  installListeners.push(callback);
  // Llamar de inmediato con el estado actual
  callback(!!deferredPrompt);

  return () => {
    installListeners = installListeners.filter((cb) => cb !== callback);
  };
};

const notifyInstallListeners = (isInstallable) => {
  installListeners.forEach((cb) => {
    try {
      cb(isInstallable);
    } catch (err) {
      console.error(err);
    }
  });
};
