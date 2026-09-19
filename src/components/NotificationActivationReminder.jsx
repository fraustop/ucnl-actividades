import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Sparkles, X, CheckCircle, ShieldAlert, ChevronRight, Loader2 } from 'lucide-react';
import { requestNotificationPermissionAndToken, getNotificationPermission, areNotificationsSupported } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

export default function NotificationActivationReminder() {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState('granted');
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const checkPermission = () => {
    if (!areNotificationsSupported()) {
      setPermission('unsupported');
      return;
    }
    setPermission(getNotificationPermission());
  };

  useEffect(() => {
    checkPermission();

    // Comprobar si el usuario ya lo cerró en esta sesión específica
    const wasDismissed = sessionStorage.getItem('ucnl_notif_banner_dismissed') === '1';
    if (wasDismissed) {
      setDismissed(true);
    }
  }, [currentUser]);

  const handleActivate = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await requestNotificationPermissionAndToken(currentUser);
      if (res && res.success) {
        setSuccess(true);
        setPermission('granted');
        setTimeout(() => {
          setDismissed(true);
        }, 2500);
      } else {
        const currentPerm = getNotificationPermission();
        setPermission(currentPerm);
        if (currentPerm === 'denied') {
          setErrorMsg('Las notificaciones fueron bloqueadas en tu navegador. Puedes desbloquearlas haciendo clic en el candado 🔒 en la barra de direcciones.');
        } else {
          setErrorMsg(res?.message || 'No se pudieron activar las notificaciones.');
        }
      }
    } catch (err) {
      console.error('Error al activar notificaciones:', err);
      setErrorMsg('Ocurrió un error al solicitar el permiso. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('ucnl_notif_banner_dismissed', '1');
  };

  // Si ya tiene permisos concedidos, no está soportado o fue descartado en esta sesión, no mostrar
  if (permission === 'granted' || permission === 'unsupported' || dismissed) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900/90 border-b border-blue-500/40 text-white px-4 py-3 shadow-lg transition-all duration-300 relative z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        
        {/* Ícono y Mensaje */}
        <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
          <div className="p-2 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30 flex-shrink-0 animate-pulse">
            {permission === 'denied' ? (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            ) : (
              <BellRing className="w-5 h-5 text-blue-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Novedades en vivo
              </span>
              <span className="text-xs text-blue-200/80 font-medium hidden sm:inline">
                Recordatorios automáticos 24/7
              </span>
            </div>

            <p className="text-sm font-semibold text-white mt-0.5 leading-snug">
              {permission === 'denied' ? (
                <>
                  <span className="text-amber-300 font-bold">Notificaciones bloqueadas:</span> Desbloquéalas en los ajustes de tu navegador para recibir los recordatorios de entrega. ¡De lo contrario te estás perdiendo la mejor parte de la aplicación!
                </>
              ) : success ? (
                <span className="text-green-300 font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> ¡Notificaciones activadas con éxito! Recibirás los avisos en este dispositivo.
                </span>
              ) : (
                <>
                  <span className="text-blue-200 font-bold">¡Activa tus notificaciones!</span> Recibe las últimas novedades y recordatorios de entregas en tiempo real. <span className="text-blue-100 font-medium">De lo contrario, te estás perdiendo la mejor parte de la aplicación.</span>
                </>
              )}
            </p>

            {errorMsg && (
              <p className="text-xs text-red-300 bg-red-950/60 border border-red-800/60 rounded-lg px-2.5 py-1 mt-1.5 inline-block">
                {errorMsg}
              </p>
            )}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 w-full md:w-auto justify-end">
          {permission !== 'denied' && !success && (
            <button
              onClick={handleActivate}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md shadow-blue-900/50 transition-all border border-blue-400/40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activando...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Activar Notificaciones
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </>
              )}
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            title="Omitir por ahora"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
