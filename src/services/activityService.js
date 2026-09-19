import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { deleteAttachmentFromStorage } from './storageService';

const COLLECTION_NAME = 'activities';

/**
 * Suscripción en tiempo real a la lista de actividades ordenadas por fecha límite
 */
export const subscribeToActivities = (onSuccess, onError) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('dueDate', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const activities = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onSuccess(activities);
      },
      (error) => {
        console.error('Error al escuchar actividades en Firestore:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error('Error al configurar consulta de actividades:', err);
    if (onError) onError(err);
    // Retornar noop unsubscribe
    return () => {};
  }
};

/**
 * Crea una nueva actividad escolar
 */
export const createActivity = async (activityData, user) => {
  const newActivity = {
    title: activityData.title.trim(),
    subject: activityData.subject,
    teacher: (activityData.teacher || '').trim(),
    type: activityData.type || 'actividad_formativa',
    status: activityData.status || 'pending',
    dueDate: activityData.dueDate, // ISO string (YYYY-MM-DDTHH:mm)
    description: (activityData.description || '').trim(),
    links: activityData.links || [],
    attachments: activityData.attachments || [],
    createdById: user ? user.uid : null,
    createdByName: user ? (user.displayName || user.email) : 'Usuario',
    createdByEmail: user ? user.email : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newActivity);
  return { id: docRef.id, ...newActivity };
};

/**
 * Actualiza una actividad existente
 */
export const updateActivity = async (id, activityData) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const dataToUpdate = {
    ...activityData,
    updatedAt: new Date().toISOString()
  };

  // Limpiar campos que no deben sobrescribirse
  delete dataToUpdate.id;

  await updateDoc(docRef, dataToUpdate);
  return { id, ...dataToUpdate };
};

/**
 * Actualiza únicamente el estado de la actividad (ej. desde Kanban o lista)
 */
export const updateActivityStatus = async (id, newStatus) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    status: newStatus,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Elimina una actividad y sus archivos adjuntos en Storage
 */
export const deleteActivity = async (activity) => {
  if (!activity || !activity.id) return;

  // 1. Borrar archivos adjuntos en Firebase Storage
  if (activity.attachments && Array.isArray(activity.attachments)) {
    const deletePromises = activity.attachments
      .filter((file) => file.storagePath)
      .map((file) => deleteAttachmentFromStorage(file.storagePath));
    await Promise.allSettled(deletePromises);
  }

  // 2. Borrar documento en Firestore
  const docRef = doc(db, COLLECTION_NAME, activity.id);
  await deleteDoc(docRef);
};
