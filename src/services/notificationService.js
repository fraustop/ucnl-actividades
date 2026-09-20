import { getToken, onMessage } from 'firebase/messaging';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseMessaging, db } from './firebase';
import { saveUserFcmToken, removeUserFcmToken } from './userService';
import { saveNotificationToIndexedDb } from './indexedDbService';

// VAPID Public Key para Firebase Cloud Messaging (Web Push)
const VAPID_KEY = 'BJrIxSyWjOPVSrzLTmBemuxeYA5YA5RlNTGLWCTfkBcbk3bmhJENqUn5B109yFMgXnAKWC-iap_ouvHsBIJpGS4';

const LOCAL_STORAGE_FCM_KEY = 'ucnl_fcm_token';
const LOCAL_STORAGE_NOTIFICATION_CONFIG_KEY = 'ucnl_notification_schedule_config';
const LOCAL_STORAGE_DUE_CHECK_KEY = 'ucnl_last_local_due_check';
const LOCAL_STORAGE_BACKEND_URL_KEY = 'ucnl_notification_backend_url';
const NOTIFICATION_CONFIG_DOC_REF = doc(db, 'config', 'notifications');

export const DEFAULT_BACKEND_URL = 'http://148.230.165.236:3001';

export const getBackendUrl = () => {
  return localStorage.getItem(LOCAL_STORAGE_BACKEND_URL_KEY) || DEFAULT_BACKEND_URL;
};

export const setBackendUrl = (url) => {
  if (!url) {
    localStorage.removeItem(LOCAL_STORAGE_BACKEND_URL_KEY);
  } else {
    localStorage.setItem(LOCAL_STORAGE_BACKEND_URL_KEY, url.trim().replace(/\/$/, ''));
  }
};

export const DEFAULT_NOTIFICATION_CONFIG = {
  daily7DaysReminderEnabled: true,
  notificationHour: '08:00',
  notify7Days: true,
  notify4Days: true,
  notify3DaysDaily: true,
  notifyNewActivity: true,
  notifyNewUserToAdmins: true,
  backendUrl: DEFAULT_BACKEND_URL,
  updatedAt: null
};

/**
 * Comprueba si las notificaciones están soportadas en el navegador
 */
export const areNotificationsSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Obtiene el estado actual del permiso de notificaciones ('granted' | 'denied' | 'default' | 'unsupported')
 */
export const getNotificationPermission = () => {
  if (!areNotificationsSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Reproduce un sonido de notificación sutil sintetizado (Web Audio API)
 */
export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignorar si el navegador bloquea audio sin interacción previa
  }
};

/**
 * Emite una notificación local de forma segura utilizando el Service Worker o la Notification API
 * Y emite un evento en la app para mostrar el banner visual flotante en pantalla.
 * 
 * El banner visual y el sonido se muestran SIEMPRE (no requieren permiso del sistema).
 * Las notificaciones nativas del SO solo se muestran si el permiso está concedido.
 */
export const emitLocalNotification = async (title, options = {}) => {
  // 1. Guardar en IndexedDB para el historial y contador de la campanita
  const notifId = options.tag || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  try {
    await saveNotificationToIndexedDb({
      id: notifId,
      title,
      body: options.body || '',
      data: options.data || {},
      tag: options.tag || notifId,
      timestamp: options.timestamp || new Date().toISOString(),
      isRead: false
    });
  } catch (e) {
    console.warn('Error guardando notificación en IndexedDB:', e);
  }

  // 2. Reproducir sonido de alerta (siempre, sin esperar permisos)
  playNotificationSound();

  // 3. Disparar evento para el banner visual en pantalla (siempre, sin esperar permisos)
  if (typeof window !== 'undefined') {
    const inAppEvent = new CustomEvent('ucnl-inapp-notification', {
      detail: {
        id: notifId,
        title,
        body: options.body || '',
        data: options.data || {},
        tag: notifId
      }
    });
    window.dispatchEvent(inAppEvent);
    console.log('[emitLocalNotification] Banner visual disparado y guardado en IndexedDB:', title);
  }

  // 4. Notificación nativa del SO (solo si el permiso está concedido)
  if (!areNotificationsSupported() || Notification.permission !== 'granted') {
    console.log('[emitLocalNotification] Sin permiso para notificación nativa. Solo se muestra banner visual.');
    return false;
  }

  const notificationOptions = {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    ...options
  };

  try {
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body: notificationOptions.body || '',
          options: notificationOptions
        });
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.ready;
      }
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }
    new Notification(title, notificationOptions);
    return true;
  } catch (err) {
    console.warn('Error al mostrar notificación nativa, intentando fallback:', err);
    try {
      new Notification(title, notificationOptions);
      return true;
    } catch (e) {
      console.warn('No se pudo mostrar la notificación nativa:', e);
      return false;
    }
  }
};


