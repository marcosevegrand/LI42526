import { financialParametersSchema } from '@gengis-khan/contracts';
import type { FastifyPluginAsync } from 'fastify';

import { appError, requireRole } from '../../shared/auth/session';
import { ConfigurationService } from './configuration.service';

const configurationService = new ConfigurationService();

export const configurationModule: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/config/financial-parameters', async (request) => {
    await requireRole(['manager'])(request);

    const parameters = await configurationService.getFinancialParameters();
    return financialParametersSchema.parse(parameters);
  });

  app.patch('/api/v1/config/financial-parameters', async (request) => {
    await requireRole(['manager'])(request);

    const parsed = financialParametersSchema.safeParse(request.body);
    if (!parsed.success) {
      throw appError(400, 'validation_error', parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    const parameters = await configurationService.updateFinancialParameters(parsed.data);
    return financialParametersSchema.parse(parameters);
  });
};
