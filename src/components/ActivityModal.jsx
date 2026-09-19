import React, { useState, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  Paperclip, 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  Calendar, 
  Clock, 
  FileText, 
  GraduationCap, 
  AlertCircle,
  Loader2,
  Layers
} from 'lucide-react';
import { ACTIVITY_TYPES, ACTIVITY_STATUSES } from '../types/constants';
import { uploadAttachment, deleteAttachmentFromStorage, formatBytes } from '../services/storageService';
import FileIcon from './FileIcon';
import RichTextEditor from './RichTextEditor';

export const ActivityModal = ({
  isOpen,
  onClose,
  onSave,
  activityToEdit = null,
  academicStructure = []
}) => {
  const isEditing = !!activityToEdit;

  const defaultTetra = academicStructure[0] || null;
  const defaultSub = defaultTetra?.subjects?.[0]?.name || '';

  const [formData, setFormData] = useState({
    title: '',
    tetraId: defaultTetra?.id || '',
    tetraName: defaultTetra?.name || '',
    subject: defaultSub,
    customSubject: '',
    teacher: '',
    type: 'foro',
    status: 'pending',
    dueDate: '',
    directUrl: '',
    description: '',
    links: [],
    attachments: []
  });

  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [uploadingFiles, setUploadingFiles] = useState({}); // { [fileName]: progress }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sincronizar formulario cuando se abre para editar o crear
  useEffect(() => {
    if (activityToEdit) {
      const currentTetra = academicStructure.find(t => t.id === activityToEdit.tetraId || t.name === activityToEdit.tetraName) || academicStructure[0] || null;
      const isCustom = !currentTetra?.subjects?.some(s => s.name === activityToEdit.subject);

      setFormData({
        title: activityToEdit.title || '',
        tetraId: currentTetra?.id || activityToEdit.tetraId || '',
        tetraName: currentTetra?.name || activityToEdit.tetraName || '',
        subject: isCustom ? 'custom' : (activityToEdit.subject || currentTetra?.subjects?.[0]?.name || 'General'),
        customSubject: isCustom ? (activityToEdit.subject || '') : '',
        teacher: activityToEdit.teacher || '',
        type: activityToEdit.type || 'foro',
        status: activityToEdit.status || 'pending',
        dueDate: activityToEdit.dueDate ? activityToEdit.dueDate.substring(0, 16) : '',
        directUrl: activityToEdit.directUrl || activityToEdit.meetingUrl || activityToEdit.examUrl || activityToEdit.forumUrl || '',
        description: activityToEdit.description || '',
        links: activityToEdit.links || [],
        attachments: activityToEdit.attachments || []
      });
      setIsCustomSubject(isCustom);
    } else {
      // Fecha por defecto: Mañana a las 23:59
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);
      const defaultDateStr = tomorrow.toISOString().substring(0, 16);

      const firstTetra = academicStructure[0] || null;
      const firstSub = firstTetra?.subjects?.[0]?.name || '';

      setFormData({
        title: '',
        tetraId: firstTetra?.id || '',
        tetraName: firstTetra?.name || '',
        subject: firstSub || (academicStructure.length > 0 ? 'custom' : 'General'),
        customSubject: '',
        teacher: '',
        type: 'foro',
        status: 'pending',
        dueDate: defaultDateStr,
        directUrl: '',
        description: '',
        links: [],
        attachments: []
      });
      setIsCustomSubject(!firstSub && academicStructure.length > 0);
    }
    setError('');
    setUploadingFiles({});
  }, [activityToEdit, isOpen, academicStructure]);

  if (!isOpen) return null;

  // Obtener materias disponibles para el tetra seleccionado
  const selectedTetraObj = academicStructure.find(t => t.id === formData.tetraId) || academicStructure.find(t => t.name === formData.tetraName) || academicStructure[0];
  const availableTetraSubjects = selectedTetraObj?.subjects || [];

  const handleTetraChange = (e) => {
    const targetTetraId = e.target.value;
    const targetTetra = academicStructure.find(t => t.id === targetTetraId);
    const firstSubName = targetTetra?.subjects?.[0]?.name || '';

    setFormData(prev => ({
      ...prev,
      tetraId: targetTetraId,
      tetraName: targetTetra?.name || 'Tetramestre',
      subject: firstSubName || 'custom',
      customSubject: ''
    }));
    setIsCustomSubject(!firstSubName);
  };

  const handleSubjectChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      setIsCustomSubject(true);
      setFormData(prev => ({ ...prev, subject: 'custom' }));
    } else {
      setIsCustomSubject(false);
      setFormData(prev => ({ ...prev, subject: value }));
    }
  };

  // Manejador de subida de archivos
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError('');
    const folderId = activityToEdit ? activityToEdit.id : Date.now().toString();

    for (const file of files) {
      const tempKey = `${file.name}_${Date.now()}`;
      setUploadingFiles(prev => ({ ...prev, [tempKey]: { name: file.name, progress: 0 } }));

      try {
        const uploadedMeta = await uploadAttachment(file, folderId, (progress) => {
          setUploadingFiles(prev => ({
            ...prev,
            [tempKey]: { name: file.name, progress }
          }));
        });

        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, uploadedMeta]
        }));
      } catch (err) {
        console.error('Error al subir archivo:', err);
        setError(`No se pudo subir ${file.name}. Verifica la conexión.`);
      } finally {
        setUploadingFiles(prev => {
          const updated = { ...prev };
          delete updated[tempKey];
          return updated;
        });
      }
    }
  };

  const handleRemoveAttachment = async (index, file) => {
    if (file.storagePath) {
      try {
        await deleteAttachmentFromStorage(file.storagePath);
      } catch (err) {
        console.warn('Error al eliminar de Storage:', err);
      }
    }

    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== index)
    }));
  };

  // Agregar Enlace de Recurso
  const handleAddLink = () => {
    if (!newLink.url.trim()) return;

    let formattedUrl = newLink.url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    setFormData(prev => ({
      ...prev,
      links: [
        ...prev.links,
        {
          title: newLink.title.trim() || formattedUrl,
          url: formattedUrl
        }
      ]
    }));

    setNewLink({ title: '', url: '' });
  };

  const handleRemoveLink = (index) => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter((_, idx) => idx !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('El título de la actividad es obligatorio.');
      return;
    }

    const currentTetra = academicStructure.find(t => t.id === formData.tetraId) || academicStructure.find(t => t.name === formData.tetraName) || academicStructure[0];
    const finalTetraId = currentTetra?.id || formData.tetraId || 'tetra_1';
    const finalTetraName = currentTetra?.name || formData.tetraName || 'Tetramestre';

    const finalSubject = isCustomSubject 
      ? (formData.customSubject.trim() || 'General') 
      : (formData.subject || 'General');

    setIsSubmitting(true);
    setError('');

    try {
      await onSave({
        ...formData,
        tetraId: finalTetraId,
        tetraName: finalTetraName,
        subject: finalSubject
      });
      onClose();
    } catch (err) {
      console.error('Error al guardar actividad:', err);
      setError('Error al guardar en la base de datos. Verifica tus permisos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUploading = Object.keys(uploadingFiles).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {isEditing ? 'Editar Actividad Escolar' : 'Nueva Actividad Escolar'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Completa los detalles de la actividad asignada a su Tetramestre y Materia.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-sm touch-scroll">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Título de la Actividad *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej. Tarea 3: Ejercicios de Cálculo Integral o Proyecto Final"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-base sm:text-xs min-h-[42px]"
            />
          </div>

            {/* Tetramestre y Materia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/60 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80">
              {/* Tetramestre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tetramestre *</span>
                </label>
                {academicStructure.length > 0 ? (
                  <select
                    value={formData.tetraId}
                    onChange={handleTetraChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-slate-800 text-base sm:text-xs min-h-[42px]"
                  >
                    {academicStructure.map((tetra) => (
                      <option key={tetra.id} value={tetra.id}>
                        {tetra.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.tetraName}
                    onChange={(e) => setFormData({ ...formData, tetraName: e.target.value, tetraId: 'tetra_custom' })}
                    placeholder="Ej. 1er Tetramestre (o configura en ⚙️)"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-slate-800 text-base sm:text-xs min-h-[42px]"
                  />
                )}
              </div>

              {/* Materia dentro del Tetra */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Materia / Asignatura *
                </label>
                {academicStructure.length > 0 ? (
                  <select
                    value={isCustomSubject ? 'custom' : formData.subject}
                    onChange={handleSubjectChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white text-base sm:text-xs min-h-[42px]"
                  >
                    {availableTetraSubjects.map((subj) => (
                      <option key={subj.id || subj.name} value={subj.name}>
                        {subj.name} {subj.code ? `(${subj.code})` : ''}
                      </option>
                    ))}
                    <option value="custom">+ Otra Materia (Personalizada)</option>
                  </select>
                ) : null}

                {(isCustomSubject || academicStructure.length === 0) && (
                  <input
                    type="text"
                    required
                    value={isCustomSubject ? formData.customSubject : formData.subject}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isCustomSubject) {
                        setFormData({ ...formData, customSubject: val });
                      } else {
                        setFormData({ ...formData, subject: val });
                      }
                    }}
                    placeholder="Nombre de la materia..."
                    className={`w-full ${academicStructure.length > 0 ? 'mt-2' : ''} px-3.5 py-2.5 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-xs min-h-[42px]`}
                  />
                )}
              </div>
            </div>

            {/* Profesor y Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Docente / Catedrático
                </label>
                <input
                  type="text"
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  placeholder="Ej. Dr. Martínez"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-xs font-medium min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Actividad *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-xs font-bold bg-white text-slate-800 min-h-[42px]"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fecha y Hora Límite de Entrega */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha y Hora de Entrega *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-base sm:text-xs min-h-[42px] bg-white"
              />
            </div>

            {/* Campo Inteligente de Enlace Directo (Foros, Exámenes, Reuniones Síncronas Teams/WhatsApp/Meet) */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              formData.type === 'reunion_sincrona'
                ? 'bg-emerald-50/40 border-emerald-200'
                : formData.type === 'examen'
                ? 'bg-rose-50/40 border-rose-200'
                : formData.type === 'foro'
                ? 'bg-purple-50/40 border-purple-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {formData.type === 'foro'
                      ? 'Enlace Directo al Foro de Debate'
                      : formData.type === 'examen'
                      ? 'Enlace Directo al Examen / Evaluación'
                      : formData.type === 'reunion_sincrona'
                      ? 'Enlace a la Reunión Síncrona (Teams, Meet, WhatsApp)'
                      : 'Enlace Directo a la Actividad / Plataforma (Opcional)'}
                  </span>
                </label>
                {formData.directUrl ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                    ✓ Botón directo activo
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">
                    Opcional
                  </span>
                )}
              </div>

              <input
                type="url"
                value={formData.directUrl}
                onChange={(e) => setFormData({ ...formData, directUrl: e.target.value })}
                placeholder={
                  formData.type === 'foro'
                    ? 'https://canvas.ucnl.edu.mx/... (URL directa al foro)'
                    : formData.type === 'examen'
                    ? 'https://forms.office.com/... (URL del examen o formulario)'
                    : formData.type === 'reunion_sincrona'
                    ? 'https://teams.microsoft.com/... o meet.google.com o chat.whatsapp.com'
                    : 'https://... (URL directa para acceder a la actividad)'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-base sm:text-xs min-h-[42px] bg-white"
              />

              <p className="text-[11px] text-slate-500 leading-snug mt-1.5">
                {formData.type === 'foro' && '💬 Muestra un botón destacado "Ir al Foro" directamente en la tarjeta de la actividad.'}
                {formData.type === 'examen' && '📝 Muestra un botón destacado "Ir al Examen" en la tarjeta para iniciar la evaluación inmediatamente.'}
                {formData.type === 'reunion_sincrona' && '📹 Detecta automáticamente Teams, Google Meet o WhatsApp y genera el enlace directo a la app para unirse a la llamada.'}
                {formData.type === 'actividad_formativa' && '📄 Genera un botón directo en la tarjeta para abrir la asignación institucional.'}
              </p>
            </div>

          {/* Descripción / Instrucciones con Formato Enriquecido y Enlaces */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Descripción e Instrucciones (Formato Enriquecido y Enlaces)
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(val) => setFormData({ ...formData, description: val })}
              placeholder="Escribe las instrucciones detalladas, formato de entrega, rúbrica, enlaces web con [texto](url) o pega URLs directas..."
              rows={5}
            />
          </div>

          {/* Zona de Subida de Documentos (Firebase Storage) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Documentos Adjuntos (PDF, Word, Excel, PPT, Imágenes)
            </label>

            {/* Input / Dropzone */}
            <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-2xl bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer transition text-center group">
              <UploadCloud className="w-8 h-8 text-blue-500 group-hover:scale-110 transition mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Haz clic o arrastra documentos aquí para subirlos a Firebase
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Archivos PDF, DOCX, XLSX, PPTX, JPG, PNG, ZIP hasta 50MB
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Progreso de subida en vivo */}
            {isUploading && (
              <div className="space-y-2">
                {Object.entries(uploadingFiles).map(([key, item]) => (
                  <div key={key} className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-blue-900">
                      <span className="truncate max-w-xs">{item.name}</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lista de archivos adjuntos subidos */}
            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">
                  Archivos listos ({formData.attachments.length}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formData.attachments.map((file, idx) => (
                    <div 
                      key={file.id || idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div className="flex items-center space-x-2.5 truncate pr-2">
                        <FileIcon category={file.category} className="w-4 h-4 flex-shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx, file)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Quitar archivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enlaces de Apoyo Web */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Enlaces Web y Referencias
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Título del enlace (Ej. Video explicativo)"
                value={newLink.title}
                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-base sm:text-xs min-h-[42px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                placeholder="URL (Ej. https://youtube.com/...)"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-base sm:text-xs min-h-[42px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1 min-h-[42px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>

            {formData.links.length > 0 && (
              <div className="space-y-1.5">
                {formData.links.map((link, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 truncate">{link.title}:</span>
                      <span className="text-slate-400 truncate">{link.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </form>

        {/* Pie con Botones Sticky */}
        <div className="p-3.5 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition min-h-[42px]"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-500/25 transition disabled:opacity-50 min-h-[42px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Subiendo archivos...</span>
              </>
            ) : (
              <span>{isEditing ? 'Guardar Cambios' : 'Publicar Actividad'}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ActivityModal;
