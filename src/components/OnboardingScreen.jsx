import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, Bell, BellOff, CheckCircle, Smartphone,
  ArrowRight, X, ExternalLink, Loader2
} from 'lucide-react';
import { requestNotificationPermissionAndToken, getNotificationPermission } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

const LS_KEY = 'ucnl_onboarding_done';

// ── Detección de entorno ───────────────────────────────────────────────────────
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Verificar si la PWA está instalada usando getInstalledRelatedApps (Chrome 73+)
async function checkPWAInstalled() {
  if (!('getInstalledRelatedApps' in navigator)) return false;
  try {
    const apps = await navigator.getInstalledRelatedApps();
    return apps.length > 0;
  } catch {
    return false;
  }
}

// Intentar abrir la PWA navegando a la misma URL
// Chrome en Android intercepta esto y abre la app instalada
function tryOpenPWA() {
  // Intentar con la URL actual — Chrome redirije al PWA si está instalado
  const url = window.location.href;
  window.location.href = url;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }) {
  const { currentUser } = useAuth();

  // Estados:
  // 'checking'  → detectando si la PWA está instalada
  // 'open-app'  → PWA instalada, invitar a abrir
  // 'install'   → PWA no instalada, invitar a instalar
  // 'notify'    → pedir permiso de notificaciones
  const [step, setStep] = useState('checking');

  const [deferredPrompt, setDeferredPrompt] = useState(
    () => window.__ucnl_pwa_prompt || null
  );
  const [installing, setInstalling] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyError, setNotifyError] = useState('');
  const [notifyDone, setNotifyDone] = useState(false);
  const [openAttempts, setOpenAttempts] = useState(0);

  // Escuchar si el prompt llega después
  useEffect(() => {
    const handler = () => {
      if (window.__ucnl_pwa_prompt) setDeferredPrompt(window.__ucnl_pwa_prompt);
    };
    window.addEventListener('ucnl-pwa-prompt-ready', handler);
    if (window.__ucnl_pwa_prompt) setDeferredPrompt(window.__ucnl_pwa_prompt);
    return () => window.removeEventListener('ucnl-pwa-prompt-ready', handler);
  }, []);

  // Lógica principal al montar
  useEffect(() => {
    // Si ya está corriendo como PWA standalone → ir directo a notificaciones o terminar
    if (isStandalone()) {
      const perm = getNotificationPermission();
      if (perm === 'granted') {
        onDone(); // Todo perfecto
      } else {
        setStep('notify');
      }
      return;
    }

    // Detectar si la PWA está instalada pero el usuario abrió el navegador
    checkPWAInstalled().then((installed) => {
      if (installed) {
        setStep('open-app');
      } else {
        setStep('install');
      }
    });
  }, []);

  const markDone = useCallback(() => {
    localStorage.setItem(LS_KEY, '1');
    onDone();
  }, [onDone]);

  // ── Instalar ─────────────────────────────────────────────────────────────────
  const handleInstall = async () => {
    const prompt = deferredPrompt || window.__ucnl_pwa_prompt;
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      window.__ucnl_pwa_prompt = null;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        setTimeout(() => setStep('notify'), 800);
      }
    } catch (e) {
      console.warn('Install prompt error:', e);
    } finally {
      setInstalling(false);
    }
  };

  // ── Abrir la PWA instalada ───────────────────────────────────────────────────
  const handleOpenApp = () => {
    setOpenAttempts(n => n + 1);
    tryOpenPWA();
    // Si Chrome no redirigió automáticamente, mostrar instrucción manual
  };

  // ── Notificaciones ───────────────────────────────────────────────────────────
  const handleEnableNotifications = async () => {
    setNotifyLoading(true);
    setNotifyError('');
    try {
      await requestNotificationPermissionAndToken(currentUser);
      setNotifyDone(true);
      setTimeout(() => markDone(), 1200);
    } catch (err) {
      setNotifyError(err.message || 'No se pudieron activar las notificaciones.');
    } finally {
      setNotifyLoading(false);
    }
  };

  // ── Renders por step ─────────────────────────────────────────────────────────

  // Detectando...
  if (step === 'checking') {
    return (
      <Screen>
        <Logo />
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mt-4" />
        <p className="text-slate-500 text-sm mt-3">Verificando instalación...</p>
      </Screen>
    );
  }

  // PWA instalada → invitar a abrir
  if (step === 'open-app') {
    return (
      <Screen>
        <Logo />
        <div className="w-full max-w-xs bg-green-900/30 border border-green-700/50 rounded-2xl p-4 mb-5 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-white font-bold text-sm">¡La app está instalada!</p>
          <p className="text-green-300 text-xs mt-1">
            Abre UCNL Actividades desde tu pantalla de inicio para la mejor experiencia.
          </p>
        </div>

        <button
          onClick={handleOpenApp}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-4 px-6 rounded-2xl text-base transition-all shadow-lg shadow-blue-900/40 mb-3"
        >
          <ExternalLink className="w-5 h-5" />
          Abrir en la App
        </button>

        {openAttempts > 0 && (
          <div className="w-full max-w-xs bg-slate-800 rounded-xl p-3 mb-3 text-xs text-slate-400 text-center">
            Si no se abrió automáticamente, busca el ícono de
            <strong className="text-white"> UCNL Actividades</strong> en tu pantalla de inicio.
          </div>
        )}

        <button
          onClick={() => setStep('notify')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          Continuar en el navegador
        </button>
      </Screen>
    );
  }

  // iOS: instrucciones manuales de instalación
  if (step === 'install' && isIOS()) {
    return (
      <Screen>
        <Logo />
        <h2 className="text-xl font-bold text-white mb-2">Instala la App</h2>
        <p className="text-slate-400 text-sm mb-5 text-center max-w-xs">
          Para acceso rápido y notificaciones, instala UCNL en tu iPhone:
        </p>
        <div className="bg-slate-800 rounded-2xl p-4 w-full max-w-xs space-y-3 text-sm text-slate-300 mb-5">
          <IOSStep n={1}>Toca el botón <strong className="text-white">Compartir</strong> <span className="bg-slate-700 rounded px-1.5 py-0.5 text-xs">⬆</span> en Safari</IOSStep>
          <IOSStep n={2}>Selecciona <strong className="text-white">"Agregar a pantalla de inicio"</strong></IOSStep>
          <IOSStep n={3}>Toca <strong className="text-white">Agregar</strong> arriba a la derecha</IOSStep>
          <IOSStep n={4}>Abre la app desde tu pantalla de inicio</IOSStep>
        </div>
        <button onClick={() => setStep('notify')} className="flex items-center gap-2 text-blue-400 text-sm hover:text-blue-300 transition-colors">
          <ArrowRight className="w-4 h-4" /> Ya la instalé, continuar
        </button>
        <SkipBtn onClick={markDone} label="Omitir por ahora" />
      </Screen>
    );
  }

  // Android/Chrome/Edge: botón de instalación o instrucciones manuales
  if (step === 'install') {
    const canInstall = !!(deferredPrompt || window.__ucnl_pwa_prompt);

    return (
      <Screen>
        <Logo />
        <h2 className="text-xl font-bold text-white mb-2">Instala la App</h2>
        <p className="text-slate-400 text-sm mb-6 text-center max-w-xs">
          Instala UCNL Actividades para acceso rápido y recibir notificaciones de entregas escolares.
        </p>

        {canInstall ? (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="w-full max-w-xs flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-4 px-6 rounded-2xl text-base transition-all shadow-lg shadow-blue-900/40 mb-4"
          >
            <Download className="w-5 h-5" />
            {installing ? 'Instalando...' : 'Instalar App'}
          </button>
        ) : (
          <div className="w-full max-w-xs space-y-2 mb-4">
            <p className="text-slate-400 text-xs text-center mb-2">Instala manualmente desde el menú de tu navegador:</p>
            <div className="bg-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 flex items-start gap-2">
              <span className="text-blue-400 font-bold shrink-0">Chrome:</span>
              <span>⋮ → <strong className="text-white">Instalar aplicación</strong></span>
            </div>
            <div className="bg-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 flex items-start gap-2">
              <span className="text-blue-400 font-bold shrink-0">Edge:</span>
              <span>⋮ → Aplicaciones → <strong className="text-white">Instalar este sitio</strong></span>
            </div>
            <div className="bg-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 flex items-start gap-2">
              <span className="text-blue-400 font-bold shrink-0">Samsung:</span>
              <span>⋮ → <strong className="text-white">Agregar página a</strong> → Pantalla de inicio</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setStep('notify')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors mb-1"
        >
          <ArrowRight className="w-4 h-4" />
          {canInstall ? 'Continuar sin instalar' : 'Ya la instalé, continuar'}
        </button>
        <SkipBtn onClick={markDone} label="Omitir" />
      </Screen>
    );
  }

  // Notificaciones
  if (step === 'notify') {
    const alreadyGranted = getNotificationPermission() === 'granted';
    return (
      <Screen>
        <Logo />
        <h2 className="text-xl font-bold text-white mb-2">¡Activa las Notificaciones!</h2>
        <p className="text-slate-300 text-sm mb-6 text-center max-w-xs leading-relaxed">
          Recibe las últimas novedades y recordatorios de entregas en tiempo real. <strong className="text-blue-300 font-semibold block mt-1">¡De lo contrario te estás perdiendo la mejor parte de la aplicación!</strong>
        </p>

        {notifyDone || alreadyGranted ? (
          <>
            <CheckCircle className="w-14 h-14 text-green-400 mb-3" />
            <p className="text-green-300 font-semibold mb-4">¡Notificaciones activas!</p>
            <button onClick={markDone} className="flex items-center gap-2 text-blue-400 font-semibold text-sm hover:text-blue-300">
              Entrar a la app <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEnableNotifications}
              disabled={notifyLoading}
              className="w-full max-w-xs flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold py-4 px-6 rounded-2xl text-base transition-all shadow-lg shadow-green-900/40 mb-3"
            >
              <Bell className="w-5 h-5" />
              {notifyLoading ? 'Activando...' : 'Activar Notificaciones'}
            </button>
            {notifyError && (
              <p className="text-red-400 text-xs text-center max-w-xs mb-2 bg-red-900/20 rounded-xl px-3 py-2">{notifyError}</p>
            )}
            <SkipBtn onClick={markDone} label="Omitir por ahora" icon={<BellOff className="w-4 h-4" />} />
          </>
        )}
      </Screen>
    );
  }

  return null;
}

// ── Sub-componentes ────────────────────────────────────────────────────────────
function Screen({ children }) {
  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
      {children}
    </div>
  );
}

function Logo() {
  return (
    <div className="mb-6 flex flex-col items-center">
      <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-900/50 mb-4 overflow-hidden">
        <img src="/icons/icon-192.png" alt="UCNL" className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
      <span className="text-white font-black text-2xl tracking-tight">UCNL</span>
      <span className="text-blue-400 text-xs font-semibold tracking-widest uppercase">Actividades</span>
    </div>
  );
}

function IOSStep({ n, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">{n}</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function SkipBtn({ onClick, label = 'Omitir', icon }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors mt-2">
      {icon || <X className="w-4 h-4" />}
      {label}
    </button>
  );
}
