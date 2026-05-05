import { hash } from 'bcryptjs';

import { getPrismaClient } from '../src/shared/db/prisma';

async function seed() {
  const prisma = getPrismaClient();
  const passwordHash = await hash('changeme123', 12);

  console.log('Seeding users...');
  const manager = await prisma.user.upsert({
    where: { email: 'manager@gengiskhan.pt' },
    update: {},
    create: {
      fullName: 'Rui Ferreira',
      email: 'manager@gengiskhan.pt',
      passwordHash,
      role: 'manager',
    },
  });

  const mechanic1 = await prisma.user.upsert({
    where: { email: 'carlos@gengiskhan.pt' },
    update: {},
    create: { fullName: 'Carlos Mendes', email: 'carlos@gengiskhan.pt', passwordHash, role: 'mechanic' },
  });

  const mechanic2 = await prisma.user.upsert({
    where: { email: 'pedro@gengiskhan.pt' },
    update: {},
    create: { fullName: 'Pedro Santos', email: 'pedro@gengiskhan.pt', passwordHash, role: 'mechanic' },
  });

  const mechanic3 = await prisma.user.upsert({
    where: { email: 'ana@gengiskhan.pt' },
    update: {},
    create: { fullName: 'Ana Costa', email: 'ana@gengiskhan.pt', passwordHash, role: 'mechanic' },
  });

  console.log('Seeding financial configuration...');
  await prisma.financialConfiguration.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', hourlyLaborRate: '35.00', vatRate: '23.00' },
  });

  console.log('Seeding customers...');
  const customersData = [
    { nif: '123456789', customerType: 'personal' as const, fullName: 'Joao Ferreira', email: 'joao.ferreira@email.pt', phone: '+351 912 345 678', address: 'Rua das Flores 12, Braga' },
    { nif: '234567890', customerType: 'personal' as const, fullName: 'Ana Rodrigues', email: 'ana.rodrigues@email.pt', phone: '+351 913 456 789', address: 'Av. da Liberdade 45, Porto' },
    { nif: '345678901', customerType: 'personal' as const, fullName: 'Sofia Almeida', email: 'sofia.almeida@email.pt', phone: '+351 914 567 890', address: 'Travessa do Carmo 8, Lisboa' },
    { nif: '456789012', customerType: 'personal' as const, fullName: 'Ricardo Costa', email: 'ricardo.costa@email.pt', phone: '+351 915 678 901', address: 'Rua Augusta 100, Lisboa' },
    { nif: '567890123', customerType: 'business' as const, fullName: 'Transportes Silva', legalName: 'Transportes Silva Lda.', email: 'geral@transportessilva.pt', phone: '+351 253 111 222', address: 'Zona Industrial, Braga', creditLimit: '5000.00', paymentTerms: '30 dias' },
    { nif: '678901234', customerType: 'business' as const, fullName: 'EcoRide', legalName: 'EcoRide Portugal S.A.', email: 'comercial@ecoride.pt', phone: '+351 213 222 333', address: 'Parque Empresarial, Lisboa', creditLimit: '10000.00', paymentTerms: '60 dias' },
    { nif: '789012345', customerType: 'business' as const, fullName: 'MobiCity', legalName: 'MobiCity Lda.', email: 'info@mobicity.pt', phone: '+351 223 333 444', address: 'Rua do Comercio 200, Porto', creditLimit: '7500.00', paymentTerms: '30 dias' },
    { nif: '890123456', customerType: 'business' as const, fullName: 'GreenGo', legalName: 'GreenGo Servicos Lda.', email: 'apoio@greengo.pt', phone: '+351 234 444 555', address: 'Av. Central 50, Aveiro', creditLimit: '3000.00', paymentTerms: '15 dias' },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({ where: { nif: c.nif }, update: {}, create: c });
  }

  console.log('Seeding scooters...');
  const scootersData = [
    { serialNumber: 'SN-XIA-0001', brand: 'Xiaomi', model: 'Pro 2', customerNif: '123456789', conditionNotes: 'Bom estado' },
    { serialNumber: 'SN-XIA-0002', brand: 'Xiaomi', model: 'Mi Electric 3', customerNif: '234567890' },
    { serialNumber: 'SN-SEG-0003', brand: 'Segway', model: 'Ninebot Max G30', customerNif: '345678901', conditionNotes: 'Risco no guiador' },
    { serialNumber: 'SN-SEG-0004', brand: 'Segway', model: 'Ninebot ES2', customerNif: '456789012' },
    { serialNumber: 'SN-XIA-0005', brand: 'Xiaomi', model: 'Pro 2', customerNif: '567890123' },
    { serialNumber: 'SN-XIA-0006', brand: 'Xiaomi', model: 'Pro 2', customerNif: '567890123' },
    { serialNumber: 'SN-XIA-0007', brand: 'Xiaomi', model: 'Mi Electric 3', customerNif: '567890123' },
    { serialNumber: 'SN-SEG-0008', brand: 'Segway', model: 'Ninebot Max G30', customerNif: '678901234' },
    { serialNumber: 'SN-SEG-0009', brand: 'Segway', model: 'Ninebot Max G30', customerNif: '678901234' },
    { serialNumber: 'SN-ECO-0010', brand: 'Ecogo', model: 'City Rider', customerNif: '789012345' },
    { serialNumber: 'SN-ECO-0011', brand: 'Ecogo', model: 'Urban Plus', customerNif: '890123456' },
  ];

  for (const s of scootersData) {
    await prisma.scooter.upsert({ where: { serialNumber: s.serialNumber }, update: {}, create: s });
  }

  console.log('Seeding suppliers...');
  const supplierNames = [
    { key: 'europarts', name: 'EuroParts Lda.', email: 'vendas@europarts.pt', phone: '+351 912 345 678', paymentTerms: '30 dias' },
    { key: 'braketech', name: 'BrakeTech Solutions', email: 'orders@braketech.pt', phone: '+351 923 456 789', paymentTerms: '30 dias' },
    { key: 'wheelpro', name: 'WheelPro Distribuicao', email: 'info@wheelpro.pt', phone: '+351 934 567 890', paymentTerms: '15 dias' },
    { key: 'powercell', name: 'PowerCell Energy', email: 'supply@powercell.pt', phone: '+351 945 678 901', paymentTerms: '60 dias' },
    { key: 'fluidmaster', name: 'FluidMaster', email: 'comercial@fluidmaster.pt', phone: '+351 956 789 012', paymentTerms: '30 dias' },
  ];

  const suppliers: Record<string, string> = {};
  for (const s of supplierNames) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (existing) {
      suppliers[s.key] = existing.id;
    } else {
      const created = await prisma.supplier.create({ data: { name: s.name, email: s.email, phone: s.phone, paymentTerms: s.paymentTerms } });
      suppliers[s.key] = created.id;
    }
  }

  console.log('Seeding parts...');
  const partsData = [
    { partReference: 'BRK-001', description: 'Pastilhas de Travao Xiaomi', supplierId: suppliers.braketech, costPrice: '4.50', salePrice: '8.50', currentStock: 14, minimumStock: 20 },
    { partReference: 'BAT-012', description: 'Bateria 36V 10.4Ah', supplierId: suppliers.powercell, costPrice: '85.00', salePrice: '145.00', currentStock: 3, minimumStock: 5 },
    { partReference: 'PNU-003', description: 'Pneu 10" Tubeless', supplierId: suppliers.wheelpro, costPrice: '7.00', salePrice: '12.90', currentStock: 42, minimumStock: 15 },
    { partReference: 'CTR-007', description: 'Controlador ESC 48V', supplierId: suppliers.europarts, costPrice: '50.00', salePrice: '89.00', currentStock: 2, minimumStock: 3 },
    { partReference: 'LUB-002', description: 'Liquido de Refrigeracao 1L', supplierId: suppliers.fluidmaster, costPrice: '3.00', salePrice: '6.50', currentStock: 4, minimumStock: 10 },
    { partReference: 'DSP-004', description: 'Display LCD S866', supplierId: suppliers.europarts, costPrice: '13.00', salePrice: '24.50', currentStock: 18, minimumStock: 8 },
    { partReference: 'CAB-009', description: 'Cabo de Travao 1.8m', supplierId: suppliers.braketech, costPrice: '1.50', salePrice: '3.20', currentStock: 35, minimumStock: 10 },
    { partReference: 'GRP-005', description: 'Punho Ergonomico (par)', supplierId: suppliers.europarts, costPrice: '3.80', salePrice: '7.80', currentStock: 22, minimumStock: 8 },
    { partReference: 'MOT-011', description: 'Motor 350W Hub', supplierId: suppliers.powercell, costPrice: '120.00', salePrice: '210.00', currentStock: 1, minimumStock: 2 },
    { partReference: 'SUS-006', description: 'Amortecedor Dianteiro', supplierId: suppliers.europarts, costPrice: '17.00', salePrice: '32.00', currentStock: 12, minimumStock: 5 },
    { partReference: 'PNU-013', description: 'Pneu 8.5" Camara', supplierId: suppliers.wheelpro, costPrice: '6.00', salePrice: '11.50', currentStock: 28, minimumStock: 10 },
    { partReference: 'CAM-014', description: 'Camara de ar 8.5"', supplierId: suppliers.wheelpro, costPrice: '2.00', salePrice: '4.50', currentStock: 50, minimumStock: 20 },
  ];

  for (const p of partsData) {
    await prisma.part.upsert({
      where: { partReference: p.partReference },
      update: {},
      create: p,
    });
  }

  console.log('Seeding service orders...');
  const serviceOrdersData = [
    { customerNif: '123456789', scooterSerialNumber: 'SN-XIA-0001', reportedProblem: 'Travao dianteiro nao funciona', status: 'in-repair', createdByUserId: manager.id },
    { customerNif: '234567890', scooterSerialNumber: 'SN-XIA-0002', reportedProblem: 'Bateria nao carrega', status: 'in-diagnosis', createdByUserId: manager.id },
    { customerNif: '345678901', scooterSerialNumber: 'SN-SEG-0003', reportedProblem: 'Pneu dianteiro furado', status: 'completed', createdByUserId: manager.id },
    { customerNif: '456789012', scooterSerialNumber: 'SN-SEG-0004', reportedProblem: 'Ruido no motor', status: 'awaiting-parts', createdByUserId: manager.id },
    { customerNif: '567890123', scooterSerialNumber: 'SN-XIA-0005', reportedProblem: 'Display avariado', status: 'in-repair', createdByUserId: manager.id },
    { customerNif: '678901234', scooterSerialNumber: 'SN-SEG-0008', reportedProblem: 'Manutencao periodica', status: 'completed', createdByUserId: manager.id },
    { customerNif: '789012345', scooterSerialNumber: 'SN-ECO-0010', reportedProblem: 'Nao liga', status: 'received', createdByUserId: manager.id },
    { customerNif: '890123456', scooterSerialNumber: 'SN-ECO-0011', reportedProblem: 'Travao traseiro folgado', status: 'awaiting-customer-approval', createdByUserId: manager.id },
    { customerNif: '567890123', scooterSerialNumber: 'SN-XIA-0006', reportedProblem: 'Substituicao de pneus', status: 'delivered', createdByUserId: manager.id },
    { customerNif: '678901234', scooterSerialNumber: 'SN-SEG-0009', reportedProblem: 'Calibracao do guiador', status: 'completed', createdByUserId: manager.id },
  ];

  // Check if service orders already exist to avoid duplicates
  const existingOrderCount = await prisma.serviceOrder.count();
  if (existingOrderCount === 0) {
    for (const so of serviceOrdersData) {
      await prisma.serviceOrder.create({ data: so });
    }
  }

  console.log('Seeding interventions...');
  const orders = await prisma.serviceOrder.findMany({ where: { status: { in: ['in-repair', 'in-diagnosis', 'completed', 'delivered'] } } });
  const mechanics = [mechanic1.id, mechanic2.id, mechanic3.id];

  const existingInterventionCount = await prisma.intervention.count();
  if (existingInterventionCount === 0) {
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const mechanicId = mechanics[i % mechanics.length];
      await prisma.intervention.create({
        data: {
          serviceOrderId: order.id,
          description: `Trabalho tecnico na ordem ${order.serviceOrderNumber}`,
          mechanicUserId: mechanicId,
          elapsedSeconds: Math.floor(Math.random() * 7200) + 1800,
          timerState: order.status === 'completed' || order.status === 'delivered' ? 'stopped' : 'idle',
        },
      });
    }
  }

  console.log('Seeding purchase orders...');
  const existingPOCount = await prisma.purchaseOrder.count();
  if (existingPOCount === 0) {
    const po1 = await prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers.braketech,
        status: 'received',
        deliveredAt: new Date(),
        items: { create: [{ partReference: 'BRK-001', quantity: 50 }, { partReference: 'CAB-009', quantity: 30 }] },
      },
    });

    await prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers.powercell,
        status: 'requested',
        items: { create: [{ partReference: 'BAT-012', quantity: 10 }, { partReference: 'MOT-011', quantity: 3 }] },
      },
    });

    await prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers.wheelpro,
        status: 'received',
        deliveredAt: new Date(),
        items: { create: [{ partReference: 'PNU-003', quantity: 40 }] },
      },
    });
    void po1;
  }

  console.log('Seeding invoices...');
  const completedOrders = await prisma.serviceOrder.findMany({ where: { status: { in: ['completed', 'delivered'] } } });
  const existingInvoiceCount = await prisma.invoice.count();
  if (existingInvoiceCount === 0) {
    const paymentStatuses: ('paid' | 'pending' | 'overdue')[] = ['paid', 'paid', 'pending', 'overdue'];
    for (let i = 0; i < completedOrders.length; i++) {
      const order = completedOrders[i];
      const subtotal = Math.floor(Math.random() * 400) + 50;
      const vat = Math.round(subtotal * 0.23 * 100) / 100;
      const total = subtotal + vat;
      const status = paymentStatuses[i % paymentStatuses.length];

      await prisma.invoice.create({
        data: {
          serviceOrderId: order.id,
          paymentMethod: 'Transferencia Bancaria',
          subtotal: subtotal.toFixed(2),
          vatAmount: vat.toFixed(2),
          total: total.toFixed(2),
          paymentStatus: status,
          paidAt: status === 'paid' ? new Date() : null,
        },
      });
    }
  }

  console.log('Seed complete!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
