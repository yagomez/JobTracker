import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

function getDatabase() {
  if (!db) {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'data/job_tracker.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
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
