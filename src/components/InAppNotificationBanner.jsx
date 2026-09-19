import React, { useState, useEffect } from 'react';
import { Bell, BellRing, X, ExternalLink, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { confirmUserNotificationReceipt } from '../services/userService';

export const InAppNotificationBanner = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmedIds, setConfirmedIds] = useState(new Set());

  useEffect(() => {
    const handleNotification = (e) => {
      const { title, body, data, tag } = e.detail || {};
      const newNotif = {
        id: tag || `toast_${Date.now()}_${Math.random()}`,
        title: title || 'Notificación UCNL',
        body: body || '',
        data: data || {},
        createdAt: Date.now()
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 3)]);

      // Vibrar en dispositivos móviles si está soportado
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } catch (e) {}

      // Auto-eliminar a los 15 segundos si es de confirmación, o 7 segundos normal
      const isConfirmReq = data?.type === 'notification_confirmation_request' || (title && title.includes('UCNL-Actividades en linea'));
      const timeoutMs = isConfirmReq ? 20000 : 7000;

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
      }, timeoutMs);
    };

    window.addEventListener('ucnl-inapp-notification', handleNotification);
    return () => window.removeEventListener('ucnl-inapp-notification', handleNotification);
  }, []);

  const handleDismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleConfirmAction = async (notif) => {
    if (!currentUser) return;
    setConfirmingId(notif.id);
    try {
      await confirmUserNotificationReceipt(currentUser.uid);
      setConfirmedIds((prev) => new Set([...prev, notif.id]));
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.2 }
        });
      } catch (_) {}

      setTimeout(() => {
        handleDismiss(notif.id);
      }, 3500);
    } catch (err) {
      console.error('Error confirmando notificación:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 inset-x-3 sm:inset-x-auto sm:right-4 z-[99999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none mx-auto sm:mx-0">
      {notifications.map((notif) => {
        const isConfirmReq = notif.data?.type === 'notification_confirmation_request' || (notif.title && notif.title.includes('UCNL-Actividades en linea'));
        const isConfirmed = confirmedIds.has(notif.id);
        const isLoading = confirmingId === notif.id;

        return (
          <div
            key={notif.id}
            className="pointer-events-auto bg-slate-900/98 backdrop-blur-xl text-white border-2 border-blue-500 shadow-2xl rounded-2xl p-4 flex flex-col space-y-3 animate-in slide-in-from-top-6 fade-in duration-300 transition-all hover:border-blue-400"
          >
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30 flex-shrink-0 mt-0.5 animate-bounce">
                <BellRing className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                    UCNL Alerta
                  </span>
                  {isConfirmReq && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                      Acción requerida
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-sm text-white mt-1 leading-snug break-words">
                  {notif.title}
                </h4>
                {notif.body && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
                    {notif.body}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleDismiss(notif.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition flex-shrink-0"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Botón de Acción para Confirmación */}
            {isConfirmReq && (
              <div className="pt-1 border-t border-slate-800 flex items-center justify-end">
                {isConfirmed ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 py-1 px-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Confirmado con éxito!</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirmAction(notif)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-emerald-900/40 border border-emerald-400/40"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirmando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar Recepción</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InAppNotificationBanner;
