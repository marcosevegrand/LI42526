import type { FastifyInstance } from 'fastify';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    const statusCode = 'statusCode' in error ? Number(error.statusCode) : 500;
    const errorCode = 'error' in error ? String(error.error) : 'internal_error';

    reply.status(statusCode).send({
      error: errorCode,
      message: error.message,
      traceId: request.id,
    });
  });
}
