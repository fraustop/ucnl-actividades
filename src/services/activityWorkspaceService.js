import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadAttachment } from './storageService';

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
 * Suscripción en tiempo real a los comentarios de una actividad específica
 */
export const subscribeToActivityComments = (activityId, onUpdate, onError) => {
  if (!activityId) return () => {};

  try {
    const commentsRef = collection(db, 'activities', activityId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const comments = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onUpdate(comments);
      },
      (error) => {
        console.warn(`Error al escuchar comentarios de actividad ${activityId}:`, error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error('Error al inicializar listener de comentarios:', err);
    return () => {};
  }
};

/**
 * Publicar un nuevo comentario o duda en la actividad
 */
export const addActivityComment = async (activityId, { text = '', attachments = [], links = [] }, user, userProfile) => {
  if (!activityId) throw new Error('ID de actividad requerido');
  if (!text.trim() && attachments.length === 0 && links.length === 0) {
    throw new Error('El comentario no puede estar vacío');
  }

  const commentData = {
    text: text.trim(),
    attachments: attachments || [],
    links: links || [],
    userId: user ? user.uid : 'anon',
    userName: userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario UCNL',
    userEmail: user?.email || '',
    userRole: userProfile?.role || 'estudiante',
    createdAt: new Date().toISOString()
  };

  const commentsRef = collection(db, 'activities', activityId, 'comments');
  const docRef = await addDoc(commentsRef, commentData);
  return { id: docRef.id, ...commentData };
};

/**
 * Eliminar un comentario de una actividad
 */
export const deleteActivityComment = async (activityId, commentId) => {
  if (!activityId || !commentId) return;
  const commentDocRef = doc(db, 'activities', activityId, 'comments', commentId);
  await deleteDoc(commentDocRef);
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
