import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApp } from './app';

function setTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.API_PORT = '3000';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.DIRECT_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = 'super-secret-test-key-12345';
  process.env.COOKIE_DOMAIN = 'localhost';
  process.env.SMTP_HOST = 'localhost';
  process.env.SMTP_PORT = '1025';
  process.env.MAIL_FROM = 'test@example.com';
}

describe('API smoke tests', () => {
  it('GET /health returns ok payload', async () => {
    setTestEnv();
    const app = await createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: 'ok',
      service: 'api',
    });

    await app.close();
  });

  it('GET /api/v1/auth/me without session returns 401', async () => {
    setTestEnv();
    const app = await createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    assert.equal(response.statusCode, 401);
    const body = response.json() as { error?: string };
    assert.equal(body.error, 'unauthorized');

    await app.close();
  });
});
