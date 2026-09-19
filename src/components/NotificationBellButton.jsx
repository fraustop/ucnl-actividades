import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { getAllNotificationsFromIndexedDb } from '../services/indexedDbService';

export default function NotificationBellButton({
  onClick,
  className = '',
  iconSize = 'w-4 h-4',
  title = 'Ver notificaciones'
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnreadCount = async () => {
    try {
      const items = await getAllNotificationsFromIndexedDb();
      const count = items.filter(n => !n.isRead).length;
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    checkUnreadCount();

    const handler = () => {
      checkUnreadCount();
    };

    window.addEventListener('ucnl-notifications-updated', handler);
    return () => {
      window.removeEventListener('ucnl-notifications-updated', handler);
    };
  }, []);

  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative flex items-center justify-center transition active:scale-95 flex-shrink-0 ${className}`}
    >
      <Bell className={iconSize} />

      {/* Badge de contador de no leídas */}
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900 animate-in zoom-in duration-150">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
