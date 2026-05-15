/**
 * Shared test helpers for module-level integration tests.
 *
 * The tests use the native `node:test` runner invoked via `tsx --test`.
 * Each describe spins up a fresh Fastify instance via `createApp()` and
 * exercises the HTTP contract through `app.inject()` — no real network.
 *
 * The Prisma client points at a real PostgreSQL test database (no mocks)
 * so any schema or query bug surfaces in CI.
 */
import jwt from 'jsonwebtoken';

import type { SessionUser } from '../shared/auth/session';
import { getPrismaClient } from '../shared/db/prisma';

export function setTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.API_PORT = '3000';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test';
  process.env.DIRECT_DATABASE_URL =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  process.env.JWT_SECRET = 'super-secret-test-key-12345';
  process.env.COOKIE_DOMAIN = 'localhost';
  process.env.MAIL_FROM = 'test@example.com';
  // Leave SMTP_HOST unset so the mailer falls back to jsonTransport.
  delete process.env.SMTP_HOST;
}

const TEST_JWT_SECRET = 'super-secret-test-key-12345';

export type TestRole = 'manager' | 'mechanic';

/**
 * Generates a signed JWT cookie value for the given role. Used to exercise
 * authenticated endpoints through `app.inject({ cookies: { session } })`.
 */
export function buildSessionToken(role: TestRole, overrides: Partial<SessionUser> = {}): string {
  const base: SessionUser = {
    id: overrides.id ?? `test-${role}-id`,
    fullName: overrides.fullName ?? `Test ${role}`,
    email: overrides.email ?? `${role}@test.local`,
    role,
  };
  return jwt.sign(base, TEST_JWT_SECRET, { expiresIn: '1h' });
}

export function managerCookies(): Record<string, string> {
  return { session: buildSessionToken('manager') };
}

export function mechanicCookies(): Record<string, string> {
  return { session: buildSessionToken('mechanic') };
}

/**
 * Wipes the database between tests in dependency-safe order so each describe
 * starts from a clean slate. Only used inside test files; never invoked in
 * production code paths.
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.notificationTemplate.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.interventionPart.deleteMany(),
    prisma.intervention.deleteMany(),
    prisma.serviceOrderHistoryEntry.deleteMany(),
    prisma.serviceOrder.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.part.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.scooter.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.user.deleteMany(),
    prisma.financialConfiguration.deleteMany(),
  ]);
}

export type SeededIds = {
  managerId: string;
  mechanicId: string;
  customerNif: string;
  businessCustomerNif: string;
  scooterSerial: string;
  supplierId: string;
  partReference: string;
};

/**
 * Inserts the minimal fixtures required by most module tests: one manager,
 * one mechanic, one personal + one business customer, a scooter, supplier
 * and part, plus the default financial configuration.
 */
export async function seedMinimal(): Promise<SeededIds> {
  const prisma = getPrismaClient();

  // Ids fixos que batem com o JWT em buildSessionToken — evita FK violations
  // quando endpoints gravam createdByUserId/mechanicUserId a partir da sessão.
  const manager = await prisma.user.create({
    data: {
      id: 'test-manager-id',
      fullName: 'Test Manager',
      email: 'manager@test.local',
      passwordHash: '$2a$12$invalidplaceholderhashvalue',
      role: 'manager',
    },
  });
  const mechanic = await prisma.user.create({
    data: {
      id: 'test-mechanic-id',
      fullName: 'Test Mechanic',
      email: 'mechanic@test.local',
      passwordHash: '$2a$12$invalidplaceholderhashvalue',
      role: 'mechanic',
    },
  });

  await prisma.financialConfiguration.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', hourlyLaborRate: '35.00', vatRate: '23.00' },
  });

  const customer = await prisma.customer.create({
    data: {
      nif: '111111111',
      customerType: 'personal',
      fullName: 'Personal Tester',
      email: 'personal@test.local',
      phone: '+351 900 000 000',
    },
  });
  const business = await prisma.customer.create({
    data: {
      nif: '222222222',
      customerType: 'business',
      fullName: 'Business Tester',
      legalName: 'Business Tester Lda.',
      email: 'business@test.local',
      phone: '+351 900 111 111',
      creditLimit: '5000.00',
      paymentTerms: '30 dias',
    },
  });

  const scooter = await prisma.scooter.create({
    data: {
      serialNumber: 'SN-TEST-0001',
      brand: 'Xiaomi',
      model: 'Pro 2',
      customerNif: customer.nif,
    },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: 'TestParts Lda.',
      email: 'parts@test.local',
      phone: '+351 911 111 111',
      paymentTerms: '30 dias',
    },
  });

  const part = await prisma.part.create({
    data: {
      partReference: 'BRK-TEST-1',
      description: 'Pastilhas de Teste',
      supplierId: supplier.id,
      costPrice: '5.00',
      salePrice: '10.00',
      currentStock: 10,
      minimumStock: 2,
    },
  });

  return {
    managerId: manager.id,
    mechanicId: mechanic.id,
    customerNif: customer.nif,
    businessCustomerNif: business.nif,
    scooterSerial: scooter.serialNumber,
    supplierId: supplier.id,
    partReference: part.partReference,
  };
}

/** Drops Prisma's connection pool so node:test can exit cleanly. */
export async function disconnectPrisma(): Promise<void> {
  await getPrismaClient().$disconnect();
}
