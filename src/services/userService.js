import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { STORES, putInStore, getAllFromStore, deleteFromStore } from './indexedDbService';
import { notifyAdminsNewUser } from './notificationService';

export const SUPER_ADMIN_EMAIL = 'fraustop@outlook.com';

const firebaseConfig = {
  apiKey: "AIzaSyC-KKA0iTnadutGf5OqMnvkMc_vgntnY_8",
  authDomain: "ucnl-actividades.firebaseapp.com",
  projectId: "ucnl-actividades",
  storageBucket: "ucnl-actividades.firebasestorage.app",
  messagingSenderId: "709317883582",
  appId: "1:709317883582:web:f2838d2ba39467d2ac50ef",
  measurementId: "G-FSKPB3QRYY"
};

// Inicialización de instancia secundaria de Firebase para crear usuarios sin cerrar la sesión del admin
const getSecondaryAuth = () => {
  const secondaryAppName = 'SecondaryAuthApp';
  const secondaryApp = getApps().find(app => app.name === secondaryAppName) 
    || initializeApp(firebaseConfig, secondaryAppName);
  return getAuth(secondaryApp);
};

/**
 * Garantiza que el usuario tenga un documento de perfil en Firestore
 */
export const ensureAdminProfile = async (user, requestedRole = 'estudiante') => {
  if (!user || !user.email) return null;

  const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const userRef = doc(db, 'users', user.uid);
  
  try {
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const initialProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || (isSuperAdmin ? 'Administrador Principal' : 'Estudiante'),
        photoURL: user.photoURL || null,
        role: isSuperAdmin ? 'admin' : (requestedRole || 'estudiante'),
        status: 'active',
        authProvider: user.providerData?.[0]?.providerId || 'password',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(userRef, initialProfile, { merge: true });

      // Notificar a administradores en Firestore
      try {
        const notifRef = doc(collection(db, 'admin_notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          type: 'new_user',
          title: '👤 Nuevo Usuario Registrado',
          message: `${initialProfile.displayName} (${initialProfile.email}) se ha registrado en la plataforma como ${initialProfile.role === 'admin' ? 'Administrador' : initialProfile.role === 'docente' ? 'Docente' : 'Estudiante'}.`,
          userId: user.uid,
          userEmail: user.email,
          userName: initialProfile.displayName,
          userRole: initialProfile.role,
          createdBy: 'Auto-Registro',
          createdAt: initialProfile.createdAt,
          read: false
        });

        // Disparar notificación push remota a dispositivos de administradores
        notifyAdminsNewUser(initialProfile).catch(() => {});
      } catch (errNotif) {
        console.warn('No se pudo registrar admin_notification:', errNotif);
      }

      return initialProfile;
    } else {
      const currentData = userDoc.data();
      // Si es el super admin pero no tiene rol de admin, asignarlo
      if (isSuperAdmin && currentData.role !== 'admin') {
        await updateDoc(userRef, {
          role: 'admin',
          updatedAt: new Date().toISOString()
        });
        return { ...currentData, role: 'admin' };
      }
      return currentData;
    }
  } catch (err) {
    console.warn('Error al verificar/asegurar perfil de usuario en Firestore:', err);
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Usuario',
      role: isSuperAdmin ? 'admin' : (requestedRole || 'estudiante')
    };
  }
};

/**
 * Crea un nuevo usuario en Firebase Auth y su respectivo documento de perfil en Firestore
 */
