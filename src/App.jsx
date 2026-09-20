import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  BookOpen, 
  Loader2, 
  Share2, 
  Lock, 
  Unlock, 
  CheckCircle, 
  Info, 
  Layers, 
  Sparkles
} from 'lucide-react';
import { parseISO, isPast } from 'date-fns';

import { useAuth } from './context/AuthContext';
import { 
  initSync, 
  createActivityWithSync, 
  updateActivityWithSync, 
  deleteActivityWithSync, 
  updateActivityStatusWithSync,
  saveAcademicStructureWithSync
} from './services/syncService';
import { 
  subscribeToStudentCompletions, 
  saveStudentCompletion,
  confirmUserNotificationReceipt,
  subscribeToAdminNotifications
} from './services/userService';
import confetti from 'canvas-confetti';
import { 
  onForegroundMessage,
  checkAndTriggerLocalDueReminders,
  notifyNewActivityLocal,
  emitLocalNotification
} from './services/notificationService';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './services/firebase';
import { compareActivitiesByDueDate } from './utils/dateUtils';

import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AuthScreen from './components/AuthScreen';
import ActivityModal from './components/ActivityModal';
import ActivityDetailsModal from './components/ActivityDetailsModal';
import ActivityFilters from './components/ActivityFilters';
import ConfigModal from './components/ConfigModal';
import ResourcesModal from './components/ResourcesModal';
import KanbanView from './components/KanbanView';
import ListView from './components/ListView';
import CalendarView from './components/CalendarView';
import FirebaseStatusBanner from './components/FirebaseStatusBanner';
import InAppNotificationBanner from './components/InAppNotificationBanner';
import NotificationActivationReminder from './components/NotificationActivationReminder';
import OnboardingScreen from './components/OnboardingScreen';
import NotificationDrawer from './components/NotificationDrawer';

