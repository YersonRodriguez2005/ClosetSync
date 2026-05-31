// src/services/storageService.ts
import { Filesystem, Directory } from '@capacitor/filesystem';
import { initializeDB, saveItem } from '../database/dbService';
import { Capacitor } from '@capacitor/core';

/**
 * Convierte una URL de objeto Blob a una cadena Base64 limpia
 */
const convertBlobUrlToBase64 = async (blobUrl: string): Promise<string> => {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Error al leer el archivo binario"));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Extrae estrictamente el contenido binario omitiendo el encabezado 'data:*/*;base64,'
      const base64Raw = dataUrl.split(',')[1];
      resolve(base64Raw);
    };
    reader.readAsDataURL(blob);
  });
};

/**
 * Guarda físicamente la prenda en el almacenamiento local y la registra en la DB SQLite
 * @param temporaryBlobUrl URL temporal generada por el removedor de fondo
 * @param categoryId ID de la categoría seleccionada por el usuario
 * @param colorTag Etiqueta de color identificada o seleccionada
 */
export const saveGarmentToCloset = async (
  temporaryBlobUrl: string,
  categoryId: number,
  colorTag: string
): Promise<void> => {
  const dbResult = await initializeDB();
  if (!dbResult) throw new Error("Base de datos no inicializada");

  // 1. Generar un identificador único para la prenda y el nombre del archivo
  const itemId = crypto.randomUUID();
  const fileName = `garment_${itemId}.webp`;

  let savedFileUri = '';

  try {
    // 2. Transformar el Blob temporal a Base64 para el puente nativo
    const base64Data = await convertBlobUrlToBase64(temporaryBlobUrl);

    // 3. Escribir el archivo de forma permanente en el almacenamiento seguro de la app
    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data, // Almacenamiento privado persistente aislado del sistema
    });

    savedFileUri = writeResult.uri;

    // 4. Insertar de manera relacional el registro en la base de datos local SQLite
    const itemData = {
      id: itemId,
      category_id: categoryId,
      image_uri: Capacitor.getPlatform() === 'web' ? temporaryBlobUrl : savedFileUri,
      color_tag: colorTag
    };
    await saveItem(itemData);
    
    // 5. Limpieza preventiva de memoria RAM del navegador/webview
    URL.revokeObjectURL(temporaryBlobUrl);

  } catch (error) {
    console.error("Fallo atómico en la persistencia del archivo:", error);
    
    // Reversión (Rollback manual): Si el archivo se guardó pero la DB falló, eliminamos el residuo
    if (savedFileUri) {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Data
      }).catch(err => console.error("No se pudo limpiar el archivo huérfano", err));
    }
    throw error;
  }
};