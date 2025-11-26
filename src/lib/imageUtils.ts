/**
 * Convierte una URL de Google Drive a formato directo de imagen
 * Soporta varios formatos de URLs de Google Drive:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * @param url - URL de Google Drive o cualquier otra URL de imagen
 * @returns URL directa de imagen o la URL original si no es de Google Drive
 */
export const getDirectImageUrl = (url: string | null | undefined): string => {
  if (!url) return '/placeholder.svg';
  
  // Si es una URL de Google Drive, convertirla
  if (url.includes('drive.google.com')) {
    let fileId: string | null = null;
    
    // Formato: /file/d/FILE_ID/
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      fileId = fileIdMatch[1];
    }
    
    // Formato: ?id=FILE_ID o &id=FILE_ID
    if (!fileId) {
      const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParamMatch) {
        fileId = idParamMatch[1];
      }
    }
    
    if (fileId) {
      // Usar lh3.googleusercontent.com para mejor compatibilidad CORS
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }
  
  // Si no es de Google Drive, retornar la URL original
  return url;
};

/**
 * Props adicionales para imágenes de Google Drive
 * Ayuda a evitar problemas de CORS
 */
export const getDriveImageProps = () => ({
  referrerPolicy: 'no-referrer' as const,
  crossOrigin: 'anonymous' as const,
});