export function App() {
  const { currentUser, isEditor, isAdmin, isStudent, loading: authLoading } = useAuth();

  // Estado de Datos (Sincronizado IndexedDB + Firestore Meta)
  const [activities, setActivities] = useState([]);
  const [academicStructure, setAcademicStructure] = useState([]);
  const [studentCompletions, setStudentCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ isCached: true, stats: null });

  // Estados de Filtros y Vistas
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTetra, setSelectedTetra] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban', 'list', 'calendar'

  // Estados de Modales
  const [authModalState, setAuthModalState] = useState({ isOpen: false, mode: 'login', message: '' });
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [resourcesModalOpen, setResourcesModalOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  const handleSelectActivityFromNotification = (activityId) => {
    const found = activities.find(a => a.id === activityId);
    if (found) {
      if (configModalOpen) {
        setConfigModalOpen(false);
      }
      handleViewDetails(found);
    }
  };

  // Onboarding PWA: mostrar SIEMPRE que el usuario abra en el navegador (no como PWA instalada)
  const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(navigator.userAgent);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (!isMobileDevice) return false;
    const isInstalledPWA = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;
    const hasNotifications = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    // Si ya está instalada como PWA Y tiene notificaciones → no molestar
    if (isInstalledPWA && hasNotifications) return false;
    // En cualquier otro caso (navegador, sin notificaciones) → mostrar siempre
    return true;
  });

  // 1. Inicializar sincronización delta inteligente SOLO para usuarios autenticados
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    setFirebaseError(null);

    const unsubscribe = initSync(
      ({ activities: syncedActivities, academicStructure: syncedStructure, isFromCache, deltaStats, newlyAddedActivities }) => {
        setActivities(syncedActivities || []);
        setAcademicStructure(syncedStructure || []);
        setSyncStatus({ isCached: isFromCache, stats: deltaStats });
        setLoading(false);

        // Notificar en tiempo real si otro usuario publica una nueva actividad con la app abierta
        if (newlyAddedActivities && newlyAddedActivities.length > 0) {
          newlyAddedActivities.forEach((act) => {
            if (act.createdById !== currentUser.uid) {
              notifyNewActivityLocal(act);
            }
          });
        }
      },
      (err) => {
        console.error('Error en sincronización:', err);
        setFirebaseError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Suscribirse a las tareas completadas por el usuario (progreso personal para todos los roles)
  useEffect(() => {
    if (!currentUser) {
      setStudentCompletions({});
      return;
    }

    const unsubscribe = subscribeToStudentCompletions(currentUser.uid, (completionsMap) => {
      setStudentCompletions(completionsMap || {});
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Comprobar recordatorios locales de vencimiento (al abrir la app, 1 sola vez al día por dispositivo)
  useEffect(() => {
    if (!currentUser || activities.length === 0) return;

    // Comprobación al cargar actividades (controlado por localStorage para no repetir en el mismo día)
    checkAndTriggerLocalDueReminders(activities, studentCompletions, isStudent, false);
  }, [currentUser, activities, studentCompletions, isStudent]);

  // 4. Escuchar notificaciones en primer plano
  useEffect(() => {
    if (!currentUser) return;
    let unsubscribe = () => {};
    onForegroundMessage((payload) => {
      console.log('Notificación recibida en primer plano:', payload);
    }).then(unsub => {
      if (typeof unsub === 'function') unsubscribe = unsub;
    }).catch(() => {});

    return () => unsubscribe();
  }, [currentUser]);

  // 5. Escuchar difusiones remotas desde el backend (broadcast_notifications en Firestore)
  useEffect(() => {
    if (!currentUser) return;

    // Registrar el momento exacto en que se inicia el listener.
    // Solo se procesarán documentos cuyo createdAt sea POSTERIOR a este momento.
    // Esto evita mostrar notificaciones antiguas al (re)abrir la app.
    const listenerStartTime = new Date().toISOString();
    console.log('[BroadcastListener] Iniciado. Solo se mostrarán notificaciones creadas después de:', listenerStartTime);

    const q = query(collection(db, 'broadcast_notifications'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const docCreatedAt = data.createdAt || '';

          // Ignorar documentos que existían antes de que iniciara el listener
          if (docCreatedAt <= listenerStartTime) {
            console.log('[BroadcastListener] Ignorando doc antiguo:', docCreatedAt);
            return;
          }

          console.log('[BroadcastListener] ✅ Nueva notificación remota recibida:', data.title);
          emitLocalNotification(data.title || '🔔 UCNL Actividades', {
            body: data.body || '',
            tag: `broadcast_${change.doc.id}`,
            data: { url: data.url || '/' }
          });
        }
      });
    }, (err) => {
      console.warn('[BroadcastListener] Error en listener:', err.message);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 6. Manejar confirmación de notificación si el usuario abrió desde la notificación push o enlace
  useEffect(() => {
    if (!currentUser) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'confirm_notification' || urlParams.get('confirm') === 'true') {
      confirmUserNotificationReceipt(currentUser.uid).then(() => {
        emitLocalNotification('🎉 ¡Notificación Confirmada!', {
          body: 'Se ha registrado tu confirmación exitosamente. Tus profesores y administradores pueden ver que estás al día.',
          tag: 'confirm_success'
        });
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.25 } });
        } catch (_) {}
      });
      // Limpiar URL sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser]);

  // 7. Escuchar notificaciones de administración en tiempo real (Nuevos usuarios registrados)
  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    const listenerStartTime = new Date().toISOString();
    console.log('[AdminNotificationsListener] Iniciado para admin:', currentUser.email);

    const unsubscribe = subscribeToAdminNotifications((notifs) => {
      notifs.forEach((notif) => {
        const notifCreatedAt = notif.createdAt || '';
        if (notifCreatedAt > listenerStartTime && !notif.read) {
          console.log('[AdminNotificationsListener] ✅ Nueva notificación de administración recibida:', notif.title);
          emitLocalNotification(notif.title || '👤 Nuevo Usuario Registrado', {
            body: notif.message || notif.body || 'Un nuevo usuario se ha registrado en la plataforma.',
            tag: `admin_notif_${notif.id}`,
            data: { url: '/', type: notif.type || 'new_user' }
          });
        }
      });
    }, (err) => {
      console.warn('[AdminNotificationsListener] Error en listener de admin:', err);
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin]);


  const handleSetPersonalStatus = async (activityId, status) => {
    if (!currentUser) return;

    // Actualización optimista
    setStudentCompletions(prev => {
      const next = { ...prev };
      if (status === 'pending') {
        delete next[activityId];
      } else {
        next[activityId] = status;
      }
      return next;
    });

    await saveStudentCompletion(currentUser.uid, activityId, status);
  };

  const handleToggleStudentCompletion = async (activityId) => {
    if (!currentUser) return;
    const currentStatus = studentCompletions[activityId] || 'pending';
    const nextStatus = (currentStatus === 'completed' || currentStatus === true) ? 'pending' : 'completed';
    await handleSetPersonalStatus(activityId, nextStatus);
  };

  // Abrir Modal de Autenticación
  const handleOpenAuth = (mode = 'login', message = '') => {
    setAuthModalState({ isOpen: true, mode, message });
  };

  // Abrir Modal de Creación / Edición (Solo Admin)
  const handleOpenNewActivity = (presetDate = null) => {
    if (!isAdmin) return;
    setActivityToEdit(presetDate ? { dueDate: presetDate.toISOString() } : null);
    setActivityModalOpen(true);
  };

  const handleEditActivity = (activity) => {
    if (!isEditor) return;
    setActivityToEdit(activity);
    setActivityModalOpen(true);
  };

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setDetailsModalOpen(true);
  };

  const handleOpenConfig = () => {
    setConfigModalOpen(true);
  };

  // Operaciones CRUD con sincronización delta (Docentes y Admins)
  const handleSaveActivity = async (activityData) => {
    if (activityToEdit && activityToEdit.id) {
      const updated = await updateActivityWithSync(activityToEdit.id, activityData);
      setActivities(prev => prev.map(a => a.id === updated.id ? updated : a));
      if (selectedActivity && selectedActivity.id === updated.id) {
        setSelectedActivity(updated);
      }
    } else {
      const created = await createActivityWithSync(activityData, currentUser);
      setActivities(prev => [created, ...prev]);
    }
  };

  const handleDeleteActivity = async (activity) => {
    if (!window.confirm(`¿Estás seguro de eliminar la actividad "${activity.title}" y todos sus documentos adjuntos?`)) {
      return;
    }
    try {
      await deleteActivityWithSync(activity);
      setActivities(prev => prev.filter(a => a.id !== activity.id));
      if (detailsModalOpen && selectedActivity?.id === activity.id) {
        setDetailsModalOpen(false);
      }
    } catch (err) {
      console.error('Error al eliminar actividad:', err);
      alert('No se pudo eliminar la actividad. Comprueba tus permisos.');
    }
  };

  const handleSaveAcademicStructure = async (newStructure) => {
    await saveAcademicStructureWithSync(newStructure);
    setAcademicStructure(newStructure);
  };

  // Filtrado y Ordenamiento de Actividades (Las más próximas arriba, las más lejanas abajo)
  // 1. Filtrado para Vistas que muestran todas las columnas de estado (como Kanban)
  const searchAndStructureFilteredActivities = activities
    .filter((act) => {
      // 1. Filtro por Tetramestre (por ID o por nombre)
      if (selectedTetra !== 'all') {
        const matchId = act.tetraId === selectedTetra;
        const targetTetra = academicStructure.find(t => t.id === selectedTetra);
        const matchName = targetTetra && act.tetraName === targetTetra.name;
        if (!matchId && !matchName) return false;
      }

      // 2. Filtro por Búsqueda de Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (act.title || '').toLowerCase().includes(q);
        const matchSubject = (act.subject || '').toLowerCase().includes(q);
        const matchTetra = (act.tetraName || '').toLowerCase().includes(q);
        const matchTeacher = (act.teacher || '').toLowerCase().includes(q);
        const matchDesc = (act.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchTeacher && !matchDesc && !matchTetra) return false;
      }

      // 3. Filtro por Materia
      if (selectedSubject !== 'all' && act.subject !== selectedSubject) {
        return false;
      }

      return true;
    })
    .sort(compareActivitiesByDueDate);

  // 2. Filtrado adicional por Estado (para Lista y Calendario)
  const filteredActivities = searchAndStructureFilteredActivities.filter((act) => {
    if (selectedStatus !== 'all') {
      const userStatus = studentCompletions[act.id] || 'pending';
      const isCompleted = userStatus === 'completed' || userStatus === true;
      const isInProgress = userStatus === 'in_progress';
      const isPending = !isInProgress && !isCompleted;

      if (selectedStatus === 'pending' && !isPending) return false;
      if (selectedStatus === 'in_progress' && !isInProgress) return false;
      if (selectedStatus === 'completed' && !isCompleted) return false;
    }
    return true;
  });

  const hasActiveFilters = 
    searchQuery.trim() !== '' || 
    selectedTetra !== 'all' ||
    selectedSubject !== 'all' || 
    selectedStatus !== 'pending';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTetra('all');
    setSelectedSubject('all');
    setSelectedStatus('pending');
  };

  // --- CANCELACIÓN TOTAL DE USO ANÓNIMO ---
  // Si Firebase Auth está cargando
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-white text-sm font-semibold tracking-wide">Iniciando portal seguro UCNL...</p>
      </div>
    );
  }

  // Si no hay usuario autenticado, renderizar directamente la pantalla de inicio de sesión obligatoria
  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="h-screen max-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* Barra de Navegación Principal (Estilo Barra de Título Windows) */}
      <Navbar 
        onOpenAuthModal={handleOpenAuth} 
        onOpenConfigModal={handleOpenConfig}
        onOpenResourcesModal={() => setResourcesModalOpen(true)}
        onOpenNotificationDrawer={() => setNotificationDrawerOpen(true)}
      />

      {/* Recordatorio destacado de activación de notificaciones */}
      <NotificationActivationReminder />

      {/* Banner de Filtros con Fondo Cromado en 1 Sola Fila Pegado al Encabezado (Oculto cuando ConfigModal está activo) */}
      <div className={configModalOpen ? 'hidden' : 'block'}>
        <ActivityFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTetra={selectedTetra}
          setSelectedTetra={setSelectedTetra}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          viewMode={viewMode}
          setViewMode={setViewMode}
          academicStructure={academicStructure}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          onOpenNewActivity={isAdmin ? () => handleOpenNewActivity() : null}
          onOpenConfigModal={handleOpenConfig}
          onOpenResourcesModal={() => setResourcesModalOpen(true)}
          onOpenAuthModal={handleOpenAuth}
          onOpenNotificationDrawer={() => setNotificationDrawerOpen(true)}
        />
      </div>

      {/* Vista de Configuración a pantalla completa (a la altura del ribbon) o Contenedor Principal Dividido */}
      {configModalOpen ? (
        <ConfigModal
          isOpen={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          academicStructure={academicStructure}
          onSaveStructure={handleSaveAcademicStructure}
          isAdmin={isAdmin}
          currentUser={currentUser}
        />
      ) : (
        /* Contenedor Dividido: Área Principal + Panel Lateral Derecho (Empuja el contenido en Desktop) */
        <div className="flex-1 flex flex-row items-stretch w-full overflow-hidden min-h-0 relative">
          
          {/* Contenido Principal (Kanban / Lista / Calendario) */}
          <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col h-full overflow-hidden min-h-0 transition-all duration-300">
            
            {/* Banner de Diagnóstico / Firebase si ocurre un error */}
            {firebaseError && (
              <FirebaseStatusBanner 
                error={firebaseError} 
                onDismiss={() => setFirebaseError(null)} 
              />
            )}

            {/* Vistas Principales */}
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-500">Cargando actividades escolares desde IndexedDB / Firebase...</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
                {viewMode === 'kanban' && (
                  <KanbanView
                    activities={searchAndStructureFilteredActivities}
                    selectedStatus={selectedStatus}
                    onViewDetails={handleViewDetails}
                    onEdit={handleEditActivity}
                    onDelete={handleDeleteActivity}
                    onOpenNewActivity={isAdmin ? () => handleOpenNewActivity() : null}
                    studentCompletions={studentCompletions}
                    onToggleStudentCompletion={handleToggleStudentCompletion}
                    onSetPersonalStatus={handleSetPersonalStatus}
                    selectedActivity={selectedActivity}
                  />
                )}

                {viewMode === 'list' && (
                  <ListView
                    activities={filteredActivities}
                    onViewDetails={handleViewDetails}
                    onEdit={handleEditActivity}
                    onDelete={handleDeleteActivity}
                    onOpenNewActivity={isAdmin ? () => handleOpenNewActivity() : null}
                    studentCompletions={studentCompletions}
                    onToggleStudentCompletion={handleToggleStudentCompletion}
                    onSetPersonalStatus={handleSetPersonalStatus}
                    selectedActivity={selectedActivity}
                  />
                )}

                {viewMode === 'calendar' && (
                  <CalendarView
                    activities={filteredActivities}
                    onViewDetails={handleViewDetails}
                    onOpenNewActivity={isAdmin ? (date) => handleOpenNewActivity(date) : null}
                    studentCompletions={studentCompletions}
                    selectedActivity={selectedActivity}
                  />
                )}
              </div>
            )}

          </main>

          {/* Panel Lateral Derecho de Actividad: En Desktop empuja el contenido y topa debajo del ribbon. En móvil ocupa toda la pantalla */}
          {detailsModalOpen && selectedActivity && (
            <ActivityDetailsModal
              isOpen={detailsModalOpen}
              onClose={() => {
                setDetailsModalOpen(false);
                setSelectedActivity(null);
              }}
              activity={selectedActivity}
              onEdit={handleEditActivity}
              onDelete={handleDeleteActivity}
              personalStatus={selectedActivity ? (studentCompletions[selectedActivity.id] || 'pending') : 'pending'}
              onSetPersonalStatus={handleSetPersonalStatus}
              onToggleStudentCompletion={handleToggleStudentCompletion}
            />
          )}

        </div>
      )}

      {/* Modal Crear / Editar Actividad */}
      {activityModalOpen && (
        <ActivityModal
          isOpen={activityModalOpen}
          onClose={() => {
            setActivityModalOpen(false);
            setActivityToEdit(null);
          }}
          onSave={handleSaveActivity}
          activityToEdit={activityToEdit}
          academicStructure={academicStructure}
        />
      )}

      {/* Modal de Recursos y Enlaces Institucionales */}
      {resourcesModalOpen && (
        <ResourcesModal
          isOpen={resourcesModalOpen}
          onClose={() => setResourcesModalOpen(false)}
          isAdmin={isAdmin}
          isEditor={isEditor}
          currentUser={currentUser}
        />
      )}

      {/* Modal de Autenticación */}
      {authModalState.isOpen && (
        <AuthModal
          isOpen={authModalState.isOpen}
          onClose={() => setAuthModalState({ isOpen: false, mode: 'login', message: '' })}
          initialMode={authModalState.mode}
          customMessage={authModalState.message}
        />
      )}

      {/* Panel de Notificaciones: Superior y por encima de todo */}
      {notificationDrawerOpen && (
        <NotificationDrawer
          isOpen={notificationDrawerOpen}
          onClose={() => setNotificationDrawerOpen(false)}
          onSelectActivity={handleSelectActivityFromNotification}
        />
      )}

      {/* Banner de Notificaciones Visuales en Pantalla (Toasts) */}
      <InAppNotificationBanner />

      {/* Onboarding PWA: instalar app + activar notificaciones (solo móvil, solo primera vez) */}
      {showOnboarding && (
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      )}

    </div>
  );
}

export default App;
