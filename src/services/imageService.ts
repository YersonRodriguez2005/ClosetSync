// src/services/imageService.ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { removeBackground } from '@imgly/background-removal';

/**
 * Abre la cámara nativa, captura una imagen y ejecuta el modelo 
 * de remoción de fondo localmente.
 * @returns {Promise<string>} URL del objeto Blob resultante (transparente)
 */
export const captureAndProcessGarment = async (): Promise<string> => {
  try {
    // 1. Captura de imagen a través de hardware nativo
    const photo = await Camera.getPhoto({
      quality: 70, // Reducir calidad inicial ahorra RAM en el procesamiento
      allowEditing: true, // Permite al usuario centrar la prenda
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      width: 800, // Pre-redimensionamiento crucial para no colapsar el modelo IA
    });

    if (!photo.webPath) throw new Error("No se pudo obtener la ruta de la imagen");

    // 2. Convertir la ruta local a un Blob transaccional
    const response = await fetch(photo.webPath);
    const imageBlob = await response.blob();

    // 3. Procesamiento de IA (Eliminación de fondo)
    // Nota: Por defecto, @imgly utiliza Web Workers internamente.
    const transparentBlob = await removeBackground(imageBlob, {
      debug: false, // Desactivar en producción
      output: {
        format: 'image/webp', // WebP soporta transparencia y pesa menos que PNG
        quality: 0.8
      }
    });

    // 4. Generar una URL temporal para renderizar en el DOM (React)
    const renderUrl = URL.createObjectURL(transparentBlob);
    return renderUrl;

  } catch (error) {
    console.error("Error en el pipeline de captura y procesamiento:", error);
    throw error;
  }
};