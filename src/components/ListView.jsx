import React, { useState } from 'react';
import { 
  ArrowUpDown, 
  Calendar, 
  Clock, 
  BookOpen, 
  AlertCircle, 
  Plus, 
  List, 
  LayoutGrid, 
  PlayCircle, 
  CheckCircle2, 
  FolderOpen, 
  Edit, 
  Trash2, 
  User, 
  Paperclip, 
  ExternalLink, 
  Video, 
  MessagesSquare, 
  MessageCircle, 
  GraduationCap 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ActivityCard from './ActivityCard';
import { useAuth } from '../context/AuthContext';
import { ACTIVITY_TYPES } from '../types/constants';
import { compareActivitiesByDueDate, formatShortDate, getDueBadgeInfo } from '../utils/dateUtils';
import { stripMarkdownAndHtml, getDirectActionInfo } from '../utils/textUtils';

export const ListView = ({
  activities = [],
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
  const { isAdmin, isEditor } = useAuth();
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate', 'subject', 'title'
  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem('ucnl_list_display_mode') || 'list';
    } catch {
      return 'list';
    }
  });

  const handleModeChange = (mode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('ucnl_list_display_mode', mode);
    } catch (e) {}
  };

  const handleSetStatus = (e, activityId, newStatus) => {
    e.stopPropagation();
    if (newStatus === 'completed') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (err) {}
    }
    if (onSetPersonalStatus) {
      onSetPersonalStatus(activityId, newStatus);
    } else if (onToggleStudentCompletion) {
      onToggleStudentCompletion(activityId);
    }
  };

  const sortedActivities = [...activities].sort((a, b) => {
    if (sortBy === 'dueDate') {
      return compareActivitiesByDueDate(a, b);
    }
    if (sortBy === 'subject') {
      return (a.subject || '').localeCompare(b.subject || '');
    }
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No se encontraron actividades</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          No hay actividades que coincidan con los filtros aplicados o aún no se han registrado tareas.
        </p>
        {isAdmin && onOpenNewActivity && (
          <button
            onClick={onOpenNewActivity}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-2xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Crear la primera actividad</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-3 min-h-0">
      {/* Controles de vista (Lista / Cuadrícula) y ordenamiento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 px-1 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
          <span className="font-semibold text-slate-600">
            Mostrando {activities.length} {activities.length === 1 ? 'actividad' : 'actividades'}
          </span>

          {/* Selector de modo Lista / Cuadrícula */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleModeChange('list')}
              title="Ver en formato Lista detallada"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                displayMode === 'list'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('grid')}
              title="Ver en formato Cuadrícula de tarjetas"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                displayMode === 'grid'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cuadrícula</span>
            </button>
          </div>
        </div>

        {/* Control de Ordenamiento */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="font-medium whitespace-nowrap">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 sm:flex-none bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs text-xs"
          >
            <option value="dueDate">Fecha de Entrega (Próxima)</option>
            <option value="subject">Materia / Asignatura</option>
            <option value="title">Título alfabético</option>
          </select>
        </div>
      </div>

      {/* Contenedor de Actividades */}
      {displayMode === 'list' ? (
        /* VISTA DE LISTA (Por Defecto) */
        <div className="flex-1 overflow-y-auto touch-scroll min-h-0 pr-1 pb-4 space-y-3">
          {sortedActivities.map((activity) => {
            const isSelected = selectedActivity?.id === activity.id;
            const userStatus = studentCompletions[activity.id] || 'pending';
            const isCompleted = userStatus === 'completed' || userStatus === true;
            const isInProgress = userStatus === 'in_progress';
            const isPending = !isCompleted && !isInProgress;

            const dueInfo = getDueBadgeInfo(activity.dueDate, isCompleted);
            const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type);
            const directAction = getDirectActionInfo(activity);
            const attachmentsCount = activity.attachments?.length || 0;
            const linksCount = activity.links?.length || 0;

            return (
              <div
                key={activity.id}
                onClick={() => onViewDetails(activity)}
                className={`group relative bg-white rounded-2xl border transition-all duration-200 cursor-pointer p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/30 shadow-md scale-[1.005]'
                    : isCompleted 
                    ? 'border-emerald-200 bg-emerald-50/20 opacity-90 hover:border-emerald-300' 
                    : isInProgress
                    ? 'border-blue-300 bg-blue-50/20 ring-1 ring-blue-400/30 hover:border-blue-400'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {/* Información Principal de la Actividad */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {activity.tetraName && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-800 text-white tracking-tight flex-shrink-0">
                          {activity.tetraName.replace('Tetramestre', 'Tetra')}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 truncate">
                        {activity.subject || 'Materia'}
                      </span>
                      {typeInfo && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeInfo.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {typeInfo.label}
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white tracking-tight flex items-center gap-1 flex-shrink-0 shadow-xs">
                          <PlayCircle className="w-3 h-3" />
                          <span>En Progreso</span>
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white tracking-tight flex items-center gap-1 flex-shrink-0 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completada</span>
                        </span>
                      )}
                    </div>

                    {/* Acciones de Edición en Móvil */}
                    {isEditor && (
                      <div className="flex items-center space-x-1.5 lg:hidden" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onEdit(activity)}
                          title="Editar actividad"
                          className="w-8 h-8 flex items-center justify-center text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition active:scale-95"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(activity)}
                          title="Eliminar actividad"
                          className="w-8 h-8 flex items-center justify-center text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className={`font-bold text-sm sm:text-base text-slate-900 leading-snug group-hover:text-blue-700 transition ${
                    isCompleted ? 'line-through text-slate-500' : ''
                  }`}>
                    {activity.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {activity.teacher && (
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-medium">Prof. {activity.teacher}</span>
                      </div>
                    )}
                    {attachmentsCount > 0 && (
                      <span className="inline-flex items-center space-x-1 text-[11px] text-blue-700 font-medium">
                        <Paperclip className="w-3 h-3" />
                        <span>{attachmentsCount} {attachmentsCount === 1 ? 'archivo' : 'archivos'}</span>
                      </span>
                    )}
                    {linksCount > 0 && (
                      <span className="inline-flex items-center space-x-1 text-[11px] text-indigo-700 font-medium">
                        <ExternalLink className="w-3 h-3" />
                        <span>{linksCount} {linksCount === 1 ? 'enlace' : 'enlaces'}</span>
                      </span>
                    )}
                  </div>

                  {activity.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {stripMarkdownAndHtml(activity.description)}
                    </p>
                  )}
                </div>

                {/* Panel Derecho: Fechas, Recursos, Enlace Directo y Estado */}
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-end xl:items-center justify-between gap-3 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  
                  {/* Fecha de Entrega y Tiempo Restante */}
                  <div className="flex flex-col space-y-1 text-xs min-w-[130px]">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-700 font-semibold text-xs">
                        {formatShortDate(activity.dueDate)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${dueInfo.className}`}>
                        {dueInfo.text}
                      </span>
                      {activity.dueDate && !isCompleted && (
                        <span className={`text-[11px] font-bold flex items-center gap-1 ${dueInfo.textColor}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dueInfo.dotColor }} />
                          {dueInfo.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fila de Botones de Acción */}
                  <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    
                    {/* Botón de Enlace Directo */}
                    {directAction && (
                      <a
                        href={directAction.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-xl font-bold text-xs transition active:scale-95 ${directAction.colorClass}`}
                        title={directAction.label}
                      >
                        {directAction.platform === 'teams' && <Video className="w-3.5 h-3.5" />}
                        {directAction.platform === 'meet' && <Video className="w-3.5 h-3.5" />}
                        {directAction.platform === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5" />}
                        {directAction.platform === 'zoom' && <Video className="w-3.5 h-3.5" />}
                        {directAction.platform === 'reunion' && <Video className="w-3.5 h-3.5" />}
                        {directAction.platform === 'examen' && <GraduationCap className="w-3.5 h-3.5" />}
                        {directAction.platform === 'foro' && <MessagesSquare className="w-3.5 h-3.5" />}
                        {directAction.platform === 'actividad' && <ExternalLink className="w-3.5 h-3.5" />}
                        <span className="truncate max-w-[110px]">{directAction.label}</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>
                    )}

                    {/* Botón de Recursos y Visor Integrado */}
                    {onOpenWorkspace && (
                      <button
                        type="button"
                        onClick={() => onOpenWorkspace(activity)}
                        title="Abrir recursos, documentos y visor integrado"
                        className="inline-flex items-center gap-1.5 text-xs font-bold min-h-[36px] px-3 py-1.5 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border border-blue-200/90 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>Recursos</span>
                        {(attachmentsCount + linksCount > 0) && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-200/80 text-blue-900 font-extrabold leading-none">
                            {attachmentsCount + linksCount}
                          </span>
                        )}
                      </button>
                    )}

                    {/* Botones de Estado */}
                    {isPending && (
                      <>
                        <button
                          onClick={(e) => handleSetStatus(e, activity.id, 'in_progress')}
                          title="Marcar en progreso para mí"
                          className="inline-flex items-center justify-center space-x-1 text-xs font-bold min-h-[36px] px-3 py-1.5 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95"
                        >
                          <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>Iniciar</span>
                        </button>
                        <button
                          onClick={(e) => handleSetStatus(e, activity.id, 'completed')}
                          title="Marcar como completada para mí"
                          className="inline-flex items-center justify-center space-x-1 text-xs font-bold min-h-[36px] px-3.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Completar</span>
                        </button>
                      </>
                    )}

                    {isInProgress && (
                      <>
                        <button
                          onClick={(e) => handleSetStatus(e, activity.id, 'pending')}
                          title="Mover a pendiente"
                          className="inline-flex items-center justify-center space-x-1 text-xs font-bold min-h-[36px] px-2.5 py-1.5 rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition active:scale-95"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pausar</span>
                        </button>
                        <button
                          onClick={(e) => handleSetStatus(e, activity.id, 'completed')}
                          title="Marcar como completada"
                          className="inline-flex items-center justify-center space-x-1 text-xs font-bold min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Completar</span>
                        </button>
                      </>
                    )}

                    {isCompleted && (
                      <button
                        onClick={(e) => handleSetStatus(e, activity.id, 'pending')}
                        title="Reabrir / Marcar como pendiente para mí"
                        className="inline-flex items-center justify-center space-x-1.5 text-xs font-bold min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Completada ✓</span>
                      </button>
                    )}

                    {/* Botones de Administrador en Desktop */}
                    {isEditor && (
                      <div className="hidden lg:flex items-center space-x-1 pl-1 border-l border-slate-200">
                        <button
                          onClick={() => onEdit(activity)}
                          title="Editar actividad"
                          className="p-2 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition active:scale-95"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(activity)}
                          title="Eliminar actividad"
                          className="p-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DE CUADRÍCULA (Tarjetas auto-reacomodables con min 500px) */
        <div className="flex-1 overflow-y-auto touch-scroll min-h-0 pr-1 pb-4">
          <div className="grid grid-cols-1 [grid-template-columns:repeat(auto-fill,minmax(min(100%,500px),1fr))] gap-4">
            {sortedActivities.map((activity) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;
