import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  addDoc,
  onSnapshot, 
  deleteField 
} from 'firebase/firestore';
import { db } from './firebase';
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

/**
 * Inicializa la sincronización de alta fidelidad:
 * 1. Carga inmediata desde IndexedDB (0 latencia).
 * 2. Escucha en tiempo real la colección 'activities' y la configuración en Firestore.
 * 3. Mantiene actualizados IndexedDB y los documentos 'metadata/data' y 'metadata/sync_meta'.
 */
export const initSync = (onDataUpdated, onError) => {
  let isUnsubscribed = false;
  let currentStructure = [];
  let currentActivities = [];

  // Paso 1: Carga instantánea desde IndexedDB
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

  // Paso 2: Escuchar estructura académica en Firestore
  const unsubStructure = onSnapshot(
    CONFIG_STRUCTURE_REF,
    async (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.data();
          currentStructure = data.tetras || [];
          await putInStore(STORES.ACADEMIC_STRUCTURE, {
            id: LOCAL_STRUCTURE_ID,
            tetras: currentStructure,
            updatedAt: data.updatedAt || new Date().toISOString()
          });

          if (!isUnsubscribed) {
            onDataUpdated({
              activities: currentActivities,
              academicStructure: currentStructure,
              isFromCache: false
            });
          }
        }
      } catch (err) {
        console.warn('Error al sincronizar estructura académica:', err);
      }
    },
    (err) => console.warn('Error en snapshot estructura:', err)
  );

  // Paso 3: Escuchar actividades en tiempo real de Firestore
  let isInitialActivitiesSnapshot = true;

  const unsubActivities = onSnapshot(
    collection(db, 'activities'),
    async (snapshot) => {
      try {
        const firestoreActivities = [];
        const metaActivitiesMap = {};
        const remoteIds = new Set();
        const newlyAddedActivities = [];

        // Detectar si se añadieron documentos nuevos en tiempo real (posteriores a la carga inicial)
        if (!isInitialActivitiesSnapshot) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              newlyAddedActivities.push({ id: change.doc.id, ...change.doc.data() });
            }
          });
        }
        isInitialActivitiesSnapshot = false;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const activity = {
            id: docSnap.id,
            status: data.status || 'pending',
            ...data
          };
          firestoreActivities.push(activity);
          remoteIds.add(docSnap.id);
          metaActivitiesMap[docSnap.id] = data.updatedAt || data.createdAt || new Date().toISOString();
        });

        // 1. Guardar todas las actividades remotas en IndexedDB
        if (firestoreActivities.length > 0) {
          await putManyInStore(STORES.ACTIVITIES, firestoreActivities);
        }

        // 2. Limpiar de IndexedDB las que fueron eliminadas remotamente
        const localActivities = await getAllFromStore(STORES.ACTIVITIES);
        for (const localAct of localActivities) {
          if (!remoteIds.has(localAct.id)) {
            await deleteFromStore(STORES.ACTIVITIES, localAct.id);
          }
        }

        // 3. Sincronizar documento metadata/data y metadata/sync_meta
        const metaPayload = {
          activities: metaActivitiesMap,
          total: firestoreActivities.length,
          lastUpdated: new Date().toISOString()
        };
        await putInStore(STORES.SYNC_META, { id: LOCAL_META_ID, ...metaPayload });

        currentActivities = firestoreActivities;

        if (!isUnsubscribed) {
          onDataUpdated({
            activities: currentActivities,
            academicStructure: currentStructure,
            isFromCache: false,
            newlyAddedActivities,
            deltaStats: {
              fetched: firestoreActivities.length,
              cached: firestoreActivities.length
            }
          });
        }
      } catch (err) {
        console.error('Error al procesar actividades de Firestore:', err);
        if (onError && !isUnsubscribed) onError(err);
      }
    },
    (err) => {
      console.error('Error al escuchar colección activities en Firestore:', err);
      if (onError && !isUnsubscribed) onError(err);
    }
  );

  return () => {
    isUnsubscribed = true;
    unsubStructure();
    unsubActivities();
  };
};

/**
 * Inicializa el documento 'metadata/sync_meta' si el proyecto es nuevo
 */
const initializeMetaDocument = async () => {
  try {
    const initialMeta = {
      structure_updatedAt: new Date().toISOString(),
      activities: {},
      lastUpdated: new Date().toISOString()
    };
    await Promise.allSettled([
      setDoc(META_DATA_REF, initialMeta, { merge: true }),
      setDoc(META_SYNC_REF, initialMeta, { merge: true })
    ]);
    
    // Guardar estructura inicial en Firestore config
    await setDoc(CONFIG_STRUCTURE_REF, {
      id: LOCAL_STRUCTURE_ID,
      tetras: [],
      updatedAt: initialMeta.structure_updatedAt
    }, { merge: true });
  } catch (err) {
    console.warn('No se pudo inicializar documento meta en Firestore:', err);
  }
};

/**
 * Crea una nueva actividad escolar y actualiza el documento meta
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

  // 3. Guardar de inmediato en IndexedDB
  await putInStore(STORES.ACTIVITIES, createdActivity);

  return createdActivity;
};

/**
 * Actualiza una actividad existente y su marca de tiempo en el meta
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

  // 3. Actualizar en IndexedDB
  const fullUpdated = { id, ...dataToUpdate };
  await putInStore(STORES.ACTIVITIES, fullUpdated);

  return fullUpdated;
};

/**
 * Actualiza el estado de la actividad y sincroniza meta
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

  // Actualizar en IndexedDB local
  const current = await getFromStore(STORES.ACTIVITIES, id);
  if (current) {
    await putInStore(STORES.ACTIVITIES, { ...current, status: newStatus, updatedAt: timestamp });
  }
};

/**
 * Elimina una actividad de Firestore, Storage, Meta e IndexedDB
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

  // 4. Borrar de IndexedDB
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

  // 3. Guardar en IndexedDB
  await putInStore(STORES.ACADEMIC_STRUCTURE, {
    id: LOCAL_STRUCTURE_ID,
    tetras,
    updatedAt: timestamp
  });

  return tetras;
};
