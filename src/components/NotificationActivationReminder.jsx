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
    <div className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b-2 border-blue-500 text-white px-4 py-3 shadow-xl transition-all duration-300 relative z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        
        {/* Ícono y Mensaje */}
        <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl border border-blue-400 flex-shrink-0 shadow-md shadow-blue-950">
            {permission === 'denied' ? (
              <ShieldAlert className="w-5 h-5 text-amber-300 animate-pulse" />
            ) : (
              <BellRing className="w-5 h-5 text-white animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-900 text-cyan-200 px-2.5 py-0.5 rounded-full border border-blue-400 flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Novedades en vivo
              </span>
              <span className="text-xs text-blue-200 font-semibold hidden sm:inline">
                Recordatorios automáticos 24/7
              </span>
            </div>

            <p className="text-sm font-semibold text-white mt-1 leading-snug">
              {permission === 'denied' ? (
                <>
                  <span className="text-amber-300 font-bold">Notificaciones bloqueadas:</span> Desbloquéalas en los ajustes de tu navegador para recibir los recordatorios de entrega. ¡De lo contrario te estás perdiendo la mejor parte de la aplicación!
                </>
              ) : success ? (
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> ¡Notificaciones activadas con éxito! Recibirás los avisos en este dispositivo.
                </span>
              ) : (
                <>
                  <span className="text-cyan-300 font-bold">¡Activa tus notificaciones!</span> Recibe las últimas novedades y recordatorios de entregas en tiempo real. <span className="text-white font-medium">De lo contrario, te estás perdiendo la mejor parte de la aplicación.</span>
                </>
              )}
            </p>

            {errorMsg && (
              <p className="text-xs text-rose-200 bg-rose-950 border border-rose-600 rounded-lg px-2.5 py-1 mt-1.5 inline-block font-medium">
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
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-950 transition-all border border-blue-400 cursor-pointer disabled:opacity-50"
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
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Omitir por ahora"
            aria-label="Omitir recordatorio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
