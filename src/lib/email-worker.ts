import { processEmailQueue } from './email';
import { logger } from './logger';

const INTERVAL_MS = 30_000;

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startEmailWorker() {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try {
      const result = await processEmailQueue();
      if (result.sent > 0 || result.failed > 0) {
        logger.info('Email queue processed', result);
      }
    } catch (err: any) {
      logger.error('Email worker error', { error: err.message });
    }
  }, INTERVAL_MS);
}
