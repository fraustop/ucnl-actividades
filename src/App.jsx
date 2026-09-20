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
import { 
  getInitialNavigationState, 
  saveNavigationState, 
  DEFAULT_NAV_STATE, 
  hashToNavState 
} from './services/navigationService';

import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AuthScreen from './components/AuthScreen';
import ActivityModal from './components/ActivityModal';
import ActivityDetailsModal from './components/ActivityDetailsModal';
import ActivityWorkspaceModal from './components/ActivityWorkspaceModal';
import ActivityFilters from './components/ActivityFilters';
import ConfigModal from './components/ConfigModal';
import KanbanView from './components/KanbanView';
import ListView from './components/ListView';
import CalendarView from './components/CalendarView';
import FirebaseStatusBanner from './components/FirebaseStatusBanner';
import InAppNotificationBanner from './components/InAppNotificationBanner';
import NotificationActivationReminder from './components/NotificationActivationReminder';
import OnboardingScreen from './components/OnboardingScreen';
import NotificationDrawer from './components/NotificationDrawer';
import AppTutorial from './components/AppTutorial';

const isTutorialRequested = () => {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('tuto') || searchParams.has('tutorial')) return true;
  const hash = window.location.hash || '';
  if (hash.includes('tuto') || hash.includes('tutorial')) return true;
  return false;
};

