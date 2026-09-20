import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Layers,
  BookOpen,
  Edit2,
  Save,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ACTIVITY_TYPES } from '../types/constants';
import { formatFullDate, getDueBadgeInfo } from '../utils/dateUtils';
import { getDirectActionInfo } from '../utils/textUtils';
import { formatBytes, uploadAttachment, fixCloudinaryUrl } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import FileIcon from './FileIcon';
import RichTextRenderer from './RichTextRenderer';
import RichTextEditor from './RichTextEditor';
import { 
  getEmbedInfo, 
  subscribeToActivityComments, 
  addActivityComment, 
  deleteActivityComment, 
  addActivityResourceLink, 
  uploadAndAddActivityAttachment,
  deleteActivityAttachment,
  deleteActivityLink
} from '../services/activityWorkspaceService';
import { 
  subscribeToSubjectResources, 
  uploadAndAddSubjectAttachment, 
  deleteSubjectAttachment, 
  addSubjectLink, 
  deleteSubjectLink, 
  updateSubjectDescription 
} from '../services/subjectResourcesService';

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
  onSetPersonalStatus,
  initialMode = 'activity', // 'activity' | 'subject'
  initialTetraId = null,
  initialSubjectId = null,
  onModeChange = null,
  onSelectSubject = null
}) => {
  const { currentUser, userProfile, isAdmin, isEditor, isDocente } = useAuth();
  const canManageSubject = isAdmin || isEditor || isDocente;

  // Modo del Espacio: 'activity' (Por Actividad) o 'subject' (Por Materia)
  const [workspaceMode, setWorkspaceMode] = useState(initialMode || (activity ? 'activity' : 'activity'));

  // Actividad seleccionada localmente
  const [currentActivity, setCurrentActivity] = useState(activity || null);

  // Estados de Materia (Modo 'subject')
  const [selectedTetraId, setSelectedTetraId] = useState(initialTetraId || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId || '');
  const [subjectData, setSubjectData] = useState(null);
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [isEditingSubjectDesc, setIsEditingSubjectDesc] = useState(false);
  const [subjectDescText, setSubjectDescText] = useState('');
  const [isSavingSubjectDesc, setIsSavingSubjectDesc] = useState(false);

  // Filtros del explorador de actividades (columna izquierda)
  const [explorerSearch, setExplorerSearch] = useState('');
  const [explorerTetra, setExplorerTetra] = useState('all');
  const [explorerStatus, setExplorerStatus] = useState('all');

  // Estados de vista
  const [activeTab, setActiveTab] = useState('viewer'); // 'viewer' | 'comments' | 'upload' | 'share_link'
  const [activeResource, setActiveResource] = useState(null);
  const [isFullscreenViewer, setIsFullscreenViewer] = useState(false);
  const [useGoogleDocsFallback, setUseGoogleDocsFallback] = useState(false);

  // Estados de Comentarios (Por Actividad)
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

  // Sincronizar props de modo y selecciones cuando cambian desde el padre
  useEffect(() => {
    if (initialMode) {
      setWorkspaceMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    setCurrentActivity(activity || null);
  }, [activity]);

  useEffect(() => {
    if (initialTetraId !== undefined && initialTetraId !== null) {
      setSelectedTetraId(initialTetraId);
    }
  }, [initialTetraId]);

  useEffect(() => {
    if (initialSubjectId !== undefined) {
      setSelectedSubjectId(initialSubjectId || '');
    }
  }, [initialSubjectId]);

  useEffect(() => {
    if (academicStructure && academicStructure.length > 0 && !selectedTetraId) {
      setSelectedTetraId(academicStructure[0]?.id || '');
    }
  }, [academicStructure, selectedTetraId]);

  // SuscripciÃƒÂ³n en tiempo real a los recursos de la materia
  useEffect(() => {
    if (!isOpen || workspaceMode !== 'subject' || !selectedTetraId || !selectedSubjectId) {
      setSubjectData(null);
      return;
    }

    setLoadingSubject(true);
    const unsubscribe = subscribeToSubjectResources(
      selectedTetraId,
      selectedSubjectId,
      (data) => {
        setSubjectData(data);
        setSubjectDescText(data?.description || '');
        setLoadingSubject(false);
      },
      (err) => {
        console.warn('Error al cargar recursos de materia:', err);
        setLoadingSubject(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, workspaceMode, selectedTetraId, selectedSubjectId]);

  // SuscripciÃƒÂ³n a comentarios de actividad en tiempo real
  useEffect(() => {
    if (!isOpen || workspaceMode !== 'activity' || !currentActivity?.id) {
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
  }, [isOpen, workspaceMode, currentActivity?.id, currentUser?.uid]);

  // Seleccionar recurso para el visor integrado con persistencia de último documento abierto
  const handleSelectResource = useCallback((resource) => {
    if (!resource) return;
    setUseGoogleDocsFallback(false);
    const rawUrl = resource.url || resource.downloadUrl || '';
    if (!rawUrl) return;

    const correctedUrl = fixCloudinaryUrl(rawUrl, resource.category || resource.type || '');
    const title = resource.title || resource.name || 'Documento';
    const info = getEmbedInfo(correctedUrl, title);
    
    let googleViewerUrl = null;
    if (info.type === 'office' || info.type === 'pdf' || info.type === 'web') {
      googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(correctedUrl)}&embedded=true`;
    }

    const resObj = {
      ...info,
      title: title,
      name: resource.name || title,
      category: resource.category || info.type,
      originalUrl: correctedUrl,
      downloadUrl: correctedUrl,
      url: correctedUrl,
      googleViewerUrl: googleViewerUrl
    };

    setActiveResource(resObj);
    setActiveTab('viewer');

    // Persistir el último documento abierto tanto para la actividad/materia como globalmente
    try {
      if (workspaceMode === 'activity' && currentActivity?.id) {
        localStorage.setItem(`ucnl_last_resource_act_${currentActivity.id}`, JSON.stringify(resObj));
      } else if (workspaceMode === 'subject' && selectedTetraId && selectedSubjectId) {
        localStorage.setItem(`ucnl_last_resource_subj_${selectedTetraId}_${selectedSubjectId}`, JSON.stringify(resObj));
      }
      localStorage.setItem('ucnl_last_active_resource', JSON.stringify({
        mode: workspaceMode,
        activityId: currentActivity?.id || null,
        tetraId: selectedTetraId || null,
        subjectId: selectedSubjectId || null,
        resource: resObj
      }));
    } catch (err) {
      console.warn('Error al guardar último documento en localStorage:', err);
    }
  }, [workspaceMode, currentActivity?.id, selectedTetraId, selectedSubjectId]);

  // Cargar último recurso guardado o primer recurso disponible al cambiar de actividad
  useEffect(() => {
    if (!isOpen || workspaceMode !== 'activity' || !currentActivity) {
      return;
    }
    setUseGoogleDocsFallback(false);

    // 1. Intentar cargar el último recurso guardado para esta actividad
    try {
      const savedKey = `ucnl_last_resource_act_${currentActivity.id}`;
      const savedRaw = localStorage.getItem(savedKey);
      if (savedRaw) {
        const savedRes = JSON.parse(savedRaw);
        if (savedRes && (savedRes.url || savedRes.downloadUrl)) {
          handleSelectResource(savedRes);
          return;
        }
      }
    } catch (_) {}

    // 2. Si no hay previo, usar el primer link o archivo disponible
    if (currentActivity.links && currentActivity.links.length > 0) {
      const firstLink = currentActivity.links[0];
      handleSelectResource(firstLink);
    } else if (currentActivity.attachments && currentActivity.attachments.length > 0) {
      const firstAtt = currentActivity.attachments[0];
      handleSelectResource(firstAtt);
    } else {
      setActiveResource(null);
    }
  }, [isOpen, workspaceMode, currentActivity?.id, handleSelectResource]);

  // Cargar último recurso guardado o primer recurso disponible al cambiar de materia en modo subject
  useEffect(() => {
    if (!isOpen || workspaceMode !== 'subject' || !selectedSubjectId || !subjectData) {
      return;
    }
    setUseGoogleDocsFallback(false);

    // 1. Intentar cargar el último recurso guardado para esta materia
    try {
      const savedKey = `ucnl_last_resource_subj_${selectedTetraId}_${selectedSubjectId}`;
      const savedRaw = localStorage.getItem(savedKey);
      if (savedRaw) {
        const savedRes = JSON.parse(savedRaw);
        if (savedRes && (savedRes.url || savedRes.downloadUrl)) {
          handleSelectResource(savedRes);
          return;
        }
      }
    } catch (_) {}

    // 2. Si no hay previo, usar el primer archivo o enlace disponible
    if (subjectData.attachments && subjectData.attachments.length > 0) {
      const firstAtt = subjectData.attachments[0];
      handleSelectResource({ url: firstAtt.downloadUrl, name: firstAtt.name, category: firstAtt.category });
    } else if (subjectData.links && subjectData.links.length > 0) {
      const firstLink = subjectData.links[0];
      handleSelectResource({ url: firstLink.url, title: firstLink.title });
    } else {
      setActiveResource(null);
    }
  }, [isOpen, workspaceMode, selectedTetraId, selectedSubjectId, subjectData, handleSelectResource]);

  // Cerrar con Escape
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

  if (!isOpen) return null;

  // Objetos de Tetra y Materia actuales en modo 'subject'
  const currentTetra = academicStructure.find(t => t.id === selectedTetraId) || academicStructure[0] || null;
  const currentSubject = currentTetra?.subjects?.find(s => s.id === selectedSubjectId) || currentTetra?.subjects?.[0] || null;

  // Cambiar tetra en modo subject
  const handleSubjectTetraChange = (tetraId) => {
    setSelectedTetraId(tetraId);
    const target = academicStructure.find(t => t.id === tetraId);
    const firstSub = target?.subjects?.[0];
    const newSubId = firstSub?.id || '';
    setSelectedSubjectId(newSubId);
    setActiveResource(null);
    if (onSelectSubject && newSubId) {
      onSelectSubject(tetraId, newSubId);
    }
  };

  // Cambiar materia en modo subject
  const handleSubjectChange = (subjectId) => {
    setSelectedSubjectId(subjectId);
    setActiveResource(null);
    setActiveTab('viewer');
    if (onSelectSubject) {
      onSelectSubject(selectedTetraId, subjectId);
    }
  };

  // Guardar programa / descripciÃƒÂ³n de la materia
  const handleSaveSubjectDescription = async () => {
    if (!selectedTetraId || !selectedSubjectId) return;
    setIsSavingSubjectDesc(true);
    try {
      await updateSubjectDescription(
        selectedTetraId,
        currentTetra?.name,
        selectedSubjectId,
        currentSubject?.name,
        currentSubject?.code,
        subjectDescText,
        currentUser
      );
      setIsEditingSubjectDesc(false);
    } catch (err) {
      console.error('Error al guardar programa de materia:', err);
      alert('Error al guardar el programa de la materia.');
    } finally {
      setIsSavingSubjectDesc(false);
    }
  };

  // Eliminar adjunto de materia
  const handleDeleteSubjectAttachment = async (attachmentId) => {
    if (!selectedTetraId || !selectedSubjectId || !attachmentId) return;
    if (!window.confirm('Ã‚Â¿Deseas eliminar este documento de la materia?')) return;
    try {
      await deleteSubjectAttachment(selectedTetraId, selectedSubjectId, attachmentId);
      if (activeResource?.originalUrl) {
        const wasActive = subjectData?.attachments?.find(a => a.id === attachmentId)?.downloadUrl === activeResource.originalUrl;
        if (wasActive) setActiveResource(null);
      }
    } catch (err) {
      console.error('Error al eliminar adjunto de materia:', err);
      alert('No se pudo eliminar el archivo.');
    }
  };

  // Eliminar enlace de materia
  const handleDeleteSubjectLink = async (linkId) => {
    if (!selectedTetraId || !selectedSubjectId || !linkId) return;
    if (!window.confirm('Ã‚Â¿Deseas eliminar este enlace de la materia?')) return;
    try {
      await deleteSubjectLink(selectedTetraId, selectedSubjectId, linkId);
      if (activeResource?.originalUrl) {
        const wasActive = subjectData?.links?.find(l => l.id === linkId)?.url === activeResource.originalUrl;
        if (wasActive) setActiveResource(null);
      }
    } catch (err) {
      console.error('Error al eliminar enlace de materia:', err);
      alert('No se pudo eliminar el enlace.');
    }
  };

  // Eliminar adjunto de actividad
  const handleDeleteActivityAttachment = async (file) => {
    if (!currentActivity?.id || !file) return;
    const fileId = file.id || file.downloadUrl || file.storagePath;
    if (!window.confirm(`¿Deseas eliminar el archivo "${file.name || 'documento'}" de esta actividad?`)) return;
    try {
      const updated = await deleteActivityAttachment(currentActivity.id, fileId);
      setCurrentActivity(prev => prev ? { ...prev, attachments: updated } : null);
      if (activeResource?.originalUrl === file.downloadUrl) {
        setActiveResource(null);
      }
    } catch (err) {
      console.error('Error al eliminar adjunto de actividad:', err);
      alert('No se pudo eliminar el archivo de la actividad.');
    }
  };

  // Eliminar enlace de actividad
  const handleDeleteActivityLink = async (link) => {
    if (!currentActivity?.id || !link) return;
    const linkTarget = link.url || link.title || link.id;
    if (!window.confirm(`¿Deseas eliminar el enlace "${link.title || link.url}" de esta actividad?`)) return;
    try {
      const updated = await deleteActivityLink(currentActivity.id, linkTarget);
      setCurrentActivity(prev => prev ? { ...prev, links: updated } : null);
      if (activeResource?.originalUrl === link.url) {
        setActiveResource(null);
      }
    } catch (err) {
      console.error('Error al eliminar enlace de actividad:', err);
      alert('No se pudo eliminar el enlace de la actividad.');
    }
  };

  // Manejar selecciÃƒÂ³n de una actividad desde el listado explorador
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

  // Datos de la actividad seleccionada
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

  // Enviar comentario de actividad
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
    if (!window.confirm('Ã‚Â¿Deseas eliminar este comentario?')) return;
    try {
      await deleteActivityComment(currentActivity.id, commentId, authorUserId || currentUser?.uid);
    } catch (err) {
      console.error('Error al borrar comentario:', err);
    }
  };

  // Subir archivo (Materia o Actividad)
  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess('');

    try {
      if (workspaceMode === 'subject') {
        if (!selectedTetraId || !selectedSubjectId) {
          throw new Error('Debes seleccionar un Tetramestre y una Materia.');
        }
        const newAttachment = await uploadAndAddSubjectAttachment(
          selectedTetraId,
          currentTetra?.name,
          selectedSubjectId,
          currentSubject?.name,
          currentSubject?.code,
          uploadFile,
          currentUser,
          (progress) => setUploadProgress(progress)
        );

        setUploadSuccess(`Ã‚Â¡Archivo "${uploadFile.name}" subido a ${currentSubject?.name || 'la materia'}!`);
        setUploadFile(null);
        if (newAttachment) {
          handleSelectResource({ url: newAttachment.downloadUrl, name: newAttachment.name });
        }
      } else {
        if (!currentActivity?.id) return;
        const newAttachment = await uploadAndAddActivityAttachment(
          currentActivity.id,
          currentActivity,
          uploadFile,
          (progress) => setUploadProgress(progress)
        );

        setCurrentActivity(prev => prev ? {
          ...prev,
          attachments: [...(prev.attachments || []), newAttachment]
        } : null);

        setUploadSuccess(`¡Archivo "${uploadFile.name}" subido exitosamente a la actividad!`);
        setUploadFile(null);
        if (newAttachment) {
          handleSelectResource({ url: newAttachment.downloadUrl, name: newAttachment.name });
        }
      }

      setTimeout(() => setUploadSuccess(''), 4000);
    } catch (err) {
      console.error('Error al subir archivo:', err);
      setUploadError(err.message || 'Error al subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Compartir nuevo enlace / video (Materia o Actividad)
  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;

    setSavingLink(true);
    setLinkError('');
    setLinkSuccess('');

    try {
      const linkObj = {
        title: newLinkTitle.trim() || newLinkUrl.trim(),
        url: newLinkUrl.trim()
      };

      if (workspaceMode === 'subject') {
        if (!selectedTetraId || !selectedSubjectId) {
          throw new Error('Debes seleccionar un Tetramestre y una Materia.');
        }
        const newLink = await addSubjectLink(
          selectedTetraId,
          currentTetra?.name,
          selectedSubjectId,
          currentSubject?.name,
          currentSubject?.code,
          linkObj,
          currentUser
        );

        setLinkSuccess(`Ã‚Â¡Enlace compartido en ${currentSubject?.name || 'la materia'}!`);
        handleSelectResource({ url: newLink.url, title: newLink.title });
      } else {
        if (!currentActivity?.id) return;
        await addActivityResourceLink(currentActivity.id, currentActivity, linkObj);
        setCurrentActivity(prev => prev ? {
          ...prev,
          links: [...(prev.links || []), linkObj]
        } : null);
        setLinkSuccess('¡Enlace guardado y compartido en la actividad!');
        handleSelectResource(linkObj);
      }

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
            <h4 className="text-base font-bold text-white">
              {workspaceMode === 'subject' 
                ? `Recursos de ${currentSubject?.name || 'la Materia'}`
                : 'Visor Multimedia Integrado'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {workspaceMode === 'subject'
                ? 'Haz clic en cualquier archivo, libro o enlace de la materia (panel izquierdo) para previsualizarlo aquÃƒÂ­ con soporte integrado.'
                : 'Haz clic en cualquier enlace o documento de las instrucciones (panel izquierdo) para previsualizarlo aquÃƒÂ­.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm pt-2">
            <button
              onClick={() => setActiveTab('share_link')}
              className="p-3 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-2xl text-xs font-bold text-slate-200 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Video className="w-4 h-4 text-cyan-400" />
              <span>Ver Video o Enlace</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className="p-3 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-2xl text-xs font-bold text-slate-200 transition flex items-center justify-center space-x-2 cursor-pointer"
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
            {/* ExplicaciÃƒÂ³n de seguridad */}
            <button
              onClick={() => setShowSecurityExplanation(true)}
              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
              title="Explicar por quÃƒÂ© algunos sitios rechazan la conexiÃƒÂ³n en la app"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Ã‚Â¿Por quÃƒÂ© no abre?</span>
            </button>

            {/* Abrir en Navegador Predeterminado */}
            <button
              onClick={() => handleOpenDefaultBrowser(originalUrl)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Abrir pÃƒÂ¡gina en el navegador predeterminado de tu equipo"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Abrir en Navegador</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>

            {/* Alternar con Google Docs Viewer */}
            {(type === 'pdf' || type === 'office' || type === 'web') && (
              <button
                onClick={() => setUseGoogleDocsFallback(!useGoogleDocsFallback)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition border cursor-pointer ${
                  useGoogleDocsFallback
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Alternar entre visualizador directo y Google Docs Viewer"
              >
                {useGoogleDocsFallback ? 'Modo Normal' : 'Google Docs Viewer'}
              </button>
            )}

            {/* Ventana Paralela */}
            <button
              onClick={() => handleOpenPopout(originalUrl)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="Abrir en Ventana Paralela / Emergente"
            >
              <AppWindow className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline text-[11px]">Ventana Paralela</span>
            </button>

            {/* Copiar Enlace */}
            <button
              onClick={() => handleCopyLink(originalUrl)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
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
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title={isFullscreenViewer ? 'Salir de pantalla completa' : 'Pantalla completa del visor'}
            >
              {isFullscreenViewer ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setActiveResource(null)}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Cerrar visor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Contenedor del Visor */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-auto p-2 bg-slate-950">
          
          {/* YouTube & Vimeo & Loom */}
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

          {/* Google Drive / Docs / Sheets / Slides */}
          {type === 'gdrive' && (
            <iframe
              src={embedUrl}
              title={title}
              className="w-full h-full rounded-2xl border border-slate-800 bg-white"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          )}

          {/* Video Directo */}
          {type === 'video_direct' && (
            <video
              src={embedUrl}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-2xl shadow-2xl bg-black border border-slate-800"
            >
              Tu navegador no soporta la reproducciÃƒÂ³n directa de este formato de video.
            </video>
          )}

          {/* Audio Directo */}
          {type === 'audio_direct' && (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 max-w-md w-full">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Music className="w-8 h-8" />
              </div>
              <p className="font-bold text-sm text-white text-center">{title}</p>
              <audio src={embedUrl} controls autoPlay className="w-full" />
            </div>
          )}

          {/* Imagen Directa */}
          {type === 'image' && (
            <div className="max-w-full max-h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={embedUrl}
                alt={title}
                className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            </div>
          )}

          {/* PDF */}
          {type === 'pdf' && (
            <div className="w-full h-full flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              {useGoogleDocsFallback ? (
                <iframe
                  src={googleViewerUrl}
                  title={title}
                  className="w-full h-full border-0 bg-slate-900"
                />
              ) : (
                <iframe
                  src={`${embedUrl}#toolbar=1&navpanes=0`}
                  title={title}
                  className="w-full h-full border-0 bg-white"
                />
              )}
            </div>
          )}

          {/* Documentos Office */}
          {type === 'office' && (
            <iframe
              src={googleViewerUrl || embedUrl}
              title={title}
              className="w-full h-full rounded-2xl border border-slate-800 bg-white"
            />
          )}

          {/* Enlace Web GenÃƒÂ©rico */}
          {type === 'web' && (
            <div className="w-full h-full flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative">
              <div className="p-2.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="font-mono text-[11px] text-slate-300 truncate">{originalUrl}</span>
                </div>
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleOpenDefaultBrowser(originalUrl)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                  >
                    <span>Abrir en Navegador</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleOpenPopout(originalUrl)}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                  >
                    <AppWindow className="w-3 h-3 text-indigo-400" />
                    <span className="hidden sm:inline">Ventana Paralela</span>
                  </button>
                </div>
              </div>

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
    <div className="fixed inset-x-0 bottom-0 top-8 z-[79] flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative flex w-full h-full overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* COLUMNA IZQUIERDA (Panel ampliado en 30% a 416px) */}
        <div className="w-full sm:w-[416px] flex-shrink-0 flex flex-col h-full overflow-hidden bg-slate-50 border-r border-slate-200">

          {/* Selector deslizable */}
          <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex-shrink-0">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/60 shadow-inner">
              <button type="button"
                onClick={() => { 
                  setWorkspaceMode('activity'); 
                  if (onModeChange) onModeChange('activity');
                  if (!currentActivity && activities && activities.length > 0) {
                    setCurrentActivity(activities[0]);
                    if (onSelectActivity) onSelectActivity(activities[0]);
                  } else if (currentActivity && onSelectActivity) {
                    onSelectActivity(currentActivity);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${workspaceMode === 'activity' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                <FileText className="w-3.5 h-3.5" /><span>Por Actividad</span>
                {activities?.length > 0 && <span className="text-[9px] px-1.5 rounded-full bg-white/20 font-mono">{activities.length}</span>}
              </button>
              <button type="button"
                onClick={() => { 
                  setWorkspaceMode('subject'); 
                  if (onModeChange) onModeChange('subject');
                  if (selectedTetraId && selectedSubjectId && onSelectSubject) {
                    onSelectSubject(selectedTetraId, selectedSubjectId);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${workspaceMode === 'subject' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                <BookOpen className="w-3.5 h-3.5" /><span>Por Materia</span>
              </button>
            </div>
          </div>

          {/* ACTIVIDAD — explorador */}
          {workspaceMode === 'activity' && !currentActivity && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="px-3.5 py-3 border-b border-slate-200 bg-white space-y-2.5 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0"><FolderOpen className="w-3.5 h-3.5" /></div>
                  <div>
                    <h2 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">Actividades<span className="text-[9px] font-bold px-1.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">{filteredExplorerActivities.length}</span></h2>
                    <p className="text-[10px] text-slate-500">Selecciona una actividad</p>
                  </div>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input type="text" value={explorerSearch} onChange={(e) => setExplorerSearch(e.target.value)} placeholder="Buscar actividad..." className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {explorerSearch && <button onClick={() => setExplorerSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-3 h-3" /></button>}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <select value={explorerTetra} onChange={(e) => setExplorerTetra(e.target.value)} className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="all">Todos los Tetras</option>
                    {academicStructure.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select value={explorerStatus} onChange={(e) => setExplorerStatus(e.target.value)} className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="all">Todos</option>
                    <option value="pending">Pendientes</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Completadas</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-0">
                {filteredExplorerActivities.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2"><FolderOpen className="w-8 h-8 mx-auto text-slate-300" /><p className="text-xs font-semibold">Sin actividades.</p></div>
                ) : filteredExplorerActivities.map((act) => {
                  const uStatus = studentCompletions[act.id] || 'pending';
                  const isDone = uStatus === 'completed' || uStatus === true;
                  const inProg = uStatus === 'in_progress';
                  const tInfo = ACTIVITY_TYPES.find(t => t.id === act.type) || { label: 'Actividad', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const dInfo = getDueBadgeInfo(act.dueDate, isDone);
                  return (
                    <div key={act.id} onClick={() => handleSelectActivity(act)} className="p-2.5 bg-white hover:bg-blue-50/70 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer group space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-wrap min-w-0">
                          {act.tetraName && <span className="px-1.5 rounded text-[9px] font-extrabold bg-slate-900 text-white">{act.tetraName.replace('Tetramestre','T')}</span>}
                          <span className={`px-1.5 rounded text-[9px] font-bold border ${tInfo.badgeClass}`}>{tInfo.label}</span>
                          <span className="text-[10px] font-bold text-blue-700 truncate max-w-[90px]">{act.subject}</span>
                        </div>
                        <span className={`px-1.5 rounded-full text-[9px] font-bold border flex-shrink-0 ${dInfo.className}`}>{dInfo.text}</span>
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-900 line-clamp-2 group-hover:text-blue-700 transition">{act.title}</h3>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {(act.attachments?.length || 0) > 0 && <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3 text-blue-500" />{act.attachments.length}</span>}
                          {(act.links?.length || 0) > 0 && <span className="flex items-center gap-0.5"><ExternalLink className="w-3 h-3 text-indigo-500" />{act.links.length}</span>}
                          {!act.attachments?.length && !act.links?.length && <span className="italic">Sin adjuntos</span>}
                        </div>
                        <span className={`font-bold ${isDone ? 'text-emerald-600' : inProg ? 'text-blue-600' : 'text-amber-600'}`}>{isDone ? '✅' : inProg ? '🚀' : '⏳'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTIVIDAD — detalle */}
          {workspaceMode === 'activity' && currentActivity && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
                <button onClick={() => { setCurrentActivity(null); if (onSelectActivity) onSelectActivity(null); }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 transition cursor-pointer active:scale-95">
                  <ArrowLeft className="w-3.5 h-3.5" /><span>Todas</span>
                </button>
                {activities?.length > 1 && (
                  <select value={currentActivity.id} onChange={(e) => { const a = activities.find(x => x.id === e.target.value); if (a) handleSelectActivity(a); }} className="max-w-[160px] text-[11px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-xl text-slate-800 truncate focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
                    {activities.map(a => <option key={a.id} value={a.id}>{a.subject ? `[${a.subject}] ` : ''}{a.title}</option>)}
                  </select>
                )}
              </div>
              <div className="px-3.5 py-3 border-b border-slate-200 bg-white space-y-1.5 flex-shrink-0">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    {currentActivity.tetraName && <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-900 text-white">{currentActivity.tetraName.replace('Tetramestre','Tetra')}</span>}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${typeInfo?.badgeClass}`}>{typeInfo?.label}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 truncate max-w-[130px]">{currentActivity.subject}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${dueInfo?.className}`}>{dueInfo?.text}</span>
                </div>
                <h2 className="text-sm font-extrabold text-slate-900 leading-snug">{currentActivity.title}</h2>
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-blue-600" /><span className="font-semibold text-slate-800">{formatFullDate(currentActivity.dueDate)}</span></div>
                  {currentActivity.teacher && <div className="flex items-center gap-1 text-slate-500"><User className="w-3 h-3 text-slate-400" /><span>Prof. {currentActivity.teacher}</span></div>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0 text-sm text-slate-700">
                {directAction && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 p-3 rounded-2xl border border-blue-200/90 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-1.5 rounded-xl bg-blue-600 text-white flex-shrink-0">{directAction.platform === 'teams' || directAction.platform === 'meet' || directAction.platform === 'zoom' ? <Video className="w-3.5 h-3.5" /> : directAction.platform === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}</div>
                      <div className="min-w-0"><p className="text-xs font-extrabold text-blue-950 truncate">{directAction.label}</p><p className="text-[10px] text-blue-600 truncate">{directAction.url}</p></div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleSelectResource({ url: directAction.url, title: directAction.label })} className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"><Eye className="w-3 h-3" /><span>Ver</span></button>
                      <a href={directAction.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition"><ExternalLink className="w-3.5 h-3.5" /></a>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-600" />Instrucciones</h3>
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Clic en enlaces para visor</span>
                  </div>
                  {currentActivity.description ? (
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed"><RichTextRenderer content={currentActivity.description} onLinkClick={(url, label) => handleSelectResource({ url, title: label || url })} /></div>
                  ) : <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs italic">Sin instrucciones adicionales.</div>}
                </div>
                {links.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5 text-blue-600" />Recursos Web ({links.length})</h3>
                      {canManageSubject && (
                        <button type="button" onClick={() => setActiveTab('share_link')} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer">
                          <Plus className="w-3 h-3" /><span>Añadir</span>
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {links.map((link, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition">
                          <div className="flex items-center gap-2 truncate pr-2"><ExternalLink className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" /><span className="font-semibold text-xs text-slate-800 truncate">{link.title || link.url}</span></div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => handleSelectResource(link)} className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100/70 hover:bg-blue-600 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer"><Eye className="w-3 h-3" /><span>Visor</span></button>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition"><ExternalLink className="w-3.5 h-3.5" /></a>
                            {canManageSubject && (
                              <button type="button" onClick={() => handleDeleteActivityLink(link)} className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer" title="Eliminar enlace">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-blue-600" />Documentos ({attachments.length})</h3>
                      {canManageSubject && (
                        <button type="button" onClick={() => setActiveTab('upload')} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer">
                          <Plus className="w-3 h-3" /><span>Subir</span>
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {attachments.map((file, idx) => (
                        <div key={file.id || idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition">
                          <div className="flex items-center gap-2.5 truncate pr-2"><FileIcon category={file.category} className="w-4 h-4 flex-shrink-0" /><div className="truncate"><p className="font-semibold text-slate-800 text-xs truncate">{file.name}</p><p className="text-[10px] text-slate-400">{formatBytes(file.size)}</p></div></div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => handleSelectResource({ url: file.downloadUrl, name: file.name })} className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100/70 hover:bg-blue-600 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer"><Eye className="w-3 h-3" /><span>Ver</span></button>
                            <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" download={file.name} className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition"><Download className="w-3.5 h-3.5" /></a>
                            {canManageSubject && (
                              <button type="button" onClick={() => handleDeleteActivityAttachment(file)} className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer" title="Eliminar archivo">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
              <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1">
                  {[
                    { status: 'pending', label: 'Pendiente', icon: <Clock className="w-3.5 h-3.5" />, active: isPending, activeClass: 'bg-amber-500 text-white' },
                    { status: 'in_progress', label: 'En Progreso', icon: <PlayCircle className="w-3.5 h-3.5" />, active: isInProgress, activeClass: 'bg-blue-600 text-white' },
                    { status: 'completed', label: 'Completada', icon: <CheckCircle2 className="w-3.5 h-3.5" />, active: isCompleted, activeClass: 'bg-emerald-600 text-white' },
                  ].map(({ status, label, icon, active, activeClass }) => (
                    <button key={status} onClick={() => { if (status === 'completed' && !isCompleted) { try { confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } }); } catch(e){} } if (onSetPersonalStatus) onSetPersonalStatus(currentActivity.id, status); }}
                      className={`flex-1 py-1.5 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer ${active ? activeClass : 'text-slate-600 hover:bg-slate-200'}`}>
                      {icon}<span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MATERIA — lista */}
          {workspaceMode === 'subject' && !selectedSubjectId && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="px-3.5 py-3 border-b border-slate-200 bg-white space-y-2.5 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0"><BookOpen className="w-3.5 h-3.5" /></div>
                  <div>
                    <h2 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">Materias<span className="text-[9px] font-bold px-1.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">{(currentTetra?.subjects || []).length}</span></h2>
                    <p className="text-[10px] text-slate-500">Selecciona una para ver sus recursos</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tetramestre</label>
                  <select value={selectedTetraId} onChange={(e) => handleSubjectTetraChange(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                    {academicStructure.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-0">
                {(currentTetra?.subjects || []).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2"><BookOpen className="w-8 h-8 mx-auto text-slate-300" /><p className="text-xs font-semibold">Sin materias en este tetramestre.</p></div>
                ) : currentTetra.subjects.map(sub => (
                  <div key={sub.id} onClick={() => handleSubjectChange(sub.id)} className="p-2.5 bg-white hover:bg-indigo-50/70 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer group space-y-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {sub.code && <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-900 text-white flex-shrink-0">{sub.code}</span>}
                      <span className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700 transition truncate">{sub.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{currentTetra.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MATERIA — detalle (igual que actividad) */}
          {workspaceMode === 'subject' && selectedSubjectId && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
                <button type="button" onClick={() => { setSelectedSubjectId(''); setActiveResource(null); setActiveTab('viewer'); if (onSelectSubject) onSelectSubject(selectedTetraId, ''); }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 transition cursor-pointer active:scale-95">
                  <ArrowLeft className="w-3.5 h-3.5" /><span>Todas</span>
                </button>
              </div>
              <div className="px-3.5 py-3 border-b border-slate-200 bg-white space-y-1.5 flex-shrink-0">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-900 text-white">{currentTetra?.name?.replace('Tetramestre','Tetra')}</span>
                  {currentSubject?.code && <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">{currentSubject.code}</span>}
                </div>
                <h2 className="text-sm font-extrabold text-slate-900 leading-snug">{currentSubject?.name}</h2>
                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">{currentTetra?.name}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0 text-sm text-slate-700">
                {loadingSubject ? (
                  <div className="p-8 text-center space-y-2 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /><p className="text-xs">Cargando recursos...</p></div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-indigo-600" />Programa / Guia Oficial</h3>
                        {canManageSubject && !isEditingSubjectDesc && <button type="button" onClick={() => setIsEditingSubjectDesc(true)} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"><Edit2 className="w-3 h-3" /><span>Editar</span></button>}
                      </div>
                      {isEditingSubjectDesc ? (
                        <div className="space-y-2 bg-white p-3 rounded-2xl border border-indigo-200">
                          <RichTextEditor value={subjectDescText} onChange={setSubjectDescText} placeholder="Programa, objetivos, criterios de evaluacion..." />
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button type="button" onClick={() => { setIsEditingSubjectDesc(false); setSubjectDescText(subjectData?.description || ''); }} className="px-3 py-1 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
                            <button type="button" onClick={handleSaveSubjectDescription} disabled={isSavingSubjectDesc} className="inline-flex items-center gap-1 px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer">{isSavingSubjectDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}<span>Guardar</span></button>
                          </div>
                        </div>
                      ) : subjectData?.description ? (
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed"><RichTextRenderer content={subjectData.description} onLinkClick={(url, label) => handleSelectResource({ url, title: label || url })} /></div>
                      ) : <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs italic">{canManageSubject ? 'Sin programa. Clic en Editar para anadirlo.' : 'Sin programa oficial registrado.'}</div>}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-indigo-600" />Documentos y Libros ({subjectData?.attachments?.length || 0})</h3>
                        {canManageSubject && <button type="button" onClick={() => setActiveTab('upload')} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"><Plus className="w-3 h-3" /><span>Subir</span></button>}
                      </div>
                      {(!subjectData?.attachments || subjectData.attachments.length === 0) ? <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs italic">No hay documentos en esta materia.</div> : (
                        <div className="space-y-1.5">{subjectData.attachments.map(file => (
                          <div key={file.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition">
                            <div className="flex items-center gap-2.5 truncate pr-2"><FileIcon category={file.category} className="w-4 h-4 flex-shrink-0" /><div className="truncate"><p className="font-semibold text-slate-800 text-xs truncate">{file.name}</p><p className="text-[10px] text-slate-400">{formatBytes(file.size)}</p></div></div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => handleSelectResource({ url: file.downloadUrl, name: file.name })} className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer"><Eye className="w-3 h-3" /><span>Ver</span></button>
                              <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" download={file.name} className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition"><Download className="w-3.5 h-3.5" /></a>
                              {canManageSubject && <button type="button" onClick={() => handleDeleteSubjectAttachment(file.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                            </div>
                          </div>
                        ))}</div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5 text-indigo-600" />Enlaces y Videos ({subjectData?.links?.length || 0})</h3>
                        {canManageSubject && <button type="button" onClick={() => setActiveTab('share_link')} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"><Plus className="w-3 h-3" /><span>Anadir</span></button>}
                      </div>
                      {(!subjectData?.links || subjectData.links.length === 0) ? <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs italic">No hay enlaces en esta materia.</div> : (
                        <div className="space-y-1.5">{subjectData.links.map(link => (
                          <div key={link.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 transition">
                            <div className="flex items-center gap-2 truncate pr-2"><ExternalLink className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" /><span className="font-semibold text-xs text-slate-800 truncate">{link.title || link.url}</span></div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => handleSelectResource(link)} className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer"><Eye className="w-3 h-3" /><span>Visor</span></button>
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition"><ExternalLink className="w-3 h-3" /></a>
                              {canManageSubject && <button type="button" onClick={() => handleDeleteSubjectLink(link.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                            </div>
                          </div>
                        ))}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA — Visor oscuro (identico en ambos modos) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900 text-slate-100 min-w-0">
          <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setActiveTab('viewer')} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'viewer' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}>
                <Film className="w-3.5 h-3.5 text-cyan-400" /><span>Visor</span>{activeResource && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
              </button>
              {workspaceMode === 'activity' && currentActivity && (
                <button onClick={() => setActiveTab('comments')} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'comments' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}>
                  <MessagesSquare className="w-3.5 h-3.5 text-indigo-400" /><span>Comentarios</span>{comments.length > 0 && <span className="px-1.5 rounded-full text-[10px] font-black bg-indigo-500 text-white">{comments.length}</span>}
                </button>
              )}
              {(workspaceMode === 'activity' ? !!currentActivity : (canManageSubject && !!selectedSubjectId)) && (
                <>
                  <button onClick={() => setActiveTab('upload')} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}><Upload className="w-3.5 h-3.5 text-emerald-400" /><span>Subir</span></button>
                  <button onClick={() => setActiveTab('share_link')} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === 'share_link' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}><Link2 className="w-3.5 h-3.5 text-amber-400" /><span>Enlace</span></button>
                </>
              )}
            </div>
            <button onClick={onClose} className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-600 text-slateate-200 hover:text-white border border-slate-700 hover:border-rose-500 transition flex items-center gap-1.5 active:scale-95 cursor-pointer flex-shrink-0 ml-auto"><X className="w-3.5 h-3.5" /><span>Cerrar</span></button>
          </div>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'viewer' && renderIntegratedViewer()}
            {activeTab === 'comments' && workspaceMode === 'activity' && currentActivity && (
              <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0">
                  {comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400"><MessagesSquare className="w-6 h-6" /></div>
                      <div><p className="font-bold text-slate-200 text-sm">Sin comentarios aun</p><p className="text-xs text-slate-400 mt-1">Se el primero en hacer una pregunta.</p></div>
                    </div>
                  ) : comments.map((cmt) => {
                    const isAuthor = currentUser?.uid === cmt.userId;
                    const canDelete = isAuthor || isAdmin;
                    return (
                      <div key={cmt.id} className={`p-3.5 rounded-2xl border transition ${isAuthor ? 'bg-indigo-950/40 border-indigo-800/60 ml-4 sm:ml-8' : 'bg-slate-800/80 border-slate-700 mr-4 sm:mr-8'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] uppercase flex-shrink-0">{cmt.userName?.[0] || 'U'}</div>
                            <span className="font-bold text-xs text-white truncate">{cmt.userName}</span>
                            <span className={`text-[9px] font-bold px-1.5 rounded uppercase ${cmt.userRole === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : cmt.userRole === 'docente' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>{cmt.userRole}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span>{cmt.createdAt ? new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            {canDelete && <button onClick={() => handleDeleteComment(cmt.id, cmt.userId)} className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"><Trash2 className="w-3 h-3" /></button>}
                          </div>
                        </div>
                        <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{cmt.text}</p>
                        {cmt.links?.length > 0 && <div className="mt-2 space-y-1">{cmt.links.map((l, i) => <button key={i} onClick={() => handleSelectResource(l)} className="flex items-center gap-1.5 text-xs text-cyan-300 hover:underline bg-black/30 px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer"><ExternalLink className="w-3 h-3" /><span className="truncate">{l.title || l.url}</span><span className="text-[10px] text-slate-400">(Visor)</span></button>)}</div>}
                      </div>
                    );
                  })}
                  <div ref={commentsEndRef} />
                </div>
                <form onSubmit={handleSendComment} className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-2 flex-shrink-0">
                  <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                    <div className="flex items-center gap-1.5"><span>Tu hilo:</span><span className={`font-mono font-bold ${userThreadBytes > 950000 ? 'text-rose-400' : userThreadBytes > 800000 ? 'text-amber-400' : 'text-slate-300'}`}>{formatBytes(userThreadBytes)} / 1 MB</span></div>
                    {userThreadBytes > 800000 && <span className="text-amber-400 text-[10px]">Cerca del limite</span>}
                  </div>
                  {commentError && <div className="p-2 bg-rose-950 border border-rose-800 rounded-xl text-rose-200 text-xs">{commentError}</div>}
                  <div className="flex gap-2">
                    <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Escribe una duda, apunte o respuesta..." rows={2} className="flex-1 p-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <button type="submit" disabled={sendingComment || (!commentText.trim() && !commentLinkInput.trim())} className="px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition flex-shrink-0 cursor-pointer">
                      {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /><span className="hidden sm:inline">Publicar</span></>}
                    </button>
                  </div>
                  <input type="url" value={commentLinkInput} onChange={(e) => setCommentLinkInput(e.target.value)} placeholder="Adjuntar URL (opcional): https://..." className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </form>
              </div>
            )}
            {activeTab === 'upload' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><Upload className="w-4 h-4 text-emerald-400" /><span>{workspaceMode === 'subject' ? `Subir a ${currentSubject?.name || 'la Materia'}` : 'Subir a la Actividad'}</span></h4>
                  <p className="text-xs text-slate-400">{workspaceMode === 'subject' ? 'Libros, manuales, guias o diapositivas.' : 'PDF, Word, Excel, PowerPoint, imagenes o videos.'}</p>
                </div>
                {uploadSuccess && <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>{uploadSuccess}</span></div>}
                {uploadError && <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-xs text-rose-200">{uploadError}</div>}
                <form onSubmit={handleUploadFile} className="space-y-4">
                  <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-3xl p-6 text-center space-y-3 bg-slate-900/60 transition">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto"><Upload className="w-6 h-6" /></div>
                    <div><p className="text-xs font-bold text-white">Selecciona un archivo</p><p className="text-[11px] text-slate-400 mt-0.5">PDF, DOCX, XLSX, PPTX, JPG, PNG, MP4, ZIP (max 50MB)</p></div>
                    <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
                    {uploadFile && <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-xs text-slate-200 flex items-center justify-between"><div className="flex items-center gap-2 truncate"><FileIcon category={uploadFile.name.split('.').pop()} className="w-4 h-4" /><span className="truncate font-semibold">{uploadFile.name}</span></div><span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{formatBytes(uploadFile.size)}</span></div>}
                  </div>
                  {isUploading && <div className="space-y-1.5"><div className="flex justify-between text-xs text-slate-300 font-bold"><span>Subiendo...</span><span>{uploadProgress}%</span></div><div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200" style={{ width: `${uploadProgress}%` }} /></div></div>}
                  <button type="submit" disabled={isUploading || !uploadFile} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer">
                    {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Subiendo...</span></> : <><Upload className="w-4 h-4" /><span>{workspaceMode === 'subject' ? `Subir a ${currentSubject?.name || 'la Materia'}` : 'Subir a la Actividad'}</span></>}
                  </button>
                </form>
              </div>
            )}
            {activeTab === 'share_link' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><Link2 className="w-4 h-4 text-amber-400" /><span>{workspaceMode === 'subject' ? `Anadir Enlace a ${currentSubject?.name || 'la Materia'}` : 'Compartir Enlace o Video'}</span></h4>
                  <p className="text-xs text-slate-400">YouTube, Google Drive, Loom, Vimeo, OneDrive o paginas web.</p>
                </div>
                {linkSuccess && <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>{linkSuccess}</span></div>}
                {linkError && <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-xs text-rose-200">{linkError}</div>}
                <form onSubmit={handleAddLink} className="space-y-4">
                  <div className="space-y-1.5"><label className="text-xs font-bold text-slate-300">URL del enlace o video *</label><input type="url" required value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-bold text-slate-300">Titulo (opcional)</label><input type="text" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} placeholder="Ej. Clase grabada del tema 3..." className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <button type="submit" disabled={savingLink || !newLinkUrl.trim()} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer">
                    {savingLink ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando...</span></> : <><Plus className="w-4 h-4" /><span>{workspaceMode === 'subject' ? `Guardar en ${currentSubject?.name || 'la Materia'}` : 'Guardar en la Actividad'}</span></>}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>

      {showSecurityExplanation && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-amber-400"><ShieldAlert className="w-5 h-5" /><h3 className="font-bold text-sm">Por que algunos sitios no abren dentro de la app?</h3></div><button onClick={() => setShowSecurityExplanation(false)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"><X className="w-4 h-4" /></button></div>
            <p className="text-xs text-slate-300 leading-relaxed">Por politicas de seguridad (X-Frame-Options: SAMEORIGIN), algunos sitios rechazan ser incrustados.</p>
            <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-2xl space-y-2 text-xs text-blue-200"><p className="font-bold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-400" />Soluciones integradas en UCNL:</p><ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]"><li><strong className="text-white">Abrir en Navegador</strong></li><li><strong className="text-white">Ventana Paralela</strong></li><li><strong className="text-white">Google Docs Viewer</strong></li></ul></div>
            <button onClick={() => setShowSecurityExplanation(false)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityWorkspaceModal;

