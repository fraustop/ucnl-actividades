import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadAttachment } from './storageService';
import { getEmbedInfo } from './activityWorkspaceService';

const SUBJECT_RESOURCES_COLLECTION = collection(db, 'subject_resources');

/**
 * Genera el ID único determinista para el documento de recursos de una materia
 */
export const getSubjectResourceDocId = (tetraId, subjectId) => {
  const cleanTetra = String(tetraId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanSub = String(subjectId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sr_${cleanTetra}_${cleanSub}`;
};

/**
 * Suscribirse a los recursos de una materia específica en tiempo real
 */
export const subscribeToSubjectResources = (tetraId, subjectId, onUpdate, onError) => {
  if (!tetraId || !subjectId) {
    if (onUpdate) onUpdate(null);
    return () => {};
  }

  const docId = getSubjectResourceDocId(tetraId, subjectId);
  const docRef = doc(db, 'subject_resources', docId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate({
          id: docSnap.id,
          ...docSnap.data()
        });
      } else {
        onUpdate({
          id: docId,
          tetraId,
          subjectId,
          attachments: [],
          links: [],
          description: '',
          updatedAt: null
        });
      }
    },
    (err) => {
      console.warn(`Error al suscribirse a recursos de materia (${tetraId}, ${subjectId}):`, err);
      if (onError) onError(err);
    }
  );
};

/**
 * Suscribirse a todos los recursos de materias en tiempo real (para conteos e insignias)
 */
export const subscribeToAllSubjectResources = (onUpdate, onError) => {
  return onSnapshot(
    SUBJECT_RESOURCES_COLLECTION,
    (snapshot) => {
      const allResources = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const key = `${data.tetraId}_${data.subjectId}`;
        allResources[key] = {
          id: docSnap.id,
          ...data,
          totalCount: (data.attachments?.length || 0) + (data.links?.length || 0)
        };
      });
      if (onUpdate) onUpdate(allResources);
    },
    (err) => {
      console.warn('Error al suscribirse a todas las materias con recursos:', err);
      if (onError) onError(err);
    }
  );
};

/**
 * Subir un archivo adjunto a Cloudinary y registrarlo en los recursos de la materia
 */
export const uploadAndAddSubjectAttachment = async (
  tetraId, 
  tetraName, 
  subjectId, 
  subjectName, 
  subjectCode, 
  file, 
  user, 
  onProgress = () => {}
) => {
  if (!tetraId || !subjectId || !file) {
    throw new Error('Parámetros incompletos para subir archivo a la materia.');
  }

  const folderId = `subject_${tetraId}_${subjectId}`;
  const fileMetadata = await uploadAttachment(file, folderId, onProgress);

  const docId = getSubjectResourceDocId(tetraId, subjectId);
  const docRef = doc(db, 'subject_resources', docId);

  const attachment = {
    ...fileMetadata,
    uploadedBy: user ? (user.displayName || user.email) : 'Docente / Admin',
    uploadedById: user ? user.uid : null
  };

  const timestamp = new Date().toISOString();

  await setDoc(
    docRef,
    {
      tetraId,
      tetraName: tetraName || '',
      subjectId,
      subjectName: subjectName || '',
      subjectCode: subjectCode || '',
      attachments: arrayUnion(attachment),
      updatedAt: timestamp,
      updatedBy: user ? (user.displayName || user.email) : 'Docente / Admin'
    },
    { merge: true }
  );

  return attachment;
};

/**
 * Eliminar un archivo adjunto de los recursos de la materia
 */
export const deleteSubjectAttachment = async (tetraId, subjectId, attachmentId) => {
  if (!tetraId || !subjectId || !attachmentId) return;

  const docId = getSubjectResourceDocId(tetraId, subjectId);
  const docRef = doc(db, 'subject_resources', docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return;

  const data = docSnap.data();
  const currentAttachments = data.attachments || [];
  const updatedAttachments = currentAttachments.filter(a => a.id !== attachmentId);

  await updateDoc(docRef, {
    attachments: updatedAttachments,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Agregar un enlace web o video a la materia
 */
export const addSubjectLink = async (
  tetraId, 
  tetraName, 
  subjectId, 
  subjectName, 
  subjectCode, 
  linkData, 
  user
) => {
  if (!tetraId || !subjectId || !linkData?.url) {
    throw new Error('Se requiere una URL válida.');
  }

  let formattedUrl = linkData.url.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }

  const embedInfo = getEmbedInfo(formattedUrl, linkData.title);
  const timestamp = new Date().toISOString();

  const newLink = {
    id: `lnk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: (linkData.title || '').trim() || embedInfo.title || formattedUrl,
    url: formattedUrl,
    type: embedInfo.type || 'link',
    platform: embedInfo.platform || 'Web',
    createdAt: timestamp,
    createdBy: user ? (user.displayName || user.email) : 'Docente / Admin'
  };

  const docId = getSubjectResourceDocId(tetraId, subjectId);
  const docRef = doc(db, 'subject_resources', docId);

  await setDoc(
    docRef,
    {
      tetraId,
      tetraName: tetraName || '',
      subjectId,
      subjectName: subjectName || '',
      subjectCode: subjectCode || '',
      links: arrayUnion(newLink),
      updatedAt: timestamp,
      updatedBy: user ? (user.displayName || user.email) : 'Docente / Admin'
    },
    { merge: true }
  );

  return newLink;
};

/**
 * Eliminar un enlace de la materia
 */
export const deleteSubjectLink = async (tetraId, subjectId, linkId) => {
  if (!tetraId || !subjectId || !linkId) return;

  const docId = getSubjectResourceDocId(tetraId, subjectId);
  const docRef = doc(db, 'subject_resources', docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return;

  const data = docSnap.data();
  const currentLinks = data.links || [];
  const updatedLinks = currentLinks.filter(l => l.id !== linkId);

  await updateDoc(docRef, {
    links: updatedLinks,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Actualizar la descripción o programa oficial de la materia
 */
export const updateSubjectDescription = async (
  tetraId, 
  tetraName, 
  subjectId, 
  subjectName, 
  subjectCode, 
  description, 
  user
) => {
  const docId = getSubjectResourceDocId(tetraId, subjectId);
  const docRef = doc(db, 'subject_resources', docId);
  const timestamp = new Date().toISOString();

  await setDoc(
    docRef,
    {
      tetraId,
      tetraName: tetraName || '',
      subjectId,
      subjectName: subjectName || '',
      subjectCode: subjectCode || '',
      description: (description || '').trim(),
      updatedAt: timestamp,
      updatedBy: user ? (user.displayName || user.email) : 'Docente / Admin'
    },
    { merge: true }
  );
};
