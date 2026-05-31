// src/database/schema.ts
export const createSchema = `
  CREATE TABLE IF NOT EXISTS Category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Item (
    id TEXT PRIMARY KEY,
    category_id INTEGER,
    image_uri TEXT NOT NULL,
    color_tag TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES Category(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS Outfit (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Outfit_Item (
    outfit_id TEXT,
    item_id TEXT,
    z_index INTEGER DEFAULT 0,
    scale REAL DEFAULT 1.0,
    pos_x REAL DEFAULT 0.0,
    pos_y REAL DEFAULT 0.0,
    PRIMARY KEY (outfit_id, item_id),
    FOREIGN KEY(outfit_id) REFERENCES Outfit(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES Item(id) ON DELETE CASCADE
  );
`;

export const initialData = `
  INSERT OR IGNORE INTO Category (id, name) VALUES (1, 'Superior'), (2, 'Inferior'), (3, 'Calzado'), (4, 'Accesorios');
`;