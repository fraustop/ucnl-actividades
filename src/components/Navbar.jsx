import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  LogIn, 
  LogOut, 
  User, 
  ShieldCheck, 
  Settings, 
  Download, 
  Bell, 
  BellRing, 
  BookOpen, 
  FolderOpen,
  Maximize2,
  Minimize2,
  Move
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { onInstallStateChange, promptPwaInstallation } from '../services/pwaService';
import { 
  getNotificationPermission, 
  requestNotificationPermissionAndToken,
  areNotificationsSupported,
  emitLocalNotification
} from '../services/notificationService';
import NotificationBellButton from './NotificationBellButton';

export const Navbar = ({ 
  onOpenAuthModal, 
  onOpenConfigModal, 
  onOpenResourcesModal,
  onOpenNotificationDrawer
}) => {
  const { currentUser, userProfile, isEditor, isAdmin, isDocente, isStudent, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gestureNotice, setGestureNotice] = useState(null);

  const headerRef = useRef(null);
  const touchStartRef = useRef(null);
  const pointerDragRef = useRef(null);
  const noticeTimeoutRef = useRef(null);

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
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  const showGestureFeedback = (msg) => {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    setGestureNotice(msg);
    noticeTimeoutRef.current = setTimeout(() => {
      setGestureNotice(null);
    }, 2200);
  };

  const handleInstallPwa = async () => {
    await promptPwaInstallation();
  };

  const handleToggleNotifications = async () => {
    if (!currentUser) return;
    setEnablingNotifications(true);
    try {
      await requestNotificationPermissionAndToken(currentUser);
      const perm = getNotificationPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        await emitLocalNotification('🔔 ¡Notificaciones Activadas!', {
          body: 'Tu dispositivo ahora recibirá recordatorios de entregas y nuevas actividades.',
          tag: 'welcome_notification'
        });
      }
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
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleConfigClick = () => {
    if (isEditor) {
      onOpenConfigModal();
    }
  };

  // --- GESTOS Y CONTROLES DE VENTANA (PWA & Desktop) ---
  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        showGestureFeedback('Ventana restaurada');
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
        showGestureFeedback('Ventana maximizada / Pantalla completa');
      }
    } catch (err) {
      console.warn('Error al alternar pantalla completa:', err);
    }
  };

  // Doble clic / doble toque en el encabezado (emulación nativa de Windows titlebar)
  const handleTitlebarDoubleClick = (e) => {
    if (e.target.closest('.pwa-no-drag, button, a, input, select')) return;
    toggleFullscreen();
  };

  // Soporte de arrastre de ventana por puntero (en entornos PWA / ventanas que permitan window.moveBy)
  const handlePointerDown = (e) => {
    if (e.target.closest('.pwa-no-drag, button, a, input, select')) return;
    pointerDragRef.current = {
      startX: e.screenX,
      startY: e.screenY,
      time: Date.now()
    };
  };

  const handlePointerMove = (e) => {
    if (!pointerDragRef.current || e.buttons !== 1) return;
    const dx = e.screenX - pointerDragRef.current.startX;
    const dy = e.screenY - pointerDragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      try {
        if (typeof window.moveBy === 'function') {
          window.moveBy(dx, dy);
        }
      } catch {}
      pointerDragRef.current.startX = e.screenX;
      pointerDragRef.current.startY = e.screenY;
    }
  };

  const handlePointerUp = () => {
    pointerDragRef.current = null;
  };

  // Soporte de gestos táctiles en el encabezado (Swipe Arriba = Maximizar, Swipe Abajo = Restaurar)
  const handleTouchStart = (e) => {
    if (e.target.closest('.pwa-no-drag, button, a, input, select')) return;
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    } else if (e.touches.length === 2) {
      // Gesto de 2 dedos (pellizco / resize)
      showGestureFeedback('Gesto de redimensionamiento detectado');
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (touch) {
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaTime = Date.now() - touchStartRef.current.time;

      if (deltaTime < 500 && Math.abs(deltaY) > 35 && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY < 0 && !document.fullscreenElement) {
          toggleFullscreen();
        } else if (deltaY > 0 && document.fullscreenElement) {
          toggleFullscreen();
        }
      }
    }
    touchStartRef.current = null;
  };

  const handleCloseWindow = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      showGestureFeedback('Modo pantalla completa cerrado');
      return;
    }
    try {
      window.close();
    } catch {}
    showGestureFeedback('Para cerrar la ventana, usa el control de tu sistema');
  };

  return (
    <header 
      ref={headerRef}
      onDoubleClick={handleTitlebarDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      title="Barra de Título: Doble clic para maximizar/restaurar | Arrastra para mover"
      className="hidden sm:block sticky top-0 z-[80] windows-titlebar-chrome w-full pwa-header-bar pwa-draggable-header flex-shrink-0 cursor-default select-none text-white transition-all overflow-visible"
    >
      <div className="w-full flex items-center justify-between h-8 pwa-header-container">
        
        {/* Lado Izquierdo: Logo y Nombre Institucional estilo Barra de Título Windows */}
        <div className="flex items-center space-x-2 flex-shrink-0 pl-1">
          <div className="w-4.5 h-4.5 rounded-md bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-2xs flex-shrink-0">
            <GraduationCap className="w-3 h-3" />
          </div>
          
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-[11px] sm:text-xs tracking-tight text-white/95 drop-shadow-xs">
              UCNL
            </span>
            <span className="text-[9px] px-1 py-0.2 font-bold uppercase tracking-wider rounded bg-blue-500/25 text-blue-200 border border-blue-400/30">
              Actividades
            </span>
          </div>

          {/* Indicador de Rol compacto estilo Windows */}
          <div className="hidden lg:flex items-center ml-1">
            {isAdmin ? (
              <div className="flex items-center space-x-1 px-1.5 py-0.2 text-[9px] font-bold bg-indigo-500/25 text-indigo-200 rounded-full border border-indigo-400/30 shadow-2xs">
                <ShieldCheck className="w-2.5 h-2.5 text-indigo-300" />
                <span>Administrador</span>
              </div>
            ) : isDocente ? (
              <div className="flex items-center space-x-1 px-1.5 py-0.2 text-[9px] font-bold bg-blue-500/25 text-blue-200 rounded-full border border-blue-400/30 shadow-2xs">
                <ShieldCheck className="w-2.5 h-2.5 text-blue-300" />
                <span>Docente</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/25 text-emerald-200 rounded-full border border-emerald-400/30 shadow-2xs">
                <BookOpen className="w-2.5 h-2.5 text-emerald-300" />
                <span>Estudiante</span>
              </div>
            )}
          </div>
        </div>

        {/* Feedback de gestos en vivo */}
        {gestureNotice && (
          <div className="hidden md:flex items-center space-x-1 px-2 py-0.2 text-[9px] font-semibold bg-blue-600/90 text-white rounded-full shadow-xs border border-blue-400/40 animate-pulse">
            <Move className="w-2.5 h-2.5" />
            <span>{gestureNotice}</span>
          </div>
        )}

        {/* Lado Derecho: Acciones de la Barra de Título + Botones Nativos/Estilo Windows */}
        <div className="flex items-center h-full flex-shrink-0">
          
          {/* Botones de acción dentro de la barra de título */}
          <div className="flex items-center space-x-1 pr-1.5 sm:pr-2 pwa-no-drag">
            
            {/* Campanita de Notificaciones con Contador y Panel Lateral */}
            <NotificationBellButton
              onClick={onOpenNotificationDrawer}
              className="h-[22px] w-[22px] rounded text-xs border border-white/15 bg-white/10 hover:bg-white/20 text-slate-100 hover:text-white"
              iconSize="w-3 h-3 text-slate-200"
              title="Centro de notificaciones"
            />

            {/* Botón Instalar PWA */}
            {canInstallPwa && (
              <button
                onClick={handleInstallPwa}
                title="Instalar UCNL Actividades como aplicación en tu dispositivo"
                className="inline-flex items-center justify-center space-x-1 h-[22px] px-1.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-2xs transition active:scale-95 flex-shrink-0"
              >
                <Download className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Instalar</span>
              </button>
            )}

            {/* Botón Recursos */}
            <button
              onClick={onOpenResourcesModal}
              title="Biblioteca de recursos, formatos y enlaces institucionales"
              className="inline-flex items-center justify-center space-x-1 h-[22px] px-2 rounded text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 transition shadow-2xs active:scale-95 flex-shrink-0"
            >
              <FolderOpen className="w-3 h-3 text-blue-300" />
              <span className="hidden sm:inline">Recursos</span>
            </button>

            {/* Botón Configuración (Solo Docente y Admin) */}
            {isEditor && (
              <button
                onClick={handleConfigClick}
                title={isAdmin ? "Configuración y Administración de Usuarios" : "Configuración de Tetramestres y Materias"}
                className={`inline-flex items-center justify-center space-x-1 h-[22px] px-2 rounded text-[10px] font-semibold transition shadow-2xs border flex-shrink-0 active:scale-95 ${
                  isAdmin 
                    ? 'bg-indigo-500/25 hover:bg-indigo-500/35 text-indigo-200 border-indigo-400/40' 
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                }`}
              >
                <Settings className={`w-3 h-3 ${isAdmin ? 'text-indigo-300' : 'text-slate-300'}`} />
                <span className="hidden sm:inline">Ajustes</span>
              </button>
            )}

            {/* Usuario / Autenticación */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-1.5 h-[22px] px-1.5 rounded border border-white/15 bg-white/10 hover:bg-white/20 transition text-slate-100 text-xs font-medium active:scale-95"
                >
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[8px] uppercase shadow-2xs text-white flex-shrink-0 ${
                    isAdmin 
                      ? 'bg-gradient-to-tr from-indigo-500 to-purple-500' 
                      : isStudent
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-500'
                      : 'bg-gradient-to-tr from-blue-500 to-indigo-400'
                  }`}>
                    {currentUser.displayName ? currentUser.displayName[0] : (currentUser.email ? currentUser.email[0] : 'U')}
                  </div>
                  <span className="hidden md:block max-w-[90px] truncate text-slate-100 text-[10px] font-semibold">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </button>

                {/* Dropdown de usuario */}
                {showUserMenu && (
                  <>
                    {/* Backdrop invisible para cerrar al hacer clic afuera */}
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => setShowUserMenu(false)} 
                    />
                    <div 
                      className="absolute right-0 mt-1.5 w-60 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-900 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="text-[11px] text-slate-400 font-medium">Conectado como</p>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.displayName || 'Usuario'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentUser.email}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {isAdmin ? (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Rol: Administrador
                          </span>
                        ) : isDocente ? (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                            Rol: Docente / Tutor
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Rol: Estudiante
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-1 space-y-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          if (onOpenResourcesModal) onOpenResourcesModal();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-blue-700 bg-blue-50/50 hover:bg-blue-100 rounded-xl transition font-semibold text-left"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Recursos y Enlaces</span>
                      </button>

                      {canInstallPwa && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleInstallPwa();
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-amber-700 bg-amber-50/70 hover:bg-amber-100 rounded-xl transition font-bold text-left"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-600" />
                          <span>Instalar Aplicación PWA</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenConfigModal();
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-indigo-700 hover:bg-indigo-50 rounded-xl transition font-semibold text-left"
                        >
                          <Settings className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Panel de Usuarios</span>
                        </button>
                      )}

                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition font-medium text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            ) : (
              <button
                onClick={() => onOpenAuthModal('login')}
                className="inline-flex items-center justify-center space-x-1 h-[22px] px-2 rounded text-[11px] font-semibold bg-white/20 hover:bg-white/30 text-white shadow-2xs transition"
              >
                <LogIn className="w-3 h-3" />
                <span>Entrar</span>
              </button>
            )}

          </div>

          {/* Botones de Control de Ventana de Windows (Minimizar, Maximizar/Restaurar, Cerrar) */}
          <div className="windows-caption-buttons flex items-center h-full pwa-no-drag">
            {/* 1. Minimizar */}
            <button
              onClick={() => showGestureFeedback('Minimizar ventana')}
              title="Minimizar"
              className="win-caption-btn"
            >
              <svg width="10" height="1" viewBox="0 0 10 1">
                <rect width="10" height="1" fill="currentColor" />
              </svg>
            </button>

            {/* 2. Maximizar / Restaurar (Misma altura y diseño de Windows) */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Restaurar tamaño de ventana" : "Maximizar"}
              className="win-caption-btn"
            >
              {isFullscreen ? (
                /* Icono Restaurar (2 rectángulos superpuestos) */
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
                  <path strokeWidth="1" d="M3 1.5h5.5v5.5H3z" />
                  <path strokeWidth="1" d="M1.5 3.5h5.5v5.5H1.5z" />
                </svg>
              ) : (
                /* Icono Maximizar (1 rectángulo) */
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
                  <rect x="1" y="1" width="8" height="8" strokeWidth="1" />
                </svg>
              )}
            </button>

            {/* 3. Cerrar (Hover en rojo característico de Windows) */}
            <button
              onClick={handleCloseWindow}
              title="Cerrar"
              className="win-caption-btn win-caption-close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
                <path strokeWidth="1.1" d="M1 1l8 8M9 1L1 9" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;

