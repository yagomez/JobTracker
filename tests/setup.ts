import path from 'path';
import { mkdirSync } from 'fs';

/**
 * Use a separate test database so integration tests don't touch dev/prod data.
 * Must run before any module that imports the db client.
 */
const testDbPath = path.join(process.cwd(), 'data', 'test_job_tracker.db');
try {
  mkdirSync(path.dirname(testDbPath), { recursive: true });
} catch {
  /* dir exists */
}
process.env.DATABASE_URL = testDbPath;
