import type { FastifyInstance } from 'fastify';

import { authModule } from '../modules/auth';
import { billingModule } from '../modules/billing';
import { configurationModule } from '../modules/configuration';
import { customersModule } from '../modules/customers';
import { interventionsModule } from '../modules/interventions';
import { inventoryModule } from '../modules/inventory';
import { notificationsModule } from '../modules/notifications';
import { reportsModule } from '../modules/reports';
import { scootersModule } from '../modules/scooters';
import { serviceOrdersModule } from '../modules/service-orders';
import { suppliersProcurementModule } from '../modules/suppliers-procurement';

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
