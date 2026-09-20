import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  addDoc,
  onSnapshot, 
  deleteField,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  ref as rtdbRef, 
  onValue as rtdbOnValue, 
  set as rtdbSet, 
  update as rtdbUpdate 
} from 'firebase/database';
import { db, rtdb } from './firebase';
import { 
  STORES, 
  getAllFromStore, 
  getFromStore, 
  putInStore, 
  putManyInStore, 
  deleteFromStore 
} from './indexedDbService';
import { deleteAttachmentFromStorage } from './storageService';

const META_DATA_REF = doc(db, 'metadata', 'data');
const META_SYNC_REF = doc(db, 'metadata', 'sync_meta');
const CONFIG_STRUCTURE_REF = doc(db, 'config', 'academic_structure');
const LOCAL_META_ID = 'global_meta';
const LOCAL_STRUCTURE_ID = 'academic_structure';
const RTDB_SYNC_PATH = 'sync_signal';

/**
 * Emite una señal ultraligera por RTDB (pesa ~50 bytes, 0 lecturas en Firestore)
 */
const broadcastRtdbSignal = async (payload = {}) => {
  try {
    if (!rtdb) return;
    const signalRef = rtdbRef(rtdb, RTDB_SYNC_PATH);
    const now = Date.now();
    await rtdbUpdate(signalRef, {
      v: now,
      lastUpdated: new Date().toISOString(),
      ...payload
    });
  } catch (err) {
    console.debug('Aviso RTDB signal:', err.message);
  }
};

/**
 * Inicializa la sincronización directa y robusta con Firestore + IndexedDB:
 * 1. Carga inmediata desde IndexedDB local (0 ms, inicio instantáneo).
 * 2. Suscripción en tiempo real a la colección de actividades y estructura en Firestore.
 * 3. Actualización automática de IndexedDB, Metadata y RTDB.
 */
export const initSync = (onDataUpdated, onError) => {
  let isUnsubscribed = false;
  let currentStructure = [];
  let currentActivities = [];
  let unsubActivities = null;
  let unsubStructure = null;

  // Paso 1: Carga instantánea desde IndexedDB local (0 ms)
  const loadLocalCache = async () => {
    try {
      const localActivities = await getAllFromStore(STORES.ACTIVITIES);
      const localStructureDoc = await getFromStore(STORES.ACADEMIC_STRUCTURE, LOCAL_STRUCTURE_ID);
      
      currentStructure = localStructureDoc ? (localStructureDoc.tetras || []) : [];
      currentActivities = localActivities || [];

      if (!isUnsubscribed && (currentActivities.length > 0 || currentStructure.length > 0)) {
        onDataUpdated({
          activities: currentActivities,
          academicStructure: currentStructure,
          isFromCache: true
        });
      }
    } catch (err) {
      console.warn('Advertencia al leer IndexedDB inicial:', err);
    }
  };

  loadLocalCache();

  let isInitialSnapshot = true;

  // Paso 2: Suscripción en tiempo real a la colección de actividades en Firestore
  try {
    const q = query(collection(db, 'activities'), orderBy('dueDate', 'asc'));
    unsubActivities = onSnapshot(
      q,
      async (snapshot) => {
        if (isUnsubscribed) return;

        const activities = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          status: docSnap.data().status || 'pending',
          ...docSnap.data()
        }));

        currentActivities = activities;

        // Persistir en IndexedDB local
        try {
          if (activities.length > 0) {
            await putManyInStore(STORES.ACTIVITIES, activities);
          }
          // Limpiar de IndexedDB cualquier actividad eliminada en Firestore
          const currentLocal = await getAllFromStore(STORES.ACTIVITIES);
          const remoteIds = new Set(activities.map(a => a.id));
          for (const localAct of currentLocal) {
            if (!remoteIds.has(localAct.id)) {
              await deleteFromStore(STORES.ACTIVITIES, localAct.id);
            }
          }
        } catch (dbErr) {
          console.warn('Error al sincronizar con IndexedDB local:', dbErr);
        }

        // Mantener sincronizado el documento metadata en background
        const actMap = {};
        activities.forEach(a => {
          actMap[a.id] = a.updatedAt || a.createdAt || new Date().toISOString();
        });
        const metaPayload = {
          activities: actMap,
          lastUpdated: new Date().toISOString()
        };
        Promise.allSettled([
          setDoc(META_DATA_REF, metaPayload, { merge: true }),
          setDoc(META_SYNC_REF, metaPayload, { merge: true }),
          broadcastRtdbSignal(metaPayload)
        ]).catch(() => {});

        // Detectar actividades recién añadidas para notificaciones (solo después de la carga inicial)
        let newlyAdded = [];
        if (!isInitialSnapshot) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              newlyAdded.push({ id: change.doc.id, ...data });
            }
          });
        }
        isInitialSnapshot = false;

        onDataUpdated({
          activities: currentActivities,
          academicStructure: currentStructure,
          isFromCache: false,
          newlyAddedActivities: newlyAdded,
          deltaStats: {
            cached: currentActivities.length
          }
        });
      },
      (err) => {
        console.error('Error en listener de actividades en Firestore:', err);
        if (onError && !isUnsubscribed) onError(err);
      }
    );
  } catch (err) {
    console.error('Error al configurar consulta de actividades:', err);
    if (onError && !isUnsubscribed) onError(err);
  }

  // Paso 3: Suscripción a la estructura académica en Firestore
  try {
    unsubStructure = onSnapshot(
      CONFIG_STRUCTURE_REF,
      async (snapshot) => {
        if (isUnsubscribed) return;

        if (snapshot.exists()) {
          const structData = snapshot.data();
          currentStructure = structData.tetras || [];
          try {
            await putInStore(STORES.ACADEMIC_STRUCTURE, {
              id: LOCAL_STRUCTURE_ID,
              tetras: currentStructure,
              updatedAt: structData.updatedAt || new Date().toISOString()
            });
          } catch (stErr) {
            console.warn('Error al guardar estructura en IndexedDB:', stErr);
          }

          onDataUpdated({
            activities: currentActivities,
            academicStructure: currentStructure,
            isFromCache: false
          });
        }
      },
      (err) => {
        console.warn('Aviso en listener de estructura académica:', err.message);
      }
    );
  } catch (err) {
    console.warn('Aviso al configurar listener de estructura:', err.message);
  }

  return () => {
    isUnsubscribed = true;
    if (unsubActivities) unsubActivities();
    if (unsubStructure) unsubStructure();
  };
};

