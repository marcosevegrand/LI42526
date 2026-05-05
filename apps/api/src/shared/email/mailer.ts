import nodemailer from 'nodemailer';

import { loadEnv } from '../../env';

export function createMailer() {
  const env = loadEnv();

  // Fallback for dev: when no SMTP host is configured, use the built-in JSON transport
  // so notifications always "succeed" and we can inspect them in API logs / DB records.
  if (!env.SMTP_HOST) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
  });
}
