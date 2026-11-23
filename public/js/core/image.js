/**
 * Reduce una foto del celular (varios MB) a una imagen liviana lista para publicar.
 * Todo ocurre en el navegador: la foto original nunca sale del dispositivo.
 */

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * @param {File} file
 * @param {{maxSide?: number, maxBytes?: number}} [options]
 * @returns {Promise<string>} data URL (WebP, o JPEG si el navegador no soporta WebP)
 */
export async function resizeImageToDataUrl(file, { maxSide = 960, maxBytes = 220_000 } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');

  // imageOrientation respeta la rotación con que sacó la foto el celular.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  // Se baja la calidad hasta que el peso sea razonable (se guarda dentro de un documento de Firestore).
  let blob = null;
  for (const quality of [0.82, 0.7, 0.58, 0.45]) {
    blob = (await toBlob(canvas, 'image/webp', quality)) ?? (await toBlob(canvas, 'image/jpeg', quality));
    if (blob && blob.size <= maxBytes) break;
  }
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  return blobToDataUrl(blob);
}