/**
 * Inicializa el documento 'metadata/sync_meta' si el proyecto es nuevo o no tiene meta
 */
const initializeMetaDocument = async () => {
  try {
    const actSnap = await getDocs(collection(db, 'activities'));
    const actMap = {};
    const activitiesList = [];
    actSnap.forEach((docSnap) => {
      const data = docSnap.data();
      actMap[docSnap.id] = data.updatedAt || data.createdAt || new Date().toISOString();
      activitiesList.push({ id: docSnap.id, status: data.status || 'pending', ...data });
    });

    if (activitiesList.length > 0) {
      await putManyInStore(STORES.ACTIVITIES, activitiesList);
    }

    const initialMeta = {
      structure_updatedAt: new Date().toISOString(),
      activities: actMap,
      lastUpdated: new Date().toISOString()
    };
    await Promise.allSettled([
      setDoc(META_DATA_REF, initialMeta, { merge: true }),
      setDoc(META_SYNC_REF, initialMeta, { merge: true })
    ]);

    // Emitir señal a RTDB
    await broadcastRtdbSignal(initialMeta);
  } catch (err) {
    console.warn('No se pudo inicializar documento meta en Firestore:', err);
  }
};

/**
 * Crea una nueva actividad escolar y actualiza el documento meta y señal RTDB
 */
