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
  deleteField 
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
    // RTDB es complementario, si está desconectado continúa con Firestore
    console.debug('Aviso RTDB signal:', err.message);
  }
};

/**
 * Inicializa la sincronización Delta ultra-eficiente con RTDB + Firestore + IndexedDB:
 * 1. Carga inmediata desde IndexedDB local (0 lecturas a Firestore, 0 ms).
 * 2. Comprobación ultraligera por RTDB (pesa ~50 bytes, 0 lecturas a Firestore).
 * 3. Si no hay cambios: 0 lecturas en Firestore.
 * 4. Si hay cambios: Descarga ÚNICAMENTE el documento modificado y lo guarda en IndexedDB.
 */
export const initSync = (onDataUpdated, onError) => {
  let isUnsubscribed = false;
  let currentStructure = [];
  let currentActivities = [];
  let unsubFirestoreMeta = null;

  // Paso 1: Carga instantánea desde IndexedDB local (0 lecturas)
  const loadLocalCache = async () => {
    try {
      const localActivities = await getAllFromStore(STORES.ACTIVITIES);
      const localStructureDoc = await getFromStore(STORES.ACADEMIC_STRUCTURE, LOCAL_STRUCTURE_ID);
      
      currentStructure = localStructureDoc ? (localStructureDoc.tetras || []) : [];
      currentActivities = localActivities || [];

      if (!isUnsubscribed) {
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

  // Función para procesar metadata y sincronizar delta a IndexedDB
  const processDeltaSync = async (remoteActivitiesMap, remoteStructureUpdated, remoteLastUpdated) => {
    try {
      const localActivities = await getAllFromStore(STORES.ACTIVITIES);
      const localStructureDoc = await getFromStore(STORES.ACADEMIC_STRUCTURE, LOCAL_STRUCTURE_ID);
      const localActMap = new Map((localActivities || []).map((a) => [a.id, a]));

      // Detectar qué actividades necesitan ser descargadas (nuevas o modificadas)
      const idsToFetch = [];
      for (const [actId, remoteUpdatedAt] of Object.entries(remoteActivitiesMap)) {
        const localAct = localActMap.get(actId);
        if (!localAct || (localAct.updatedAt || localAct.createdAt) !== remoteUpdatedAt) {
          idsToFetch.push(actId);
        }
      }

      // Detectar qué actividades fueron eliminadas remotamente
      const idsToDelete = [];
      for (const localAct of localActivities) {
        if (!remoteActivitiesMap[localAct.id]) {
          idsToDelete.push(localAct.id);
        }
      }

      // Detectar si la estructura académica (Tetras/Materias) cambió
      const structureChanged = remoteStructureUpdated && (!localStructureDoc || localStructureDoc.updatedAt !== remoteStructureUpdated);

      let newlyAddedActivities = [];

      // Descargar ÚNICAMENTE los documentos que cambiaron de Firestore
      if (idsToFetch.length > 0) {
        const fetchPromises = idsToFetch.map(async (actId) => {
          try {
            const docSnap = await getDoc(doc(db, 'activities', actId));
            if (docSnap.exists()) {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                status: data.status || 'pending',
                ...data
              };
            }
          } catch (fetchErr) {
            console.warn(`Error al descargar actividad delta ${actId}:`, fetchErr);
          }
          return null;
        });

        const fetchedResults = await Promise.all(fetchPromises);
        const validFetched = fetchedResults.filter(Boolean);

        if (validFetched.length > 0) {
          await putManyInStore(STORES.ACTIVITIES, validFetched);
          newlyAddedActivities = validFetched;
        }
      }

      // Eliminar de IndexedDB las actividades que ya no existen
      if (idsToDelete.length > 0) {
        for (const delId of idsToDelete) {
          await deleteFromStore(STORES.ACTIVITIES, delId);
        }
      }

      // Si la estructura cambió, descargar solo ese documento
      if (structureChanged) {
        try {
          const structSnap = await getDoc(CONFIG_STRUCTURE_REF);
          if (structSnap.exists()) {
            const structData = structSnap.data();
            currentStructure = structData.tetras || [];
            await putInStore(STORES.ACADEMIC_STRUCTURE, {
              id: LOCAL_STRUCTURE_ID,
              tetras: currentStructure,
              updatedAt: remoteStructureUpdated
            });
          }
        } catch (structErr) {
          console.warn('Error al descargar estructura académica:', structErr);
        }
      }

      // Guardar metadata local actualizada en IndexedDB
      await putInStore(STORES.SYNC_META, {
        id: LOCAL_META_ID,
        activities: remoteActivitiesMap,
        structure_updatedAt: remoteStructureUpdated,
        lastUpdated: remoteLastUpdated || new Date().toISOString()
      });

      // Obtener la lista definitiva desde IndexedDB local
      currentActivities = await getAllFromStore(STORES.ACTIVITIES);

      if (!isUnsubscribed) {
        onDataUpdated({
          activities: currentActivities,
          academicStructure: currentStructure,
          isFromCache: false,
          newlyAddedActivities: idsToFetch.length > 0 ? newlyAddedActivities : [],
          deltaStats: {
            fetched: idsToFetch.length,
            cached: currentActivities.length
          }
        });
      }
    } catch (err) {
      console.error('Error en procesamiento Delta:', err);
      if (onError && !isUnsubscribed) onError(err);
    }
  };

  // Paso 2: Conectar con RTDB como semáforo primario ultraligero (~50 bytes, 0 lecturas en Firestore)
  let unsubRtdb = null;
  try {
    if (rtdb) {
      const signalRef = rtdbRef(rtdb, RTDB_SYNC_PATH);
      unsubRtdb = rtdbOnValue(
        signalRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            const signalData = snapshot.val() || {};
            const remoteActivitiesMap = signalData.activities || {};
            const remoteStructureUpdated = signalData.structure_updatedAt || '';
            await processDeltaSync(remoteActivitiesMap, remoteStructureUpdated, signalData.lastUpdated);
          } else {
            // Si RTDB no tiene señal aún, consultar Firestore metadata una sola vez para inicializar
            connectFirestoreFallback();
          }
        },
        (rtdbErr) => {
          console.debug('RTDB no disponible, activando Firestore metadata listener:', rtdbErr.message);
          connectFirestoreFallback();
        }
      );
    } else {
      connectFirestoreFallback();
    }
  } catch (err) {
    connectFirestoreFallback();
  }

  // Fallback con Firestore Metadata si RTDB no está activo
  function connectFirestoreFallback() {
    if (unsubFirestoreMeta || isUnsubscribed) return;
    unsubFirestoreMeta = onSnapshot(
      META_SYNC_REF,
      async (snapshot) => {
        if (!snapshot.exists()) {
          await initializeMetaDocument();
          return;
        }
        const remoteMeta = snapshot.data() || {};
        const remoteActivitiesMap = remoteMeta.activities || {};
        const remoteStructureUpdated = remoteMeta.structure_updatedAt || '';
        await processDeltaSync(remoteActivitiesMap, remoteStructureUpdated, remoteMeta.lastUpdated);
      },
      (err) => {
        console.error('Error al escuchar metadata en Firestore:', err);
        if (onError && !isUnsubscribed) onError(err);
      }
    );
  }

  return () => {
    isUnsubscribed = true;
    if (unsubRtdb) unsubRtdb();
    if (unsubFirestoreMeta) unsubFirestoreMeta();
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
