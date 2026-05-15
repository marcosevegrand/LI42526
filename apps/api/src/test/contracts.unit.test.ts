/**
 * Unit tests — contract schemas (Zod)
 *
 * Layer: UNIT (parsing isolado, sem Fastify ou Prisma)
 * Scope: regras de validação partilhadas em packages/contracts.
 *
 * Coverage targets: validações que sustentam REQ-001 (campos obrigatórios
 * de cliente), REQ-004 (NIF único e válido), REQ-029 (formato monetário
 * com duas casas decimais), REQ-019 (catálogo de peças).
 * ISO/IEC 25010: Functional Suitability — Correctness.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCustomerSchema,
  createServiceOrderSchema,
  diagnosisSchema,
  invoiceIssueSchema,
  loginRequestSchema,
  moneySchema,
  nifSchema,
  partSchema,
} from '@gengis-khan/contracts';

describe('nifSchema', () => {
  // REQ-004: NIF tem exatamente 9 dígitos
  it('aceita NIF com exatamente 9 dígitos', () => {
    assert.equal(nifSchema.safeParse('123456789').success, true);
  });

  it('rejeita NIF curto', () => {
    assert.equal(nifSchema.safeParse('12345').success, false);
  });

  it('rejeita NIF com letras', () => {
    assert.equal(nifSchema.safeParse('12345678A').success, false);
  });
});

describe('moneySchema', () => {
  // REQ-029: valores monetários respeitam duas casas decimais
  it('aceita "1.00", "0.50", "12345.67"', () => {
    for (const v of ['1.00', '0.50', '12345.67']) {
      assert.equal(moneySchema.safeParse(v).success, true, `falhou: ${v}`);
    }
  });

  it('rejeita "1", "1.0", "1.234"', () => {
    for (const v of ['1', '1.0', '1.234']) {
      assert.equal(moneySchema.safeParse(v).success, false, `passou indevidamente: ${v}`);
    }
  });
});

describe('loginRequestSchema', () => {
  // REQ-034
  it('aceita email válido + password não vazia', () => {
    const parsed = loginRequestSchema.safeParse({ email: 'a@b.com', password: 'x' });
    assert.equal(parsed.success, true);
  });

  it('rejeita email malformado', () => {
    const parsed = loginRequestSchema.safeParse({ email: 'not-email', password: 'x' });
    assert.equal(parsed.success, false);
  });

  it('rejeita password vazia', () => {
    const parsed = loginRequestSchema.safeParse({ email: 'a@b.com', password: '' });
    assert.equal(parsed.success, false);
  });
});

describe('createCustomerSchema', () => {
  // REQ-001: cliente particular válido
  it('aceita particular com campos mínimos', () => {
    const parsed = createCustomerSchema.safeParse({
      nif: '111111111',
      customerType: 'personal',
      fullName: 'A',
      email: 'a@b.com',
      phone: '+351 911 111 111',
    });
    assert.equal(parsed.success, true);
  });

  // REQ-003: cliente empresarial precisa de legalName + creditLimit + paymentTerms
  it('rejeita empresarial sem legalName', () => {
    const parsed = createCustomerSchema.safeParse({
      nif: '222222222',
      customerType: 'business',
      fullName: 'Empresa',
      email: 'e@b.com',
      phone: '+351 911 111 111',
      creditLimit: '5000.00',
      paymentTerms: '30 dias',
    });
    assert.equal(parsed.success, false);
  });
});

describe('createServiceOrderSchema', () => {
  // REQ-010
  it('aceita OS com cliente, trotinete e problema reportado', () => {
    const parsed = createServiceOrderSchema.safeParse({
      customerNif: '111111111',
      scooterSerialNumber: 'SN-X',
      reportedProblem: 'avaria',
    });
    assert.equal(parsed.success, true);
  });

  it('rejeita OS sem problema reportado', () => {
    const parsed = createServiceOrderSchema.safeParse({
      customerNif: '111111111',
      scooterSerialNumber: 'SN-X',
    });
    assert.equal(parsed.success, false);
  });
});

describe('diagnosisSchema', () => {
  // REQ-018 (registo de diagnóstico)
  it('aceita diagnóstico completo', () => {
    const parsed = diagnosisSchema.safeParse({
      technicalFindings: 'Bateria deteriorada',
      recommendedActions: 'Substituir',
      estimatedLaborHours: '1.00',
    });
    assert.equal(parsed.success, true);
  });

  it('rejeita diagnóstico sem findings', () => {
    const parsed = diagnosisSchema.safeParse({
      recommendedActions: 'X',
      estimatedLaborHours: '1.00',
    });
    assert.equal(parsed.success, false);
  });
});

describe('invoiceIssueSchema', () => {
  // REQ-027
  it('aceita emissão com OS e método de pagamento', () => {
    const parsed = invoiceIssueSchema.safeParse({
      serviceOrderId: 'os-1',
      paymentMethod: 'Multibanco',
    });
    assert.equal(parsed.success, true);
  });

  it('rejeita emissão sem paymentMethod', () => {
    const parsed = invoiceIssueSchema.safeParse({ serviceOrderId: 'os-1' });
    assert.equal(parsed.success, false);
  });
});

describe('partSchema', () => {
  // REQ-019
  it('aceita peça com referência, preços e stocks válidos', () => {
    const parsed = partSchema.safeParse({
      partReference: 'BRK-001',
      description: 'Pastilhas',
      supplierId: 'sup-1',
      costPrice: '5.00',
      salePrice: '10.00',
      currentStock: 10,
      minimumStock: 2,
    });
    assert.equal(parsed.success, true);
  });

  it('rejeita stock negativo', () => {
    const parsed = partSchema.safeParse({
      partReference: 'BRK-002',
      description: 'X',
      supplierId: 'sup-1',
      costPrice: '5.00',
      salePrice: '10.00',
      currentStock: -1,
      minimumStock: 0,
    });
    assert.equal(parsed.success, false);
  });
});