export const createActivityWithSync = async (activityData, user) => {
  const timestamp = new Date().toISOString();
  
  const newActivity = {
    title: activityData.title.trim(),
    tetraId: activityData.tetraId || '',
    tetraName: activityData.tetraName || '',
    subject: activityData.subject,
    teacher: (activityData.teacher || '').trim(),
    type: activityData.type || 'actividad_formativa',
    status: activityData.status || 'pending',
    dueDate: activityData.dueDate,
    directUrl: (activityData.directUrl || activityData.meetingUrl || activityData.examUrl || activityData.forumUrl || '').trim(),
    description: (activityData.description || '').trim(),
    links: activityData.links || [],
    attachments: activityData.attachments || [],
    createdById: user ? user.uid : null,
    createdByName: user ? (user.displayName || user.email) : 'Usuario',
    createdByEmail: user ? user.email : null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  // 1. Guardar documento en Firestore
  const docRef = await addDoc(collection(db, 'activities'), newActivity);
  const createdActivity = { id: docRef.id, ...newActivity };

  // 2. Actualizar documento 'data' y 'sync_meta' en Firestore
  const metaUpdate = {
    [`activities.${docRef.id}`]: timestamp,
    lastUpdated: timestamp
  };
  await Promise.allSettled([
    setDoc(META_DATA_REF, metaUpdate, { merge: true }),
    setDoc(META_SYNC_REF, metaUpdate, { merge: true })
  ]);

  // 3. Emitir señal a RTDB (0 lecturas en Firestore para los demás)
  await broadcastRtdbSignal({
    [`activities/${docRef.id}`]: timestamp
  });

  // 4. Guardar de inmediato en IndexedDB local
  await putInStore(STORES.ACTIVITIES, createdActivity);

  return createdActivity;
};

/**
 * Actualiza una actividad existente y su marca de tiempo en el meta y RTDB
 */
export const updateActivityWithSync = async (id, activityData) => {
  const timestamp = new Date().toISOString();
  
  const dataToUpdate = {
    ...activityData,
    updatedAt: timestamp
  };
  delete dataToUpdate.id;

  // 1. Actualizar en Firestore
  const docRef = doc(db, 'activities', id);
  await updateDoc(docRef, dataToUpdate);

  // 2. Actualizar en meta (data y sync_meta)
  const metaUpdate = {
    [`activities.${id}`]: timestamp,
    lastUpdated: timestamp
  };
  await Promise.allSettled([
    setDoc(META_DATA_REF, metaUpdate, { merge: true }),
    setDoc(META_SYNC_REF, metaUpdate, { merge: true })
  ]);

  // 3. Emitir señal a RTDB
  await broadcastRtdbSignal({
    [`activities/${id}`]: timestamp
  });

  // 4. Actualizar en IndexedDB
  const fullUpdated = { id, ...dataToUpdate };
  await putInStore(STORES.ACTIVITIES, fullUpdated);

  return fullUpdated;
};

/**
 * Actualiza el estado de la actividad y sincroniza meta y RTDB
 */
export const updateActivityStatusWithSync = async (id, newStatus) => {
  const timestamp = new Date().toISOString();
  const docRef = doc(db, 'activities', id);
  
  await updateDoc(docRef, {
    status: newStatus,
    updatedAt: timestamp
  });

  const metaUpdate = {
    [`activities.${id}`]: timestamp,
    lastUpdated: timestamp
  };
  await Promise.allSettled([
    setDoc(META_DATA_REF, metaUpdate, { merge: true }),
    setDoc(META_SYNC_REF, metaUpdate, { merge: true })
  ]);

  // Emitir señal a RTDB
  await broadcastRtdbSignal({
    [`activities/${id}`]: timestamp
  });

  // Actualizar en IndexedDB local
  const current = await getFromStore(STORES.ACTIVITIES, id);
  if (current) {
    await putInStore(STORES.ACTIVITIES, { ...current, status: newStatus, updatedAt: timestamp });
  }
};

/**
 * Elimina una actividad de Firestore, Storage, Meta, RTDB e IndexedDB
 */
export const deleteActivityWithSync = async (activity) => {
  if (!activity || !activity.id) return;

  // 1. Borrar archivos adjuntos en Storage
  if (activity.attachments && Array.isArray(activity.attachments)) {
    const deletePromises = activity.attachments
      .filter((file) => file.storagePath)
      .map((file) => deleteAttachmentFromStorage(file.storagePath));
    await Promise.allSettled(deletePromises);
  }

  // 2. Borrar documento en Firestore
  const docRef = doc(db, 'activities', activity.id);
  await deleteDoc(docRef);

  // 3. Eliminar de meta en Firestore (data y sync_meta)
  const metaDelete = {
    [`activities.${activity.id}`]: deleteField(),
    lastUpdated: new Date().toISOString()
  };
  await Promise.allSettled([
    updateDoc(META_DATA_REF, metaDelete).catch(() => {}),
    updateDoc(META_SYNC_REF, metaDelete).catch(() => {})
  ]);

  // 4. Actualizar RTDB
  await broadcastRtdbSignal({
    [`activities/${activity.id}`]: null
  });

  // 5. Borrar de IndexedDB
  await deleteFromStore(STORES.ACTIVITIES, activity.id);
};

/**
 * Guarda la estructura académica de Tetramestres y Materias
 */
export const saveAcademicStructureWithSync = async (tetras) => {
  const timestamp = new Date().toISOString();

  // 1. Guardar en Firestore config
  await setDoc(CONFIG_STRUCTURE_REF, {
    id: LOCAL_STRUCTURE_ID,
    tetras,
    updatedAt: timestamp
  }, { merge: true });

  // 2. Actualizar meta (data y sync_meta)
  const metaUpdate = {
    structure_updatedAt: timestamp,
    lastUpdated: timestamp
  };
  await Promise.allSettled([
    setDoc(META_DATA_REF, metaUpdate, { merge: true }),
    setDoc(META_SYNC_REF, metaUpdate, { merge: true })
  ]);

  // 3. Emitir señal a RTDB
  await broadcastRtdbSignal({
    structure_updatedAt: timestamp
  });

  // 4. Guardar en IndexedDB
  await putInStore(STORES.ACADEMIC_STRUCTURE, {
    id: LOCAL_STRUCTURE_ID,
    tetras,
    updatedAt: timestamp
  });

  return tetras;
};