export const createAppUser = async ({ email, password, displayName, role = 'estudiante', adminUser }) => {
  const secondaryAuth = getSecondaryAuth();

  try {
    // 1. Crear el usuario en Authentication usando la instancia secundaria
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    const newUser = userCredential.user;

    // 2. Actualizar nombre visible en Auth
    if (displayName) {
      await updateProfile(newUser, { displayName: displayName.trim() });
    }

    // 3. Crear el documento de perfil en Firestore (colección 'users/{uid}')
    const profileData = {
      uid: newUser.uid,
      email: newUser.email,
      displayName: displayName?.trim() || newUser.email.split('@')[0],
      role: role || 'estudiante',
      status: 'active',
      createdBy: adminUser ? (adminUser.displayName || adminUser.email) : 'Administrador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', newUser.uid), profileData);

    // Notificar a administradores en Firestore
    try {
      const notifRef = doc(collection(db, 'admin_notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        type: 'new_user',
        title: '👤 Nuevo Usuario Registrado',
        message: `${profileData.displayName} (${profileData.email}) fue creado con el rol ${profileData.role === 'admin' ? 'Administrador' : profileData.role === 'docente' ? 'Docente' : 'Estudiante'}.`,
        userId: newUser.uid,
        userEmail: newUser.email,
        userName: profileData.displayName,
        userRole: profileData.role,
        createdBy: profileData.createdBy,
        createdAt: profileData.createdAt,
        read: false
      });

      // Disparar notificación push remota a dispositivos de administradores
      notifyAdminsNewUser(profileData).catch(() => {});
    } catch (errNotif) {
      console.warn('No se pudo registrar admin_notification:', errNotif);
    }

    // 4. Cerrar la sesión secundaria
    await signOut(secondaryAuth);

    return profileData;
  } catch (error) {
    try {
      await signOut(secondaryAuth);
    } catch {}
    throw error;
  }
};

/**
 * Escucha la lista de usuarios registrados en tiempo real desde Firestore
 */
export const subscribeToUsers = (onSuccess, onError) => {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onSuccess(users);
      },
      (err) => {
        console.error('Error al escuchar usuarios en Firestore:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error('Error al crear suscripción de usuarios:', err);
    if (onError) onError(err);
    return () => {};
  }
};

/**
 * Actualiza el rol de un usuario existente ('admin' | 'docente' | 'estudiante')
 */
export const updateUserRole = async (uid, newRole) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Actualiza el estado de un usuario ('active' | 'inactive')
 */
export const updateUserStatus = async (uid, newStatus) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    status: newStatus,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Guarda el progreso personal de un usuario (tarea pendiente, en progreso o completada para sí mismo)
 */
export const saveStudentCompletion = async (uid, activityId, statusOrCompleted) => {
  if (!uid || !activityId) return;

  const timestamp = new Date().toISOString();
  const completionRef = doc(db, 'users', uid, 'completions', activityId);

  // Normalizar el estado solicitado: 'pending' | 'in_progress' | 'completed'
  let targetStatus = 'pending';
  if (statusOrCompleted === 'completed' || statusOrCompleted === true) {
    targetStatus = 'completed';
  } else if (statusOrCompleted === 'in_progress') {
    targetStatus = 'in_progress';
  }

  try {
    if (targetStatus === 'completed') {
      const data = {
        activityId,
        status: 'completed',
        completed: true,
        completedAt: timestamp,
        updatedAt: timestamp
      };
      await setDoc(completionRef, data, { merge: true });
      await putInStore(STORES.USER_COMPLETIONS, data);
    } else if (targetStatus === 'in_progress') {
      const data = {
        activityId,
        status: 'in_progress',
        completed: false,
        updatedAt: timestamp
      };
      await setDoc(completionRef, data, { merge: true });
      await putInStore(STORES.USER_COMPLETIONS, data);
    } else {
      // 'pending' -> eliminar documento de completados / estado
      await deleteDoc(completionRef);
      await deleteFromStore(STORES.USER_COMPLETIONS, activityId);
    }
  } catch (err) {
    console.error('Error al guardar estado de actividad de usuario:', err);
    // Guardar al menos localmente en caso de fallo de red
    if (targetStatus === 'completed') {
      await putInStore(STORES.USER_COMPLETIONS, { activityId, status: 'completed', completed: true, completedAt: timestamp, updatedAt: timestamp });
    } else if (targetStatus === 'in_progress') {
      await putInStore(STORES.USER_COMPLETIONS, { activityId, status: 'in_progress', completed: false, updatedAt: timestamp });
    } else {
      await deleteFromStore(STORES.USER_COMPLETIONS, activityId);
    }
  }
};

