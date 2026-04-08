import { getPrismaClient } from '../../shared/db/prisma';

export class ConfigurationRepository {
  async getFinancialParameters() {
    return getPrismaClient().financialConfiguration.findUnique({
      where: { id: 'default' },
    });
  }

  async upsertFinancialParameters(input: { hourlyLaborRate: string; vatRate: string }) {
    return getPrismaClient().financialConfiguration.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        hourlyLaborRate: input.hourlyLaborRate,
        vatRate: input.vatRate,
      },
      update: {
        hourlyLaborRate: input.hourlyLaborRate,
        vatRate: input.vatRate,
      },
    });
  }
}