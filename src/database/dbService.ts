// src/database/dbService.ts
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

// Bandera global de entorno
const isWeb = Capacitor.getPlatform() === 'web';
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

export const initializeDB = async () => {
  if (isWeb) {
    console.warn("Entorno Web detectado: Usando LocalStorage como Mock DB para evitar colapsos de WASM.");
    if (!localStorage.getItem('closetsync_items')) {
      localStorage.setItem('closetsync_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('closetsync_outfits')) {
      localStorage.setItem('closetsync_outfits', JSON.stringify([]));
    }
    return true; // Simula éxito en Web
  }

  // Lógica nativa (Android/iOS)
  try {
    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection('closetsync_db', false)).result;
    
    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection('closetsync_db', false);
    } else {
      db = await sqlite.createConnection('closetsync_db', false, 'no-encryption', 1, false);
    }
    await db.open();

    // Verificación y creación de tablas críticas (Profile y Outfits)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS UserProfile (
        id INTEGER PRIMARY KEY, 
        avatar_uri TEXT
      );
      CREATE TABLE IF NOT EXISTS Outfits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        canvas_json TEXT NOT NULL,
        preview_image TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // (Aquí se mantiene la ejecución de tu schema.ts original para Category e Item)
    
    return db;
  } catch (error) {
    console.error("Error nativo SQLite:", error);
    throw error;
  }
};

// --- CRUD DE PRENDAS (GARMENTS) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getGarments = async (categoryId: number | null): Promise<any[]> => {
  if (isWeb) {
    const items = JSON.parse(localStorage.getItem('closetsync_items') || '[]');
    const categories: Record<number, string> = { 1: 'Superior', 2: 'Inferior', 3: 'Calzado', 4: 'Accesorios' };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = items.map((item: any) => ({
      ...item,
      category_name: categories[item.category_id] || 'Otros'
    }));

    if (categoryId !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return mapped.filter((item: any) => item.category_id === categoryId);
    }
    return mapped;
  }

  if (!db) throw new Error("DB nativa no inicializada");
  let query = `
    SELECT i.id, i.image_uri, i.color_tag, c.name as category_name 
    FROM Item i
    LEFT JOIN Category c ON i.category_id = c.id
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  if (categoryId !== null) {
    query += ` WHERE i.category_id = ?`;
    params.push(categoryId);
  }
  query += ` ORDER BY i.created_at DESC`;

  const res = await db.query(query, params);
  return res.values || [];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveItem = async (item: any) => {
  if (isWeb) {
    const items = JSON.parse(localStorage.getItem('closetsync_items') || '[]');
    items.push(item);
    localStorage.setItem('closetsync_items', JSON.stringify(items));
    return;
  }
  
  if (!db) throw new Error("DB nativa no inicializada");
  const query = `INSERT INTO Item (id, category_id, image_uri, color_tag) VALUES (?, ?, ?, ?);`;
  await db.run(query, [item.id, item.category_id, item.image_uri, item.color_tag]);
};

// --- CRUD DE PERFIL Y GEMELO DIGITAL (AVATAR) ---

export const saveAvatar = async (base64Image: string) => {
  if (isWeb) {
    localStorage.setItem('closetsync_avatar', base64Image);
    return;
  }
  
  if (!db) throw new Error("DB no inicializada");
  await db.run(`INSERT OR REPLACE INTO UserProfile (id, avatar_uri) VALUES (1, ?);`, [base64Image]);
};

export const getAvatar = async (): Promise<string | null> => {
  if (isWeb) {
    return localStorage.getItem('closetsync_avatar');
  }

  if (!db) throw new Error("DB no inicializada");
  const res = await db.query(`SELECT avatar_uri FROM UserProfile WHERE id = 1;`);
  return res.values && res.values.length > 0 ? res.values[0].avatar_uri : null;
};

// --- CRUD DE OUTFITS Y LOOKBOOK ---

export const saveOutfit = async (name: string, canvasJson: string, previewBase64: string) => {
  if (isWeb) {
    const outfits = JSON.parse(localStorage.getItem('closetsync_outfits') || '[]');
    outfits.push({ id: Date.now(), name, canvas_json: canvasJson, preview_image: previewBase64, created_at: new Date().toISOString() });
    localStorage.setItem('closetsync_outfits', JSON.stringify(outfits));
    return;
  }

  if (!db) throw new Error("DB no inicializada");
  const query = `INSERT INTO Outfits (name, canvas_json, preview_image) VALUES (?, ?, ?);`;
  await db.run(query, [name, canvasJson, previewBase64]);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getOutfits = async (): Promise<any[]> => {
  if (isWeb) {
    const outfits = JSON.parse(localStorage.getItem('closetsync_outfits') || '[]');
    // Ordenar de más reciente a más antiguo para consistencia con SQL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return outfits.sort((a: any, b: any) => b.id - a.id);
  }

  if (!db) throw new Error("DB no inicializada");
  const res = await db.query(`SELECT * FROM Outfits ORDER BY created_at DESC;`);
  return res.values || [];
};

export const deleteGarment = async (id: number | string): Promise<void> => {
  if (isWeb) {
    const items = JSON.parse(localStorage.getItem('closetsync_items') || '[]');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = items.filter((item: any) => item.id !== id);
    localStorage.setItem('closetsync_items', JSON.stringify(filtered));
    return;
  }

  if (!db) throw new Error("DB nativa no inicializada");
  const query = `DELETE FROM Item WHERE id = ?;`;
  await db.run(query, [id]);
};

// Eliminar un outfit completo de la galería
export const deleteOutfit = async (id: number | string): Promise<void> => {
  if (isWeb) {
    const outfits = JSON.parse(localStorage.getItem('closetsync_outfits') || '[]');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = outfits.filter((outfit: any) => outfit.id !== id);
    localStorage.setItem('closetsync_outfits', JSON.stringify(filtered));
    return;
  }

  if (!db) throw new Error("DB no inicializada");
  const query = `DELETE FROM Outfits WHERE id = ?;`;
  await db.run(query, [id]);
};