import { existsSync, statSync, renameSync, appendFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

const LOG_DIR = resolve('data/logs');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROTATED_FILES = 5;

type Level = 'INFO' | 'WARN' | 'ERROR';

function ensureDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
}

function getLogPath() {
  return join(LOG_DIR, 'app.log');
}

function rotate() {
  const logPath = getLogPath();
  if (!existsSync(logPath)) return;

  const { size } = statSync(logPath);
  if (size < MAX_FILE_SIZE) return;

  // Shift existing rotated files: app.4.log -> app.5.log, ..., app.1.log -> app.2.log
  for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
    const from = join(LOG_DIR, `app.${i}.log`);
    const to = join(LOG_DIR, `app.${i + 1}.log`);
    if (existsSync(from)) renameSync(from, to);
  }

  // Current -> app.1.log
  renameSync(logPath, join(LOG_DIR, 'app.1.log'));
}

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  try {
    ensureDir();
    rotate();

    const timestamp = new Date().toISOString();
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    const line = `${timestamp} [${level}] ${message}${metaStr}\n`;

    appendFileSync(getLogPath(), line);
  } catch {
    // Don't crash the app if logging fails
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write('INFO', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('WARN', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('ERROR', message, meta),
};