export function App() {
  const { currentUser, isEditor, isAdmin, isStudent, loading: authLoading } = useAuth();

  // Estado Inicial Restaurado desde localStorage o URL Hash
  const initialNav = getInitialNavigationState();

  // Estado de Datos (Sincronizado IndexedDB + Firestore Meta)
  const [activities, setActivities] = useState([]);
  const [academicStructure, setAcademicStructure] = useState([]);
  const [studentCompletions, setStudentCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ isCached: true, stats: null });

  // Estados de Filtros y Vistas (Persistidos en localStorage y URL)
  const [searchQuery, setSearchQuery] = useState(initialNav.searchQuery || '');
  const [selectedTetra, setSelectedTetra] = useState(initialNav.selectedTetra || 'all');
  const [selectedSubject, setSelectedSubject] = useState(initialNav.selectedSubject || 'all');
  const [selectedStatus, setSelectedStatus] = useState(initialNav.selectedStatus || 'pending');
  const [viewMode, setViewMode] = useState(initialNav.viewMode || 'kanban'); // 'kanban', 'list', 'calendar'

  // Estados de Modales y Paneles (Sincronizados con el Historial del Navegador)
  const [authModalState, setAuthModalState] = useState({ isOpen: false, mode: 'login', message: '' });
  const [activityModalOpen, setActivityModalOpen] = useState(initialNav.modal === 'new_activity');
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(initialNav.activityId || null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(initialNav.modal === 'activity_details');
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(initialNav.modal === 'workspace' || initialNav.modal === 'resources');
  const [workspaceActivity, setWorkspaceActivity] = useState(null);
  const [configModalOpen, setConfigModalOpen] = useState(initialNav.modal === 'config');
  const [configModalTab, setConfigModalTab] = useState(initialNav.configTab || 'tetras');
  const [resourcesModalOpen, setResourcesModalOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(initialNav.modal === 'notifications');
  const [showTutorial, setShowTutorial] = useState(() => isTutorialRequested());

  // Escuchar cambios en la URL (por ejemplo si el usuario escribe ?tuto o navega atrás/adelante)
  useEffect(() => {
    const checkTutoUrl = () => {
      setShowTutorial(isTutorialRequested());
    };
    window.addEventListener('popstate', checkTutoUrl);
    window.addEventListener('hashchange', checkTutoUrl);
    return () => {
      window.removeEventListener('popstate', checkTutoUrl);
      window.removeEventListener('hashchange', checkTutoUrl);
    };
  }, []);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('tuto');
      url.searchParams.delete('tutorial');
      let newHash = url.hash;
      if (newHash.includes('tuto') || newHash.includes('tutorial')) {
        newHash = '#/kanban';
      }
      const searchPart = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
      window.history.replaceState({}, document.title, url.pathname + searchPart + newHash);
    }
  };

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
  const [completionsLoaded, setCompletionsLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setStudentCompletions({});
      setCompletionsLoaded(false);
      return;
    }

    const unsubscribe = subscribeToStudentCompletions(currentUser.uid, (completionsMap) => {
      setStudentCompletions(completionsMap || {});
      setCompletionsLoaded(true);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Comprobar recordatorios locales de vencimiento (al abrir la app, 1 sola vez al día por dispositivo)
  useEffect(() => {
    if (!currentUser || !completionsLoaded || activities.length === 0) return;

    // Comprobación al cargar actividades y completados (controlado por localStorage para no repetir en el mismo día)
    checkAndTriggerLocalDueReminders(activities, studentCompletions, isStudent, false);
  }, [currentUser, completionsLoaded, activities, studentCompletions, isStudent]);

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

  // Sincronizar actividad seleccionada si se abrió desde el historial o enlace directo
  useEffect(() => {
    if (selectedActivityId && activities.length > 0 && !selectedActivity) {
      const found = activities.find(a => a.id === selectedActivityId);
      if (found) {
        setSelectedActivity(found);
        if (initialNav.modal === 'workspace') {
          setWorkspaceActivity(found);
          setWorkspaceModalOpen(true);
        } else {
          setDetailsModalOpen(true);
        }
      }
    }
  }, [activities, selectedActivityId, selectedActivity]);

  // Función unificada para persistir y sincronizar el estado de navegación
  const syncNav = (override = {}, pushHistory = true) => {
    const currentNav = {
      viewMode: override.viewMode !== undefined ? override.viewMode : viewMode,
      selectedTetra: override.selectedTetra !== undefined ? override.selectedTetra : selectedTetra,
      selectedSubject: override.selectedSubject !== undefined ? override.selectedSubject : selectedSubject,
      selectedStatus: override.selectedStatus !== undefined ? override.selectedStatus : selectedStatus,
      searchQuery: override.searchQuery !== undefined ? override.searchQuery : searchQuery,
      modal: override.modal !== undefined ? override.modal : (
        workspaceModalOpen ? (workspaceActivity ? 'workspace' : 'resources') :
        configModalOpen ? 'config' :
        notificationDrawerOpen ? 'notifications' :
        activityModalOpen ? 'new_activity' :
        detailsModalOpen ? 'activity_details' : null
      ),
      activityId: override.activityId !== undefined ? override.activityId : (
        workspaceModalOpen ? (workspaceActivity?.id || selectedActivity?.id || selectedActivityId) :
        detailsModalOpen ? (selectedActivity?.id || selectedActivityId) : null
      ),
      configTab: override.configTab !== undefined ? override.configTab : configModalTab
    };

    saveNavigationState(currentNav, pushHistory);
  };

  // Sincronización bidireccional con el Historial del Navegador (Botones Atrás / Adelante y Gestos Nativos)
  useEffect(() => {
    const handlePopState = (event) => {
      const nav = event.state || hashToNavState(window.location.hash) || DEFAULT_NAV_STATE;

      setViewMode(nav.viewMode || 'kanban');
      setSelectedTetra(nav.selectedTetra || 'all');
      setSelectedSubject(nav.selectedSubject || 'all');
      setSelectedStatus(nav.selectedStatus || 'pending');
      setSearchQuery(nav.searchQuery || '');

      if (nav.modal === 'config') {
        setConfigModalOpen(true);
        setConfigModalTab(nav.configTab || 'tetras');
        setResourcesModalOpen(false);
        setNotificationDrawerOpen(false);
        setActivityModalOpen(false);
        setDetailsModalOpen(false);
        setWorkspaceModalOpen(false);
      } else if (nav.modal === 'resources') {
        setWorkspaceActivity(null);
        setWorkspaceModalOpen(true);
        setConfigModalOpen(false);
        setNotificationDrawerOpen(false);
        setActivityModalOpen(false);
        setDetailsModalOpen(false);
        setResourcesModalOpen(false);
      } else if (nav.modal === 'notifications') {
        setNotificationDrawerOpen(true);
        setConfigModalOpen(false);
        setResourcesModalOpen(false);
        setActivityModalOpen(false);
        setDetailsModalOpen(false);
        setWorkspaceModalOpen(false);
      } else if (nav.modal === 'new_activity') {
        setActivityModalOpen(true);
        setConfigModalOpen(false);
        setResourcesModalOpen(false);
        setNotificationDrawerOpen(false);
        setDetailsModalOpen(false);
        setWorkspaceModalOpen(false);
      } else if (nav.modal === 'workspace') {
        if (nav.activityId) {
          setSelectedActivityId(nav.activityId);
          const found = activities.find(a => a.id === nav.activityId);
          if (found) {
            setSelectedActivity(found);
            setWorkspaceActivity(found);
          }
        } else {
          setWorkspaceActivity(null);
        }
        setWorkspaceModalOpen(true);
        setDetailsModalOpen(false);
        setConfigModalOpen(false);
        setResourcesModalOpen(false);
        setNotificationDrawerOpen(false);
        setActivityModalOpen(false);
      } else if (nav.modal === 'activity_details' && nav.activityId) {
        setSelectedActivityId(nav.activityId);
        const found = activities.find(a => a.id === nav.activityId);
        if (found) setSelectedActivity(found);
        setDetailsModalOpen(true);
        setWorkspaceModalOpen(false);
        setConfigModalOpen(false);
        setResourcesModalOpen(false);
        setNotificationDrawerOpen(false);
        setActivityModalOpen(false);
      } else {
        setConfigModalOpen(false);
        setResourcesModalOpen(false);
        setNotificationDrawerOpen(false);
        setActivityModalOpen(false);
        setDetailsModalOpen(false);
        setWorkspaceModalOpen(false);
        setSelectedActivity(null);
        setSelectedActivityId(null);
        setWorkspaceActivity(null);
      }

      saveNavigationState(nav, false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activities]);

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

  // Handlers de Navegación y Modales con Historial
  const handleOpenNewActivity = (presetDate = null) => {
    if (!isAdmin) return;
    setActivityToEdit(presetDate ? { dueDate: presetDate.toISOString() } : null);
    setActivityModalOpen(true);
    syncNav({ modal: 'new_activity' }, true);
  };

  const handleCloseActivityModal = () => {
    setActivityModalOpen(false);
    setActivityToEdit(null);
    syncNav({ modal: null }, true);
  };

  const handleEditActivity = (activity) => {
    if (!isEditor) return;
    setActivityToEdit(activity);
    setActivityModalOpen(true);
    syncNav({ modal: 'new_activity' }, true);
  };

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setSelectedActivityId(activity.id);
    setDetailsModalOpen(true);
    setConfigModalOpen(false);
    setResourcesModalOpen(false);
    setNotificationDrawerOpen(false);
    syncNav({ modal: 'activity_details', activityId: activity.id }, true);
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedActivity(null);
    setSelectedActivityId(null);
    syncNav({ modal: null, activityId: null }, true);
  };

  const handleOpenConfig = (tab = 'tetras') => {
    setConfigModalOpen(true);
    setConfigModalTab(tab);
    setDetailsModalOpen(false);
    setResourcesModalOpen(false);
    setNotificationDrawerOpen(false);
    syncNav({ modal: 'config', configTab: tab }, true);
  };

  const handleCloseConfig = () => {
    setConfigModalOpen(false);
    syncNav({ modal: null }, true);
  };

  const handleConfigTabChange = (tab) => {
    setConfigModalTab(tab);
    syncNav({ modal: 'config', configTab: tab }, false);
  };

  const handleOpenResources = () => {
    setWorkspaceActivity(null);
    setWorkspaceModalOpen(true);
    setConfigModalOpen(false);
    setDetailsModalOpen(false);
    setNotificationDrawerOpen(false);
    setResourcesModalOpen(false);
    syncNav({ modal: 'resources', activityId: null }, true);
  };

  const handleCloseResources = () => {
    setWorkspaceModalOpen(false);
    setWorkspaceActivity(null);
    setResourcesModalOpen(false);
    syncNav({ modal: null, activityId: null }, true);
  };

  const handleOpenNotificationDrawer = () => {
    setNotificationDrawerOpen(true);
    setConfigModalOpen(false);
    setDetailsModalOpen(false);
    setResourcesModalOpen(false);
    syncNav({ modal: 'notifications' }, true);
  };

  const handleCloseNotificationDrawer = () => {
    setNotificationDrawerOpen(false);
    syncNav({ modal: null }, true);
  };

  const handleOpenWorkspace = (activity) => {
    const act = activity || selectedActivity;
    setWorkspaceActivity(act || null);
    setWorkspaceModalOpen(true);
    setConfigModalOpen(false);
    setDetailsModalOpen(false);
    setNotificationDrawerOpen(false);
    setResourcesModalOpen(false);
    syncNav({ modal: 'workspace', activityId: act?.id || null }, true);
  };

  const handleCloseWorkspace = () => {
    setWorkspaceModalOpen(false);
    setWorkspaceActivity(null);
    if (detailsModalOpen && selectedActivity) {
      syncNav({ modal: 'activity_details', activityId: selectedActivity.id }, true);
    } else {
      syncNav({ modal: null, activityId: null }, true);
    }
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    syncNav({ viewMode: mode }, true);
  };

  const handleSearchQueryChange = (q) => {
    setSearchQuery(q);
    syncNav({ searchQuery: q }, false);
  };

  const handleTetraChange = (tetra) => {
    setSelectedTetra(tetra);
    syncNav({ selectedTetra: tetra }, false);
  };

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    syncNav({ selectedSubject: subject }, false);
  };

  const handleStatusChangeFilter = (status) => {
    setSelectedStatus(status);
    syncNav({ selectedStatus: status }, false);
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
        handleCloseDetails();
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
    syncNav({
      searchQuery: '',
      selectedTetra: 'all',
      selectedSubject: 'all',
      selectedStatus: 'pending'
    }, false);
  };

  // --- ACCESO AL TUTORIAL SIN LOGIN (?tuto) ---
  if (showTutorial) {
    return <AppTutorial onClose={handleCloseTutorial} currentUser={currentUser} />;
  }

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
        onOpenConfigModal={() => handleOpenConfig('tetras')}
        onOpenResourcesModal={handleOpenResources}
        onOpenNotificationDrawer={handleOpenNotificationDrawer}
      />

      {/* Recordatorio destacado de activación de notificaciones */}
      <NotificationActivationReminder />

      {/* Banner de Filtros con Fondo Cromado en 1 Sola Fila Pegado al Encabezado (Oculto cuando ConfigModal o WorkspaceModal está activo) */}
      <div id="ucnl-main-ribbon" className={(configModalOpen || workspaceModalOpen) ? 'hidden' : 'block'}>
        <ActivityFilters
          searchQuery={searchQuery}
          setSearchQuery={handleSearchQueryChange}
          selectedTetra={selectedTetra}
          setSelectedTetra={handleTetraChange}
          selectedSubject={selectedSubject}
          setSelectedSubject={handleSubjectChange}
          selectedStatus={selectedStatus}
          setSelectedStatus={handleStatusChangeFilter}
          viewMode={viewMode}
          setViewMode={handleViewModeChange}
          academicStructure={academicStructure}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          onOpenNewActivity={isAdmin ? () => handleOpenNewActivity() : null}
          onOpenConfigModal={() => handleOpenConfig('tetras')}
          onOpenResourcesModal={handleOpenResources}
          onOpenAuthModal={handleOpenAuth}
          onOpenNotificationDrawer={handleOpenNotificationDrawer}
        />
      </div>

      {/* Vista de Configuración a pantalla completa (a la altura del ribbon) o Espacio de Recursos o Contenedor Principal Dividido */}
      {configModalOpen ? (
        <ConfigModal
          isOpen={configModalOpen}
          onClose={handleCloseConfig}
          initialTab={configModalTab}
          onTabChange={handleConfigTabChange}
          academicStructure={academicStructure}
          onSaveStructure={handleSaveAcademicStructure}
          isAdmin={isAdmin}
          currentUser={currentUser}
        />
      ) : workspaceModalOpen ? (
        <ActivityWorkspaceModal
          isOpen={workspaceModalOpen}
          onClose={handleCloseWorkspace}
          activity={workspaceActivity}
          onSelectActivity={(act) => {
            setWorkspaceActivity(act);
            if (act) {
              syncNav({ modal: 'workspace', activityId: act.id }, false);
            } else {
              syncNav({ modal: 'resources', activityId: null }, false);
            }
          }}
          activities={activities}
          academicStructure={academicStructure}
          studentCompletions={studentCompletions}
          onEditActivity={(act) => {
            handleCloseWorkspace();
            handleEditActivity(act);
          }}
          personalStatus={
            workspaceActivity
              ? (studentCompletions[workspaceActivity.id] || 'pending')
              : 'pending'
          }
          onSetPersonalStatus={handleSetPersonalStatus}
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
                    onOpenWorkspace={handleOpenWorkspace}
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
                    onOpenWorkspace={handleOpenWorkspace}
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
                    onOpenWorkspace={handleOpenWorkspace}
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
              onClose={handleCloseDetails}
              activity={selectedActivity}
              onEdit={handleEditActivity}
              onDelete={handleDeleteActivity}
              onOpenWorkspace={handleOpenWorkspace}
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
          onClose={handleCloseActivityModal}
          onSave={handleSaveActivity}
          activityToEdit={activityToEdit}
          academicStructure={academicStructure}
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
          onClose={handleCloseNotificationDrawer}
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
