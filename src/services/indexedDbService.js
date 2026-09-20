const DB_NAME = 'UCNL_Actividades_DB';
const DB_VERSION = 4;

export const STORES = {
  ACTIVITIES: 'activities',
  ACADEMIC_STRUCTURE: 'academic_structure',
  SYNC_META: 'sync_meta',
  USER_COMPLETIONS: 'user_completions',
  NOTIFICATIONS: 'notifications',
  ACTIVITY_THREADS: 'activity_threads'
};

/**
 * Inicializa y abre la base de datos IndexedDB local
 */
export const openIndexedDB = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Almacén para actividades escolares
      if (!db.objectStoreNames.contains(STORES.ACTIVITIES)) {
        db.createObjectStore(STORES.ACTIVITIES, { keyPath: 'id' });
      }

      // Almacén para estructura académica (Tetras y Materias)
      if (!db.objectStoreNames.contains(STORES.ACADEMIC_STRUCTURE)) {
        db.createObjectStore(STORES.ACADEMIC_STRUCTURE, { keyPath: 'id' });
      }

      // Almacén para metadata de sincronización delta
      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META, { keyPath: 'id' });
      }

      // Almacén para tareas completadas por estudiante (progreso personal)
      if (!db.objectStoreNames.contains(STORES.USER_COMPLETIONS)) {
        db.createObjectStore(STORES.USER_COMPLETIONS, { keyPath: 'activityId' });
      }

      // Almacén para historial de notificaciones locales y push
      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notifStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' });
        notifStore.createIndex('timestamp', 'timestamp', { unique: false });
        notifStore.createIndex('isRead', 'isRead', { unique: false });
      }

      // Almacén para hilos de comentarios por alumno/actividad
      if (!db.objectStoreNames.contains(STORES.ACTIVITY_THREADS)) {
        const threadStore = db.createObjectStore(STORES.ACTIVITY_THREADS, { keyPath: 'threadKey' });
        threadStore.createIndex('activityId', 'activityId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

/**
 * Obtiene todos los elementos de un almacén en IndexedDB
 */
export const getAllFromStore = async (storeName) => {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Obtiene un elemento por su clave ID
 */
export const getFromStore = async (storeName, id) => {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Guarda o actualiza un elemento
 */
export const putInStore = async (storeName, value) => {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Guarda o actualiza múltiples elementos en una sola transacción
 */
export const putManyInStore = async (storeName, items = []) => {
  if (!items || items.length === 0) return;
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    items.forEach((item) => {
      store.put(item);
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Elimina un elemento por su ID
 */
export const deleteFromStore = async (storeName, id) => {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Limpia un almacén completo
 */
export const clearStore = async (storeName) => {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// ─── GESTOR DE NOTIFICACIONES EN INDEXEDDB ───────────────────────────────────

/**
 * Notifica a la interfaz de usuario que la lista o contador de notificaciones cambió
 */
const emitNotificationsUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ucnl-notifications-updated'));
  }
};

/**
 * Guarda una notificación en IndexedDB (si no existe) y emite evento de actualización
 */
export const saveNotificationToIndexedDb = async (notif) => {
  try {
    if (!notif) return null;
    const id = notif.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const notificationItem = {
      id,
      title: notif.title || 'Notificación UCNL',
      body: notif.body || '',
      data: notif.data || notif.options?.data || {},
      tag: notif.tag || notif.options?.tag || null,
      type: notif.type || notif.data?.type || 'general',
      timestamp: notif.timestamp || new Date().toISOString(),
      isRead: notif.isRead === true
    };

    await putInStore(STORES.NOTIFICATIONS, notificationItem);
    emitNotificationsUpdated();
    return notificationItem;
  } catch (err) {
    console.warn('No se pudo guardar la notificación en IndexedDB:', err);
    return null;
  }
};

/**
 * Obtiene todas las notificaciones ordenadas de más reciente a más antigua
 */
export const getAllNotificationsFromIndexedDb = async () => {
  try {
    const list = await getAllFromStore(STORES.NOTIFICATIONS);
    return list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  } catch (err) {
    console.warn('Error al leer notificaciones de IndexedDB:', err);
    return [];
  }
};

/**
 * Marca una notificación como leída
 */
export const markNotificationAsReadInIndexedDb = async (id) => {
  try {
    const existing = await getFromStore(STORES.NOTIFICATIONS, id);
    if (existing) {
      existing.isRead = true;
      existing.readAt = new Date().toISOString();
      await putInStore(STORES.NOTIFICATIONS, existing);
      emitNotificationsUpdated();
    }
  } catch (err) {
    console.warn('Error marcando notificación como leída:', err);
  }
};

/**
 * Marca todas las notificaciones como leídas
 */
export const markAllNotificationsAsReadInIndexedDb = async () => {
  try {
    const list = await getAllFromStore(STORES.NOTIFICATIONS);
    const now = new Date().toISOString();
    const updated = list.map(item => ({ ...item, isRead: true, readAt: now }));
    await putManyInStore(STORES.NOTIFICATIONS, updated);
    emitNotificationsUpdated();
  } catch (err) {
    console.warn('Error marcando todas como leídas:', err);
  }
};

/**
 * Elimina una notificación específica
 */
export const deleteNotificationFromIndexedDb = async (id) => {
  try {
    await deleteFromStore(STORES.NOTIFICATIONS, id);
    emitNotificationsUpdated();
  } catch (err) {
    console.warn('Error al eliminar notificación:', err);
  }
};

/**
 * Limpia todo el historial de notificaciones
 */
export const clearAllNotificationsFromIndexedDb = async () => {
  try {
    await clearStore(STORES.NOTIFICATIONS);
    emitNotificationsUpdated();
  } catch (err) {
    console.warn('Error al vaciar almacén de notificaciones:', err);
  }
};
