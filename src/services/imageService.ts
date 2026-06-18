// src/services/imageService.ts
import { removeBackground } from '@imgly/background-removal';

/**
 * Corre el modelo de remoción de fondo localmente sobre un Blob ya existente.
 * Sirve como respaldo cuando remove.bg falla — no requiere API key ni red.
 */
export const removeBackgroundLocally = async (imageBlob: Blob): Promise<Blob> => {
  return await removeBackground(imageBlob, {
    debug: false,
    output: {
      format: 'image/webp',
      quality: 0.8,
    },
  });
};