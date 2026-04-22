import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { resolve } from 'path';

const dbPath = process.env.DATABASE_URL || './data/petroalianza.db';

const sqlite = new Database(resolve(dbPath));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };

import { startEmailWorker } from './email-worker';
startEmailWorker();
