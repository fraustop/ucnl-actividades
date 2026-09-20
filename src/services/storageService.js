export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'u55avwrv',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ucnl_uploads'
};

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
  const ext = (fileName || '').split('.').pop().toLowerCase();
  
  if (['pdf'].includes(ext) || mimeType.includes('pdf')) return 'pdf';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mimeType.includes('word')) return 'word';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel';
  if (['ppt', 'pptx', 'odp'].includes(ext) || mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'powerpoint';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) return 'image';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'html', 'css', 'sql', 'json'].includes(ext)) return 'code';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext) || (mimeType && mimeType.startsWith('audio/'))) return 'audio';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext) || (mimeType && mimeType.startsWith('video/'))) return 'video';
  
  return 'document';
};

/**
 * Sube un archivo a Cloudinary con seguimiento de progreso en tiempo real
 */
export const uploadAttachment = (file, activityFolderId = 'general', onProgress = () => {}) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No se ha seleccionado ningún archivo.'));
    }

    const { cloudName, uploadPreset } = CLOUDINARY_CONFIG;
    if (!cloudName || !uploadPreset) {
      return reject(new Error('Configuración de almacenamiento incompleta.'));
    }

    // Determinar el tipo de recurso Cloudinary según la categoría del archivo.
    // Usar /raw/upload para PDFs y documentos evita que Cloudinary los clasifique
    // erróneamente como imágenes (lo que genera URLs inaccesibles con error 401/404).
    const fileCategory = getFileCategory(file.name, file.type);
    let cloudinaryResourceType = 'raw'; // default seguro para documentos
    if (fileCategory === 'image') cloudinaryResourceType = 'image';
    else if (fileCategory === 'video') cloudinaryResourceType = 'video';
    // PDF, Word, Excel, PPT, audio, code, archive → 'raw'

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${cloudinaryResourceType}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `ucnl_activities/${activityFolderId || 'general'}`);


    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    // Seguimiento del progreso de subida para la barra en UI
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          const category = getFileCategory(file.name, file.type);
          const rawDownloadUrl = response.secure_url || response.url;
          const timestamp = Date.now();
          const fileMetadata = {
            id: `${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
            name: file.name,
            size: response.bytes || file.size,
            type: file.type || response.format || 'application/octet-stream',
            category,
            storagePath: response.public_id,
            resourceType: response.resource_type || (category === 'image' ? 'image' : category === 'video' ? 'video' : 'raw'),
            downloadUrl: fixCloudinaryUrl(rawDownloadUrl, category),
            provider: 'cloudinary',
            uploadedAt: new Date().toISOString()
          };
          onProgress(100);
          resolve(fileMetadata);
        } catch (err) {
          reject(new Error('Error al procesar la respuesta de Cloudinary: ' + err.message));
        }
      } else {
        let errorMsg = 'Error al subir el archivo a la nube.';
        try {
          const errorResp = JSON.parse(xhr.responseText);
          if (errorResp?.error?.message) {
            errorMsg = `Cloudinary: ${errorResp.error.message}`;
          }
        } catch (e) {}
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Error de conexión al subir el archivo. Revisa tu conexión a internet.'));
    };

    xhr.send(formData);
  });
};

/**
 * Corrige URLs de Cloudinary según el tipo de recurso para evitar errores 401 y 404.
 * - Imágenes (.jpg, .jpeg, .png, .webp, etc.): Cloudinary requiere /image/upload/
 * - Videos (.mp4, .webm, .mov, etc.): Cloudinary requiere /video/upload/
 * - Documentos y archivos (PDF, Word, Excel, PPT, ZIP, etc.): Cloudinary requiere /raw/upload/
 */
export const fixCloudinaryUrl = (url = '', category = '') => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
  
  // Extraer extensión de la URL si no viene categoría explícita
  let detectedCategory = category;
  if (!detectedCategory || detectedCategory === 'document' || detectedCategory === 'raw' || detectedCategory === 'auto') {
    const cleanUrl = url.split('?')[0].split('#')[0];
    detectedCategory = getFileCategory(cleanUrl);
  }

  // 1. Imágenes: Cloudinary requiere /image/upload/
  if (detectedCategory === 'image' || /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif)($|\?|#)/i.test(url)) {
    return url.replace(/\/raw\/upload\//, '/image/upload/').replace(/\/video\/upload\//, '/image/upload/');
  }

  // 2. Videos: Cloudinary requiere /video/upload/
  if (detectedCategory === 'video' || /\.(mp4|webm|mov|mkv|avi|m4v)($|\?|#)/i.test(url)) {
    return url.replace(/\/raw\/upload\//, '/video/upload/').replace(/\/image\/upload\//, '/video/upload/');
  }

  // 3. Documentos (PDF, Word, Excel, PPT, ZIP, etc.): Cloudinary requiere /raw/upload/
  return url.replace(/\/image\/upload\//, '/raw/upload/').replace(/\/video\/upload\//, '/raw/upload/');
};

/**
 * Desvincular archivo
 */
export const deleteAttachmentFromStorage = async (storagePath) => {
  console.info('Archivo desvinculado de la actividad:', storagePath);
};
