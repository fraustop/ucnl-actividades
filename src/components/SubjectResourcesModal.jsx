import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  FolderOpen, 
  Layers, 
  FileText, 
  Download, 
  ExternalLink, 
  Upload, 
  Link2, 
  Trash2, 
  Eye, 
  Video, 
  Music, 
  Image as ImageIcon, 
  Film, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Sparkles, 
  Check, 
  Copy, 
  AppWindow, 
  Compass, 
  HelpCircle, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  Plus, 
  Edit2, 
  Save, 
  GraduationCap, 
  User, 
  Info,
  Calendar,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FileIcon from './FileIcon';
import RichTextRenderer from './RichTextRenderer';
import RichTextEditor from './RichTextEditor';
import { formatBytes } from '../services/storageService';
import { getEmbedInfo } from '../services/activityWorkspaceService';
import { 
  subscribeToSubjectResources, 
  uploadAndAddSubjectAttachment, 
  deleteSubjectAttachment, 
  addSubjectLink, 
  deleteSubjectLink, 
  updateSubjectDescription 
} from '../services/subjectResourcesService';

export const SubjectResourcesModal = ({
  isOpen,
  onClose,
  academicStructure = [],
  initialTetraId = null,
  initialSubjectId = null
}) => {
  const { currentUser, userProfile, isAdmin, isEditor, isDocente } = useAuth();

  // Estados de Selección de Tetramestre y Materia
  const [selectedTetraId, setSelectedTetraId] = useState(initialTetraId || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId || '');

  // Datos de recursos de la materia actual
  const [subjectData, setSubjectData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estados de Pestañas y Visor
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'syllabus' | 'upload' | 'link'
  const [activeResource, setActiveResource] = useState(null);
  const [isFullscreenViewer, setIsFullscreenViewer] = useState(false);
  const [useGoogleDocsFallback, setUseGoogleDocsFallback] = useState(false);
  const [showSecurityExplanation, setShowSecurityExplanation] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);

  // Estados de Subida de Archivos
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Estados de Añadir Enlace
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState('');
  const [linkError, setLinkError] = useState('');

  // Estados de Edición de Programa / Descripción
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  // Inicializar o sincronizar selecciones cuando cambie initialTetraId o initialSubjectId
  useEffect(() => {
    if (academicStructure && academicStructure.length > 0) {
      const validTetra = academicStructure.find(t => t.id === initialTetraId) || academicStructure[0];
      const tetraId = validTetra?.id || '';
      setSelectedTetraId(tetraId);

      const validSubject = validTetra?.subjects?.find(s => s.id === initialSubjectId) || validTetra?.subjects?.[0];
      setSelectedSubjectId(validSubject?.id || '');
    }
  }, [initialTetraId, initialSubjectId, academicStructure, isOpen]);

  // Obtener objetos actuales de Tetra y Materia
  const currentTetra = academicStructure.find(t => t.id === selectedTetraId) || academicStructure[0] || null;
  const currentSubject = currentTetra?.subjects?.find(s => s.id === selectedSubjectId) || currentTetra?.subjects?.[0] || null;

  // Suscribirse a los recursos de la materia seleccionada
  useEffect(() => {
    if (!isOpen || !selectedTetraId || !selectedSubjectId) {
      setSubjectData(null);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToSubjectResources(
      selectedTetraId,
      selectedSubjectId,
      (data) => {
        setSubjectData(data);
        setDescriptionText(data?.description || '');
        setLoading(false);

        // Si hay recursos y no hay ninguno seleccionado en el visor, preseleccionar el primero
        if (data && !activeResource) {
          if (data.attachments && data.attachments.length > 0) {
            handleSelectResource({
              url: data.attachments[0].downloadUrl,
              title: data.attachments[0].name,
              type: data.attachments[0].category
            });
          } else if (data.links && data.links.length > 0) {
            handleSelectResource(data.links[0]);
          }
        }
      },
      (err) => {
        console.error('Error al cargar recursos de materia:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, selectedTetraId, selectedSubjectId]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Cambiar de Tetramestre y auto-seleccionar la primera materia
  const handleTetraChange = (newTetraId) => {
    setSelectedTetraId(newTetraId);
    const targetTetra = academicStructure.find(t => t.id === newTetraId);
    const firstSubject = targetTetra?.subjects?.[0];
    setSelectedSubjectId(firstSubject?.id || '');
    setActiveResource(null);
  };

  // Seleccionar recurso para el visor integrado
  const handleSelectResource = (resource) => {
    if (!resource || !resource.url) return;
    const info = getEmbedInfo(resource.url, resource.title || resource.name);
    
    // Configurar fallback para Office y PDF
    let googleViewerUrl = null;
    if (info.type === 'office' || info.type === 'pdf' || info.type === 'web') {
      googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(resource.url)}&embedded=true`;
    }

    setActiveResource({
      ...info,
      title: resource.title || resource.name || info.title,
      originalUrl: resource.url,
      googleViewerUrl: googleViewerUrl
    });

    setUseGoogleDocsFallback(false);
  };

  // Abrir en el navegador predeterminado
  const handleOpenDefaultBrowser = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Abrir ventana emergente (Companion window)
  const handleOpenPopout = (url) => {
    if (!url) return;
    const width = 1100;
    const height = 800;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    window.open(
      url,
      'ucnl_subject_resource_window',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes,status=yes`
    );
  };

  // Copiar URL al portapapeles
  const handleCopyUrl = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (e) {
      console.warn('No se pudo copiar:', e);
    }
  };

  // Subir archivo a la materia
  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!uploadFile || !currentTetra || !currentSubject) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess('');

    try {
      const newAtt = await uploadAndAddSubjectAttachment(
        currentTetra.id,
        currentTetra.name,
        currentSubject.id,
        currentSubject.name,
        currentSubject.code || '',
        uploadFile,
        currentUser,
        (progress) => setUploadProgress(progress)
      );

      setUploadSuccess(`¡Archivo "${uploadFile.name}" subido y vinculado a la materia!`);
      setUploadFile(null);
      if (newAtt?.downloadUrl) {
        handleSelectResource({ url: newAtt.downloadUrl, title: newAtt.name, type: newAtt.category });
      }
      setTimeout(() => {
        setUploadSuccess('');
        setActiveTab('resources');
      }, 2000);
    } catch (err) {
      console.error('Error al subir archivo a la materia:', err);
      setUploadError(err.message || 'Error al subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Eliminar archivo de la materia
  const handleDeleteAttachment = async (attachmentId, fileName) => {
    if (!window.confirm(`¿Deseas eliminar el archivo "${fileName}" de esta materia?`)) return;
    try {
      await deleteSubjectAttachment(currentTetra.id, currentSubject.id, attachmentId);
      if (activeResource?.originalUrl?.includes(attachmentId)) {
        setActiveResource(null);
      }
    } catch (err) {
      console.error('Error al eliminar archivo:', err);
      alert('No se pudo eliminar el archivo.');
    }
  };

  // Guardar nuevo enlace web o video
  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!newLinkUrl.trim() || !currentTetra || !currentSubject) return;

    setIsSavingLink(true);
    setLinkError('');
    setLinkSuccess('');

    try {
      const savedLink = await addSubjectLink(
        currentTetra.id,
        currentTetra.name,
        currentSubject.id,
        currentSubject.name,
        currentSubject.code || '',
        { url: newLinkUrl, title: newLinkTitle },
        currentUser
      );

      setLinkSuccess('¡Enlace guardado exitosamente en la materia!');
      setNewLinkUrl('');
      setNewLinkTitle('');
      if (savedLink) {
        handleSelectResource(savedLink);
      }
      setTimeout(() => {
        setLinkSuccess('');
        setActiveTab('resources');
      }, 2000);
    } catch (err) {
      console.error('Error al guardar enlace:', err);
      setLinkError(err.message || 'Error al guardar el enlace.');
    } finally {
      setIsSavingLink(false);
    }
  };

  // Eliminar enlace de la materia
  const handleDeleteLink = async (linkId, linkTitle) => {
    if (!window.confirm(`¿Deseas eliminar el enlace "${linkTitle}"?`)) return;
    try {
      await deleteSubjectLink(currentTetra.id, currentSubject.id, linkId);
    } catch (err) {
      console.error('Error al eliminar enlace:', err);
      alert('No se pudo eliminar el enlace.');
    }
  };

  // Guardar descripción / programa de la materia
  const handleSaveDescription = async () => {
    if (!currentTetra || !currentSubject) return;
    setIsSavingDesc(true);
    try {
      await updateSubjectDescription(
        currentTetra.id,
        currentTetra.name,
        currentSubject.id,
        currentSubject.name,
        currentSubject.code || '',
        descriptionText,
        currentUser
      );
      setIsEditingDescription(false);
    } catch (err) {
      console.error('Error al guardar descripción:', err);
      alert('Error al guardar la descripción.');
    } finally {
      setIsSavingDesc(false);
    }
  };

  const attachments = subjectData?.attachments || [];
  const links = subjectData?.links || [];
  const totalResourcesCount = attachments.length + links.length;

  // Renderizado del Visor Integrado Multiformato
  const renderIntegratedViewer = () => {
    if (!activeResource) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-4 bg-slate-900/40">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h4 className="text-base font-bold text-white">Visor de Recursos por Materia</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Selecciona cualquier documento, libro, rúbrica o video de la lista de la izquierda para abrirlo en el visor integrado interactivo.
            </p>
          </div>

          {(isAdmin || isDocente) && (
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <button
                onClick={() => setActiveTab('upload')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Subir Documento</span>
              </button>
              <button
                onClick={() => setActiveTab('link')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5"
              >
                <Link2 className="w-4 h-4 text-amber-400" />
                <span>Agregar Enlace</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    const { type, embedUrl, originalUrl, title, googleViewerUrl } = activeResource;

    return (
      <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
        {/* Barra Superior del Visor */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0 text-white">
          <div className="flex items-center space-x-2 truncate flex-1 min-w-0">
            <span className="p-1 rounded bg-indigo-500/20 text-indigo-300 flex-shrink-0">
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
            {/* Botón ¿Por qué no abre? */}
            <button
              onClick={() => setShowSecurityExplanation(true)}
              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
              title="Explicar por qué algunos sitios rechazan conexiones embebidas"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">¿No carga?</span>
            </button>

            {/* Abrir en Navegador */}
            <button
              onClick={() => handleOpenDefaultBrowser(originalUrl)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Abrir en pestaña nueva"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Abrir en Navegador</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>

            {/* Alternar Google Docs Fallback */}
            {(type === 'pdf' || type === 'office' || type === 'web') && (
              <button
                onClick={() => setUseGoogleDocsFallback(!useGoogleDocsFallback)}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  useGoogleDocsFallback 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title={useGoogleDocsFallback ? "Visor de Google Activo" : "Usar Visor de Google"}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Botón Descargar */}
            {originalUrl && (
              <a
                href={originalUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition"
                title="Descargar archivo original"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Botón Pantalla Completa */}
            <button
              onClick={() => setIsFullscreenViewer(!isFullscreenViewer)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition"
              title={isFullscreenViewer ? "Restaurar tamaño" : "Pantalla completa"}
            >
              {isFullscreenViewer ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Contenido Visualizador */}
        <div className="flex-1 bg-black relative overflow-hidden flex items-center justify-center min-h-0">
          {type === 'youtube' || type === 'vimeo' || type === 'loom' ? (
            <iframe
              src={embedUrl}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : type === 'gdrive' ? (
            <iframe
              src={embedUrl}
              title={title}
              className="w-full h-full border-0 bg-white"
              allowFullScreen
            />
          ) : type === 'video_direct' ? (
            <video
              src={originalUrl}
              controls
              autoPlay
              className="max-w-full max-h-full"
            />
          ) : type === 'audio_direct' ? (
            <div className="p-8 text-center space-y-4">
              <Music className="w-16 h-16 text-indigo-400 mx-auto animate-pulse" />
              <p className="text-sm font-bold text-white">{title}</p>
              <audio src={originalUrl} controls className="w-80 max-w-full mx-auto" />
            </div>
          ) : type === 'image' ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={originalUrl}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          ) : (type === 'pdf' || type === 'office' || type === 'web') ? (
            <iframe
              src={useGoogleDocsFallback && googleViewerUrl ? googleViewerUrl : (embedUrl || originalUrl)}
              title={title}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className="p-8 text-center space-y-4 max-w-md">
              <FileText className="w-12 h-12 text-blue-400 mx-auto" />
              <p className="text-sm font-bold text-white">{title}</p>
              <p className="text-xs text-slate-400">
                Este tipo de archivo se abre mejor directamente en tu navegador o mediante descarga.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleOpenDefaultBrowser(originalUrl)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4" />
                  <span>Abrir en Navegador</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Contenedor Principal Modal */}
      <div className={`w-full max-w-7xl h-[92vh] max-h-[920px] bg-slate-950 border border-indigo-900/60 text-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
        isFullscreenViewer ? 'fixed inset-0 z-[650] max-w-none h-full max-h-none rounded-none border-0' : ''
      }`}>
        
        {/* 1. BARRA SUPERIOR (HEADER) */}
        <header className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border-b border-indigo-900/50 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          
          {/* Identidad y Selector de Tetramestre / Materia */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0 border border-blue-400/30">
              <BookOpen className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
              {/* Selector de Tetramestre */}
              <select
                value={selectedTetraId}
                onChange={(e) => handleTetraChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-indigo-800/80 text-xs font-extrabold text-indigo-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
              >
                {academicStructure.map((tetra) => (
                  <option key={tetra.id} value={tetra.id} className="bg-slate-900 text-white">
                    {tetra.name}
                  </option>
                ))}
              </select>

              {/* Selector de Materia */}
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setActiveResource(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-950/80 border border-blue-600/60 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-sm max-w-[240px] sm:max-w-xs truncate"
              >
                {currentTetra?.subjects?.map((sub) => (
                  <option key={sub.id} value={sub.id} className="bg-slate-900 text-white">
                    {sub.code ? `[${sub.code}] ` : ''}{sub.name}
                  </option>
                ))}
              </select>

              {/* Badge de Conteo */}
              <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <FolderOpen className="w-3 h-3" />
                {totalResourcesCount} recursos disponibles
              </span>
            </div>
          </div>

          {/* Botones de Control de Ventana */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition shadow-sm cursor-pointer border border-rose-500/60 flex items-center gap-1.5 text-xs font-bold"
              title="Cerrar ventana (Esc)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar</span>
            </button>
          </div>
        </header>

        {/* 2. CUERPO PRINCIPAL (2 PANELES) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-900">
          
          {/* PANEL IZQUIERDO: DETALLE DE MATERIA, ARCHIVOS Y ENLACES */}
          {!isFullscreenViewer && (
            <div className="w-full lg:w-[440px] xl:w-[480px] bg-slate-950/90 border-b lg:border-b-0 lg:border-r border-indigo-950 flex flex-col flex-shrink-0 min-h-0">
              
              {/* Encabezado del Panel Izquierdo con Pestañas */}
              <div className="p-3.5 px-4 bg-slate-950 border-b border-indigo-950 space-y-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                      {currentTetra?.name}
                    </span>
                    <h3 className="text-base font-extrabold text-white truncate leading-tight">
                      {currentSubject?.name}
                    </h3>
                  </div>
                  {currentSubject?.code && (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {currentSubject.code}
                    </span>
                  )}
                </div>

                {/* Pestañas de Navegación Interna */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setActiveTab('resources')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeTab === 'resources'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Recursos ({totalResourcesCount})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('syllabus')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeTab === 'syllabus'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Programa</span>
                  </button>

                  {(isAdmin || isDocente) && (
                    <>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          activeTab === 'upload'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('link')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          activeTab === 'link'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-amber-400 hover:text-amber-300'
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Enlace</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Contenido Desplazable del Panel Izquierdo */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 touch-scroll min-h-0">
                
                {/* PESTAÑA 1: LISTA DE RECURSOS (ARCHIVOS + ENLACES) */}
                {activeTab === 'resources' && (
                  <div className="space-y-4">
                    {/* Sección 1: Archivos Adjuntos */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          Archivos y Documentos ({attachments.length})
                        </span>
                      </div>

                      {attachments.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                          <p>No hay documentos adjuntos en esta materia aún.</p>
                          {(isAdmin || isDocente) && (
                            <button
                              onClick={() => setActiveTab('upload')}
                              className="text-blue-400 font-bold hover:underline"
                            >
                              Haz clic aquí para subir el primer archivo
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {attachments.map((file) => {
                            const isSelected = activeResource?.originalUrl === file.downloadUrl;
                            return (
                              <div
                                key={file.id}
                                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2.5 ${
                                  isSelected
                                    ? 'bg-blue-950/60 border-blue-500 shadow-md'
                                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800'
                                }`}
                              >
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <FileIcon category={file.category} className="w-5 h-5 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate" title={file.name}>
                                      {file.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                      <span>{formatBytes(file.size)}</span>
                                      <span>•</span>
                                      <span className="truncate">{file.uploadedBy || 'Docente'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectResource({ url: file.downloadUrl, title: file.name, type: file.category })}
                                    className="px-2.5 py-1 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 cursor-pointer"
                                    title="Ver en visor integrado"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Ver</span>
                                  </button>

                                  <a
                                    href={file.downloadUrl}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                    title="Descargar archivo"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>

                                  {(isAdmin || isDocente) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAttachment(file.id, file.name)}
                                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition"
                                      title="Eliminar archivo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sección 2: Enlaces Web y Videos */}
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-amber-400" />
                          Enlaces y Videos Recomendados ({links.length})
                        </span>
                      </div>

                      {links.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                          <p>No hay enlaces web agregados.</p>
                          {(isAdmin || isDocente) && (
                            <button
                              onClick={() => setActiveTab('link')}
                              className="text-amber-400 font-bold hover:underline"
                            >
                              Haz clic aquí para agregar un video o enlace
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {links.map((lnk) => {
                            const isSelected = activeResource?.originalUrl === lnk.url;
                            return (
                              <div
                                key={lnk.id}
                                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2.5 ${
                                  isSelected
                                    ? 'bg-amber-950/40 border-amber-500 shadow-md'
                                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800'
                                }`}
                              >
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 flex-shrink-0">
                                    {lnk.type === 'youtube' || lnk.type === 'vimeo' ? (
                                      <Video className="w-4 h-4" />
                                    ) : (
                                      <ExternalLink className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate" title={lnk.title}>
                                      {lnk.title}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">{lnk.url}</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectResource(lnk)}
                                    className="px-2.5 py-1 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1 cursor-pointer"
                                    title="Cargar en visor integrado"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Ver</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyUrl(lnk.url)}
                                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                    title="Copiar enlace"
                                  >
                                    {copiedUrl === lnk.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>

                                  <a
                                    href={lnk.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                    title="Abrir en pestaña externa"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>

                                  {(isAdmin || isDocente) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLink(lnk.id, lnk.title)}
                                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition"
                                      title="Eliminar enlace"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PESTAÑA 2: PROGRAMA / GUÍA DE LA MATERIA */}
                {activeTab === 'syllabus' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        Programa y Descripción de la Materia
                      </span>

                      {(isAdmin || isDocente) && !isEditingDescription && (
                        <button
                          onClick={() => setIsEditingDescription(true)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-400 hover:text-white bg-blue-900/30 hover:bg-blue-600 rounded-xl transition flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      )}
                    </div>

                    {isEditingDescription ? (
                      <div className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                        <RichTextEditor
                          value={descriptionText}
                          onChange={(val) => setDescriptionText(val)}
                          placeholder="Describe el temario, objetivos de aprendizaje, libros base y criterios de evaluación..."
                          rows={8}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setIsEditingDescription(false)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveDescription}
                            disabled={isSavingDesc}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow"
                          >
                            {isSavingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>Guardar Programa</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2">
                        {subjectData?.description ? (
                          <RichTextRenderer 
                            content={subjectData.description} 
                            onLinkClick={(url, label) => handleSelectResource({ url, title: label || url })}
                          />
                        ) : (
                          <p className="text-slate-400 italic">
                            Aún no se ha registrado el programa oficial para esta materia.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PESTAÑA 3: SUBIR ARCHIVO */}
                {activeTab === 'upload' && (isAdmin || isDocente) && (
                  <form onSubmit={handleUploadAttachment} className="space-y-4">
                    <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
                      <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Upload className="w-4 h-4 text-emerald-400" />
                        <span>Subir Documento a {currentSubject?.name}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Sube guías, libros en PDF, plantillas de Excel, diapositivas o material de apoyo oficial.
                      </p>
                    </div>

                    {uploadSuccess && (
                      <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{uploadSuccess}</span>
                      </div>
                    )}

                    {uploadError && (
                      <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-xs text-rose-200">
                        {uploadError}
                      </div>
                    )}

                    <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500 rounded-3xl p-6 text-center space-y-3 bg-slate-900/50 transition">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Selecciona un archivo</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">PDF, Word, Excel, PPTX, ZIP (Hasta 50MB)</p>
                      </div>

                      <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
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
                          <span>Subiendo archivo a Cloudinary...</span>
                          <span className="font-bold text-white">{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!uploadFile || isUploading}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Guardar y Ver en Visor</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* PESTAÑA 4: AÑADIR ENLACE */}
                {activeTab === 'link' && (isAdmin || isDocente) && (
                  <form onSubmit={handleSaveLink} className="space-y-4">
                    <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
                      <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Link2 className="w-4 h-4 text-amber-400" />
                        <span>Vincular Enlace o Video a {currentSubject?.name}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Agrega enlaces a videos de YouTube, carpetas de Google Drive, bibliotecas virtuales o artículos recomendados.
                      </p>
                    </div>

                    {linkSuccess && (
                      <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{linkSuccess}</span>
                      </div>
                    )}

                    {linkError && (
                      <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-xs text-rose-200">
                        {linkError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                          Dirección URL *
                        </label>
                        <input
                          type="url"
                          required
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=... o https://drive.google.com/..."
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                          Título o Nombre del Recurso
                        </label>
                        <input
                          type="text"
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                          placeholder="Ej. Video Clase Magistral, Documentación Oficial..."
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!newLinkUrl.trim() || isSavingLink}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {isSavingLink ? (
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
                )}

              </div>
            </div>
          )}

          {/* PANEL DERECHO: VISOR INTEGRADO MULTIFORMATO */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-900">
            {renderIntegratedViewer()}
          </div>

        </div>

      </div>

      {/* MODAL EXPLICATIVO DE SEGURIDAD (X-Frame-Options) */}
      {showSecurityExplanation && (
        <div 
          className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowSecurityExplanation(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Seguridad del Sitio Externo</h4>
                  <p className="text-[10px] text-amber-300/90 font-mono">X-Frame-Options / CSP</p>
                </div>
              </div>
              <button
                onClick={() => setShowSecurityExplanation(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Algunos sitios institucionales o portales con contraseñas bloquean la visualización dentro de marcos para proteger tu privacidad. Puedes abrir el recurso en una pestaña externa con un solo clic.
            </p>

            {activeResource?.originalUrl && (
              <button
                onClick={() => {
                  handleOpenDefaultBrowser(activeResource.originalUrl);
                  setShowSecurityExplanation(false);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Compass className="w-4 h-4" />
                <span>Abrir en Nueva Pestaña</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SubjectResourcesModal;
