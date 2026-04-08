import { createApp } from './app';
import { loadEnv } from './env';

async function start() {
  const env = loadEnv();
  const app = await createApp();

  try {
    await app.listen({
      host: '0.0.0.0',
      port: env.API_PORT,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
