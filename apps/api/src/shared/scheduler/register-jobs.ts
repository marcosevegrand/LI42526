import type { FastifyInstance } from 'fastify';
import cron from 'node-cron';

export function registerScheduledJobs(app: FastifyInstance) {
  const delayCheck = cron.schedule('0 8 * * *', async () => {
    app.log.info('Scheduled check: awaiting-parts delay monitor');
  });

  const creditCheck = cron.schedule('30 8 * * *', async () => {
    app.log.info('Scheduled check: business credit exposure monitor');
  });

  app.addHook('onClose', async () => {
    delayCheck.stop();
    creditCheck.stop();
  });
}
