import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Kanban, 
  List, 
  Calendar as CalendarIcon, 
  X, 
  Layers,
  BookOpen, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  Plus, 
  SlidersHorizontal, 
  Menu, 
  RotateCcw, 
  Sparkles,
  GraduationCap,
  ShieldCheck,
  Settings,
  Download,
  Bell,
  BellRing,
  FolderOpen,
  LogOut,
  LogIn,
  Maximize2,
  Minimize2,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { onInstallStateChange, promptPwaInstallation } from '../services/pwaService';
import { 
  getNotificationPermission, 
  requestNotificationPermissionAndToken,
  areNotificationsSupported 
} from '../services/notificationService';
import NotificationBellButton from './NotificationBellButton';

export const ActivityFilters = ({
  searchQuery,
  setSearchQuery,
  selectedTetra,
  setSelectedTetra,
  selectedSubject,
  setSelectedSubject,
  selectedStatus = 'pending',
  setSelectedStatus,
  viewMode,
  setViewMode,
  academicStructure = [],
  onResetFilters,
  hasActiveFilters,
  onOpenNewActivity,
  onOpenConfigModal,
  onOpenResourcesModal,
  onOpenAuthModal,
  onOpenNotificationDrawer
}) => {
  const { currentUser, userProfile, isEditor, isAdmin, isDocente, isStudent, logout } = useAuth();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsubscribe = onInstallStateChange((isInstallable) => {
      setCanInstallPwa(isInstallable);
    });
    setNotificationPermission(getNotificationPermission());

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      unsubscribe();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleInstallPwa = async () => {
    await promptPwaInstallation();
  };

  const handleToggleNotifications = async () => {
    if (!currentUser) return;
    setEnablingNotifications(true);
    try {
      await requestNotificationPermissionAndToken(currentUser);
      setNotificationPermission(getNotificationPermission());
      alert('¡Notificaciones activadas con éxito! Recibirás alertas sobre nuevas actividades y recordatorios.');
    } catch (err) {
      console.warn('Error al activar notificaciones:', err);
      alert(err.message || 'No se pudieron activar las notificaciones.');
    } finally {
      setEnablingNotifications(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setShowMobileFilters(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (err) {
      console.warn('Error al alternar pantalla completa:', err);
    }
  };

  // Obtener lista de materias según el Tetramestre seleccionado
  let availableSubjects = [];
  if (selectedTetra && selectedTetra !== 'all') {
    const targetTetra = academicStructure.find(t => t.id === selectedTetra);
    availableSubjects = targetTetra?.subjects || [];
  } else {
    // Si están seleccionados todos los tetras, incluir todas las materias registradas
    availableSubjects = academicStructure.flatMap(t => t.subjects || []);
  }

  // Eliminar duplicados por nombre de materia
  const uniqueSubjectNames = Array.from(new Set(availableSubjects.map(s => s.name).filter(Boolean)));

  // Detectar si hay filtros secundarios activos en móvil (para el badge del botón hamburguesa)
  const hasSecondaryFilters = selectedTetra !== 'all' || selectedSubject !== 'all' || viewMode !== 'kanban';

  return (
    <div className="w-full bg-gradient-to-b from-slate-100 via-slate-200/90 to-slate-300/80 border-b border-slate-300 shadow-md shadow-slate-300/20 relative z-20 flex-shrink-0 pt-safe sm:pt-0">
      
      {/* Brillo reflectivo metálico cromado */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

      {/* ========================================================================= */}
      {/* VISTA MÓVIL: Ribbon ultra-compacto con Buscador, Selector de Estado y Botón Menú */}
      {/* ========================================================================= */}
      <div className="sm:hidden px-3 py-2.5 space-y-2.5">
        
        {/* Fila Principal Móvil: Buscador + Menú Desplegable de Estado + Botón Hamburguesa de Filtros y Controles */}
        <div className="flex items-center gap-2">
          
          {/* 1. Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar actividades..."
              className="w-full pl-9 pr-8 h-11 rounded-2xl bg-white border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 2. Selector Desplegable de Estado (Por defecto: Pendientes) */}
          <div className="relative flex-shrink-0 w-36">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full h-11 pl-3 pr-7 bg-white border rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs appearance-none truncate transition ${
                selectedStatus === 'pending'
                  ? 'text-amber-800 border-amber-300 bg-amber-50/70'
                  : selectedStatus === 'in_progress'
                  ? 'text-blue-800 border-blue-300 bg-blue-50/70'
                  : selectedStatus === 'completed'
                  ? 'text-emerald-800 border-emerald-300 bg-emerald-50/70'
                  : 'text-slate-800 border-slate-300 bg-white'
              }`}
            >
              <option value="pending">⏳ Pendientes</option>
              <option value="in_progress">🚀 En Progreso</option>
              <option value="completed">✅ Completadas</option>
              <option value="all">📚 Todas</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px]">
              ▼
            </div>
          </div>

          {/* 3. Botón Configuración Móvil */}
          {onOpenConfigModal && (
            <button
              type="button"
              onClick={onOpenConfigModal}
              title="Configuración y Ajustes"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs flex-shrink-0 active:scale-95 cursor-pointer"
            >
              <Settings className={`w-4 h-4 ${isAdmin ? 'text-indigo-600' : 'text-slate-600'}`} />
            </button>
          )}

          {/* 4. Botón Hamburguesa / Menú y Controles Integrados */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            title="Abrir menú principal, controles y filtros"
            className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl border transition relative shadow-xs flex-shrink-0 active:scale-95 ${
              showMobileFilters
                ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20'
                : hasSecondaryFilters
                ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {showMobileFilters ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}

            {/* Badge indicador de filtros secundarios activos */}
            {hasSecondaryFilters && !showMobileFilters && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>

          {/* 4. Campanita de Notificaciones con Contador (Al lado derecho del botón hamburguesa en móvil) */}
          <NotificationBellButton
            onClick={() => {
              setShowMobileFilters(false);
              if (onOpenNotificationDrawer) onOpenNotificationDrawer();
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs active:scale-95"
            iconSize="w-5 h-5 text-slate-700"
            title="Ver notificaciones recientes"
          />
        </div>

        {/* Panel Desplegable: Controles del Encabezado, Perfil y Filtros (Móvil) */}
        {showMobileFilters && (
          <div className="p-3.5 bg-white/98 rounded-3xl border border-slate-300 shadow-2xl space-y-3.5 animate-in slide-in-from-top-2 fade-in duration-200">
            
            {/* Cabecera del panel con identidad institucional */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-sm tracking-tight text-slate-900">
                    UCNL Actividades
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Panel Móvil y Controles
                  </p>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => onResetFilters()}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 py-1 px-2 rounded-xl hover:bg-rose-50 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restablecer</span>
                </button>
              )}
            </div>

            {/* 1. Tarjeta de Usuario / Autenticación */}
            {currentUser ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-xs text-white flex-shrink-0 ${
                    isAdmin 
                      ? 'bg-gradient-to-tr from-indigo-600 to-purple-600' 
                      : isStudent
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                      : 'bg-gradient-to-tr from-blue-600 to-indigo-500'
                  }`}>
                    {currentUser.displayName ? currentUser.displayName[0] : (currentUser.email ? currentUser.email[0] : 'U')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <div className="mt-0.5">
                      {isAdmin ? (
                        <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Administrador
                        </span>
                      ) : isDocente ? (
                        <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          Docente / Tutor
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Estudiante
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Cerrar Sesión"
                  className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition flex-shrink-0 active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowMobileFilters(false);
                  if (onOpenAuthModal) onOpenAuthModal('login');
                }}
                className="w-full h-11 flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-sm transition active:scale-98"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión en el Portal</span>
              </button>
            )}

            {/* 2. Acciones y Controles Rápidos del Encabezado */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Herramientas y Accesos Rápidos
              </label>
              <div className="grid grid-cols-2 gap-2">
                
                {/* Biblioteca de Recursos */}
                <button
                  onClick={() => {
                    setShowMobileFilters(false);
                    if (onOpenResourcesModal) onOpenResourcesModal();
                  }}
                  className="flex items-center space-x-2 p-2.5 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-2xl text-blue-800 text-xs font-bold text-left transition active:scale-98"
                >
                  <FolderOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Recursos y Docs</span>
                </button>

                {/* Configuración (Para todos: notificaciones, horarios, servidor, materias y usuarios) */}
                <button
                  onClick={() => {
                    setShowMobileFilters(false);
                    if (onOpenConfigModal) onOpenConfigModal();
                  }}
                  className={`flex items-center space-x-2 p-2.5 border rounded-2xl text-xs font-bold text-left transition active:scale-98 ${
                    isAdmin
                      ? 'bg-indigo-50/90 hover:bg-indigo-100 border-indigo-200 text-indigo-800'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                  }`}
                >
                  <Settings className={`w-4 h-4 flex-shrink-0 ${isAdmin ? 'text-indigo-600' : 'text-slate-600'}`} />
                  <span className="truncate">{isAdmin ? 'Configuración / Admin' : 'Configuración'}</span>
                </button>

                {/* Notificaciones (Abre el panel) */}
                <button
                  onClick={() => {
                    setShowMobileFilters(false);
                    if (onOpenNotificationDrawer) onOpenNotificationDrawer();
                  }}
                  className="flex items-center space-x-2 p-2.5 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-2xl text-blue-800 text-xs font-bold text-left transition active:scale-98"
                >
                  <Bell className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Notificaciones</span>
                </button>

                {/* Pantalla Completa / Maximizar */}
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center space-x-2 p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl text-slate-700 text-xs font-bold text-left transition active:scale-98"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  )}
                  <span className="truncate">{isFullscreen ? 'Restaurar' : 'Pantalla Completa'}</span>
                </button>

                {/* Instalar App PWA (si está disponible) */}
                {canInstallPwa && (
                  <button
                    onClick={() => {
                      setShowMobileFilters(false);
                      handleInstallPwa();
                    }}
                    className="col-span-2 flex items-center justify-center space-x-2 p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-bold shadow-sm transition active:scale-98"
                  >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span>Instalar UCNL como Aplicación</span>
                  </button>
                )}

              </div>
            </div>

            {/* 3. Selectores de Tetramestre y Materia */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Filtros Académicos
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Selector de Tetramestre */}
                <div>
                  <div className="relative">
                    <select
                      value={selectedTetra}
                      onChange={(e) => {
                        setSelectedTetra(e.target.value);
                        setSelectedSubject('all');
                      }}
                      className="w-full h-11 pl-3 pr-7 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs appearance-none truncate"
                    >
                      <option value="all">📚 Todos los Tetras ({academicStructure.length})</option>
                      {academicStructure.map((tetra) => (
                        <option key={tetra.id} value={tetra.id}>
                          {tetra.name} ({tetra.subjects?.length || 0} materias)
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px]">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Selector de Materia */}
                <div>
                  <div className="relative">
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full h-11 pl-3 pr-7 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs appearance-none truncate"
                    >
                      <option value="all">📖 Todas las Materias</option>
                      {uniqueSubjectNames.map((subjName) => (
                        <option key={subjName} value={subjName}>
                          {subjName}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px]">
                      ▼
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Selector de Modos de Vista Móvil */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Modo de Visualización
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center justify-center space-x-1.5 h-10 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${
                    viewMode === 'kanban'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Kanban className="w-4 h-4" />
                  <span>Tablero</span>
                </button>

                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center justify-center space-x-1.5 h-10 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>Lista</span>
                </button>

                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center justify-center space-x-1.5 h-10 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>Calendario</span>
                </button>
              </div>
            </div>

            {/* 5. Botón Nueva Actividad dentro del panel para acceso rápido (Solo Admin) */}
            {isAdmin && onOpenNewActivity && (
              <button
                onClick={() => {
                  setShowMobileFilters(false);
                  onOpenNewActivity();
                }}
                className="w-full h-11 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-sm shadow-blue-500/25 transition active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nueva Actividad</span>
              </button>
            )}

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* VISTA ESCRITORIO / TABLET: Ribbon horizontal cromado (visible en >= sm) */}
      {/* ========================================================================= */}
      <div className="hidden sm:flex w-full overflow-x-auto no-scrollbar touch-scroll px-4 sm:px-6 lg:px-8 py-2.5 items-center gap-2.5 whitespace-nowrap">
        
        {/* 1. Buscador */}
        <div className="relative w-52 sm:w-60 md:w-68 flex-shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar actividades..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white/95 border border-slate-300/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Separador */}
        <div className="h-5 w-[1px] bg-slate-300 flex-shrink-0" />

        {/* 2. Filtro: Tetramestre */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedTetra}
            onChange={(e) => {
              setSelectedTetra(e.target.value);
              setSelectedSubject('all');
            }}
            className="px-2.5 py-1.5 bg-white/95 border border-slate-300/90 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          >
            <option value="all">Todos los Tetras ({academicStructure.length})</option>
            {academicStructure.map((tetra) => (
              <option key={tetra.id} value={tetra.id}>
                {tetra.name} ({tetra.subjects?.length || 0} mat.)
              </option>
            ))}
          </select>
        </div>

        {/* 3. Filtro: Materia */}
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-2.5 py-1.5 bg-white/95 border border-slate-300/90 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs flex-shrink-0"
        >
          <option value="all">
            {selectedTetra !== 'all' ? 'Todas las Materias del Tetra' : 'Todas las Materias'}
          </option>
          {uniqueSubjectNames.map((subjName) => (
            <option key={subjName} value={subjName}>
              {subjName}
            </option>
          ))}
        </select>

        {/* 4. Filtro: Estado */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-2.5 py-1.5 bg-white/95 border border-slate-300/90 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs flex-shrink-0"
        >
          <option value="all">Todas las Actividades</option>
          <option value="pending">⏳ Pendientes</option>
          <option value="in_progress">🚀 En Progreso</option>
          <option value="completed">✅ Completadas por mí</option>
        </select>

        {/* Botón Limpiar Filtros */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-700 hover:text-rose-700 hover:bg-rose-100/80 rounded-xl transition font-bold border border-slate-300/60 text-xs flex-shrink-0"
          >
            <X className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        )}

        {/* Espaciador flexible */}
        <div className="flex-1 min-w-2" />

        {/* Separador */}
        <div className="h-5 w-[1px] bg-slate-300 flex-shrink-0" />

        {/* Selector de Vistas Desktop */}
        <div className="flex items-center space-x-0.5 bg-slate-300/80 p-0.5 rounded-xl border border-slate-300 shadow-inner flex-shrink-0">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              viewMode === 'kanban'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/40'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Tablero</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              viewMode === 'list'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/40'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Lista</span>
          </button>

          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              viewMode === 'calendar'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/40'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendario</span>
          </button>
        </div>

        {/* Botón Configuración sin etiqueta (A la derecha del selector de vista) */}
        {onOpenConfigModal && (
          <button
            type="button"
            onClick={onOpenConfigModal}
            title={isAdmin ? "Configuración y Administración de Usuarios" : "Configuración y Ajustes"}
            className="p-2 rounded-xl text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition active:scale-95 flex-shrink-0 cursor-pointer"
          >
            <Settings className={`w-4 h-4 ${isAdmin ? 'text-indigo-600' : 'text-slate-600'}`} />
          </button>
        )}

        {/* Botón Nueva Actividad (Solo Admin en Ribbon) */}
        {isAdmin && onOpenNewActivity && (
          <button
            onClick={onOpenNewActivity}
            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 border border-blue-400/40 transition hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Actividad</span>
          </button>
        )}

      </div>
    </div>
  );
};

export default ActivityFilters;
