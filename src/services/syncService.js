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
 * Inicializa la sincronización Delta ultra-eficiente:
 * 1. Carga inmediata desde IndexedDB (0 lecturas de Firestore, latencia instantánea).
 * 2. Escucha UN SOLO documento de metadata ('metadata/sync_meta') en tiempo real (1 sola lectura).
 * 3. Compara el mapa de versiones con IndexedDB y descarga ÚNICAMENTE los documentos modificados o nuevos.
 */
export const initSync = (onDataUpdated, onError) => {
  let isUnsubscribed = false;
  let currentStructure = [];
  let currentActivities = [];

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

  // Paso 2: Escuchar ÚNICAMENTE el documento de metadata ('metadata/sync_meta')
  // Esto consume 1 sola lectura al conectar en lugar de leer toda la base de datos
  const unsubMeta = onSnapshot(
    META_SYNC_REF,
    async (snapshot) => {
      try {
        if (!snapshot.exists()) {
          // Si el documento meta aún no existe (proyecto nuevo), inicializarlo
          await initializeMetaDocument();
          return;
        }

        const remoteMeta = snapshot.data() || {};
        const remoteActivitiesMap = remoteMeta.activities || {};
        const remoteStructureUpdated = remoteMeta.structure_updatedAt || '';

        // Obtener estado local de IndexedDB
        const localActivities = await getAllFromStore(STORES.ACTIVITIES);
        const localStructureDoc = await getFromStore(STORES.ACADEMIC_STRUCTURE, LOCAL_STRUCTURE_ID);
        const localActMap = new Map((localActivities || []).map((a) => [a.id, a]));

        // Detectar qué actividades necesitan ser descargadas (nuevas o actualizadas)
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

        // Descargar ÚNICAMENTE los documentos que cambiaron
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
          lastUpdated: remoteMeta.lastUpdated || new Date().toISOString()
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
        console.error('Error en sincronización Delta:', err);
        if (onError && !isUnsubscribed) onError(err);
      }
    },
    (err) => {
      console.error('Error al escuchar metadata en Firestore:', err);
      if (onError && !isUnsubscribed) onError(err);
    }
  );

  return () => {
    isUnsubscribed = true;
    unsubMeta();
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
