/**
 * Convierte una URL de Google Drive a formato directo de imagen
 * @param url - URL de Google Drive o cualquier otra URL de imagen
 * @returns URL directa de imagen o la URL original si no es de Google Drive
 */
export const getDirectImageUrl = (url: string | null | undefined): string => {
  if (!url) return '/placeholder.svg';
  
  // Si es una URL de Google Drive, convertirla
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([^\/]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
  }
  
  // Si no es de Google Drive, retornar la URL original
  return url;
};