/**
 * Evalúa las actividades del estudiante y emite un recordatorio de RESUMEN consolidado
 * con el conteo de tareas pendientes y en proceso (descartando estrictamente las completadas/terminadas).
 * Se ejecuta 1 vez al día por dispositivo.
 */
export const checkAndTriggerLocalDueReminders = async (
  activities = [],
  studentCompletions = {},
  isStudent = false,
  force = false
) => {
  if (!areNotificationsSupported() || Notification.permission !== 'granted') {
    return;
  }

  if (!activities || activities.length === 0) {
    return;
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastCheck = localStorage.getItem(LOCAL_STORAGE_DUE_CHECK_KEY);

  // Evitar alertar repetidamente en la misma fecha a menos que sea forzado
  if (!force && lastCheck === todayStr) {
    return;
  }

  const pendingList = [];
  const inProgressList = [];
  const upcomingDueList = [];

  activities.forEach((act) => {
    // 1. Descartar actividades canceladas o completadas globalmente
    if (act.status === 'completed' || act.status === 'cancelled') return;

    // 2. Descartar actividades marcadas como completadas/terminadas por el estudiante
    const userStatus = studentCompletions[act.id];
    if (userStatus === 'completed' || userStatus === true) {
      return;
    }

    // 3. Clasificar entre en proceso y pendiente
    if (userStatus === 'in_progress') {
      inProgressList.push(act);
    } else {
      pendingList.push(act);
    }

    // 4. Evaluar si tiene fecha límite próxima (próximos 7 días o vencida hoy/ayer)
    if (act.dueDate) {
      const dueDate = new Date(act.dueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7 && daysLeft >= -1) {
        upcomingDueList.push({ ...act, daysLeft });
      }
    }
  });

  const totalActive = pendingList.length + inProgressList.length;

  // Si todas las actividades están completadas o no hay tareas activas, no molestar con alertas
  if (totalActive === 0) {
    return;
  }

  // Registrar fecha de la última comprobación diaria
  localStorage.setItem(LOCAL_STORAGE_DUE_CHECK_KEY, todayStr);

  // Construir mensaje de resumen consolidado
  const summaryTitle = '📋 Resumen de Actividades UCNL';
  let summaryBody = '';

  if (pendingList.length > 0 && inProgressList.length > 0) {
    summaryBody = `Tienes ${totalActive} actividades escolares activas (${pendingList.length} pendiente${pendingList.length > 1 ? 's' : ''} y ${inProgressList.length} en proceso).`;
  } else if (inProgressList.length > 0) {
    summaryBody = `Tienes ${inProgressList.length} actividad${inProgressList.length > 1 ? 'es' : ''} en proceso de realización.`;
  } else {
    summaryBody = `Tienes ${pendingList.length} actividad${pendingList.length > 1 ? 'es' : ''} pendiente${pendingList.length > 1 ? 's' : ''} por entregar.`;
  }

  if (upcomingDueList.length > 0) {
    const urgentCount = upcomingDueList.filter(a => a.daysLeft <= 3).length;
    if (urgentCount > 0) {
      summaryBody += ` ⚠️ ${urgentCount} con entrega urgente en los próximos 3 días.`;
    } else {
      summaryBody += ` ${upcomingDueList.length} con entrega en los siguientes 7 días.`;
    }
  }

  await emitLocalNotification(summaryTitle, {
    body: summaryBody,
    tag: `due_summary_${todayStr}`,
    data: { url: '/' }
  });
};

/**
 * Muestra una notificación local cuando se añade una nueva actividad en tiempo real
 */
export const notifyNewActivityLocal = async (activity) => {
  if (!activity || !areNotificationsSupported() || Notification.permission !== 'granted') {
    return;
  }

  const title = `📚 Nueva Actividad: ${activity.subject || 'Materia'}`;
  const body = `${activity.title}${activity.tetraName ? ` (${activity.tetraName})` : ''} - Fecha límite: ${activity.dueDate ? activity.dueDate.replace('T', ' ') : 'Por definir'}`;

  await emitLocalNotification(title, {
    body,
    tag: `new_act_${activity.id || Date.now()}`,
    data: { activityId: activity.id, url: '/' }
  });
};

/**
 * Envía una notificación de prueba en el dispositivo local para verificar permisos y presentación
 */
export const sendLocalTestNotification = async () => {
  if (!areNotificationsSupported()) {
    throw new Error('Las notificaciones no son compatibles con este navegador.');
  }

  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      throw new Error('Debes conceder permisos de notificación en tu navegador.');
    }
  }

  const testTitle = '🔔 UCNL Actividades - Prueba de Notificación';
  const testOptions = {
    body: '¡Excelente! Las notificaciones locales de actividades escolares están activas y funcionando.',
    tag: 'test_notification',
    data: { url: '/' }
  };

  return emitLocalNotification(testTitle, testOptions);
};

