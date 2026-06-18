// src/database/dbService.ts
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const isWeb = Capacitor.getPlatform() === 'web';
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

// ─── Core: ensure DB is open before any operation ────────────────────────────
const ensureDB = async (): Promise<SQLiteDBConnection> => {
  if (db) return db;

  try {
    const ret    = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection('closetsync_db', false)).result;

    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection('closetsync_db', false);
    } else {
      db = await sqlite.createConnection('closetsync_db', false, 'no-encryption', 1, false);
    }

    await db.open();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Category (
        id   INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS Item (
        id          TEXT PRIMARY KEY,
        category_id INTEGER,
        image_uri   TEXT,
        color_tag   TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS UserProfile (
        id         INTEGER PRIMARY KEY,
        avatar_uri TEXT
      );
      CREATE TABLE IF NOT EXISTS Outfits (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        canvas_json   TEXT NOT NULL,
        preview_image TEXT NOT NULL,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default categories if empty
    const cats = await db.query(`SELECT COUNT(*) as count FROM Category;`);
    if (cats.values && cats.values[0]?.count === 0) {
      await db.execute(`
        INSERT INTO Category (id, name) VALUES
          (1, 'Superior'),
          (2, 'Inferior'),
          (3, 'Calzado'),
          (4, 'Accesorios');
      `);
    }

    return db;
  } catch (error) {
    db = null;
    console.error('ensureDB error:', error);
    throw new Error(`No se pudo abrir la base de datos: ${error instanceof Error ? error.message : error}`);
  }
};

// ─── Public init ─────────────────────────────────────────────────────────────
export const initializeDB = async () => {
  if (isWeb) {
    if (!localStorage.getItem('closetsync_items'))   localStorage.setItem('closetsync_items',   JSON.stringify([]));
    if (!localStorage.getItem('closetsync_outfits')) localStorage.setItem('closetsync_outfits', JSON.stringify([]));
    return true;
  }
  return ensureDB();
};

// ─── CRUD: Prendas ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getGarments = async (categoryId: number | null): Promise<any[]> => {
  if (isWeb) {
    const items = JSON.parse(localStorage.getItem('closetsync_items') || '[]');
    const categories: Record<number, string> = { 1: 'Superior', 2: 'Inferior', 3: 'Calzado', 4: 'Accesorios' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = items.map((item: any) => ({
      ...item,
      category_name: categories[item.category_id] || 'Otros',
      // ensure category_id is a number (localStorage might deserialize as string)
      category_id: Number(item.category_id),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (categoryId !== null) return mapped.filter((item: any) => item.category_id === categoryId);
    return mapped;
  }

  const conn = await ensureDB();

  let query = `
    SELECT
      i.id,
      i.image_uri,
      i.color_tag,
      i.category_id,
      c.name AS category_name
    FROM Item i
    LEFT JOIN Category c ON i.category_id = c.id
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];
  if (categoryId !== null) { query += ` WHERE i.category_id = ?`; params.push(categoryId); }
  query += ` ORDER BY i.created_at DESC`;

  const res = await conn.query(query, params);

  // Ensure category_id is always a number (SQLite may return it as string)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.values || []).map((row: any) => ({
    ...row,
    category_id: Number(row.category_id),
  }));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveItem = async (item: any) => {
  if (isWeb) {
    const items = JSON.parse(localStorage.getItem('closetsync_items') || '[]');
    items.push({ ...item, category_id: Number(item.category_id) });
    localStorage.setItem('closetsync_items', JSON.stringify(items));
    return;
  }

  const conn = await ensureDB();
  await conn.run(
    `INSERT INTO Item (id, category_id, image_uri, color_tag, created_at) VALUES (?, ?, ?, ?, ?);`,
    [item.id, item.category_id, item.image_uri, item.color_tag, item.created_at]
  );
};

// ─── CRUD: Perfil / Avatar ────────────────────────────────────────────────────

export const saveAvatar = async (base64Image: string) => {
  if (isWeb) { localStorage.setItem('closetsync_avatar', base64Image); return; }
  const conn = await ensureDB();
  await conn.run(`INSERT OR REPLACE INTO UserProfile (id, avatar_uri) VALUES (1, ?);`, [base64Image]);
};

export const getAvatar = async (): Promise<string | null> => {
  if (isWeb) return localStorage.getItem('closetsync_avatar');
  const conn = await ensureDB();
  const res = await conn.query(`SELECT avatar_uri FROM UserProfile WHERE id = 1;`);
  return res.values && res.values.length > 0 ? res.values[0].avatar_uri : null;
};

// ─── CRUD: Outfits ────────────────────────────────────────────────────────────

export const saveOutfit = async (name: string, canvasJson: string, previewBase64: string) => {
  if (isWeb) {
    const outfits = JSON.parse(localStorage.getItem('closetsync_outfits') || '[]');
    outfits.push({ id: Date.now(), name, canvas_json: canvasJson, preview_image: previewBase64, created_at: new Date().toISOString() });
    localStorage.setItem('closetsync_outfits', JSON.stringify(outfits));
    return;
  }
  const conn = await ensureDB();
  await conn.run(`INSERT INTO Outfits (name, canvas_json, preview_image) VALUES (?, ?, ?);`, [name, canvasJson, previewBase64]);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getOutfits = async (): Promise<any[]> => {
  if (isWeb) {
    const outfits = JSON.parse(localStorage.getItem('closetsync_outfits') || '[]');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return outfits.sort((a: any, b: any) => b.id - a.id);
  }
  const conn = await ensureDB();
  const res = await conn.query(`SELECT * FROM Outfits ORDER BY created_at DESC;`);
  return res.values || [];
};

export const deleteGarment = async (id: number | string): Promise<void> => {
  if (isWeb) {
    const items = JSON.parse(localStorage.getItem('closetsync_items') || '[]');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localStorage.setItem('closetsync_items', JSON.stringify(items.filter((i: any) => i.id !== id)));
    return;
  }
  const conn = await ensureDB();
  await conn.run(`DELETE FROM Item WHERE id = ?;`, [id]);
};

export const deleteOutfit = async (id: number | string): Promise<void> => {
  if (isWeb) {
    const outfits = JSON.parse(localStorage.getItem('closetsync_outfits') || '[]');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localStorage.setItem('closetsync_outfits', JSON.stringify(outfits.filter((o: any) => o.id !== id)));
    return;
  }
  const conn = await ensureDB();
  await conn.run(`DELETE FROM Outfits WHERE id = ?;`, [id]);
};