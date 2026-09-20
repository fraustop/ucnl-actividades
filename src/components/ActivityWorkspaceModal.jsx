import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Download, 
  ExternalLink, 
  Paperclip, 
  Share2, 
  CheckCircle2, 
  PlayCircle, 
  FileText, 
  Video, 
  MessagesSquare, 
  MessageCircle, 
  GraduationCap,
  Eye, 
  EyeOff, 
  Send, 
  Upload, 
  Link2, 
  Trash2, 
  Loader2, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Film, 
  Music, 
  Image as ImageIcon, 
  FolderOpen, 
  Info, 
  Copy, 
  Check, 
  AppWindow, 
  Globe, 
  ShieldAlert, 
  HelpCircle, 
  Compass,
  Search,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ACTIVITY_TYPES } from '../types/constants';
import { formatFullDate, getDueBadgeInfo } from '../utils/dateUtils';
import { getDirectActionInfo } from '../utils/textUtils';
import { formatBytes, uploadAttachment } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import FileIcon from './FileIcon';
import RichTextRenderer from './RichTextRenderer';
import { 
  getEmbedInfo, 
  subscribeToActivityComments, 
  addActivityComment, 
  deleteActivityComment, 
  addActivityResourceLink, 
  uploadAndAddActivityAttachment 
} from '../services/activityWorkspaceService';

