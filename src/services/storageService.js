import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Formatea el tamaño de bytes a un string legible (KB, MB, etc.)
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Detecta la categoría del archivo según extensión o tipo MIME
 */
export const getFileCategory = (fileName = '', mimeType = '') => {
  const ext = fileName.split('.').pop().toLowerCase();
  
  if (['pdf'].includes(ext) || mimeType.includes('pdf')) return 'pdf';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mimeType.includes('word')) return 'word';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel';
  if (['ppt', 'pptx', 'odp'].includes(ext) || mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'powerpoint';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || mimeType.startsWith('image/')) return 'image';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'html', 'css', 'sql'].includes(ext)) return 'code';
  if (['mp3', 'wav', 'ogg'].includes(ext) || mimeType.startsWith('audio/')) return 'audio';
  if (['mp4', 'mkv', 'avi', 'mov'].includes(ext) || mimeType.startsWith('video/')) return 'video';
  
  return 'document';
};

/**
 * Sube un archivo a Firebase Storage con seguimiento de progreso
 */
export const uploadAttachment = (file, activityFolderId, onProgress = () => {}) => {
  return new Promise((resolve, reject) => {
    // Sanitizar nombre de archivo
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const storagePath = `activities/${activityFolderId || 'general'}/${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream'
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(Math.round(progress));
      },
      (error) => {
        console.error('Error al subir archivo a Firebase Storage:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const fileMetadata = {
            id: `${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            category: getFileCategory(file.name, file.type),
            storagePath: storagePath,
            downloadUrl: downloadUrl,
            uploadedAt: new Date().toISOString()
          };
          resolve(fileMetadata);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};

/**
 * Elimina un archivo de Firebase Storage
 */
export const deleteAttachmentFromStorage = async (storagePath) => {
  if (!storagePath) return;
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn('No se pudo borrar el archivo de storage o ya fue eliminado:', error.message);
  }
};
