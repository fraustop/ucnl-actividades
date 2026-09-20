import React, { useState, useEffect, useRef } from 'react';
import { Clock, PlayCircle, CheckCircle2, Plus, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import ActivityCard from './ActivityCard';
import { useAuth } from '../context/AuthContext';
import { compareActivitiesByDueDate } from '../utils/dateUtils';

export const KanbanView = ({
  activities = [],
  selectedStatus = 'pending',
  onViewDetails,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenWorkspace,
  onOpenNewActivity,
  isStudent = false,
  studentCompletions = {},
  onToggleStudentCompletion,
  onSetPersonalStatus,
  selectedActivity = null
}) => {
  const { isAdmin } = useAuth();
  const [mobileTab, setMobileTab] = useState(selectedStatus || 'pending');
  const containerRef = useRef(null);
  const columnRefs = useRef({});
  const isManualScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  const columns = [
    {
      id: 'pending',
      title: 'Pendientes por Entregar',
      shortTitle: 'Pendientes',
      icon: Clock,
      headerBg: 'bg-amber-500/10 text-amber-800 border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-800',
      activeTabClass: 'bg-amber-500 text-white shadow-sm',
      items: activities
        .filter((a) => !studentCompletions[a.id] || studentCompletions[a.id] === 'pending')
        .sort(compareActivitiesByDueDate)
    },
    {
      id: 'in_progress',
      title: 'En Progreso',
      shortTitle: 'En Progreso',
      icon: PlayCircle,
      headerBg: 'bg-blue-500/10 text-blue-800 border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-800',
      activeTabClass: 'bg-blue-600 text-white shadow-sm',
      items: activities
        .filter((a) => studentCompletions[a.id] === 'in_progress')
        .sort(compareActivitiesByDueDate)
    },
    {
      id: 'completed',
      title: 'Completadas por mí',
      shortTitle: 'Completadas',
      icon: CheckCircle2,
      headerBg: 'bg-emerald-500/10 text-emerald-800 border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      activeTabClass: 'bg-emerald-600 text-white shadow-sm',
      items: activities
        .filter((a) => studentCompletions[a.id] === 'completed' || studentCompletions[a.id] === true)
        .sort(compareActivitiesByDueDate)
    }
  ];

  // Desplazar suavemente a una columna al pulsar la pestaña o al cambiar selectedStatus
  const scrollToColumn = (colId) => {
    setMobileTab(colId);
    const targetEl = columnRefs.current[colId];
    if (targetEl && containerRef.current) {
      isManualScrolling.current = true;
      targetEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        isManualScrolling.current = false;
      }, 450);
    }
  };

  useEffect(() => {
    if (selectedStatus && selectedStatus !== 'all') {
      scrollToColumn(selectedStatus);
    }
  }, [selectedStatus]);

  // Sincronizar la pestaña activa al arrastrar o deslizar horizontalmente con el dedo
  const handleContainerScroll = () => {
    if (isManualScrolling.current || !containerRef.current) return;
    const container = containerRef.current;
    
    // Solo en móvil cuando hay scroll horizontal
    if (container.scrollWidth <= container.clientWidth + 10) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestCol = columns[0].id;
    let minDistance = Infinity;

    columns.forEach((col) => {
      const el = columnRefs.current[col.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        const colCenter = rect.left + rect.width / 2;
        const dist = Math.abs(containerCenter - colCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestCol = col.id;
        }
      }
    });

    if (closestCol && mobileTab !== closestCol) {
      setMobileTab(closestCol);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-2 sm:space-y-3 min-h-0">
      
      {/* Selector de Columnas Exclusivo para Móvil */}
      <div className="md:hidden flex items-center bg-slate-200/80 p-1 rounded-2xl gap-1.5 overflow-x-auto no-scrollbar touch-scroll flex-shrink-0">
        {columns.map((col) => {
          const Icon = col.icon;
          const isActive = mobileTab === col.id;
          return (
            <button
              key={col.id}
              onClick={() => scrollToColumn(col.id)}
              className={`flex-1 min-w-[95px] h-11 min-h-[42px] px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 active:scale-95 ${
                isActive
                  ? col.activeTabClass
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{col.shortTitle}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'
              }`}>
                {col.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contenedor Kanban:
          - Móvil: 100% de ancho por columna con arrastre horizontal fluido (swipe/drag) y snap-center
          - Escritorio: Grid de 3 columnas fijas y balanceadas de altura completa
      */}
      <div 
        ref={containerRef}
        onScroll={handleContainerScroll}
        className="flex-1 flex md:grid md:grid-cols-3 gap-3 sm:gap-4 md:gap-5 items-stretch overflow-x-auto md:overflow-hidden snap-x snap-mandatory no-scrollbar touch-pan-x w-full min-h-0 h-full"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {columns.map((col) => {
          const Icon = col.icon;

          return (
            <div 
              key={col.id} 
              ref={(el) => (columnRefs.current[col.id] = el)}
              className="w-full min-w-full md:w-auto md:min-w-0 flex-shrink-0 snap-center flex flex-col bg-slate-100/90 rounded-3xl p-3 sm:p-4 border border-slate-200/90 h-full min-h-0 overflow-hidden shadow-xs transition-all"
              style={{ scrollSnapAlign: 'center' }}
            >
              {/* Encabezado de la Columna: Fijo en el tope */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-xl border ${col.headerBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-xs sm:text-sm">{col.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.badgeBg}`}>
                    {col.items.length}
                  </span>
                </div>

                {isAdmin && onOpenNewActivity && (
                  <button
                    onClick={onOpenNewActivity}
                    title="Nueva actividad"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition shadow-none hover:shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Lista de Tarjetas con scroll interno independiente para cada panel */}
              <div className="flex-1 space-y-3 overflow-y-auto touch-scroll min-h-0 pr-1 select-text">
                {col.items.length === 0 ? (
                  <div className="h-36 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    <p>No hay actividades en este estado</p>
                  </div>
                ) : (
                  col.items.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onViewDetails={onViewDetails}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      onOpenWorkspace={onOpenWorkspace}
                      isStudent={isStudent}
                      studentCompletions={studentCompletions}
                      onToggleStudentCompletion={onToggleStudentCompletion}
                      onSetPersonalStatus={onSetPersonalStatus}
                      selectedActivity={selectedActivity}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicador visual de paginación / deslizamiento táctil en Móvil */}
      <div className="md:hidden flex flex-col items-center justify-center pt-1 space-y-1.5 flex-shrink-0">
        <div className="flex items-center space-x-2">
          {columns.map((col) => {
            const isActive = mobileTab === col.id;
            return (
              <button
                key={col.id}
                onClick={() => scrollToColumn(col.id)}
                className={`transition-all duration-300 rounded-full ${
                  isActive 
                    ? 'w-6 h-2 bg-blue-600 shadow-xs' 
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Ir a ${col.title}`}
              />
            );
          })}
        </div>
        <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 select-none">
          <span className="font-bold text-slate-500">←</span>
          <span>Desliza para cambiar de columna</span>
          <span className="font-bold text-slate-500">→</span>
        </p>
      </div>

    </div>
  );
};

export default KanbanView;