/**
 * Solicita permiso y registra el token FCM para el usuario actual usando la VAPID key
 */
export const requestNotificationPermissionAndToken = async (currentUser) => {
  if (!areNotificationsSupported()) {
    throw new Error('Las notificaciones no son compatibles con este navegador o dispositivo.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones no concedido.');
  }

  // Registrar token FCM con VAPID key para recibir push reales desde el backend
  try {
    const messagingInstance = await getFirebaseMessaging();
    if (messagingInstance) {
      let swRegistration = await navigator.serviceWorker.getRegistration();
      if (!swRegistration) {
        swRegistration = await navigator.serviceWorker.register('/sw.js');
        await swRegistration.update();
      }

      console.log('[FCM] Solicitando token con VAPID key...');
      const token = await getToken(messagingInstance, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration
      });

      if (token) {
        console.log('[FCM] ✅ Token registrado:', token.substring(0, 20) + '...');
        localStorage.setItem(LOCAL_STORAGE_FCM_KEY, token);
        if (currentUser?.uid) {
          await saveUserFcmToken(currentUser.uid, token);
        }
        return token;
      } else {
        console.warn('[FCM] getToken() no devolvió token. Verifica la VAPID key y el dominio en Firebase Console.');
      }
    }
  } catch (err) {
    console.error('[FCM] Error al registrar token FCM:', err.message);
    throw new Error(`No se pudo registrar el token FCM: ${err.message}`);
  }

  return 'granted';
};


/**
 * Desactiva las notificaciones en este dispositivo para el usuario
 */
export const disableNotifications = async (currentUser) => {
  const token = localStorage.getItem(LOCAL_STORAGE_FCM_KEY);
  if (token && currentUser?.uid) {
    await removeUserFcmToken(currentUser.uid, token);
    localStorage.removeItem(LOCAL_STORAGE_FCM_KEY);
  }
};

/**
 * Obtiene la configuración de horarios y reglas de notificación desde Firestore o almacenamiento local
 */
