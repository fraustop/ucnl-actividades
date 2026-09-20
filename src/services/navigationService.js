/**
 * Servicio de Gestión y Persistencia del Estado de Navegación (UCNL Actividades)
 * 
 * Sincroniza el punto exacto donde se encuentra el usuario con:
 * 1. localStorage ('ucnl_navigation_state') para reanudar la app donde se dejó.
 * 2. History API (popstate, pushState, replaceState) y URL Hash para permitir navegación adelante/atrás nativa.
 */

export const LOCAL_STORAGE_NAV_KEY = 'ucnl_navigation_state';

export const DEFAULT_NAV_STATE = {
  viewMode: 'kanban', // 'kanban' | 'list' | 'calendar'
  selectedTetra: 'all',
  selectedSubject: 'all',
  selectedStatus: 'pending', // 'all' | 'pending' | 'in_progress' | 'completed'
  searchQuery: '',
  modal: null, // null | 'config' | 'resources' | 'subject_resources' | 'workspace' | 'notifications' | 'activity_details' | 'new_activity'
  workspaceMode: 'activity', // 'activity' | 'subject'
  activityId: null, // ID de la actividad cuando modal === 'activity_details' o 'workspace'
  activity: null, // Objeto completo de la actividad seleccionada
  activities: [], // Lista de actividades activas
  tetraId: null, // ID del tetramestre
  subjectId: null, // ID de la materia seleccionada
  subject: null, // Objeto o nombre de la materia seleccionada
  subjects: [], // Lista de materias disponibles
  academicStructure: [], // Estructura académica completa
  configTab: 'tetras', // 'tetras' | 'subjects' | 'users' | 'notifications'
  timestamp: Date.now()
};

/**
 * Convierte un objeto de estado de navegación a una ruta URL Hash amigable
 */
export const navStateToHash = (state) => {
  if (!state) return '#/kanban';

  // 1. Modales prioritarios
  if (state.modal === 'config') {
    const tab = state.configTab || 'tetras';
    return `#/config/${tab}`;
  }
  if (state.modal === 'workspace') {
    if (state.workspaceMode === 'subject' || state.subjectId) {
      if (state.tetraId && state.subjectId) {
        return `#/workspace/subject/${encodeURIComponent(state.tetraId)}/${encodeURIComponent(state.subjectId)}`;
      }
      if (state.tetraId) {
        return `#/workspace/subject/${encodeURIComponent(state.tetraId)}`;
      }
      return '#/workspace/subject';
    }
    if (state.activityId) {
      return `#/workspace/activity/${encodeURIComponent(state.activityId)}`;
    }
    return '#/workspace';
  }
  if (state.modal === 'subject_resources') {
    if (state.tetraId && state.subjectId) {
      return `#/subject-resources/${encodeURIComponent(state.tetraId)}/${encodeURIComponent(state.subjectId)}`;
    }
    if (state.tetraId) {
      return `#/subject-resources/${encodeURIComponent(state.tetraId)}`;
    }
    return '#/subject-resources';
  }
  if (state.modal === 'resources') {
    return '#/resources';
  }
  if (state.modal === 'notifications') {
    return '#/notifications';
  }
  if (state.modal === 'new_activity') {
    return '#/activity/new';
  }
  if (state.modal === 'activity_details' && state.activityId) {
    return `#/activity/${encodeURIComponent(state.activityId)}`;
  }

  // 2. Vistas principales con parámetros
  const view = state.viewMode || 'kanban';
  const params = new URLSearchParams();

  if (state.selectedTetra && state.selectedTetra !== 'all') {
    params.set('tetra', state.selectedTetra);
  }
  if (state.selectedSubject && state.selectedSubject !== 'all') {
    params.set('subject', state.selectedSubject);
  }
  if (state.selectedStatus && state.selectedStatus !== 'pending') {
    params.set('status', state.selectedStatus);
  }
  if (state.searchQuery && state.searchQuery.trim()) {
    params.set('q', state.searchQuery.trim());
  }

  const queryStr = params.toString();
  return `#/${view}${queryStr ? `?${queryStr}` : ''}`;
};

/**
 * Parsea una ruta URL Hash a un objeto de estado de navegación
 */
