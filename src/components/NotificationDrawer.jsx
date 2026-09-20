import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  X,
  Clock,
  BookOpen,
  Calendar,
  AlertCircle,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import {
  getAllNotificationsFromIndexedDb,
  markNotificationAsReadInIndexedDb,
  markAllNotificationsAsReadInIndexedDb,
  deleteNotificationFromIndexedDb,
  clearAllNotificationsFromIndexedDb
} from '../services/indexedDbService';

export default function NotificationDrawer({
  isOpen,
  onClose,
  onSelectActivity
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topOffset, setTopOffset] = useState(84);

  // Calcular la altura exacta del pie del ribbon para alinear el top del panel
  useEffect(() => {
    if (!isOpen) return;

    const updateTopOffset = () => {
      // 1. Intentar medir el ribbon principal si está visible
      const ribbonEl = document.getElementById('ucnl-main-ribbon');
      if (ribbonEl && ribbonEl.offsetParent !== null) {
        const rect = ribbonEl.getBoundingClientRect();
        if (rect.bottom > 0) {
          setTopOffset(rect.bottom);
          return;
        }
      }

      // 2. Si está en ConfigModal, medir la barra superior de pestañas
      const configTabs = document.getElementById('ucnl-config-tabs-bar');
      if (configTabs && configTabs.offsetParent !== null) {
        const rect = configTabs.getBoundingClientRect();
        if (rect.bottom > 0) {
          setTopOffset(rect.bottom);
          return;
        }
      }

      // 3. Fallback al encabezado superior
      const headerEl = document.querySelector('header');
      if (headerEl) {
        const rect = headerEl.getBoundingClientRect();
        setTopOffset(rect.bottom);
      }
    };

    updateTopOffset();
    const frameId = requestAnimationFrame(updateTopOffset);
    window.addEventListener('resize', updateTopOffset);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateTopOffset);
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cargar notificaciones desde IndexedDB
  const loadNotifications = useCallback(async () => {
    try {
      const items = await getAllNotificationsFromIndexedDb();
      setNotifications(items);
    } catch (err) {
      console.warn('Error cargando notificaciones de IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('ucnl-notifications-updated', handleUpdate);
    return () => {
      window.removeEventListener('ucnl-notifications-updated', handleUpdate);
    };
  }, [isOpen, loadNotifications]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsReadInIndexedDb();
    loadNotifications();
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (window.confirm('¿Deseas eliminar todo el historial de notificaciones?')) {
      await clearAllNotificationsFromIndexedDb();
      loadNotifications();
    }
  };

  const handleClickItem = async (item) => {
    if (!item.isRead) {
      await markNotificationAsReadInIndexedDb(item.id);
      loadNotifications();
    }

    const actId = item.data?.activityId;
    if (actId && onSelectActivity) {
      onSelectActivity(actId);
      onClose();
    }
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    await deleteNotificationFromIndexedDb(id);
    loadNotifications();
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 1) return 'Hace un momento';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHours < 24) return `Hoy ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (diffDays === 1) return `Ayer ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      return date.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Contenido de la lista compartida entre móvil y desktop
  const renderNotificationList = () => {
    if (loading) {
      return (
        <div className="h-48 flex flex-col items-center justify-center space-y-2 text-slate-500">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Cargando notificaciones...</p>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500 shadow-inner">
            <BellOff className="w-8 h-8" />
          </div>
          <div className="max-w-xs space-y-1">
            <p className="text-sm font-bold text-slate-200">No tienes notificaciones</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Aquí aparecerán los recordatorios automáticos de entrega a los 7 días, alertas de urgencia y nuevas actividades.
            </p>
          </div>
        </div>
      );
    }

    return notifications.map((item) => {
      const hasActivity = !!item.data?.activityId;

      return (
        <div
          key={item.id}
          onClick={() => handleClickItem(item)}
          className={`group relative p-3.5 rounded-2xl border transition text-left cursor-pointer ${
            !item.isRead
              ? 'bg-slate-800 border-blue-500 hover:border-blue-400 shadow-md shadow-blue-950/40'
              : 'bg-slate-800/90 border-slate-700 hover:bg-slate-800 hover:border-slate-500'
          }`}
        >
          {!item.isRead && (
            <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400 animate-pulse" />
          )}

          <div className="flex items-start space-x-3 pr-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm ${
              item.type === 'due' || item.title?.includes('Urgente') || item.title?.includes('Vencida')
                ? 'bg-rose-600 text-white border border-rose-400'
                : item.title?.includes('7 días') || item.type === 'daily_7days_reminder'
                ? 'bg-emerald-600 text-white border border-emerald-400'
                : item.title?.includes('Nueva')
                ? 'bg-blue-600 text-white border border-blue-400'
                : 'bg-indigo-600 text-white border border-indigo-400'
            }`}>
              {item.type === 'due' || item.title?.includes('Urgente') ? (
                <AlertCircle className="w-4 h-4 text-white" />
              ) : item.title?.includes('7 días') || item.type === 'daily_7days_reminder' ? (
                <Calendar className="w-4 h-4 text-white" />
              ) : (
                <BookOpen className="w-4 h-4 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold leading-tight text-white">
                {item.title}
              </p>

              {item.body && (
                <p className="text-xs text-slate-200 font-medium mt-1 leading-relaxed">
                  {item.body}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                <div className="flex items-center space-x-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatTime(item.timestamp)}</span>
                </div>

                {hasActivity && (
                  <span className="inline-flex items-center space-x-0.5 text-cyan-300 font-bold hover:underline">
                    <span>Ver tarea</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => handleDeleteItem(e, item.id)}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition cursor-pointer"
            title="Eliminar notificación"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    });
  };

  return (
    <>
      {/* Fondo oscuro semitransparente que cubre cualquier vista bajo el ribbon */}
      <div 
        className="fixed inset-x-0 bottom-0 bg-slate-950/50 backdrop-blur-xs z-[70] animate-in fade-in duration-200"
        style={{ top: `${topOffset}px` }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel Lateral Flotante por encima de todo pero comenzando al pie del ribbon */}
      <aside 
        className="fixed right-0 bottom-0 z-[75] w-full sm:max-w-md md:max-w-lg bg-slate-900 text-slate-100 border-l border-t border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 ease-out"
        style={{ top: `${topOffset}px`, height: `calc(100vh - ${topOffset}px)` }}
        role="dialog"
        aria-label="Panel de Notificaciones"
      >
        {/* Encabezado Principal */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* Botón Volver visible en móviles */}
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-300 hover:text-white bg-slate-800 active:bg-slate-700 rounded-xl transition flex items-center gap-1 font-bold text-xs flex-shrink-0"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Bell className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
                  Notificaciones
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs flex-shrink-0">
                    {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">Historial en este equipo</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="p-1.5 sm:p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-xl disabled:opacity-40 transition"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClearAll}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
                  title="Vaciar todo el historial"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition active:scale-95"
              title="Cerrar panel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Acciones secundarias cuando hay notificaciones */}
        {notifications.length > 0 && (
          <div className="px-4 sm:px-5 py-2 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs flex-shrink-0">
            <span className="text-slate-400 text-[11px]">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
            </span>
            <button
              onClick={handleClearAll}
              className="inline-flex items-center space-x-1 text-slate-400 hover:text-rose-400 font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar historial</span>
            </button>
          </div>
        )}

        {/* Cuerpo Desplazable */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 touch-scroll min-h-0">
          {renderNotificationList()}
        </div>

        {/* Pie */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-center flex-shrink-0">
          <p className="text-[10px] text-slate-500">
            Sincronizado con IndexedDB y Firebase
          </p>
        </div>
      </aside>
    </>
  );
}
