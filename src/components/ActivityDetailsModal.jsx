import React, { useEffect } from 'react';
import { 
  X, 
  ArrowLeft,
  Calendar, 
  Clock, 
  User, 
  Download, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Paperclip, 
  Share2, 
  CheckCircle2, 
  PlayCircle,
  FileText,
  Video,
  MessagesSquare,
  MessageCircle,
  GraduationCap,
  FolderOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ACTIVITY_STATUSES, ACTIVITY_TYPES } from '../types/constants';
import { formatFullDate, getDueBadgeInfo } from '../utils/dateUtils';
import { getDirectActionInfo } from '../utils/textUtils';
import { formatBytes } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import FileIcon from './FileIcon';
import RichTextRenderer from './RichTextRenderer';

export const ActivityDetailsModal = ({
  activity,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onOpenWorkspace,
  isStudent = false,
  personalStatus = 'pending',
  onSetPersonalStatus,
  onToggleStudentCompletion
}) => {
  const { isEditor } = useAuth();

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activity) return null;

  const userStatus = personalStatus || 'pending';
  const isCompleted = userStatus === 'completed' || userStatus === true;
  const isInProgress = userStatus === 'in_progress';
  const isPending = !isCompleted && !isInProgress;

  const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type) || { 
    label: 'Actividad', 
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' 
  };
  const dueInfo = getDueBadgeInfo(activity.dueDate, isCompleted);
  const directAction = getDirectActionInfo(activity);
  const attachments = activity.attachments || [];
  const links = activity.links || [];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: activity.title,
        text: `Actividad de ${activity.subject}: ${activity.title} (Fecha límite: ${activity.dueDate})`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  return (
    <>
      {/* 1. MÓVIL: Pantalla Completa (Overlay nativo en pantallas pequeñas < md) */}
      <div className="md:hidden fixed inset-0 z-[500] w-full h-full bg-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Encabezado Móvil */}
        <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="p-2 text-slate-700 hover:text-slate-950 bg-slate-200/80 active:bg-slate-300 rounded-xl transition flex items-center gap-1.5 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-1.5 truncate flex-1 justify-center px-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 truncate">
              {activity.subject || 'Materia'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onOpenWorkspace && (
              <button
                onClick={() => onOpenWorkspace(activity)}
                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                title="Abrir Recursos y Espacio de Trabajo"
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Recursos</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-200/70 transition"
              title="Compartir"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Título y Metadatos Móvil */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white space-y-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {activity.tetraName && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-900 text-white">
                {activity.tetraName.replace('Tetramestre', 'Tetra')}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeInfo.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {typeInfo.label}
            </span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900 leading-snug">
            {activity.title}
          </h2>
          <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-800">{formatFullDate(activity.dueDate)}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${dueInfo.className}`}>
              {dueInfo.text}
            </span>
          </div>
        </div>

        {/* Contenido Desplazable Móvil */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 touch-scroll text-sm text-slate-700">
          
          {/* Botón de Acción Directa Hero Móvil (Teams, WhatsApp, Meet, Examen, Foro) */}
          {directAction && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className={`p-2 rounded-xl flex-shrink-0 ${
                  directAction.platform === 'teams' ? 'bg-[#464EB8]/15 text-[#464EB8]' :
                  directAction.platform === 'whatsapp' ? 'bg-[#128C7E]/15 text-[#128C7E]' :
                  directAction.platform === 'meet' ? 'bg-[#00897B]/15 text-[#00897B]' :
                  directAction.platform === 'examen' ? 'bg-rose-100 text-rose-700' :
                  directAction.platform === 'foro' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {directAction.platform === 'teams' && <Video className="w-5 h-5" />}
                  {directAction.platform === 'meet' && <Video className="w-5 h-5" />}
                  {directAction.platform === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                  {directAction.platform === 'zoom' && <Video className="w-5 h-5" />}
                  {directAction.platform === 'reunion' && <Video className="w-5 h-5" />}
                  {directAction.platform === 'examen' && <GraduationCap className="w-5 h-5" />}
                  {directAction.platform === 'foro' && <MessagesSquare className="w-5 h-5" />}
                  {directAction.platform === 'actividad' && <ExternalLink className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-extrabold text-slate-900 truncate">
                    {directAction.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {directAction.url}
                  </p>
                </div>
              </div>

              <a
                href={directAction.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm active:scale-98 ${directAction.colorClass}`}
              >
                <span>{directAction.label}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Instrucciones */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Instrucciones y Descripción</span>
            </h3>
            {activity.description ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed shadow-xs">
                <RichTextRenderer content={activity.description} />
              </div>
            ) : (
              <p className="text-slate-400 text-xs italic py-2">Sin instrucciones adicionales.</p>
            )}
          </div>

          {/* Enlaces y Recursos Web */}
          {links.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Recursos Web ({links.length})</span>
              </h3>
              <div className="space-y-1.5">
                {links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100 border border-blue-200 text-blue-800 font-semibold text-xs transition"
                  >
                    <span className="truncate pr-2">{link.title || link.url}</span>
                    <span className="text-blue-600 font-bold">Abrir ↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Documentos Adjuntos */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                <span>Documentos Adjuntos ({attachments.length})</span>
              </h3>
              <div className="space-y-2">
                {attachments.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center space-x-2.5 truncate pr-2">
                      <FileIcon category={file.category} className="w-5 h-5 flex-shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 text-xs truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.name}
                      className="p-2 text-blue-600 bg-blue-50 rounded-xl"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie Móvil */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center bg-slate-200 p-1 rounded-2xl gap-1">
            <button
              onClick={() => onSetPersonalStatus && onSetPersonalStatus(activity.id, 'pending')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                isPending ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendiente</span>
            </button>
            <button
              onClick={() => onSetPersonalStatus && onSetPersonalStatus(activity.id, 'in_progress')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                isInProgress ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>En Progreso</span>
            </button>
            <button
              onClick={() => {
                if (!isCompleted) {
                  try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } }); } catch (e) {}
                }
                if (onSetPersonalStatus) onSetPersonalStatus(activity.id, 'completed');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                isCompleted ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completada</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            {isEditor && (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => { onClose(); onDelete(activity); }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => { onClose(); onEdit(activity); }}
                  className="px-3.5 py-1.5 text-xs font-bold bg-slate-800 text-white rounded-xl shadow-xs"
                >
                  Editar
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>

      {/* 2. ESCRITORIO / TABLET: Panel Lateral Derecho que EMPUJA el contenido y topa directamente debajo del Ribbon */}
      <aside 
        className="hidden md:flex w-[380px] lg:w-[440px] xl:w-[500px] 2xl:w-[560px] flex-shrink-0 bg-white border-l border-slate-200/90 shadow-xl flex-col h-full self-stretch overflow-hidden animate-in slide-in-from-right duration-200 ease-out z-20"
      >
        {/* Encabezado del Panel Derecho */}
        <div className="px-5 py-3.5 border-b border-slate-200/90 bg-slate-50/90 flex flex-col gap-2.5 flex-shrink-0">
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 pr-1">
              {activity.tetraName && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-900 text-white tracking-tight flex-shrink-0">
                  {activity.tetraName.replace('Tetramestre', 'Tetra')}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 truncate max-w-[200px]">
                {activity.subject || 'Materia'}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${typeInfo.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {typeInfo.label}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 flex-shrink-0">
              {onOpenWorkspace && (
                <button
                  onClick={() => onOpenWorkspace(activity)}
                  title="Abrir Recursos y Visor Integrado"
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 active:bg-blue-200 rounded-xl transition shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recursos</span>
                </button>
              )}
              <button
                onClick={handleShare}
                title="Compartir actividad"
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/70 transition"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg transition active:scale-95"
                title="Cerrar panel lateral"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Título de la Actividad */}
          <h2 className="text-base lg:text-lg font-extrabold text-slate-900 leading-snug">
            {activity.title}
          </h2>

          {/* Metadatos: Fecha Límite y Docente */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-0.5">
            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="font-semibold text-slate-800">
                {formatFullDate(activity.dueDate)}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${dueInfo.className}`}>
                {dueInfo.text}
              </span>
            </div>

            {activity.teacher && (
              <div className="flex items-center space-x-1.5 text-slate-500">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Prof. {activity.teacher}</span>
              </div>
            )}
          </div>

        </div>

        {/* Cuerpo del Panel: Solo el Detalle descrito al crear la asignación */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 touch-scroll min-h-0 text-sm text-slate-700">
          
          {/* Botón de Acción Directa Hero Desktop (Teams, WhatsApp, Meet, Examen, Foro) */}
          {directAction && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                  directAction.platform === 'teams' ? 'bg-[#464EB8]/15 text-[#464EB8]' :
                  directAction.platform === 'whatsapp' ? 'bg-[#128C7E]/15 text-[#128C7E]' :
                  directAction.platform === 'meet' ? 'bg-[#00897B]/15 text-[#00897B]' :
                  directAction.platform === 'examen' ? 'bg-rose-100 text-rose-700' :
                  directAction.platform === 'foro' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {directAction.platform === 'teams' && <Video className="w-5 h-5" />}
                  {directAction.platform === 'meet' && <Video className="w-5 h-5" />}
                  {directAction.platform === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                  {directAction.platform === 'zoom' && <Video className="w-5 h-5" />}
                  {directAction.platform === 'reunion' && <Video className="w-5 h-5" />}
                  {directAction.platform === 'examen' && <GraduationCap className="w-5 h-5" />}
                  {directAction.platform === 'foro' && <MessagesSquare className="w-5 h-5" />}
                  {directAction.platform === 'actividad' && <ExternalLink className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    {directAction.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {directAction.url}
                  </p>
                </div>
              </div>

              <a
                href={directAction.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 flex-shrink-0 ${directAction.colorClass}`}
              >
                <span>Acceder</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Instrucciones y Descripción Enriquecida con Enlaces Activos */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Instrucciones y Descripción</span>
            </h3>

            {activity.description ? (
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 text-slate-800 leading-relaxed shadow-xs">
                <RichTextRenderer content={activity.description} />
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-xs italic">
                No se incluyeron instrucciones adicionales para esta actividad.
              </div>
            )}
          </div>

          {/* Enlaces y Recursos Web agregados */}
          {links.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Recursos y Enlaces ({links.length})</span>
              </h3>
              <div className="space-y-2">
                {links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200 text-blue-800 transition font-semibold text-xs group"
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate">{link.title || link.url}</span>
                    </div>
                    <span className="text-blue-600 font-bold group-hover:underline flex-shrink-0">
                      Abrir ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Documentos Adjuntos */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <span>Documentos Adjuntos ({attachments.length})</span>
                </h3>
                <span className="text-[10px] text-emerald-600 font-bold">
                  ✓ Descarga directa
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {attachments.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition"
                  >
                    <div className="flex items-center space-x-2.5 truncate pr-2">
                      <FileIcon category={file.category} className="w-5 h-5 flex-shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 text-xs truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatBytes(file.size)}</p>
                      </div>
                    </div>

                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.name}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
                      title="Descargar archivo"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Pie del Panel: Selector de Estado Personal y Acciones */}
        <div className="p-3.5 bg-slate-50/95 border-t border-slate-200/90 flex flex-col gap-2.5 flex-shrink-0">
          
          {/* Selector de Estado Personal */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl gap-1">
            <button
              onClick={() => onSetPersonalStatus && onSetPersonalStatus(activity.id, 'pending')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 active:scale-95 ${
                isPending
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendiente</span>
            </button>

            <button
              onClick={() => onSetPersonalStatus && onSetPersonalStatus(activity.id, 'in_progress')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 active:scale-95 ${
                isInProgress
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>En Progreso</span>
            </button>

            <button
              onClick={() => {
                if (!isCompleted) {
                  try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } }); } catch (e) {}
                }
                if (onSetPersonalStatus) onSetPersonalStatus(activity.id, 'completed');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 active:scale-95 ${
                isCompleted
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completada</span>
            </button>
          </div>

          {/* Acciones de Edición/Eliminación y Cerrar */}
          <div className="flex items-center justify-between gap-2">
            {isEditor && (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => { onClose(); onDelete(activity); }}
                  className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => { onClose(); onEdit(activity); }}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-xs transition"
                >
                  Editar
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="ml-auto px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
            >
              Cerrar
            </button>
          </div>

        </div>

      </aside>
    </>
  );
};

export default ActivityDetailsModal;
