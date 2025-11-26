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
    // Formato: /file/d/FILE_ID/
    const fileIdMatch = url.match(/\/d\/([^\/]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
    
    // Formato: ?id=FILE_ID o &id=FILE_ID
    const idParamMatch = url.match(/[?&]id=([^&]+)/);
    if (idParamMatch) {
      return `https://drive.google.com/uc?export=view&id=${idParamMatch[1]}`;
    }
  }
  
  // Si no es de Google Drive, retornar la URL original
  return url;
};
