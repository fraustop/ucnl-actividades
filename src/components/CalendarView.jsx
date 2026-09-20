import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  parseISO,
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, BookOpen, CheckCircle2, FolderOpen } from 'lucide-react';
import { ACTIVITY_TYPES } from '../types/constants';
import { useAuth } from '../context/AuthContext';
import { compareActivitiesByDueDate } from '../utils/dateUtils';

export const CalendarView = ({
  activities = [],
  onViewDetails,
  onOpenNewActivity,
  onOpenWorkspace,
  isStudent = false,
  studentCompletions = {}
}) => {
  const { isAdmin } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Empezar en Lunes
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDay(today);
  };

  // Mapear actividades a fechas
  const getActivitiesForDay = (day) => {
    return activities
      .filter((activity) => {
        if (!activity.dueDate) return false;
        try {
          const activityDate = parseISO(activity.dueDate);
          return isSameDay(day, activityDate);
        } catch {
          return false;
        }
      })
      .sort(compareActivitiesByDueDate);
  };

  const selectedDayActivities = getActivitiesForDay(selectedDay);
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="h-full overflow-y-auto touch-scroll min-h-0 space-y-4 pr-1 pb-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Controles de Navegación del Calendario */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 capitalize truncate">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={goToToday}
              className="px-3.5 py-2 min-h-[38px] text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition shadow-xs active:scale-95"
            >
              Hoy
            </button>
            
            <div className="flex items-center space-x-0.5 bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
              <button
                onClick={prevMonth}
                className="w-9 h-9 sm:w-8 sm:h-8 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition active:scale-95"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="w-9 h-9 sm:w-8 sm:h-8 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition active:scale-95"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Días de la Semana */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/50 text-center text-[11px] sm:text-xs font-bold text-slate-600 py-2">
          {weekDays.map((d, idx) => (
            <div key={idx} className={idx >= 5 ? 'text-slate-400' : ''}>
              {d}
            </div>
          ))}
        </div>

        {/* Cuadrícula de Días */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-[1px]">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isCurrentToday = isToday(day);
            const isDaySelected = isSameDay(day, selectedDay);
            const dayActivities = getActivitiesForDay(day);

            return (
              <div
                key={day.toString()}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[58px] sm:min-h-[120px] p-1 sm:p-2 flex flex-col justify-between transition cursor-pointer active:bg-blue-100/50 ${
                  isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                } ${isDaySelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/20' : 'hover:bg-blue-50/30'}`}
              >
                {/* Número de Día */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 sm:w-6 sm:h-6 rounded-full text-xs font-bold ${
                      isCurrentToday
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDaySelected
                        ? 'bg-blue-100 text-blue-800'
                        : isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Botón rápido de agregar solo visible en desktop para Administrador */}
                  {isAdmin && onOpenNewActivity && isCurrentMonth && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewActivity(day);
                      }}
                      title="Añadir actividad"
                      className="hidden sm:inline-flex opacity-0 hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Vista Móvil: Puntos de colores por tipo de actividad */}
                <div className="sm:hidden flex items-center justify-center gap-1 mt-1 pb-0.5">
                  {dayActivities.slice(0, 3).map((act, i) => {
                    const typeInfo = ACTIVITY_TYPES.find(t => t.id === act.type) || { color: '#3b82f6' };
                    const userStatus = studentCompletions[act.id] || 'pending';
                    const isCompleted = userStatus === 'completed' || userStatus === true;
                    const isInProgress = userStatus === 'in_progress';
                    const dotColor = isCompleted ? '#10b981' : isInProgress ? '#2563eb' : (typeInfo.color || '#f59e0b');

                    return (
                      <span
                        key={act.id || i}
                        className="w-2 h-2 rounded-full shadow-xs"
                        style={{ backgroundColor: dotColor }}
                      />
                    );
                  })}
                  {dayActivities.length > 3 && (
                    <span className="text-[10px] font-black text-blue-600">+{dayActivities.length - 3}</span>
                  )}
                </div>

                {/* Vista Desktop: Chips de Actividades del Día */}
                <div className="hidden sm:block flex-1 space-y-1 overflow-y-auto max-h-[75px] mt-1">
                  {dayActivities.map((act) => {
                    const typeInfo = ACTIVITY_TYPES.find(t => t.id === act.type) || { color: '#3b82f6' };
                    const userStatus = studentCompletions[act.id] || 'pending';
                    const isCompleted = userStatus === 'completed' || userStatus === true;
                    const isInProgress = userStatus === 'in_progress';
                    const dotColor = isCompleted ? '#10b981' : isInProgress ? '#2563eb' : (typeInfo.color || '#f59e0b');

                    return (
                      <button
                        key={act.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(act);
                        }}
                        className={`w-full text-left px-2 py-0.5 rounded-lg text-[10px] font-medium truncate flex items-center space-x-1.5 transition ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 line-through opacity-80'
                            : isInProgress
                            ? 'bg-blue-100 text-blue-900 border border-blue-300 font-bold shadow-xs'
                            : 'bg-slate-50 hover:bg-blue-50 text-slate-800 border border-slate-200 shadow-xs'
                        }`}
                        title={`${act.subject}: ${act.title}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="truncate">{act.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspector de Día Seleccionado (Especialmente útil en Móvil) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm capitalize">
              Actividades del {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100">
              {selectedDayActivities.length}
            </span>
          </div>

          {isAdmin && onOpenNewActivity && (
            <button
              onClick={() => onOpenNewActivity(selectedDay)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva en esta fecha</span>
            </button>
          )}
        </div>

        {selectedDayActivities.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No hay actividades programadas para este día.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {selectedDayActivities.map((act) => {
              const typeInfo = ACTIVITY_TYPES.find(t => t.id === act.type) || { 
                label: 'Actividad', 
                color: '#3b82f6',
                badgeClass: 'bg-slate-100 text-slate-700' 
              };
              const userStatus = studentCompletions[act.id] || 'pending';
              const isCompleted = userStatus === 'completed' || userStatus === true;
              const isInProgress = userStatus === 'in_progress';
              const dotColor = isCompleted ? '#10b981' : isInProgress ? '#2563eb' : (typeInfo.color || '#f59e0b');

              return (
                <div
                  key={act.id}
                  onClick={() => onViewDetails(act)}
                  className={`p-3 border rounded-2xl transition cursor-pointer flex items-center justify-between ${
                    isCompleted 
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300' 
                      : isInProgress
                      ? 'bg-blue-50/50 border-blue-300 hover:border-blue-400'
                      : 'bg-slate-50 hover:bg-blue-50/50 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate pr-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <div className="truncate">
                      <p className={`font-bold text-xs text-slate-800 truncate ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {act.title}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {act.subject} {act.tetraName ? `• ${act.tetraName}` : ''} • <span className="font-semibold">{typeInfo.label}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {onOpenWorkspace && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenWorkspace(act);
                        }}
                        title="Abrir recursos"
                        className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                      >
                        <FolderOpen className="w-3 h-3 text-blue-600" />
                        <span>Recursos</span>
                      </button>
                    )}

                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isInProgress
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isCompleted ? 'Lista' : isInProgress ? 'En Progreso' : 'Ver'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
