import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync } from 'fs';

const GLOBAL_DB_KEY = '__job_tracker_db';

// Narrowed global object for storing a single shared Database instance
const globalForDb = globalThis as typeof globalThis & {
  [GLOBAL_DB_KEY]?: Database.Database;
};

function getDatabase(): Database.Database {
  const existing = globalForDb[GLOBAL_DB_KEY];
  if (existing) return existing;

  const raw = process.env.DATABASE_URL?.replace(/^file:/i, '').trim() || '';
  const dbPath = raw
    ? path.isAbsolute(raw)
      ? raw
      : path.resolve(process.cwd(), raw)
    : path.join(process.cwd(), 'data/job_tracker.db');

  // Ensure parent directory exists (avoid "unable to open database file" when data/ is missing)
  if (!dbPath.startsWith(':') && dbPath.includes(path.sep)) {
    try {
      mkdirSync(path.dirname(dbPath), { recursive: true });
    } catch {
      // ignore
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  globalForDb[GLOBAL_DB_KEY] = db;
  return db;
}

export function query(sql: string, params?: any[]) {
  try {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const rows = params ? stmt.all(...params) : stmt.all();
      return { rows, rowCount: rows.length };
    } else {
      const result = params ? stmt.run(...params) : stmt.run();
      return { 
        rows: result.changes > 0 ? [{ id: result.lastInsertRowid }] : [], 
        rowCount: result.changes 
      };
    }
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export function getClient() {
  return getDatabase();
}

export default getDatabase();
