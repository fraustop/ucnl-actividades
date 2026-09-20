import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  query, 
  orderBy, 
  updateDoc 
} from 'firebase/firestore';
import { ref as rtdbRef, update as rtdbUpdate } from 'firebase/database';
import { db, rtdb } from './firebase';
import { uploadAttachment } from './storageService';
import { 
  STORES, 
  getAllFromStore, 
  getFromStore, 
  putInStore, 
  deleteFromStore 
} from './indexedDbService';

export const FIRESTORE_DOC_MAX_BYTES = 1048576; // 1 MB (1,048,576 bytes)
export const WARNING_DOC_BYTES_THRESHOLD = 891289; // 85% de 1 MB (~870 KB)

/**
 * Detecta y genera la información de embebido y tipo de recurso para máxima compatibilidad
 */
export const getEmbedInfo = (url = '', title = '') => {
  if (!url || typeof url !== 'string') {
    return { type: 'unknown', originalUrl: '', embedUrl: null, title: 'Recurso no disponible' };
  }

  const cleanUrl = url.trim();
  const lowerUrl = cleanUrl.toLowerCase();

  // 1. YouTube
  // Formatos: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      platform: 'YouTube',
      videoId: videoId,
      originalUrl: cleanUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
      title: title || 'Video de YouTube',
      icon: 'video'
    };
  }

  // 2. Vimeo
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[3]) {
    const vimeoId = vimeoMatch[3];
    return {
      type: 'vimeo',
      platform: 'Vimeo',
      videoId: vimeoId,
      originalUrl: cleanUrl,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
      title: title || 'Video de Vimeo',
      icon: 'video'
    };
  }

  // 3. Loom
  const loomMatch = cleanUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  if (loomMatch && loomMatch[1]) {
    return {
      type: 'loom',
      platform: 'Loom',
      videoId: loomMatch[1],
      originalUrl: cleanUrl,
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
      title: title || 'Video de Loom',
      icon: 'video'
    };
  }

  // 4. Google Drive / Docs / Sheets / Slides
  if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com')) {
    let embedUrl = cleanUrl;
    // Drive file view -> preview
    if (cleanUrl.includes('/file/d/')) {
      embedUrl = cleanUrl.replace(/\/view(\?.*)?$/i, '/preview').replace(/\/edit(\?.*)?$/i, '/preview');
      if (!embedUrl.includes('/preview')) {
        embedUrl = embedUrl.replace(/\/$/, '') + '/preview';
      }
    } else if (cleanUrl.includes('id=')) {
      const idMatch = cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        embedUrl = `https://drive.google.com/file/d/${idMatch[1]}/preview`;
      }
    } else if (cleanUrl.includes('/document/d/') || cleanUrl.includes('/spreadsheets/d/') || cleanUrl.includes('/presentation/d/')) {
      embedUrl = cleanUrl.replace(/\/edit(\?.*)?$/i, '/preview').replace(/\/view(\?.*)?$/i, '/preview');
    }

    return {
      type: 'gdrive',
      platform: 'Google Drive',
      originalUrl: cleanUrl,
      embedUrl: embedUrl,
      title: title || 'Documento de Google',
      icon: 'file'
    };
  }

  // 5. Video directo (MP4, WebM, OGG, MOV)
  if (/\.(mp4|webm|ogg|mov)($|\?)/i.test(lowerUrl)) {
    return {
      type: 'video_direct',
      platform: 'Video Directo',
      originalUrl: cleanUrl,
      embedUrl: cleanUrl,
      title: title || 'Reproductor de Video',
      icon: 'video'
    };
  }

  // 6. Audio directo (MP3, WAV, OGG, AAC)
  if (/\.(mp3|wav|ogg|aac|m4a)($|\?)/i.test(lowerUrl)) {
    return {
      type: 'audio_direct',
      platform: 'Audio Directo',
      originalUrl: cleanUrl,
      embedUrl: cleanUrl,
      title: title || 'Reproductor de Audio',
      icon: 'audio'
    };
  }

  // 7. Imágenes directas (PNG, JPG, JPEG, GIF, WebP, SVG)
  if (/\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(lowerUrl)) {
    return {
      type: 'image',
      platform: 'Imagen',
      originalUrl: cleanUrl,
      embedUrl: cleanUrl,
      title: title || 'Visualizador de Imagen',
      icon: 'image'
    };
  }

  // 8. PDF
  if (/\.pdf($|\?)/i.test(lowerUrl) || lowerUrl.includes('application/pdf')) {
    return {
      type: 'pdf',
      platform: 'Documento PDF',
      originalUrl: cleanUrl,
      embedUrl: cleanUrl,
      googleViewerUrl: `https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=true`,
      title: title || 'Visor de PDF',
      icon: 'pdf'
    };
  }

  // 9. Documentos de Office (Word, Excel, PowerPoint)
  if (/\.(docx?|xlsx?|pptx?|odt|ods|odp)($|\?)/i.test(lowerUrl)) {
    return {
      type: 'office',
      platform: 'Documento Office',
      originalUrl: cleanUrl,
      embedUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(cleanUrl)}`,
      googleViewerUrl: `https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=true`,
      title: title || 'Visor de Documentos Office',
      icon: 'document'
    };
  }

  // 10. Web general / Portal / Iframe genérico
  return {
    type: 'web',
    platform: 'Enlace Web',
    originalUrl: cleanUrl,
    embedUrl: cleanUrl,
    title: title || cleanUrl,
    icon: 'globe'
  };
};

/**
 * Calcula el tamaño exacto en bytes de un objeto/documento
 */
export const calculateDocSizeBytes = (data) => {
  try {
    const jsonString = JSON.stringify(data || {});
    return new Blob([jsonString]).size;
  } catch (e) {
    return 0;
  }
};

/**
 * Aplana y ordena cronológicamente todos los mensajes de los distintos hilos de alumnos
 */
export const flattenAndSortMessages = (threadsList = []) => {
  const allComments = [];
  for (const thread of threadsList) {
    if (Array.isArray(thread.messages)) {
      for (const msg of thread.messages) {
        allComments.push({
          id: msg.id || `${thread.userId}_${msg.createdAt}`,
          text: msg.text || '',
          createdAt: msg.createdAt || new Date().toISOString(),
          attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
          links: Array.isArray(msg.links) ? msg.links : [],
          userId: thread.userId,
          userName: thread.userName || 'Estudiante UCNL',
          userRole: thread.userRole || 'estudiante',
          userEmail: thread.userEmail || ''
        });
      }
    }
  }
  // Ordenar de forma cronológica estricta usando el timestamp de cada mensaje
  return allComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

/**
 * Suscripción en tiempo real a los hilos de comentarios (1 documento por alumno/actividad)
 */
export const subscribeToActivityComments = (activityId, onUpdate, onError, currentUserId) => {
  if (!activityId) return () => {};

  let isUnsubscribed = false;

  // Paso 1: Carga inmediata desde IndexedDB local (0 lecturas a la nube)
  const loadLocalThreads = async () => {
    try {
      const allCachedThreads = await getAllFromStore(STORES.ACTIVITY_THREADS);
      const activityThreads = (allCachedThreads || []).filter(t => t.activityId === activityId);
      const sortedComments = flattenAndSortMessages(activityThreads);
      const userThread = activityThreads.find(t => t.userId === currentUserId || t.id === currentUserId);
      const userThreadBytes = userThread ? (userThread.sizeBytes || calculateDocSizeBytes(userThread)) : 0;

      if (!isUnsubscribed) {
        onUpdate({
          comments: sortedComments,
          userThreadBytes,
          maxBytes: FIRESTORE_DOC_MAX_BYTES,
          isFromCache: true
        });
      }
    } catch (err) {
      console.debug('Aviso IndexedDB threads cache:', err);
    }
  };

  loadLocalThreads();

  // Paso 2: Escuchar la subcolección user_threads
  // Al comentar un alumno, solo se descarga ESE documento modificado
  try {
    const userThreadsRef = collection(db, 'activities', activityId, 'user_threads');

    const unsubscribe = onSnapshot(
      userThreadsRef,
      async (snapshot) => {
        try {
          const threadsList = [];
          for (const docSnap of snapshot.docs) {
            const threadData = { id: docSnap.id, ...docSnap.data() };
            const threadKey = `${activityId}_${docSnap.id}`;
            const sizeBytes = docSnap.data().sizeBytes || calculateDocSizeBytes(docSnap.data());
            const threadWithKey = { threadKey, ...threadData, sizeBytes };
            threadsList.push(threadWithKey);
            // Guardar en IndexedDB local
            await putInStore(STORES.ACTIVITY_THREADS, threadWithKey);
          }

          const sortedComments = flattenAndSortMessages(threadsList);
          const userThread = threadsList.find(t => t.userId === currentUserId || t.id === currentUserId);
          const userThreadBytes = userThread ? (userThread.sizeBytes || calculateDocSizeBytes(userThread)) : 0;

          if (!isUnsubscribed) {
            onUpdate({
              comments: sortedComments,
              userThreadBytes,
              maxBytes: FIRESTORE_DOC_MAX_BYTES,
              isFromCache: false
            });
          }
        } catch (procErr) {
          console.error('Error al procesar hilos de comentarios:', procErr);
        }
      },
      (error) => {
        console.warn(`Error al escuchar hilos de actividad ${activityId}:`, error);
        if (onError && !isUnsubscribed) onError(error);
      }
    );

    return () => {
      isUnsubscribed = true;
      unsubscribe();
    };
  } catch (err) {
    console.error('Error al inicializar listener de hilos:', err);
    return () => { isUnsubscribed = true; };
  }
};

/**
 * Publicar un nuevo comentario agregándolo al documento de hilo del alumno (1 doc por alumno/actividad)
 * Valida que no exceda el límite de 1 MB de Firestore.
 */
export const addActivityComment = async (activityId, { text = '', attachments = [], links = [] }, user, userProfile) => {
  if (!activityId) throw new Error('ID de actividad requerido');
  if (!text.trim() && attachments.length === 0 && links.length === 0) {
    throw new Error('El comentario no puede estar vacío');
  }

  const userId = user ? user.uid : 'anon';
  const userName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Estudiante UCNL';
  const userEmail = user?.email || '';
  const userRole = userProfile?.role || 'estudiante';
  const timestamp = new Date().toISOString();

  const newMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: text.trim(),
    attachments: attachments || [],
    links: links || [],
    createdAt: timestamp
  };

  const threadDocRef = doc(db, 'activities', activityId, 'user_threads', userId);
  
  // 1. Obtener mensajes existentes del alumno
  let existingMessages = [];
  try {
    const threadSnap = await getDoc(threadDocRef);
    if (threadSnap.exists()) {
      existingMessages = threadSnap.data().messages || [];
    } else {
      const cached = await getFromStore(STORES.ACTIVITY_THREADS, `${activityId}_${userId}`);
      if (cached && Array.isArray(cached.messages)) {
        existingMessages = cached.messages;
      }
    }
  } catch (e) {
    console.debug('Inicializando hilo de alumno');
  }

  const updatedMessages = [...existingMessages, newMessage];

  const threadData = {
    activityId,
    userId,
    userName,
    userEmail,
    userRole,
    messages: updatedMessages,
    messageCount: updatedMessages.length,
    updatedAt: timestamp
  };

  // 2. Medir tamaño en bytes del documento (Límite 1 MB de Firestore)
  const sizeBytes = calculateDocSizeBytes(threadData);
  if (sizeBytes > FIRESTORE_DOC_MAX_BYTES) {
    throw new Error(`Has alcanzado el límite de 1 MB de comentarios (${(sizeBytes / 1024).toFixed(1)} KB / 1024 KB) para esta actividad. Por favor elimina comentarios antiguos para continuar.`);
  }

  const fullThreadData = { ...threadData, sizeBytes };

  // 3. Guardar en Firestore (únicamente el documento del alumno que comentó)
  await setDoc(threadDocRef, fullThreadData, { merge: true });

  // 4. Guardar en IndexedDB local
  await putInStore(STORES.ACTIVITY_THREADS, {
    threadKey: `${activityId}_${userId}`,
    ...fullThreadData
  });

  // 5. Emitir señal a RTDB para sincronización ultra-eficiente
  try {
    if (rtdb) {
      const signalRef = rtdbRef(rtdb, `threads_signal/${activityId}/${userId}`);
      await rtdbUpdate(signalRef, { v: Date.now(), updatedAt: timestamp });
    }
  } catch (rtdbErr) {}

  return { message: newMessage, sizeBytes, maxBytes: FIRESTORE_DOC_MAX_BYTES };
};

/**
 * Eliminar un comentario del documento de hilo del alumno
 */
export const deleteActivityComment = async (activityId, commentId, authorUserId) => {
  if (!activityId || !commentId) return;

  const targetUserId = authorUserId || 'anon';
  const threadDocRef = doc(db, 'activities', activityId, 'user_threads', targetUserId);
  const threadSnap = await getDoc(threadDocRef);

  if (threadSnap.exists()) {
    const data = threadSnap.data();
    const filteredMessages = (data.messages || []).filter(m => m.id !== commentId);
    const timestamp = new Date().toISOString();

    const updatedThread = {
      ...data,
      messages: filteredMessages,
      messageCount: filteredMessages.length,
      updatedAt: timestamp
    };
    const sizeBytes = calculateDocSizeBytes(updatedThread);
    const fullUpdated = { ...updatedThread, sizeBytes };

    await setDoc(threadDocRef, fullUpdated);
    await putInStore(STORES.ACTIVITY_THREADS, {
      threadKey: `${activityId}_${targetUserId}`,
      ...fullUpdated
    });
  }
};

/**
 * Agregar un nuevo enlace de recurso directamente a la lista de recursos de la actividad
 */
export const addActivityResourceLink = async (activityId, currentActivity, newLink) => {
  if (!activityId || !newLink || !newLink.url) return;

  const currentLinks = Array.isArray(currentActivity?.links) ? currentActivity.links : [];
  const updatedLinks = [...currentLinks, {
    title: newLink.title?.trim() || newLink.url.trim(),
    url: newLink.url.trim(),
    addedAt: new Date().toISOString()
  }];

  const activityRef = doc(db, 'activities', activityId);
  await updateDoc(activityRef, {
    links: updatedLinks,
    updatedAt: new Date().toISOString()
  });

  return updatedLinks;
};

/**
 * Subir y agregar un archivo adjunto directamente a la actividad
 */
export const uploadAndAddActivityAttachment = async (activityId, currentActivity, file, onProgress = () => {}) => {
  if (!activityId || !file) return;

  // 1. Subir a Storage
  const fileMeta = await uploadAttachment(file, activityId, onProgress);

  // 2. Agregar a la lista de attachments de la actividad en Firestore
  const currentAttachments = Array.isArray(currentActivity?.attachments) ? currentActivity.attachments : [];
  const updatedAttachments = [...currentAttachments, fileMeta];

  const activityRef = doc(db, 'activities', activityId);
  await updateDoc(activityRef, {
    attachments: updatedAttachments,
    updatedAt: new Date().toISOString()
  });

  return fileMeta;
};
