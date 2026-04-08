import type { FastifyInstance } from 'fastify';

import { authModule } from '../modules/auth/index';
import { billingModule } from '../modules/billing/index';
import { configurationModule } from '../modules/configuration/index';
import { customersModule } from '../modules/customers/index';
import { interventionsModule } from '../modules/interventions/index';
import { inventoryModule } from '../modules/inventory/index';
import { notificationsModule } from '../modules/notifications/index';
import { reportsModule } from '../modules/reports/index';
import { scootersModule } from '../modules/scooters/index';
import { serviceOrdersModule } from '../modules/service-orders/index';
import { suppliersProcurementModule } from '../modules/suppliers-procurement/index';

export async function registerModules(app: FastifyInstance) {
  await app.register(authModule);
  await app.register(customersModule);
  await app.register(scootersModule);
  await app.register(serviceOrdersModule);
  await app.register(interventionsModule);
  await app.register(inventoryModule);
  await app.register(suppliersProcurementModule);
  await app.register(billingModule);
  await app.register(reportsModule);
  await app.register(configurationModule);
  await app.register(notificationsModule);
}