export const getNotificationScheduleConfig = async () => {
  try {
    const docSnap = await getDoc(NOTIFICATION_CONFIG_DOC_REF);
    if (docSnap.exists()) {
      const data = { ...DEFAULT_NOTIFICATION_CONFIG, ...docSnap.data() };
      localStorage.setItem(LOCAL_STORAGE_NOTIFICATION_CONFIG_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('No se pudo obtener config de notificaciones de Firestore, recurriendo a local:', err);
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_NOTIFICATION_CONFIG_KEY);
  if (cached) {
    try {
      return { ...DEFAULT_NOTIFICATION_CONFIG, ...JSON.parse(cached) };
    } catch (e) {}
  }

  return DEFAULT_NOTIFICATION_CONFIG;
};

/**
 * Guarda la configuración de horarios y reglas de notificación en Firestore y local
 */
export const saveNotificationScheduleConfig = async (config, currentUser = null) => {
  const payload = {
    ...DEFAULT_NOTIFICATION_CONFIG,
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.displayName || currentUser?.email || 'Admin'
  };

  try {
    await setDoc(NOTIFICATION_CONFIG_DOC_REF, payload, { merge: true });
    localStorage.setItem(LOCAL_STORAGE_NOTIFICATION_CONFIG_KEY, JSON.stringify(payload));
    return payload;
  } catch (err) {
    console.error('Error al guardar configuración de notificaciones en Firestore:', err);
    localStorage.setItem(LOCAL_STORAGE_NOTIFICATION_CONFIG_KEY, JSON.stringify(payload));
    throw err;
  }
};

/**
 * Escucha notificaciones push en primer plano (cuando la aplicación está abierta)
 */
export const onForegroundMessage = async (callback) => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    if (Notification.permission === 'granted' && payload.notification) {
      emitLocalNotification(payload.notification.title || 'UCNL Actividades', {
        body: payload.notification.body,
        data: payload.data
      });
    }

    if (callback) callback(payload);
  });
};

/**
 * Consulta el estado de salud del servidor backend en su IP Externa o URL configurada
 */
export const fetchBackendStatus = async (customUrl = null) => {
  const baseUrl = customUrl || getBackendUrl();
  try {
    const res = await fetch(`${baseUrl}/api/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status} desde el backend.`);
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message || 'No se pudo conectar al servidor backend.' };
  }
};

/**
 * Dispara manualmente la evaluación de vencimientos en el servidor backend
 */
export const triggerBackendDueEvaluation = async (customUrl = null) => {
  const baseUrl = customUrl || getBackendUrl();
  try {
    const res = await fetch(`${baseUrl}/api/notify/due`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(`Fallo al solicitar evaluación al backend: ${err.message}`);
  }
};

/**
 * Dispara una notificación de prueba desde el servidor backend
 */
export const triggerBackendTestNotification = async (customUrl = null, title = '', body = '') => {
  const baseUrl = customUrl || getBackendUrl();
  try {
    const res = await fetch(`${baseUrl}/api/notify/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(`Fallo al enviar prueba desde el backend: ${err.message}`);
  }
};

/**
 * Dispara manualmente el recordatorio diario de actividades de los próximos 7 días desde el backend
 */
export const triggerDaily7DaysReminder = async (customUrl = null) => {
  const baseUrl = customUrl || getBackendUrl();
  try {
    const res = await fetch(`${baseUrl}/api/notify/daily-7days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(`Fallo al solicitar recordatorio de 7 días: ${err.message}`);
  }
};

/**
 * Notifica a los administradores sobre un nuevo usuario registrado
 */
export const notifyAdminsNewUser = async (userProfile) => {
  if (!userProfile) return;
  const roleName = userProfile.role === 'admin' ? 'Administrador' : userProfile.role === 'docente' ? 'Docente' : 'Estudiante';
  const title = `👤 Nuevo Usuario: ${userProfile.displayName || 'Estudiante'}`;
  const body = `${userProfile.displayName || 'Un nuevo usuario'} (${userProfile.email}) se ha registrado en la plataforma como ${roleName}.`;

  // Enviar notificación push mediante el backend para dispositivos admin
  try {
    const backendUrl = getBackendUrl();
    await fetch(`${backendUrl}/api/notify/new-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        user: {
          uid: userProfile.uid,
          email: userProfile.email,
          displayName: userProfile.displayName,
          role: userProfile.role
        }
      }),
      signal: AbortSignal.timeout(6000)
    }).catch(() => {});
  } catch (e) {
    console.warn('Error al notificar backend sobre nuevo usuario:', e);
  }
};



