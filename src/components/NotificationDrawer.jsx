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
              ? 'bg-slate-800/90 border-blue-500/40 hover:border-blue-400 shadow-md shadow-blue-950/30'
              : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/70 hover:border-slate-600'
          }`}
        >
          {!item.isRead && (
            <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-blue-500 shadow-xs shadow-blue-400" />
          )}

          <div className="flex items-start space-x-3 pr-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
              item.type === 'due' || item.title?.includes('Urgente') || item.title?.includes('Vencida')
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : item.title?.includes('7 días') || item.type === 'daily_7days_reminder'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : item.title?.includes('Nueva')
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
            }`}>
              {item.type === 'due' || item.title?.includes('Urgente') ? (
                <AlertCircle className="w-4 h-4" />
              ) : item.title?.includes('7 días') || item.type === 'daily_7days_reminder' ? (
                <Calendar className="w-4 h-4" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-xs sm:text-sm font-bold leading-tight ${
                !item.isRead ? 'text-white' : 'text-slate-300'
              }`}>
                {item.title}
              </p>

              {item.body && (
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {item.body}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(item.timestamp)}</span>
                </div>

                {hasActivity && (
                  <span className="inline-flex items-center space-x-0.5 text-blue-400 font-bold hover:underline">
                    <span>Ver tarea</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => handleDeleteItem(e, item.id)}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 opacity-0 group-hover:opacity-100 transition"
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
      {/* 1. MÓVIL: Pantalla Completa (< md) */}
      <div className="md:hidden fixed inset-0 z-50 w-full h-full bg-slate-900 text-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Encabezado Móvil */}
        <div className="px-4 py-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 active:bg-slate-700 rounded-xl transition flex items-center gap-1.5 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm text-white">Notificaciones</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {unreadCount}
              </span>
            )}
          </div>

          {notifications.length > 0 ? (
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="p-2 text-blue-400 hover:text-blue-300 disabled:opacity-40 rounded-xl transition"
              title="Marcar todas como leídas"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Acciones secundarias móvil */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Al día'}
            </span>
            <button
              onClick={handleClearAll}
              className="inline-flex items-center space-x-1 text-slate-400 hover:text-rose-400 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar historial</span>
            </button>
          </div>
        )}

        {/* Cuerpo Móvil */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 touch-scroll">
          {renderNotificationList()}
        </div>
      </div>

      {/* 2. DESKTOP: Panel Lateral Derecho — Topa exactamente debajo del ribbon y empuja/acompaña el contenido */}
      <aside className="hidden md:flex w-[380px] lg:w-[420px] xl:w-[460px] flex-shrink-0 bg-slate-900 text-slate-100 border-l border-slate-800 shadow-2xl flex-col h-full self-stretch overflow-hidden animate-in slide-in-from-right duration-200 ease-out z-20">
        
        {/* Encabezado Desktop */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm tracking-tight text-white">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs">
                    {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Historial en este equipo</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg disabled:opacity-40 transition"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClearAll}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  title="Vaciar todo el historial"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition active:scale-95"
              title="Cerrar panel lateral"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo Desktop */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 touch-scroll min-h-0">
          {renderNotificationList()}
        </div>

        {/* Pie Desktop */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-center flex-shrink-0">
          <p className="text-[10px] text-slate-500">
            Sincronizado con IndexedDB y Firebase
          </p>
        </div>

      </aside>
    </>
  );
}
