import { format, parseISO, isToday, isTomorrow, isPast, differenceInHours, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatFullDate = (dateString) => {
  if (!dateString) return 'Sin fecha';
  try {
    const date = parseISO(dateString);
    return format(date, "EEEE, d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  } catch (e) {
    return dateString;
  }
};

export const formatShortDate = (dateString) => {
  if (!dateString) return 'Sin fecha';
  try {
    const date = parseISO(dateString);
    return format(date, "d MMM yyyy, HH:mm", { locale: es });
  } catch (e) {
    return dateString;
  }
};

export const formatConnectionTime = (dateString) => {
  if (!dateString) return 'Sin conexión registrada';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (isToday(date)) {
      return `Hoy, ${format(date, 'HH:mm')}`;
    }
    const now = new Date();
    const daysAgo = differenceInDays(now, date);
    if (daysAgo === 1) {
      return `Ayer, ${format(date, 'HH:mm')}`;
    }
    if (daysAgo < 7) {
      return format(date, "EEEE, HH:mm", { locale: es });
    }
    return format(date, "d MMM yyyy, HH:mm", { locale: es });
  } catch (e) {
    return dateString;
  }
};

export const getDueBadgeInfo = (dateString, isCompleted = false) => {
  return getDueProgressInfo(dateString, isCompleted);
};

export const getDueProgressInfo = (dateString, isCompleted = false) => {
  if (isCompleted) {
    return {
      text: 'Completada',
      isCompleted: true,
      isOverdue: false,
      urgencyLevel: 'completed',
      daysLeft: 0,
      label: 'Completada',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      percent: 100,
      dotColor: '#10b981'
    };
  }

  if (!dateString) {
    return {
      text: 'Sin fecha límite',
      isCompleted: false,
      isOverdue: false,
      urgencyLevel: 'none',
      daysLeft: null,
      label: 'Sin fecha límite',
      className: 'bg-slate-100 text-slate-600 border-slate-200',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      barColor: 'bg-slate-300',
      textColor: 'text-slate-500',
      percent: 0,
      dotColor: '#94a3b8'
    };
  }

  try {
    const date = parseISO(dateString);
    const now = new Date();

    if (isPast(date)) {
      const daysAgo = Math.abs(differenceInDays(now, date));
      const text = daysAgo === 0 ? 'Venció hoy' : `Vencida hace ${daysAgo}d`;
      return {
        text,
        isCompleted: false,
        isOverdue: true,
        urgencyLevel: 'red',
        daysLeft: -daysAgo,
        label: text,
        className: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
        barColor: 'bg-rose-600',
        textColor: 'text-rose-700',
        percent: 100,
        dotColor: '#e11d48'
      };
    }

    const daysLeft = differenceInDays(date, now);

    // 1. VERDE: Si quedan 7 días o más
    if (daysLeft >= 7) {
      const text = `Quedan ${daysLeft} días`;
      return {
        text,
        isCompleted: false,
        isOverdue: false,
        urgencyLevel: 'green',
        daysLeft,
        label: text,
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
        barColor: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        percent: Math.max(15, Math.min(100, Math.round((daysLeft / 14) * 100))),
        dotColor: '#10b981'
      };
    }

    // 2. AMARILLO: Si quedan 4 a 6 días
    if (daysLeft >= 4) {
      const text = `Quedan ${daysLeft} días`;
      return {
        text,
        isCompleted: false,
        isOverdue: false,
        urgencyLevel: 'yellow',
        daysLeft,
        label: text,
        className: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
        barColor: 'bg-amber-400',
        textColor: 'text-amber-800',
        percent: Math.max(40, Math.min(75, Math.round(((7 - daysLeft + 3) / 7) * 100))),
        dotColor: '#f59e0b'
      };
    }

    // 3. ROJO: Si quedan 3 días o menos
    let urgencyLabel = `Quedan ${daysLeft} días`;
    if (daysLeft === 0 || isToday(date)) {
      urgencyLabel = `Vence hoy (${format(date, 'HH:mm')})`;
    } else if (daysLeft === 1 || isTomorrow(date)) {
      urgencyLabel = `Vence mañana (1 día)`;
    } else {
      urgencyLabel = `Quedan ${daysLeft} días`;
    }

    return {
      text: urgencyLabel,
      isCompleted: false,
      isOverdue: false,
      urgencyLevel: 'red',
      daysLeft,
      label: urgencyLabel,
      className: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      barColor: 'bg-rose-500',
      textColor: 'text-rose-800',
      percent: Math.max(80, Math.min(100, 100 - (daysLeft * 6))),
      dotColor: '#ef4444'
    };
  } catch (e) {
    return {
      text: dateString,
      isCompleted: false,
      isOverdue: false,
      urgencyLevel: 'none',
      daysLeft: null,
      label: dateString,
      className: 'bg-slate-100 text-slate-600 border-slate-200',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      barColor: 'bg-slate-300',
      textColor: 'text-slate-500',
      percent: 0,
      dotColor: '#94a3b8'
    };
  }
};

/**
 * Compara dos actividades por su fecha de entrega (dueDate) en orden cronológico ascendente:
 * Las más próximas en el tiempo van primero (arriba), y las más lejanas o sin fecha van al final (abajo).
 */
export const compareActivitiesByDueDate = (a, b) => {
  const timeA = a?.dueDate ? new Date(a.dueDate).getTime() : Infinity;
  const timeB = b?.dueDate ? new Date(b.dueDate).getTime() : Infinity;

  const validA = !isNaN(timeA);
  const validB = !isNaN(timeB);

  if (!validA && !validB) {
    return (a?.title || '').localeCompare(b?.title || '');
  }
  if (!validA) return 1;
  if (!validB) return -1;

  if (timeA !== timeB) {
    return timeA - timeB; // Menor timestamp (más cercana) primero
  }

  return (a?.title || '').localeCompare(b?.title || '');
};

