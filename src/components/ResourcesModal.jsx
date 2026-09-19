import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderOpen, 
  Plus, 
  Search, 
  ExternalLink, 
  Edit2, 
  Trash2, 
  Copy, 
  Check, 
  FileText, 
  BookOpen, 
  Link as LinkIcon, 
  Download, 
  Layers, 
  Loader2, 
  Sparkles,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import { 
  subscribeToResources, 
  createResource, 
  updateResource, 
  deleteResource 
} from '../services/resourceService';
import { formatFullDate, formatShortDate } from '../utils/dateUtils';
import { normalizeUrl } from '../utils/textUtils';
import RichTextRenderer from './RichTextRenderer';

const RESOURCE_CATEGORIES = [
  'General',
  'Formatos y Plantillas',
  'Guías y Rúbricas',
  'Biblioteca y Libros',
  'Enlaces y Plataformas'
];

export const ResourcesModal = ({
  isOpen,
  onClose,
  isAdmin = false,
  isEditor = false,
  currentUser = null
}) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Estado del formulario de creación / edición
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    category: 'General'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Suscribirse a los recursos en tiempo real
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribe = subscribeToResources(
      (data) => {
        setResources(data || []);
        setLoading(false);
      },
      (err) => {
        console.error('Error al cargar recursos:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

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

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      url: '',
      category: 'General'
    });
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (resource) => {
    setEditingId(resource.id);
    setFormData({
      title: resource.title || '',
      description: resource.description || '',
      url: resource.url || '',
      category: resource.category || 'General'
    });
    setError('');
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError('');
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('El título del recurso es obligatorio.');
      return;
    }
    if (!formData.url.trim()) {
      setError('El enlace o URL del archivo es obligatorio.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (editingId) {
        await updateResource(editingId, formData);
      } else {
        await createResource(formData, currentUser);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', description: '', url: '', category: 'General' });
    } catch (err) {
      console.error('Error al guardar recurso:', err);
      setError('Ocurrió un error al guardar el recurso. Comprueba tus permisos.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (resource) => {
    if (!window.confirm(`¿Estás seguro de eliminar el recurso "${resource.title}"?`)) {
      return;
    }
    try {
      await deleteResource(resource.id);
    } catch (err) {
      console.error('Error al eliminar recurso:', err);
      alert('No se pudo eliminar el recurso.');
    }
  };

  const handleCopyLink = (resource) => {
    navigator.clipboard.writeText(resource.url);
    setCopiedId(resource.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtrado de recursos por búsqueda y categoría
  const filteredResources = resources.filter((res) => {
    if (selectedCategory !== 'all' && res.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (res.title || '').toLowerCase().includes(q);
      const matchDesc = (res.description || '').toLowerCase().includes(q);
      const matchUrl = (res.url || '').toLowerCase().includes(q);
      const matchCat = (res.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchUrl && !matchCat) return false;
    }
    return true;
  });

  const getCategoryBadgeStyle = (category) => {
    switch (category) {
      case 'Formatos y Plantillas':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Guías y Rúbricas':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Biblioteca y Libros':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Enlaces y Plataformas':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <FolderOpen className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2">
                <span>Recursos Institucionales</span>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-semibold">
                  {resources.length} {resources.length === 1 ? 'archivo' : 'archivos'}
                </span>
              </h2>
              <p className="text-xs text-blue-200/80">
                Enlaces a archivos, formatos, guías y biblioteca compartida
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isEditor && !showForm && (
              <button
                onClick={handleOpenCreate}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Recurso</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda, Filtros y Botón Móvil */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar recursos por título, descripción o formato..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isEditor && !showForm && (
              <button
                onClick={handleOpenCreate}
                className="sm:hidden inline-flex items-center justify-center p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs active:scale-95"
                title="Agregar Recurso"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro por Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-scroll py-0.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              Todos ({resources.length})
            </button>
            {RESOURCE_CATEGORIES.map((cat) => {
              const count = resources.filter(r => r.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center space-x-1 ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cuerpo Principal del Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 touch-scroll">
          
          {/* Formulario de Creación / Edición (Solo Administradores / Editores) */}
          {showForm && (
            <form 
              onSubmit={handleSubmitForm}
              className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <h3 className="text-sm font-extrabold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>{editingId ? 'Editar Recurso' : 'Nuevo Recurso o Enlace a Archivo'}</span>
                </h3>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancelar
                </button>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Título del Recurso *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej. Plantilla Oficial de Portada UCNL, Rúbrica de Ensayos..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm font-semibold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoría *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm font-bold bg-white text-slate-800"
                  >
                    {RESOURCE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enlace o URL del Archivo / Carpeta *
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://drive.google.com/... o https://onedrive.live.com/... o enlace de archivo"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm font-medium bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Puedes enlazar documentos de Google Drive, OneDrive, Dropbox, PDFs en línea o enlaces institucionales.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción e Instrucciones de Uso
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe brevemente el contenido de este recurso o instrucciones para los estudiantes..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-white leading-relaxed resize-y"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-blue-100">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingId ? 'Guardar Cambios' : 'Publicar Recurso'}</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Listado de Recursos */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-semibold">Cargando biblioteca de recursos...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="py-16 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FolderOpen className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'No se encontraron recursos con esos filtros' 
                    : 'Aún no se han agregado recursos'}
                </h3>
                <p className="text-xs text-slate-500">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Prueba modificando tus términos de búsqueda o cambiando de categoría.'
                    : 'Los administradores pueden agregar enlaces a archivos, carpetas compartidas y material de apoyo.'}
                </p>
              </div>
              {isEditor && !showForm && (
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar el primer recurso</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {filteredResources.map((resource) => {
                const categoryStyle = getCategoryBadgeStyle(resource.category);
                const isCopied = copiedId === resource.id;

                return (
                  <div
                    key={resource.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="space-y-2.5">
                      {/* Cabecera del Recurso: Categoría y Botones Admin */}
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${categoryStyle}`}>
                          {resource.category || 'General'}
                        </span>

                        {isEditor && (
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              onClick={() => handleOpenEdit(resource)}
                              title="Editar recurso"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(resource)}
                              title="Eliminar recurso"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Título */}
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition">
                        {resource.title}
                      </h4>

                      {/* Descripción */}
                      {resource.description ? (
                        <div className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          <RichTextRenderer content={resource.description} />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Sin descripción adicional.</p>
                      )}
                    </div>

                    {/* Pie de la Tarjeta del Recurso */}
                    <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400 truncate">
                        {resource.createdAt && (
                          <span>Publicado: {formatShortDate(resource.createdAt)}</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleCopyLink(resource)}
                          title="Copiar enlace"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1 active:scale-95"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 text-[11px]">¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-[11px]">Copiar</span>
                            </>
                          )}
                        </button>

                        <a
                          href={normalizeUrl(resource.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition active:scale-95"
                        >
                          <span>Abrir Enlace</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Pie del Modal */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span className="font-medium text-[11px] sm:text-xs">
            {filteredResources.length} {filteredResources.length === 1 ? 'recurso mostrado' : 'recursos mostrados'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition active:scale-95"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResourcesModal;