export const ActivityWorkspaceModal = ({
  isOpen,
  onClose,
  activity = null,
  onSelectActivity,
  activities = [],
  academicStructure = [],
  studentCompletions = {},
  onEditActivity,
  personalStatus = 'pending',
  onSetPersonalStatus
}) => {
  const { currentUser, userProfile, isAdmin, isEditor } = useAuth();

  // Actividad seleccionada localmente (sincronizada con la prop activity)
  const [currentActivity, setCurrentActivity] = useState(activity || null);

  // Sincronizar cuando la prop activity cambie externamente
  useEffect(() => {
    setCurrentActivity(activity || null);
  }, [activity]);

  // Filtros del explorador de actividades (columna izquierda cuando no hay actividad seleccionada o al navegar)
  const [explorerSearch, setExplorerSearch] = useState('');
  const [explorerTetra, setExplorerTetra] = useState('all');
  const [explorerStatus, setExplorerStatus] = useState('all');

  // Estados de vista
  const [activeTab, setActiveTab] = useState('viewer'); // 'viewer' | 'comments' | 'upload' | 'share_link'
  const [activeResource, setActiveResource] = useState(null);
  const [isFullscreenViewer, setIsFullscreenViewer] = useState(false);
  const [useGoogleDocsFallback, setUseGoogleDocsFallback] = useState(false);

  // Estados de Comentarios
  const [comments, setComments] = useState([]);
  const [userThreadBytes, setUserThreadBytes] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commentLinkInput, setCommentLinkInput] = useState('');
  const [commentFile, setCommentFile] = useState(null);
  const [sendingComment, setSendingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const commentsEndRef = useRef(null);

  // Estados de Subida de Recursos
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Estados de Compartir Enlace
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState('');
  const [linkError, setLinkError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSecurityExplanation, setShowSecurityExplanation] = useState(false);

  // Abrir en el navegador predeterminado
  const handleOpenDefaultBrowser = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Abrir ventana emergente (Pop-out / Companion window)
  const handleOpenPopout = (url) => {
    if (!url) return;
    const width = 1100;
    const height = 800;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    window.open(
      url,
      'ucnl_resource_window',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes,status=yes`
    );
  };

  // Copiar enlace al portapapeles
  const handleCopyLink = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.warn('No se pudo copiar:', e);
    }
  };

  // 1. Suscripción a comentarios en tiempo real (1 documento por alumno/actividad)
  useEffect(() => {
    if (!isOpen || !currentActivity?.id) {
      setComments([]);
      setUserThreadBytes(0);
      return;
    }
    const unsubscribe = subscribeToActivityComments(
      currentActivity.id,
      (data) => {
        if (Array.isArray(data)) {
          setComments(data);
        } else if (data && typeof data === 'object') {
          setComments(data.comments || []);
          setUserThreadBytes(data.userThreadBytes || 0);
        }
      },
      (err) => console.error('Error cargando comentarios:', err),
      currentUser?.uid
    );
    return () => unsubscribe();
  }, [isOpen, currentActivity?.id, currentUser?.uid]);

  // 2. Cargar automáticamente el primer recurso o enlace si existe al cambiar de actividad
  useEffect(() => {
    if (!isOpen || !currentActivity) {
      setActiveResource(null);
      return;
    }
    setUseGoogleDocsFallback(false);

    if (currentActivity.links && currentActivity.links.length > 0) {
      const firstLink = currentActivity.links[0];
      setActiveResource(getEmbedInfo(firstLink.url, firstLink.title));
      setActiveTab('viewer');
    } else if (currentActivity.attachments && currentActivity.attachments.length > 0) {
      const firstAtt = currentActivity.attachments[0];
      setActiveResource(getEmbedInfo(firstAtt.downloadUrl, firstAtt.name));
      setActiveTab('viewer');
    } else {
      setActiveResource(null);
    }
  }, [isOpen, currentActivity?.id]);

  // 3. Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isFullscreenViewer) {
        onClose();
      } else if (e.key === 'Escape' && isFullscreenViewer) {
        setIsFullscreenViewer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreenViewer, onClose]);

  // Manejar selección de una actividad desde el listado explorador
  const handleSelectActivity = (act) => {
    setCurrentActivity(act);
    setUseGoogleDocsFallback(false);
    if (act?.links && act.links.length > 0) {
      const firstLink = act.links[0];
      setActiveResource(getEmbedInfo(firstLink.url, firstLink.title));
      setActiveTab('viewer');
    } else if (act?.attachments && act.attachments.length > 0) {
      const firstAtt = act.attachments[0];
      setActiveResource(getEmbedInfo(firstAtt.downloadUrl, firstAtt.name));
      setActiveTab('viewer');
    } else {
      setActiveResource(null);
      setActiveTab('viewer');
    }
    if (onSelectActivity) {
      onSelectActivity(act);
    }
  };

  // Filtrado de actividades en el explorador izquierdo
  const filteredExplorerActivities = (activities || []).filter((act) => {
    if (explorerTetra !== 'all') {
      const matchId = act.tetraId === explorerTetra;
      const targetTetra = academicStructure.find(t => t.id === explorerTetra);
      const matchName = targetTetra && act.tetraName === targetTetra.name;
      if (!matchId && !matchName) return false;
    }
    if (explorerStatus !== 'all') {
      const uStatus = studentCompletions[act.id] || 'pending';
      const isDone = uStatus === 'completed' || uStatus === true;
      const inProg = uStatus === 'in_progress';
      const isPend = !isDone && !inProg;
      if (explorerStatus === 'pending' && !isPend) return false;
      if (explorerStatus === 'in_progress' && !inProg) return false;
      if (explorerStatus === 'completed' && !isDone) return false;
    }
    if (explorerSearch.trim()) {
      const q = explorerSearch.toLowerCase();
      const matchTitle = (act.title || '').toLowerCase().includes(q);
      const matchSubj = (act.subject || '').toLowerCase().includes(q);
      const matchTeacher = (act.teacher || '').toLowerCase().includes(q);
      const matchDesc = (act.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSubj && !matchTeacher && !matchDesc) return false;
    }
    return true;
  });

  if (!isOpen) return null;

  const currentPersonalStatus = currentActivity 
    ? (studentCompletions[currentActivity.id] || personalStatus || 'pending')
    : 'pending';
  const isCompleted = currentPersonalStatus === 'completed' || currentPersonalStatus === true;
  const isInProgress = currentPersonalStatus === 'in_progress';
  const isPending = !isCompleted && !isInProgress;

  const typeInfo = currentActivity ? (ACTIVITY_TYPES.find(t => t.id === currentActivity.type) || { 
    label: 'Actividad', 
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' 
  }) : null;
  const dueInfo = currentActivity ? getDueBadgeInfo(currentActivity.dueDate, isCompleted) : null;
  const directAction = currentActivity ? getDirectActionInfo(currentActivity) : null;
  const attachments = currentActivity?.attachments || [];
  const links = currentActivity?.links || [];

  // Manejar selección de recurso para el visor integrado
  const handleSelectResource = (resource) => {
    setUseGoogleDocsFallback(false);
    const info = getEmbedInfo(resource.url || resource.downloadUrl, resource.title || resource.name);
    setActiveResource(info);
    setActiveTab('viewer');
  };

  // Enviar comentario
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!currentActivity?.id) return;
    if (!commentText.trim() && !commentLinkInput.trim() && !commentFile) return;

    setSendingComment(true);
    setCommentError('');
    try {
      let commentAttachments = [];
      let commentLinks = [];

      if (commentFile) {
        const fileMeta = await uploadAttachment(commentFile, `comments_${currentActivity.id}`);
        commentAttachments.push(fileMeta);
      }

      if (commentLinkInput.trim()) {
        commentLinks.push({
          title: commentLinkInput.trim(),
          url: commentLinkInput.trim()
        });
      }

      await addActivityComment(
        currentActivity.id,
        {
          text: commentText,
          attachments: commentAttachments,
          links: commentLinks
        },
        currentUser,
        userProfile
      );

      setCommentText('');
      setCommentLinkInput('');
      setCommentFile(null);
      // Desplazar al último comentario
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error al enviar comentario:', err);
      setCommentError(err.message || 'No se pudo publicar el comentario.');
    } finally {
      setSendingComment(false);
    }
  };

  // Eliminar comentario
  const handleDeleteComment = async (commentId, authorUserId) => {
    if (!currentActivity?.id) return;
    if (!window.confirm('¿Deseas eliminar este comentario?')) return;
    try {
      await deleteActivityComment(currentActivity.id, commentId, authorUserId || currentUser?.uid);
    } catch (err) {
      console.error('Error al borrar comentario:', err);
    }
  };

  // Subir archivo a la actividad
  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!currentActivity?.id || !uploadFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess('');

    try {
      const newAttachment = await uploadAndAddActivityAttachment(
        currentActivity.id,
        currentActivity,
        uploadFile,
        (progress) => setUploadProgress(progress)
      );

      setUploadSuccess(`¡Archivo "${uploadFile.name}" subido exitosamente!`);
      setUploadFile(null);
      
      // Cargar de inmediato en el visor
      if (newAttachment) {
        handleSelectResource({ url: newAttachment.downloadUrl, title: newAttachment.name });
      }

      setTimeout(() => setUploadSuccess(''), 4000);
    } catch (err) {
      console.error('Error al subir archivo:', err);
      setUploadError(err.message || 'Error al subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Compartir nuevo enlace / video
  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!currentActivity?.id || !newLinkUrl.trim()) return;

    setSavingLink(true);
    setLinkError('');
    setLinkSuccess('');

    try {
      const linkObj = {
        title: newLinkTitle.trim() || newLinkUrl.trim(),
        url: newLinkUrl.trim()
      };

      await addActivityResourceLink(currentActivity.id, currentActivity, linkObj);
      setLinkSuccess('¡Enlace guardado y compartido en la actividad!');
      
      // Cargar en el visor integrado
      handleSelectResource(linkObj);

      setNewLinkUrl('');
      setNewLinkTitle('');
      setTimeout(() => setLinkSuccess(''), 4000);
    } catch (err) {
      console.error('Error al compartir enlace:', err);
      setLinkError(err.message || 'Error al guardar el enlace.');
    } finally {
      setSavingLink(false);
    }
  };

  // Renderizado del Visor Integrado Multiformato
  const renderIntegratedViewer = () => {
    if (!activeResource) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-4 bg-slate-900/40">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
            <Film className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h4 className="text-base font-bold text-white">Visor Multimedia Integrado</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Haz clic en cualquier enlace o documento de las instrucciones (columna izquierda) o añade un video o archivo para previsualizarlo aquí con soporte integrado.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm pt-2">
            <button
              onClick={() => setActiveTab('share_link')}
              className="p-3 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-2xl text-xs font-bold text-slate-200 transition flex items-center justify-center space-x-2"
            >
              <Video className="w-4 h-4 text-cyan-400" />
              <span>Ver Video o Enlace</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className="p-3 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-2xl text-xs font-bold text-slate-200 transition flex items-center justify-center space-x-2"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Subir Documento</span>
            </button>
          </div>
        </div>
      );
    }

    const { type, embedUrl, originalUrl, title, googleViewerUrl } = activeResource;

    return (
      <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
        {/* Barra Superior del Visor */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0 text-white">
          <div className="flex items-center space-x-2 truncate flex-1 min-w-0">
            <span className="p-1 rounded bg-blue-500/20 text-blue-300 flex-shrink-0">
              {type === 'youtube' || type === 'vimeo' || type === 'video_direct' ? (
                <Video className="w-3.5 h-3.5" />
              ) : type === 'image' ? (
                <ImageIcon className="w-3.5 h-3.5" />
              ) : type === 'audio_direct' ? (
                <Music className="w-3.5 h-3.5" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
            </span>
            <span className="text-xs font-bold truncate text-slate-200" title={title}>
              {title}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 uppercase font-mono font-bold hidden sm:inline-block">
              {type}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {/* Botón Explicativo: ¿Por qué el sitio no abre dentro de la app? */}
            <button
              onClick={() => setShowSecurityExplanation(true)}
              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
              title="Explicar por qué algunos sitios (como la universidad) rechazan la conexión en la app"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">¿Por qué no abre?</span>
            </button>

            {/* Botón Principal: Abrir en el Navegador Predeterminado */}
            <button
              onClick={() => handleOpenDefaultBrowser(originalUrl)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Abrir página en el navegador predeterminado de tu equipo"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Abrir en Navegador</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>

            {/* Si es Office / PDF / Web, permitir alternar con Google Docs Viewer */}
            {(type === 'pdf' || type === 'office' || type === 'web') && (
              <button
                onClick={() => setUseGoogleDocsFallback(!useGoogleDocsFallback)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition border ${
                  useGoogleDocsFallback
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Alternar entre visualizador directo y Google Docs Viewer (útil si la universidad bloquea la conexión)"
              >
                {useGoogleDocsFallback ? 'Modo Normal' : 'Google Docs Viewer'}
              </button>
            )}

            {/* Botón de Ventana Paralela / Popout */}
            <button
              onClick={() => handleOpenPopout(originalUrl)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-1 text-xs font-bold"
              title="Abrir en Ventana Paralela / Emergente (Recomendado para páginas de la universidad)"
            >
              <AppWindow className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline text-[11px]">Ventana Paralela</span>
            </button>

            {/* Botón Copiar Enlace */}
            <button
              onClick={() => handleCopyLink(originalUrl)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-1 text-xs font-bold"
              title="Copiar enlace al portapapeles"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400 hidden sm:inline">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] hidden sm:inline">Copiar</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsFullscreenViewer(!isFullscreenViewer)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title={isFullscreenViewer ? 'Salir de pantalla completa' : 'Pantalla completa del visor'}
            >
              {isFullscreenViewer ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setActiveResource(null)}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
              title="Cerrar visor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Contenedor del Visor */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-auto p-2 bg-slate-950">
          
          {/* 1. YouTube & Vimeo & Loom */}
          {(type === 'youtube' || type === 'vimeo' || type === 'loom') && (
            <div className="w-full h-full max-h-[85vh] aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800">
              <iframe
                src={embedUrl}
                title={title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            </div>
          )}

          {/* 2. Google Drive / Docs / Sheets / Slides */}
          {type === 'gdrive' && (
            <iframe
              src={embedUrl}
              title={title}
              className="w-full h-full rounded-2xl border border-slate-800 bg-white"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          )}

          {/* 3. Video Directo (MP4, WebM, OGG) */}
          {type === 'video_direct' && (
            <video
              src={embedUrl}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-2xl shadow-2xl bg-black border border-slate-800"
            >
              Tu navegador no soporta la reproducción directa de este formato de video.
            </video>
          )}

          {/* 4. Audio Directo (MP3, WAV) */}
          {type === 'audio_direct' && (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 max-w-md w-full">
              <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 animate-pulse">
                <Music className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-white text-center truncate w-full">{title}</p>
              <audio src={embedUrl} controls className="w-full rounded-xl" autoPlay />
            </div>
          )}

          {/* 5. Imágenes */}
          {type === 'image' && (
            <div className="w-full h-full flex items-center justify-center p-2">
              <img
                src={embedUrl}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            </div>
          )}

          {/* 6. Documentos PDF */}
          {type === 'pdf' && (
            <iframe
              src={useGoogleDocsFallback ? googleViewerUrl : `${embedUrl}#toolbar=1`}
              title={title}
              className="w-full h-full rounded-2xl border border-slate-800 bg-slate-900"
            />
          )}

          {/* 7. Documentos Office (Word, Excel, PowerPoint) */}
          {type === 'office' && (
            <iframe
              src={useGoogleDocsFallback ? googleViewerUrl : embedUrl}
              title={title}
              className="w-full h-full rounded-2xl border border-slate-800 bg-white"
            />
          )}

          {/* 8. Web General / Iframe con Asistente de Conexión */}
          {type === 'web' && (
            <div className="w-full h-full flex flex-col relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
              
              {/* Barra informativa y de acciones rápidas para portales universitarios */}
              <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-300 flex-shrink-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 flex-shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      ¿La página rechaza la conexión?
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      El sitio web de la universidad no permite abrirse dentro de la app por seguridad.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botón que explica la restricción */}
                  <button
                    onClick={() => setShowSecurityExplanation(true)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
                    title="Ver explicación de por qué este sitio no se puede abrir en la aplicación"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>¿Por qué no abre?</span>
                  </button>

                  {/* Botón para abrir en el navegador predeterminado */}
                  <button
                    onClick={() => handleOpenDefaultBrowser(originalUrl)}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer active:scale-95"
                    title="Abrir página en el navegador predeterminado"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Abrir en el Navegador Predeterminado</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </button>

                  {/* Botón Ventana Paralela */}
                  <button
                    onClick={() => handleOpenPopout(originalUrl)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-2xs cursor-pointer"
                    title="Abre el portal en una ventana flotante al lado de la app para trabajar en simultáneo"
                  >
                    <AppWindow className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Ventana Paralela</span>
                  </button>

                  {/* Botón Copiar Enlace */}
                  <button
                    onClick={() => handleCopyLink(originalUrl)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center space-x-1 transition border border-slate-700 cursor-pointer"
                    title="Copiar enlace al portapapeles"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Iframe o Google Docs Fallback */}
              {useGoogleDocsFallback ? (
                <iframe
                  src={googleViewerUrl}
                  title={title}
                  className="w-full flex-1 border-0 bg-slate-900"
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title={title}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
                  className="w-full flex-1 border-0 bg-white"
                />
              )}
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div 
      className="flex-1 w-full h-full min-h-0 flex flex-col md:flex-row overflow-hidden bg-white text-slate-900 animate-in fade-in duration-150 relative"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ========================================================================= */}
      {/* COLUMNA IZQUIERDA: Explorador de Actividades O Detalle de la Actividad    */}
      {/* ========================================================================= */}
      <div className="w-full md:w-[42%] lg:w-[38%] xl:w-[34%] border-b md:border-b-0 md:border-r border-slate-200 flex flex-col h-full overflow-hidden bg-slate-50 flex-shrink-0">
        
        {!currentActivity ? (
          /* MODO 1: EXPLORADOR DE ACTIVIDADES (Cuando no hay actividad seleccionada) */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Cabecera del Explorador */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white space-y-2.5 flex-shrink-0 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                      <span>Recursos por Actividad</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {filteredExplorerActivities.length}
                      </span>
                    </h2>
                    <p className="text-[10px] text-slate-500">Selecciona una actividad para explorar</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
                  title="Cerrar espacio de recursos (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Buscador de actividades */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={explorerSearch}
                  onChange={(e) => setExplorerSearch(e.target.value)}
                  placeholder="Buscar actividad, materia o profesor..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {explorerSearch && (
                  <button
                    onClick={() => setExplorerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filtros de Tetramestre y Estado */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <select
                  value={explorerTetra}
                  onChange={(e) => setExplorerTetra(e.target.value)}
                  className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="all">Todos los Tetras ({academicStructure.length})</option>
                  {academicStructure.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                <select
                  value={explorerStatus}
                  onChange={(e) => setExplorerStatus(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="pending">⏳ Pendientes</option>
                  <option value="in_progress">🚀 En Progreso</option>
                  <option value="completed">✅ Completadas</option>
                </select>
              </div>
            </div>

            {/* Lista de Actividades */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 touch-scroll min-h-0">
              {filteredExplorerActivities.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <FolderOpen className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No se encontraron actividades con los filtros aplicados.</p>
                </div>
              ) : (
                filteredExplorerActivities.map((act) => {
                  const uStatus = studentCompletions[act.id] || 'pending';
                  const isDone = uStatus === 'completed' || uStatus === true;
                  const inProg = uStatus === 'in_progress';
                  const attCount = act.attachments?.length || 0;
                  const linkCount = act.links?.length || 0;
                  const tInfo = ACTIVITY_TYPES.find(t => t.id === act.type) || { label: 'Actividad', badgeClass: 'bg-slate-100 text-slate-700' };
                  const dInfo = getDueBadgeInfo(act.dueDate, isDone);

                  return (
                    <div
                      key={act.id}
                      onClick={() => handleSelectActivity(act)}
                      className="p-3 bg-white hover:bg-blue-50/70 rounded-2xl border border-slate-200 hover:border-blue-300 transition shadow-2xs cursor-pointer group space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {act.tetraName && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-slate-900 text-white">
                              {act.tetraName.replace('Tetramestre', 'Tetra')}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${tInfo.badgeClass}`}>
                            {tInfo.label}
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 truncate max-w-[130px]">
                            {act.subject}
                          </span>
                        </div>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${dInfo.className}`}>
                          {dInfo.text}
                        </span>
                      </div>

                      <h3 className="text-xs font-extrabold text-slate-900 line-clamp-2 group-hover:text-blue-700 transition">
                        {act.title}
                      </h3>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex items-center space-x-2">
                          {attCount > 0 && (
                            <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                              <Paperclip className="w-3 h-3 text-blue-600" />
                              <span>{attCount} {attCount === 1 ? 'doc' : 'docs'}</span>
                            </span>
                          )}
                          {linkCount > 0 && (
                            <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                              <ExternalLink className="w-3 h-3 text-indigo-600" />
                              <span>{linkCount} {linkCount === 1 ? 'enlace' : 'enlaces'}</span>
                            </span>
                          )}
                          {attCount === 0 && linkCount === 0 && (
                            <span className="text-slate-400 italic">Sin adjuntos</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          {isDone ? (
                            <span className="text-emerald-700 font-bold flex items-center space-x-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Completada</span>
                            </span>
                          ) : inProg ? (
                            <span className="text-blue-700 font-bold flex items-center space-x-0.5">
                              <PlayCircle className="w-3 h-3 text-blue-600" />
                              <span>En progreso</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold flex items-center space-x-0.5">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pendiente</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* MODO 2: DETALLE DE LA ACTIVIDAD SELECCIONADA */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Barra de navegación superior: Volver al explorador y selector de actividad */}
            <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setCurrentActivity(null);
                  if (onSelectActivity) onSelectActivity(null);
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 transition shadow-2xs active:scale-95 cursor-pointer"
                title="Volver a la lista de todas las actividades"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Todas las Actividades</span>
              </button>

              {/* Selector rápido para cambiar a otra actividad */}
              {activities && activities.length > 1 && (
                <select
                  value={currentActivity.id}
                  onChange={(e) => {
                    const nextAct = activities.find(a => a.id === e.target.value);
                    if (nextAct) handleSelectActivity(nextAct);
                  }}
                  className="max-w-[170px] sm:max-w-[200px] text-[11px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-xl text-slate-800 truncate focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  title="Cambiar a otra actividad"
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.subject ? `[${a.subject}] ` : ''}{a.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Cabecera de la Actividad */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white space-y-1.5 flex-shrink-0 shadow-2xs">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {currentActivity.tetraName && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-900 text-white flex-shrink-0">
                      {currentActivity.tetraName.replace('Tetramestre', 'Tetra')}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${typeInfo?.badgeClass}`}>
                    {typeInfo?.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 truncate max-w-[160px]">
                    {currentActivity.subject}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${dueInfo?.className}`}>
                    {dueInfo?.text}
                  </span>
                  <button
                    onClick={onClose}
                    className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                    title="Cerrar espacio de recursos (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                {currentActivity.title}
              </h2>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-slate-800">{formatFullDate(currentActivity.dueDate)}</span>
                </div>
                {currentActivity.teacher && (
                  <div className="flex items-center space-x-1 text-slate-500">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Prof. {currentActivity.teacher}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contenido Desplazable Izquierdo */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 touch-scroll min-h-0 text-sm text-slate-700">
              
              {/* Botón de Acción Directa Hero (si aplica) */}
              {directAction && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 p-3.5 rounded-2xl border border-blue-200/90 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-blue-600 text-white flex-shrink-0 shadow-xs">
                      {directAction.platform === 'teams' || directAction.platform === 'meet' || directAction.platform === 'zoom' ? (
                        <Video className="w-4 h-4" />
                      ) : directAction.platform === 'whatsapp' ? (
                        <MessageCircle className="w-4 h-4" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-blue-950 truncate">{directAction.label}</p>
                      <p className="text-[10px] text-blue-600 truncate">{directAction.url}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      onClick={() => handleSelectResource({ url: directAction.url, title: directAction.label })}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer"
                      title="Cargar en visor integrado"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Ver</span>
                    </button>
                    <a
                      href={directAction.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition"
                      title="Abrir en pestaña externa"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Instrucciones con enlaces clickeables que abren el visor derecho */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Instrucciones y Descripción</span>
                  </h3>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Clic en enlaces para visor
                  </span>
                </div>

                {currentActivity.description ? (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed shadow-xs">
                    <RichTextRenderer 
                      content={currentActivity.description} 
                      onLinkClick={(url, label) => handleSelectResource({ url, title: label || url })}
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs italic">
                    Sin instrucciones adicionales.
                  </div>
                )}
              </div>

              {/* Lista de Enlaces y Recursos Web */}
              {links.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Recursos Web ({links.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {links.map((link, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition group"
                      >
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span className="font-semibold text-xs text-slate-800 truncate" title={link.title || link.url}>
                            {link.title || link.url}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            onClick={() => handleSelectResource(link)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100/70 hover:bg-blue-600 hover:text-white rounded-lg transition flex items-center space-x-1 cursor-pointer"
                            title="Abrir en visor integrado"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Visor</span>
                          </button>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition"
                            title="Abrir en pestaña nueva"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Documentos Adjuntos */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>Documentos Adjuntos ({attachments.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {attachments.map((file, idx) => (
                      <div
                        key={file.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition group"
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

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            onClick={() => handleSelectResource({ url: file.downloadUrl, name: file.name })}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100/70 hover:bg-blue-600 hover:text-white rounded-lg transition flex items-center space-x-1 cursor-pointer"
                            title="Ver en visor integrado"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver</span>
                          </button>
                          <a
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.name}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition"
                            title="Descargar"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Pie Izquierdo: Selector de Estado Personal */}
            <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 w-full">
                <button
                  onClick={() => onSetPersonalStatus && onSetPersonalStatus(currentActivity.id, 'pending')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 active:scale-95 cursor-pointer ${
                    isPending ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendiente</span>
                </button>

                <button
                  onClick={() => onSetPersonalStatus && onSetPersonalStatus(currentActivity.id, 'in_progress')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 active:scale-95 cursor-pointer ${
                    isInProgress ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>En Progreso</span>
                </button>

                <button
                  onClick={() => {
                    if (!isCompleted) {
                      try { confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } }); } catch (e) {}
                    }
                    if (onSetPersonalStatus) onSetPersonalStatus(currentActivity.id, 'completed');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 active:scale-95 cursor-pointer ${
                    isCompleted ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Completada</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* COLUMNA DERECHA: Espacio de Trabajo, Visor, Comentarios, Subir y Compartir */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900 text-slate-100 min-w-0">
        
        {!currentActivity ? (
          /* CUANDO NO HAY ACTIVIDAD SELECCIONADA: Mensaje invitando a seleccionar */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Barra superior */}
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs text-white">Espacio de Recursos y Actividades UCNL</span>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 transition flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
                title="Cerrar espacio (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </button>
            </div>

            {/* Contenido invitador */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6 touch-scroll">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-2xl backdrop-blur-md">
                  <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400" />
                </div>
                <div className="absolute -bottom-2 -right-2 p-2 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Explorador de Recursos por Actividad
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
                  Selecciona cualquier actividad de la lista de la izquierda para visualizar sus recursos adjuntos, enlaces interactivos, abrir el visor integrado y participar en el hilo de comentarios y dudas.
                </p>
              </div>

              {/* Acceso rápido a las actividades con recursos */}
              {activities && activities.length > 0 && (
                <div className="w-full pt-4 border-t border-slate-800/80 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">
                    Actividades disponibles para explorar:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                    {activities.slice(0, 4).map((act) => (
                      <button
                        key={act.id}
                        onClick={() => handleSelectActivity(act)}
                        className="p-3 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/60 transition group cursor-pointer text-left space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-cyan-400 font-bold truncate max-w-[140px]">{act.subject}</span>
                          <span className="text-slate-400">{(act.attachments?.length || 0) + (act.links?.length || 0)} recursos</span>
                        </div>
                        <p className="font-bold text-xs text-white group-hover:text-blue-300 transition truncate">
                          {act.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CUANDO HAY UNA ACTIVIDAD SELECCIONADA: Barra de Pestañas y Contenido */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Barra de Pestañas con Botón de Cerrar */}
            <div className="px-3 sm:px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
              <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('viewer')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'viewer'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Visor Integrado</span>
                  {activeResource && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'comments'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <MessagesSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Comentarios & Dudas</span>
                  {comments.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-500 text-white">
                      {comments.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Subir Documentos</span>
                </button>

                <button
                  onClick={() => setActiveTab('share_link')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'share_link'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Compartir Enlace / Video</span>
                </button>
              </div>

              {/* Botón para Cerrar el Espacio */}
              <div className="flex items-center space-x-2 flex-shrink-0 ml-auto pl-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500 transition flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
                  title="Cerrar espacio de recursos (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>

            {/* Contenido Activo de la Columna Derecha */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-900">
              
              {/* 1. VISOR INTEGRADO */}
              {activeTab === 'viewer' && renderIntegratedViewer()}

              {/* 2. COMENTARIOS & DUDAS */}
              {activeTab === 'comments' && (
                <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                  
                  {/* Lista de Comentarios */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 touch-scroll min-h-0">
                    {comments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <MessagesSquare className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 text-sm">No hay comentarios aún</p>
                          <p className="text-xs text-slate-400 mt-1">Sé el primero en hacer una pregunta, compartir un apunte o dejar retroalimentación.</p>
                        </div>
                      </div>
                    ) : (
                      comments.map((cmt) => {
                        const isAuthor = currentUser?.uid === cmt.userId;
                        const canDelete = isAuthor || isAdmin;
                        return (
                          <div 
                            key={cmt.id}
                            className={`p-3.5 rounded-2xl border transition ${
                              isAuthor
                                ? 'bg-indigo-950/40 border-indigo-800/60 ml-4 sm:ml-8'
                                : 'bg-slate-800/80 border-slate-700 mr-4 sm:mr-8'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center space-x-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] uppercase flex-shrink-0">
                                  {cmt.userName ? cmt.userName[0] : 'U'}
                                </div>
                                <span className="font-bold text-xs text-white truncate">
                                  {cmt.userName}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  cmt.userRole === 'admin' 
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                                    : cmt.userRole === 'docente'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {cmt.userRole}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                                <span>{cmt.createdAt ? new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteComment(cmt.id, cmt.userId)}
                                    className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                                    title="Eliminar comentario"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {cmt.text}
                            </p>

                            {/* Enlaces adjuntos en el comentario */}
                            {cmt.links && cmt.links.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {cmt.links.map((l, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleSelectResource(l)}
                                    className="flex items-center space-x-1.5 text-xs text-cyan-300 hover:underline bg-black/30 px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span className="truncate">{l.title || l.url}</span>
                                    <span className="text-[10px] text-slate-400 ml-1">(Abrir en visor)</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={commentsEndRef} />
                  </div>

                  {/* Formulario de Entrada de Comentarios */}
                  <form onSubmit={handleSendComment} className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-2 flex-shrink-0">
                    {/* Medidor de Capacidad del Hilo del Alumno (1 MB Límite Firestore) */}
                    <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <span>Capacidad de tu hilo:</span>
                        <span className={`font-mono font-bold ${
                          userThreadBytes > 950000 ? 'text-rose-400' :
                          userThreadBytes > 800000 ? 'text-amber-400' : 'text-slate-300'
                        }`}>
                          {formatBytes(userThreadBytes)} / 1 MB
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({((userThreadBytes / 1048576) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      {userThreadBytes > 800000 && (
                        <span className="text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                          ⚠️ Tu documento está cerca del límite de 1 MB
                        </span>
                      )}
                    </div>

                    {commentError && (
                      <div className="p-2 bg-rose-950 border border-rose-800 rounded-xl text-rose-200 text-xs">
                        {commentError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Escribe una duda, apunte o respuesta..."
                        rows={2}
                        className="flex-1 p-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <button
                        type="submit"
                        disabled={sendingComment || (!commentText.trim() && !commentLinkInput.trim())}
                        className="px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-sm active:scale-95 flex-shrink-0 cursor-pointer"
                      >
                        {sendingComment ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span className="hidden sm:inline">Publicar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={commentLinkInput}
                        onChange={(e) => setCommentLinkInput(e.target.value)}
                        placeholder="Adjuntar URL o video (opcional): https://..."
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </form>
                </div>
              )}

              {/* 3. SUBIR DOCUMENTOS */}
              {activeTab === 'upload' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 touch-scroll">
                  <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Subir Documentos y Entregas</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Sube archivos PDF, Word, Excel, PowerPoint, imágenes o videos a la nube para vincularlos a esta actividad.
                    </p>
                  </div>

                  {uploadSuccess && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 flex items-center space-x-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{uploadSuccess}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-xs text-rose-200">
                      {uploadError}
                    </div>
                  )}

                  <form onSubmit={handleUploadFile} className="space-y-4">
                    <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-3xl p-6 text-center space-y-3 bg-slate-900/60 transition">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      
                      <div>
                        <p className="text-xs font-bold text-white">Selecciona un archivo desde tu equipo</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Soporta PDF, DOCX, XLSX, PPTX, JPG, PNG, MP4, ZIP (Hasta 50MB)</p>
                      </div>

                      <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                      />

                      {uploadFile && (
                        <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-xs text-slate-200 flex items-center justify-between">
                          <span className="font-semibold truncate pr-2">{uploadFile.name}</span>
                          <span className="font-mono text-slate-400">{formatBytes(uploadFile.size)}</span>
                        </div>
                      )}
                    </div>

                    {isUploading && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Subiendo archivo a la nube...</span>
                          <span className="font-bold text-white">{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!uploadFile || isUploading}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white font-bold text-xs rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Subiendo archivo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Guardar y Ver en Visor</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* 4. COMPARTIR ENLACE / VIDEO */}
              {activeTab === 'share_link' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 touch-scroll">
                  <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Link2 className="w-4 h-4 text-amber-400" />
                      <span>Compartir Enlace o Video</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Pega cualquier URL (YouTube, Vimeo, Loom, Google Drive, Canva, etc.) para compartirlo e incrustarlo en la tarea.
                    </p>
                  </div>

                  {linkSuccess && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 flex items-center space-x-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{linkSuccess}</span>
                    </div>
                  )}

                  {linkError && (
                    <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-xs text-rose-200">
                      {linkError}
                    </div>
                  )}

                  <form onSubmit={handleAddLink} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        URL del Enlace o Video *
                      </label>
                      <input
                        type="url"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... o https://drive.google.com/..."
                        required
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Título Descriptivo (Opcional)
                      </label>
                      <input
                        type="text"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        placeholder="Ej. Video Explicativo Tema 1, Guía de Estudio..."
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {newLinkUrl && (
                      <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Detección Automática:</span>
                        <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{getEmbedInfo(newLinkUrl).platform}</span>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!newLinkUrl.trim() || savingLink}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {savingLink ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando enlace...</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4" />
                          <span>Guardar y Cargar en Visor</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

        {/* Modal Explicativo de Seguridad (Por qué el sitio no permite abrirse aquí) */}
      {showSecurityExplanation && (
        <div 
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowSecurityExplanation(false)}
        >
          <div 
            className="w-full max-w-lg bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white leading-tight">
                    ¿Por qué el sitio no permite abrirse en la aplicación?
                  </h3>
                  <p className="text-xs text-amber-300/90 font-mono mt-0.5">
                    Restricción de seguridad: X-Frame-Options / CSP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSecurityExplanation(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explicación Detallada */}
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <p>
                Los portales universitarios (como <strong className="text-white">SIASE, Moodle, Nexus, Teams, Blackboard</strong>) y sitios institucionales configuran políticas de protección estrictas en sus servidores.
              </p>
              <p>
                Estas directivas le ordenan a tu navegador web (<strong className="text-white">Chrome, Edge, Safari, Firefox</strong>) <span className="text-rose-300 font-semibold">bloquear la carga dentro de marcos de otras aplicaciones</span> para evitar ataques de suplantación de identidad (<em>Clickjacking</em>) y proteger tus contraseñas y datos personales.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Puedes abrir la página directamente en tu navegador predeterminado para iniciar sesión y navegar con normalidad.</span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2.5 pt-1">
              {activeResource?.originalUrl && (
                <>
                  <button
                    onClick={() => {
                      handleOpenDefaultBrowser(activeResource.originalUrl);
                      setShowSecurityExplanation(false);
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Abrir en el Navegador Predeterminado</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleOpenPopout(activeResource.originalUrl);
                        setShowSecurityExplanation(false);
                      }}
                      className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 border border-slate-700 cursor-pointer"
                    >
                      <AppWindow className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Ventana Paralela</span>
                    </button>

                    <button
                      onClick={() => handleCopyLink(activeResource.originalUrl)}
                      className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 border border-slate-700 cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copiar Enlace</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={() => setShowSecurityExplanation(false)}
                className="w-full py-2 text-slate-400 hover:text-white text-xs font-medium text-center transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ActivityWorkspaceModal;
