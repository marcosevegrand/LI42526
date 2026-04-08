import { ConfigurationRepository } from './configuration.repository';

export class ConfigurationService {
  constructor(private readonly repository = new ConfigurationRepository()) {}

  async getFinancialParameters() {
    const config = await this.repository.getFinancialParameters();
    if (!config) {
      return {
        hourlyLaborRate: '0.00',
        vatRate: '0.00',
      };
    }

    return {
      hourlyLaborRate: this.formatMoney(config.hourlyLaborRate),
      vatRate: this.formatMoney(config.vatRate),
    };
  }

  async updateFinancialParameters(input: { hourlyLaborRate: string; vatRate: string }) {
    const config = await this.repository.upsertFinancialParameters(input);
    return {
      hourlyLaborRate: this.formatMoney(config.hourlyLaborRate),
      vatRate: this.formatMoney(config.vatRate),
    };
  }

  private formatMoney(value: { toFixed: (digits: number) => string } | string | number) {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value.toFixed(2);
  }
}