/**
 * Suscripción en tiempo real a los estados y tareas completadas por el usuario
 */
export const subscribeToStudentCompletions = (uid, onUpdate) => {
  if (!uid) return () => {};

  // Carga inmediata de caché local IndexedDB
  getAllFromStore(STORES.USER_COMPLETIONS).then((localItems) => {
    const map = {};
    (localItems || []).forEach(item => {
      const status = item.status || (item.completed ? 'completed' : 'pending');
      if (status && status !== 'pending') {
        map[item.activityId] = status;
      }
    });
    onUpdate(map);
  }).catch(() => {});

  // Suscribirse a Firestore
  const completionsCol = collection(db, 'users', uid, 'completions');
  return onSnapshot(completionsCol, async (snapshot) => {
    const map = {};
    const itemsToCache = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status || (data.completed ? 'completed' : 'pending');
      if (status && status !== 'pending') {
        map[docSnap.id] = status;
        itemsToCache.push({
          activityId: docSnap.id,
          status,
          completed: status === 'completed',
          updatedAt: data.updatedAt || data.completedAt || new Date().toISOString()
        });
      }
    });

    // Actualizar IndexedDB
    for (const item of itemsToCache) {
      await putInStore(STORES.USER_COMPLETIONS, item);
    }

    onUpdate(map);
  }, (err) => {
    console.warn('Error al escuchar estados de actividad de usuario:', err);
  });
};

/**
 * Guarda el token FCM de notificaciones push para un usuario
 */
export const saveUserFcmToken = async (uid, token) => {
  if (!uid || !token) return;
  try {
    const tokenRef = doc(db, 'users', uid, 'tokens', token);
    await setDoc(tokenRef, {
      token,
      updatedAt: new Date().toISOString(),
      platform: 'web'
    }, { merge: true });

    // Guardar también en el documento principal del usuario
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      fcmTokens: arrayUnion(token),
      lastFcmToken: token,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('No se pudo guardar el token FCM en Firestore:', err);
  }
};

/**
 * Elimina el token FCM de un usuario (al cerrar sesión o deshabilitar notificaciones)
 */
export const removeUserFcmToken = async (uid, token) => {
  if (!uid || !token) return;
  try {
    const tokenRef = doc(db, 'users', uid, 'tokens', token);
    await deleteDoc(tokenRef);

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      fcmTokens: arrayRemove(token)
    }, { merge: true });
  } catch (err) {
    console.warn('No se pudo eliminar el token FCM en Firestore:', err);
  }
};

/**
 * Suscripción en tiempo real a las notificaciones para administradores
 */
export const subscribeToAdminNotifications = (onUpdate, onError) => {
  try {
    const q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        onUpdate(notifs);
      },
      (err) => {
        console.warn('Error al escuchar notificaciones de administrador:', err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('Error al suscribir a admin_notifications:', e);
    return () => {};
  }
};

/**
 * Marca una notificación de administrador como leída
 */
export const markAdminNotificationAsRead = async (notifId) => {
  if (!notifId) return;
  try {
    const notifRef = doc(db, 'admin_notifications', notifId);
    await updateDoc(notifRef, { read: true });
  } catch (e) {
    console.warn('No se pudo marcar notificación como leída:', e);
  }
};

/**
 * Registra que un usuario/estudiante confirmó haber recibido la notificación de verificación
 */
export const confirmUserNotificationReceipt = async (uid) => {
  if (!uid) return { success: false, error: 'No uid provided' };
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      notificationConfirmed: true,
      notificationConfirmedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (err) {
    console.error('Error al confirmar recepción de notificación:', err);
    return { success: false, error: err.message };
  }
};


