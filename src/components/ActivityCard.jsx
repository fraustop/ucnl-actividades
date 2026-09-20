import React from 'react';
import { 
  Calendar, 
  Clock, 
  Paperclip, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  PlayCircle,
  User, 
  ExternalLink,
  ChevronRight,
  Video,
  MessagesSquare,
  MessageCircle,
  GraduationCap,
  FolderOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ACTIVITY_STATUSES, ACTIVITY_TYPES } from '../types/constants';
import { getDueBadgeInfo, formatShortDate } from '../utils/dateUtils';
import { stripMarkdownAndHtml, getDirectActionInfo } from '../utils/textUtils';
import { useAuth } from '../context/AuthContext';

export const ActivityCard = ({
  activity,
  onViewDetails,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenWorkspace,
  isStudent = false,
  studentCompletions = {},
  onToggleStudentCompletion,
  onSetPersonalStatus,
  selectedActivity = null
}) => {
  const { isEditor } = useAuth();
  
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

  const handleSetStatus = (e, newStatus) => {
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
      onSetPersonalStatus(activity.id, newStatus);
    } else if (onToggleStudentCompletion) {
      onToggleStudentCompletion(activity.id);
    }
  };

  return (
    <div 
      onClick={() => onViewDetails(activity)}
      className={`group relative bg-white rounded-2xl border transition-all duration-200 cursor-pointer p-4 sm:p-5 flex flex-col justify-between shadow-xs ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/30 shadow-md scale-[1.01]'
          : isCompleted 
          ? 'border-emerald-200 bg-emerald-50/20 opacity-90' 
          : isInProgress
          ? 'border-blue-300 bg-blue-50/20 ring-1 ring-blue-400/30'
          : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div>
        {/* Cabecera de la Tarjeta: Tetramestre, Materia, Tipo y Botones de Admin */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 pr-1">
            {activity.tetraName && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-800 text-white tracking-tight flex-shrink-0">
                {activity.tetraName.replace('Tetramestre', 'Tetra')}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 truncate max-w-full">
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
          </div>

          {/* Botones de Administrador: Editar y Eliminar (Siempre visibles) */}
          {isEditor && (
            <div className="flex items-center space-x-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onEdit(activity)}
                title="Editar actividad"
                className="w-10 h-10 min-h-[40px] min-w-[40px] sm:w-8 sm:h-8 sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition active:scale-95"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(activity)}
                title="Eliminar actividad"
                className="w-10 h-10 min-h-[40px] min-w-[40px] sm:w-8 sm:h-8 sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Título de la Actividad */}
        <h3 className={`font-bold text-sm sm:text-base text-slate-900 leading-snug line-clamp-2 mb-2 group-hover:text-blue-700 transition ${
          isCompleted ? 'line-through text-slate-500' : ''
        }`}>
          {activity.title}
        </h3>

        {/* Detalles extendidos solo visibles en Desktop para mantener limpio el móvil */}
        {activity.teacher && (
          <div className="hidden sm:flex items-center text-xs text-slate-500 mb-2 space-x-1.5">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">Prof. {activity.teacher}</span>
          </div>
        )}

        {activity.description && (
          <p className="text-xs text-slate-600 line-clamp-3 mb-2.5 leading-relaxed">
            {stripMarkdownAndHtml(activity.description)}
          </p>
        )}

        {/* Botón de Enlace Directo (Foros, Exámenes, Teams, WhatsApp, Meet, Zoom) */}
        {directAction && (
          <div className="mt-2.5 mb-1" onClick={(e) => e.stopPropagation()}>
            <a
              href={directAction.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full inline-flex items-center justify-center space-x-2 py-2 px-3 rounded-xl font-bold text-xs transition duration-150 active:scale-98 ${directAction.colorClass}`}
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
              
              <span className="truncate">{directAction.label}</span>
              <ExternalLink className="w-3 h-3 opacity-85 flex-shrink-0" />
            </a>
          </div>
        )}
      </div>

      {/* Pie de la Tarjeta: Fecha con Barra de Progreso y Botones de Estado */}
      <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col space-y-2.5">
        
        {/* Fecha de Entrega y Estado de Vencimiento */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium text-[11px] sm:text-xs">
              {formatShortDate(activity.dueDate)}
            </span>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${dueInfo.className}`}>
            {dueInfo.text}
          </span>
        </div>

        {/* Barra de Progreso de Vencimiento: Verde (>=7d), Amarillo (4-6d), Rojo (<=3d) */}
        {activity.dueDate && !isCompleted && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="font-medium text-slate-400">Tiempo restante:</span>
              <span className={`font-bold flex items-center gap-1 ${dueInfo.textColor}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dueInfo.dotColor }} />
                {dueInfo.label}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${dueInfo.barColor}`}
                style={{ width: `${Math.min(100, Math.max(6, dueInfo.percent))}%` }}
              />
            </div>
          </div>
        )}

        {/* Botones de Acción de Estado (Completar / En Progreso / Pendiente) y Recursos */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between pt-1 gap-2">
          
          {/* Botón de Recursos y Visor Integrado */}
          {onOpenWorkspace ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenWorkspace(activity);
              }}
              title="Abrir recursos, documentos, enlaces y visor integrado"
              className="inline-flex items-center gap-1.5 text-xs font-bold min-h-[36px] px-3 py-1.5 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border border-blue-200/90 transition active:scale-95 cursor-pointer shadow-2xs flex-shrink-0"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>Recursos</span>
              {(attachmentsCount + linksCount > 0) && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-200/80 text-blue-900 font-extrabold leading-none">
                  {attachmentsCount + linksCount}
                </span>
              )}
            </button>
          ) : (
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-500 truncate">
              {attachmentsCount > 0 ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium text-[11px] border border-blue-100">
                  <Paperclip className="w-3 h-3" />
                  <span>{attachmentsCount} {attachmentsCount === 1 ? 'archivo' : 'archivos'}</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">Sin archivos</span>
              )}
            </div>
          )}

          {/* Botones de Cambio de Estado Personal */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none justify-end">
            {isPending && (
              <>
                <button
                  onClick={(e) => handleSetStatus(e, 'in_progress')}
                  title="Marcar en progreso para mí"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1 text-xs font-bold min-h-[36px] px-3 py-1.5 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Iniciar</span>
                </button>
                <button
                  onClick={(e) => handleSetStatus(e, 'completed')}
                  title="Marcar como completada para mí"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1 text-xs font-bold min-h-[36px] px-3.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Completar</span>
                </button>
              </>
            )}

            {isInProgress && (
              <>
                <button
                  onClick={(e) => handleSetStatus(e, 'pending')}
                  title="Mover a pendiente"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1 text-xs font-bold min-h-[36px] px-2.5 py-1.5 rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition active:scale-95"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pausar</span>
                </button>
                <button
                  onClick={(e) => handleSetStatus(e, 'completed')}
                  title="Marcar como completada"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1 text-xs font-bold min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Completar</span>
                </button>
              </>
            )}

            {isCompleted && (
              <button
                onClick={(e) => handleSetStatus(e, 'pending')}
                title="Reabrir / Marcar como pendiente para mí"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 text-xs font-bold min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Completada ✓ (Reabrir)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ActivityCard;