export const hashToNavState = (hash = '') => {
  const cleanHash = (hash || '').replace(/^#\/?/, '');
  if (!cleanHash) return null;

  const [pathPart, queryPart] = cleanHash.split('?');
  const pathSegments = pathPart ? pathPart.split('/').filter(Boolean) : [];
  const params = new URLSearchParams(queryPart || '');

  const state = { ...DEFAULT_NAV_STATE };

  if (pathSegments[0] === 'tuto' || pathSegments[0] === 'tutorial') {
    state.modal = 'tutorial';
    return state;
  }
  if (pathSegments[0] === 'config') {
    state.modal = 'config';
    state.configTab = pathSegments[1] || 'tetras';
    return state;
  }
  if (pathSegments[0] === 'workspace') {
    state.modal = 'workspace';
    if (pathSegments[1] === 'subject') {
      state.workspaceMode = 'subject';
      if (pathSegments[2]) state.tetraId = decodeURIComponent(pathSegments[2]);
      if (pathSegments[3]) state.subjectId = decodeURIComponent(pathSegments[3]);
    } else if (pathSegments[1] === 'activity') {
      state.workspaceMode = 'activity';
      if (pathSegments[2]) state.activityId = decodeURIComponent(pathSegments[2]);
    } else if (pathSegments[1]) {
      state.workspaceMode = 'activity';
      state.activityId = decodeURIComponent(pathSegments[1]);
    }
    return state;
  }
  if (pathSegments[0] === 'subject-resources' || pathSegments[0] === 'subject_resources') {
    state.modal = 'workspace';
    state.workspaceMode = 'subject';
    if (pathSegments[1]) state.tetraId = decodeURIComponent(pathSegments[1]);
    if (pathSegments[2]) state.subjectId = decodeURIComponent(pathSegments[2]);
    return state;
  }
  if (pathSegments[0] === 'resources') {
    state.modal = 'workspace';
    state.workspaceMode = 'activity';
    return state;
  }
  if (pathSegments[0] === 'notifications') {
    state.modal = 'notifications';
    return state;
  }
  if (pathSegments[0] === 'activity') {
    if (pathSegments[1] === 'new') {
      state.modal = 'new_activity';
    } else if (pathSegments[1] && pathSegments[2] === 'workspace') {
      state.modal = 'workspace';
      state.workspaceMode = 'activity';
      state.activityId = decodeURIComponent(pathSegments[1]);
    } else if (pathSegments[1]) {
      state.modal = 'activity_details';
      state.activityId = decodeURIComponent(pathSegments[1]);
    }
    return state;
  }


  // Vistas estándar (kanban, list, calendar)
  if (['kanban', 'list', 'calendar'].includes(pathSegments[0])) {
    state.viewMode = pathSegments[0];
  } else {
    state.viewMode = 'kanban';
  }

  if (params.has('tetra')) state.selectedTetra = params.get('tetra');
  if (params.has('subject')) state.selectedSubject = params.get('subject');
  if (params.has('status')) state.selectedStatus = params.get('status');
  if (params.has('q')) state.searchQuery = params.get('q');

  return state;
};

/**
 * Carga el estado inicial de navegación desde el URL Hash o localStorage
 */
export const getInitialNavigationState = () => {
  // 1. Cargar estado base desde localStorage si existe
  let savedState = {};
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_NAV_KEY);
    if (saved) {
      savedState = JSON.parse(saved) || {};
    }
  } catch (err) {
    console.warn('Error al leer ucnl_navigation_state de localStorage:', err);
  }

  // 2. Si hay hash en la URL, parsearlo
  let hashState = null;
  if (typeof window !== 'undefined' && window.location.hash) {
    hashState = hashToNavState(window.location.hash);
  }

  // 3. Fusionar: DEFAULT_NAV_STATE + savedState + hashState (hash tiene prioridad si es una ruta específica)
  const merged = {
    ...DEFAULT_NAV_STATE,
    ...savedState,
    ...(hashState || {}),
    timestamp: Date.now()
  };

  // Preservar selecciones recordadas del usuario si el hash actual no las especifica
  if (!hashState?.workspaceMode && savedState?.workspaceMode) {
    merged.workspaceMode = savedState.workspaceMode;
  }
  if (!hashState?.tetraId && savedState?.tetraId) {
    merged.tetraId = savedState.tetraId;
  }
  if (!hashState?.subjectId && savedState?.subjectId) {
    merged.subjectId = savedState.subjectId;
  }
  if (!hashState?.activityId && savedState?.activityId) {
    merged.activityId = savedState.activityId;
  }

  return merged;
};

/**
 * Guarda el estado en localStorage y actualiza el historial del navegador si se solicita
 */
export const saveNavigationState = (state, pushToHistory = false) => {
  if (!state) return;

  // Leer estado existente para no perder selecciones de workspace previas
  let existingState = {};
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_NAV_KEY);
    if (saved) {
      existingState = JSON.parse(saved) || {};
    }
  } catch (_) {}

  const fullState = {
    ...DEFAULT_NAV_STATE,
    ...existingState,
    ...state,
    timestamp: Date.now()
  };

  // Si se pasa explícitamente un campo (incluso null para volver a la lista general), respetarlo
  if ('workspaceMode' in state) fullState.workspaceMode = state.workspaceMode;
  if ('tetraId' in state) fullState.tetraId = state.tetraId;
  if ('subjectId' in state) fullState.subjectId = state.subjectId;
  if ('activityId' in state) fullState.activityId = state.activityId;

  try {
    localStorage.setItem(LOCAL_STORAGE_NAV_KEY, JSON.stringify(fullState));
  } catch (err) {
    console.warn('Error al guardar estado de navegación en localStorage:', err);
  }

  if (typeof window !== 'undefined') {
    const targetHash = navStateToHash(fullState);
    if (window.location.hash !== targetHash) {
      if (pushToHistory) {
        window.history.pushState(fullState, '', targetHash);
      } else {
        window.history.replaceState(fullState, '', targetHash);
      }
    }
  }

  return fullState;
};
