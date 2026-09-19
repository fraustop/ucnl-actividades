import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';

const RESOURCES_COLLECTION = collection(db, 'resources');

/**
 * Suscribirse a la lista de recursos en tiempo real
 */
export const subscribeToResources = (onUpdate, onError) => {
  try {
    const q = query(RESOURCES_COLLECTION, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const resources = [];
        snapshot.forEach((docSnap) => {
          resources.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
        onUpdate(resources);
      },
      (err) => {
        console.warn('Error al suscribirse a recursos:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Excepción al crear query de recursos:', err);
    // Fallback sin orderBy en caso de falta de índice inicial
    return onSnapshot(
      RESOURCES_COLLECTION,
      (snapshot) => {
        const resources = [];
        snapshot.forEach((docSnap) => {
          resources.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
        resources.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onUpdate(resources);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  }
};

/**
 * Crear un nuevo recurso o enlace a archivo
 */
export const createResource = async (resourceData, user) => {
  const timestamp = new Date().toISOString();
  
  let formattedUrl = (resourceData.url || '').trim();
  if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }

  const newResource = {
    title: (resourceData.title || '').trim(),
    description: (resourceData.description || '').trim(),
    url: formattedUrl,
    category: resourceData.category || 'General',
    createdById: user ? user.uid : null,
    createdByName: user ? (user.displayName || user.email) : 'Administrador',
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const docRef = await addDoc(RESOURCES_COLLECTION, newResource);
  return { id: docRef.id, ...newResource };
};

/**
 * Actualizar un recurso existente
 */
export const updateResource = async (resourceId, resourceData) => {
  const timestamp = new Date().toISOString();
  
  let formattedUrl = (resourceData.url || '').trim();
  if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }

  const dataToUpdate = {
    title: (resourceData.title || '').trim(),
    description: (resourceData.description || '').trim(),
    url: formattedUrl,
    category: resourceData.category || 'General',
    updatedAt: timestamp
  };

  const docRef = doc(db, 'resources', resourceId);
  await updateDoc(docRef, dataToUpdate);
  return { id: resourceId, ...dataToUpdate };
};

/**
 * Eliminar un recurso
 */
export const deleteResource = async (resourceId) => {
  const docRef = doc(db, 'resources', resourceId);
  await deleteDoc(docRef);
  return resourceId;
};
