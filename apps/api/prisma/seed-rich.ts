/**
 * Rich seed — populates the DB with realistic workshop data spanning 6 months.
 * Safe to run on top of existing data: uses upsert for entities with unique keys,
 * and creates new service orders / interventions / invoices unconditionally.
 */
import { hash } from 'bcryptjs';

import { getPrismaClient } from '../src/shared/db/prisma';

const prisma = getPrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const passwordHash = await hash('changeme123', 12);

  // ──────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────
  console.log('Users...');
  const manager = await prisma.user.upsert({
    where: { email: 'manager@gengiskhan.pt' },
    update: {},
    create: { fullName: 'Rui Ferreira', email: 'manager@gengiskhan.pt', passwordHash, role: 'manager' },
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

  const allMechanics = [mechanic1.id, mechanic2.id, mechanic3.id];

  // ──────────────────────────────────────────────
  // FINANCIAL CONFIG
  // ──────────────────────────────────────────────
  await prisma.financialConfiguration.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', hourlyLaborRate: '35.00', vatRate: '23.00' },
  });

  // ──────────────────────────────────────────────
  // CUSTOMERS
  // ──────────────────────────────────────────────
  console.log('Customers...');
  const customersData = [
    // original 8
    { nif: '123456789', customerType: 'personal' as const, fullName: 'Joao Ferreira', email: 'joao.ferreira@email.pt', phone: '+351 912 345 678', address: 'Rua das Flores 12, Braga' },
    { nif: '234567890', customerType: 'personal' as const, fullName: 'Ana Rodrigues', email: 'ana.rodrigues@email.pt', phone: '+351 913 456 789', address: 'Av. da Liberdade 45, Porto' },
    { nif: '345678901', customerType: 'personal' as const, fullName: 'Sofia Almeida', email: 'sofia.almeida@email.pt', phone: '+351 914 567 890', address: 'Travessa do Carmo 8, Lisboa' },
    { nif: '456789012', customerType: 'personal' as const, fullName: 'Ricardo Costa', email: 'ricardo.costa@email.pt', phone: '+351 915 678 901', address: 'Rua Augusta 100, Lisboa' },
    { nif: '567890123', customerType: 'business' as const, fullName: 'Transportes Silva', legalName: 'Transportes Silva Lda.', email: 'geral@transportessilva.pt', phone: '+351 253 111 222', address: 'Zona Industrial, Braga', creditLimit: '5000.00', paymentTerms: '30 dias' },
    { nif: '678901234', customerType: 'business' as const, fullName: 'EcoRide', legalName: 'EcoRide Portugal S.A.', email: 'comercial@ecoride.pt', phone: '+351 213 222 333', address: 'Parque Empresarial, Lisboa', creditLimit: '10000.00', paymentTerms: '60 dias' },
    { nif: '789012345', customerType: 'business' as const, fullName: 'MobiCity', legalName: 'MobiCity Lda.', email: 'info@mobicity.pt', phone: '+351 223 333 444', address: 'Rua do Comercio 200, Porto', creditLimit: '7500.00', paymentTerms: '30 dias' },
    { nif: '890123456', customerType: 'business' as const, fullName: 'GreenGo', legalName: 'GreenGo Servicos Lda.', email: 'apoio@greengo.pt', phone: '+351 234 444 555', address: 'Av. Central 50, Aveiro', creditLimit: '3000.00', paymentTerms: '15 dias' },
    // new personal customers
    { nif: '901234567', customerType: 'personal' as const, fullName: 'Miguel Teixeira', email: 'miguel.teixeira@email.pt', phone: '+351 916 789 012', address: 'Rua de Cedofeita 77, Porto' },
    { nif: '912345678', customerType: 'personal' as const, fullName: 'Beatriz Nunes', email: 'beatriz.nunes@email.pt', phone: '+351 917 890 123', address: 'Alameda das Linhas de Torres 55, Lisboa' },
    { nif: '923456789', customerType: 'personal' as const, fullName: 'Tiago Martins', email: 'tiago.martins@email.pt', phone: '+351 918 901 234', address: 'Rua do Bom Sucesso 3, Braga' },
    { nif: '934567890', customerType: 'personal' as const, fullName: 'Mariana Pereira', email: 'mariana.pereira@email.pt', phone: '+351 919 012 345', address: 'Rua da Boavista 210, Porto' },
    { nif: '945678901', customerType: 'personal' as const, fullName: 'Diogo Carvalho', email: 'diogo.carvalho@email.pt', phone: '+351 920 123 456', address: 'Praca do Comercio 1, Lisboa' },
    { nif: '956789012', customerType: 'personal' as const, fullName: 'Ines Fonseca', email: 'ines.fonseca@email.pt', phone: '+351 921 234 567', address: 'Rua de Santa Catarina 88, Porto' },
    { nif: '967890123', customerType: 'personal' as const, fullName: 'Rui Gomes', email: 'rui.gomes@email.pt', phone: '+351 922 345 678', address: 'Av. dos Combatentes 14, Lisboa' },
    // new business customers
    { nif: '978901234', customerType: 'business' as const, fullName: 'UrbanFleet', legalName: 'UrbanFleet Mobilidade S.A.', email: 'frota@urbanfleet.pt', phone: '+351 261 100 200', address: 'Av. da Republica 500, Lisboa', creditLimit: '15000.00', paymentTerms: '60 dias' },
    { nif: '989012345', customerType: 'business' as const, fullName: 'SpeedRent', legalName: 'SpeedRent Aluguer Lda.', email: 'manutencao@speedrent.pt', phone: '+351 272 200 300', address: 'Zona Franca, Castelo Branco', creditLimit: '8000.00', paymentTerms: '30 dias' },
    { nif: '990123456', customerType: 'business' as const, fullName: 'BikeShar', legalName: 'BikeShar Portugal Lda.', email: 'ops@bikeshar.pt', phone: '+351 239 300 400', address: 'Rua Bernardo de Albuquerque 12, Coimbra', creditLimit: '6000.00', paymentTerms: '30 dias' },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({ where: { nif: c.nif }, update: {}, create: c });
  }

  // ──────────────────────────────────────────────
  // SCOOTERS
  // ──────────────────────────────────────────────
  console.log('Scooters...');
  const scootersData = [
    // original 11
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
    // new scooters
    { serialNumber: 'SN-XIA-0012', brand: 'Xiaomi', model: 'Pro 2', customerNif: '901234567' },
    { serialNumber: 'SN-KUG-0013', brand: 'Kugoo', model: 'S1 Pro', customerNif: '912345678' },
    { serialNumber: 'SN-KUG-0014', brand: 'Kugoo', model: 'G-Booster', customerNif: '923456789' },
    { serialNumber: 'SN-GOT-0015', brand: 'Gotrax', model: 'GXL V2', customerNif: '934567890' },
    { serialNumber: 'SN-SEG-0016', brand: 'Segway', model: 'Ninebot E45E', customerNif: '945678901' },
    { serialNumber: 'SN-XIA-0017', brand: 'Xiaomi', model: 'Mi Electric 4 Pro', customerNif: '956789012' },
    { serialNumber: 'SN-INM-0018', brand: 'Inokim', model: 'Light 2', customerNif: '967890123' },
    // business fleets
    { serialNumber: 'SN-URB-0019', brand: 'Xiaomi', model: 'Pro 2', customerNif: '978901234' },
    { serialNumber: 'SN-URB-0020', brand: 'Xiaomi', model: 'Pro 2', customerNif: '978901234' },
    { serialNumber: 'SN-URB-0021', brand: 'Xiaomi', model: 'Pro 2', customerNif: '978901234' },
    { serialNumber: 'SN-URB-0022', brand: 'Segway', model: 'Ninebot Max G30', customerNif: '978901234' },
    { serialNumber: 'SN-URB-0023', brand: 'Segway', model: 'Ninebot Max G30', customerNif: '978901234' },
    { serialNumber: 'SN-SPD-0024', brand: 'Ecogo', model: 'City Rider', customerNif: '989012345' },
    { serialNumber: 'SN-SPD-0025', brand: 'Ecogo', model: 'City Rider', customerNif: '989012345' },
    { serialNumber: 'SN-SPD-0026', brand: 'Ecogo', model: 'Urban Plus', customerNif: '989012345' },
    { serialNumber: 'SN-BKS-0027', brand: 'Kugoo', model: 'S1 Pro', customerNif: '990123456' },
    { serialNumber: 'SN-BKS-0028', brand: 'Kugoo', model: 'S1 Pro', customerNif: '990123456' },
    { serialNumber: 'SN-BKS-0029', brand: 'Kugoo', model: 'G-Booster', customerNif: '990123456' },
    { serialNumber: 'SN-SEG-0030', brand: 'Segway', model: 'Ninebot ES4', customerNif: '567890123' },
  ];

  for (const s of scootersData) {
    await prisma.scooter.upsert({ where: { serialNumber: s.serialNumber }, update: {}, create: s });
  }

  // ──────────────────────────────────────────────
  // SUPPLIERS
  // ──────────────────────────────────────────────
  console.log('Suppliers...');
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

  // ──────────────────────────────────────────────
  // PARTS
  // ──────────────────────────────────────────────
  console.log('Parts...');
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
    // new parts
    { partReference: 'CAR-015', description: 'Carregador 42V 2A', supplierId: suppliers.powercell, costPrice: '18.00', salePrice: '34.00', currentStock: 9, minimumStock: 5 },
    { partReference: 'FOL-016', description: 'Dobragem Inferior (mecanismo)', supplierId: suppliers.europarts, costPrice: '22.00', salePrice: '42.00', currentStock: 6, minimumStock: 3 },
    { partReference: 'LUZ-017', description: 'Farol Dianteiro LED', supplierId: suppliers.europarts, costPrice: '8.00', salePrice: '16.50', currentStock: 15, minimumStock: 8 },
    { partReference: 'LUZ-018', description: 'Luz Traseira com Sinal', supplierId: suppliers.europarts, costPrice: '6.50', salePrice: '13.00', currentStock: 20, minimumStock: 8 },
    { partReference: 'BRK-019', description: 'Disco de Travao 110mm', supplierId: suppliers.braketech, costPrice: '9.00', salePrice: '18.00', currentStock: 10, minimumStock: 5 },
    { partReference: 'CAB-020', description: 'Cabo de Acelerador', supplierId: suppliers.braketech, costPrice: '2.50', salePrice: '5.50', currentStock: 18, minimumStock: 10 },
    { partReference: 'BAT-021', description: 'Bateria 48V 13Ah', supplierId: suppliers.powercell, costPrice: '110.00', salePrice: '185.00', currentStock: 2, minimumStock: 3 },
    { partReference: 'ROL-022', description: 'Rolamento Roda Traseira', supplierId: suppliers.wheelpro, costPrice: '3.50', salePrice: '7.50', currentStock: 30, minimumStock: 10 },
    { partReference: 'SUS-023', description: 'Mola Amortecedor Traseiro', supplierId: suppliers.europarts, costPrice: '12.00', salePrice: '24.00', currentStock: 8, minimumStock: 4 },
    { partReference: 'KIT-024', description: 'Kit Reparacao Pneu Tubeless', supplierId: suppliers.wheelpro, costPrice: '4.00', salePrice: '9.00', currentStock: 40, minimumStock: 15 },
  ];

  for (const p of partsData) {
    await prisma.part.upsert({
      where: { partReference: p.partReference },
      update: {},
      create: p,
    });
  }

  // ──────────────────────────────────────────────
  // PURCHASE ORDERS (historical restocking)
  // ──────────────────────────────────────────────
  console.log('Purchase orders...');
  const existingPOCount = await prisma.purchaseOrder.count();
  if (existingPOCount < 5) {
    const poData = [
      {
        supplierId: suppliers.braketech,
        status: 'received' as const,
        deliveredAt: daysAgo(150),
        createdAt: daysAgo(155),
        items: [
          { partReference: 'BRK-001', quantity: 100 },
          { partReference: 'CAB-009', quantity: 50 },
          { partReference: 'BRK-019', quantity: 40 },
        ],
      },
      {
        supplierId: suppliers.powercell,
        status: 'received' as const,
        deliveredAt: daysAgo(120),
        createdAt: daysAgo(125),
        items: [
          { partReference: 'BAT-012', quantity: 15 },
          { partReference: 'MOT-011', quantity: 5 },
          { partReference: 'CAR-015', quantity: 20 },
        ],
      },
      {
        supplierId: suppliers.wheelpro,
        status: 'received' as const,
        deliveredAt: daysAgo(90),
        createdAt: daysAgo(95),
        items: [
          { partReference: 'PNU-003', quantity: 60 },
          { partReference: 'PNU-013', quantity: 50 },
          { partReference: 'CAM-014', quantity: 80 },
          { partReference: 'KIT-024', quantity: 60 },
        ],
      },
      {
        supplierId: suppliers.europarts,
        status: 'received' as const,
        deliveredAt: daysAgo(60),
        createdAt: daysAgo(63),
        items: [
          { partReference: 'DSP-004', quantity: 30 },
          { partReference: 'GRP-005', quantity: 40 },
          { partReference: 'SUS-006', quantity: 20 },
          { partReference: 'FOL-016', quantity: 15 },
          { partReference: 'LUZ-017', quantity: 25 },
          { partReference: 'LUZ-018', quantity: 25 },
        ],
      },
      {
        supplierId: suppliers.fluidmaster,
        status: 'received' as const,
        deliveredAt: daysAgo(45),
        createdAt: daysAgo(48),
        items: [{ partReference: 'LUB-002', quantity: 30 }],
      },
      {
        supplierId: suppliers.powercell,
        status: 'received' as const,
        deliveredAt: daysAgo(30),
        createdAt: daysAgo(33),
        items: [
          { partReference: 'BAT-021', quantity: 8 },
          { partReference: 'BAT-012', quantity: 10 },
        ],
      },
      {
        supplierId: suppliers.braketech,
        status: 'received' as const,
        deliveredAt: daysAgo(14),
        createdAt: daysAgo(17),
        items: [
          { partReference: 'CAB-009', quantity: 30 },
          { partReference: 'CAB-020', quantity: 25 },
          { partReference: 'BRK-001', quantity: 60 },
        ],
      },
      {
        supplierId: suppliers.wheelpro,
        status: 'requested' as const,
        createdAt: daysAgo(2),
        items: [
          { partReference: 'PNU-003', quantity: 40 },
          { partReference: 'ROL-022', quantity: 50 },
        ],
      },
    ];

    for (const po of poData) {
      const { items, createdAt, ...poFields } = po;
      await prisma.purchaseOrder.create({
        data: {
          ...poFields,
          createdAt,
          items: { create: items },
        },
      });
    }
  }

  // ──────────────────────────────────────────────
  // SERVICE ORDERS — rich historical set
  // ──────────────────────────────────────────────
  console.log('Service orders (rich)...');

  type SOInput = {
    customerNif: string;
    scooterSerialNumber: string;
    reportedProblem: string;
    status: string;
    createdByUserId: string;
    createdAt: Date;
    completedAt?: Date;
    deliveredAt?: Date;
    estimatedCompletionDate?: Date;
    budgetApproved?: boolean;
    budgetApprovedAt?: Date;
  };

  const richOrders: SOInput[] = [
    // ─── DELIVERED (old, closed) ─────────────────────────────────
    { customerNif: '123456789', scooterSerialNumber: 'SN-XIA-0001', reportedProblem: 'Travao dianteiro nao trava bem — pastilhas gastas', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(165), completedAt: daysAgo(161), deliveredAt: daysAgo(160) },
    { customerNif: '234567890', scooterSerialNumber: 'SN-XIA-0002', reportedProblem: 'Bateria nao carrega apos queda', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(160), completedAt: daysAgo(156), deliveredAt: daysAgo(155) },
    { customerNif: '567890123', scooterSerialNumber: 'SN-XIA-0005', reportedProblem: 'Substituicao pneu dianteiro furado', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(158), completedAt: daysAgo(157), deliveredAt: daysAgo(156) },
    { customerNif: '678901234', scooterSerialNumber: 'SN-SEG-0008', reportedProblem: 'Manutencao periodica — revisao geral', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(155), completedAt: daysAgo(153), deliveredAt: daysAgo(152) },
    { customerNif: '789012345', scooterSerialNumber: 'SN-ECO-0010', reportedProblem: 'Luz dianteira partida', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(150), completedAt: daysAgo(149), deliveredAt: daysAgo(148) },
    { customerNif: '890123456', scooterSerialNumber: 'SN-ECO-0011', reportedProblem: 'Travao traseiro folgado — cabo gasto', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(148), completedAt: daysAgo(146), deliveredAt: daysAgo(145) },
    { customerNif: '978901234', scooterSerialNumber: 'SN-URB-0019', reportedProblem: 'Pneu traseiro furado (frota)', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(145), completedAt: daysAgo(144), deliveredAt: daysAgo(143) },
    { customerNif: '978901234', scooterSerialNumber: 'SN-URB-0020', reportedProblem: 'Display sem imagem — substituicao', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(142), completedAt: daysAgo(140), deliveredAt: daysAgo(139) },
    { customerNif: '989012345', scooterSerialNumber: 'SN-SPD-0024', reportedProblem: 'Bateria descarrega em 5 km', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(140), completedAt: daysAgo(136), deliveredAt: daysAgo(135) },
    { customerNif: '901234567', scooterSerialNumber: 'SN-XIA-0012', reportedProblem: 'Acelerador nao responde', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(135), completedAt: daysAgo(133), deliveredAt: daysAgo(132) },
    { customerNif: '912345678', scooterSerialNumber: 'SN-KUG-0013', reportedProblem: 'Ruido estranho na roda traseira', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(130), completedAt: daysAgo(128), deliveredAt: daysAgo(127) },
    { customerNif: '345678901', scooterSerialNumber: 'SN-SEG-0003', reportedProblem: 'Punhos gastos — substituicao', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(128), completedAt: daysAgo(127), deliveredAt: daysAgo(126) },
    { customerNif: '456789012', scooterSerialNumber: 'SN-SEG-0004', reportedProblem: 'Controlador avariado — scooter nao liga', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(125), completedAt: daysAgo(120), deliveredAt: daysAgo(119) },
    { customerNif: '990123456', scooterSerialNumber: 'SN-BKS-0027', reportedProblem: 'Revisao geral semestral (frota)', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(120), completedAt: daysAgo(118), deliveredAt: daysAgo(117) },
    { customerNif: '990123456', scooterSerialNumber: 'SN-BKS-0028', reportedProblem: 'Revisao geral semestral (frota)', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(120), completedAt: daysAgo(118), deliveredAt: daysAgo(117) },
    { customerNif: '923456789', scooterSerialNumber: 'SN-KUG-0014', reportedProblem: 'Motor com sobreaquecimento', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(115), completedAt: daysAgo(110), deliveredAt: daysAgo(109) },
    { customerNif: '934567890', scooterSerialNumber: 'SN-GOT-0015', reportedProblem: 'Amortecedor dianteiro partido', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(112), completedAt: daysAgo(109), deliveredAt: daysAgo(108) },
    { customerNif: '978901234', scooterSerialNumber: 'SN-URB-0021', reportedProblem: 'Substituicao bateria (desgaste)', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(110), completedAt: daysAgo(105), deliveredAt: daysAgo(104) },
    { customerNif: '567890123', scooterSerialNumber: 'SN-XIA-0006', reportedProblem: 'Dobragem bloqueada — nao dobra', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(108), completedAt: daysAgo(106), deliveredAt: daysAgo(105) },
    { customerNif: '678901234', scooterSerialNumber: 'SN-SEG-0009', reportedProblem: 'Calibracao do guiador desalinhado', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(105), completedAt: daysAgo(104), deliveredAt: daysAgo(103) },
    { customerNif: '945678901', scooterSerialNumber: 'SN-SEG-0016', reportedProblem: 'Luz traseira sem funcionar', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(100), completedAt: daysAgo(99), deliveredAt: daysAgo(98) },
    { customerNif: '956789012', scooterSerialNumber: 'SN-XIA-0017', reportedProblem: 'Pneus carecas — substituicao dupla', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(98), completedAt: daysAgo(96), deliveredAt: daysAgo(95) },
    { customerNif: '967890123', scooterSerialNumber: 'SN-INM-0018', reportedProblem: 'Bateria nao aceita carga', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(95), completedAt: daysAgo(91), deliveredAt: daysAgo(90) },
    { customerNif: '989012345', scooterSerialNumber: 'SN-SPD-0025', reportedProblem: 'Roda solta — aperto de raios', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(90), completedAt: daysAgo(89), deliveredAt: daysAgo(88) },
    { customerNif: '990123456', scooterSerialNumber: 'SN-BKS-0029', reportedProblem: 'Controlador substituido', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(88), completedAt: daysAgo(84), deliveredAt: daysAgo(83) },
    { customerNif: '978901234', scooterSerialNumber: 'SN-URB-0022', reportedProblem: 'Pneu dianteiro furado', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(85), completedAt: daysAgo(84), deliveredAt: daysAgo(83) },
    { customerNif: '123456789', scooterSerialNumber: 'SN-XIA-0001', reportedProblem: 'Revisao anual completa', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(82), completedAt: daysAgo(80), deliveredAt: daysAgo(79) },
    { customerNif: '567890123', scooterSerialNumber: 'SN-XIA-0007', reportedProblem: 'Nao acelera acima de 15km/h', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(78), completedAt: daysAgo(75), deliveredAt: daysAgo(74) },
    { customerNif: '901234567', scooterSerialNumber: 'SN-XIA-0012', reportedProblem: 'Farol dianteiro sem funcionar', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(75), completedAt: daysAgo(74), deliveredAt: daysAgo(73) },
    { customerNif: '912345678', scooterSerialNumber: 'SN-KUG-0013', reportedProblem: 'Cabo de travao partido', status: 'delivered', createdByUserId: manager.id, createdAt: daysAgo(72), completedAt: daysAgo(71), deliveredAt: daysAgo(70) },

    // ─── COMPLETED (pronto a levantar) ────────────────────────────
    { customerNif: '234567890', scooterSerialNumber: 'SN-XIA-0002', reportedProblem: 'Cheiro a queimado ao acelerar', status: 'completed', createdByUserId: manager.id, createdAt: daysAgo(12), completedAt: daysAgo(9) },
    { customerNif: '345678901', scooterSerialNumber: 'SN-SEG-0003', reportedProblem: 'Display piscando — falha electrica', status: 'completed', createdByUserId: manager.id, createdAt: daysAgo(11), completedAt: daysAgo(8) },
    { customerNif: '978901234', scooterSerialNumber: 'SN-URB-0023', reportedProblem: 'Motor sem potencia (frota)', status: 'completed', createdByUserId: manager.id, createdAt: daysAgo(10), completedAt: daysAgo(7) },
    { customerNif: '989012345', scooterSerialNumber: 'SN-SPD-0026', reportedProblem: 'Revisao trimestral preventiva', status: 'completed', createdByUserId: manager.id, createdAt: daysAgo(9), completedAt: daysAgo(6) },
    { customerNif: '923456789', scooterSerialNumber: 'SN-KUG-0014', reportedProblem: 'Substituicao amortecedor traseiro', status: 'completed', createdByUserId: manager.id, createdAt: daysAgo(8), completedAt: daysAgo(5) },

    // ─── IN-REPAIR ────────────────────────────────────────────────
    { customerNif: '456789012', scooterSerialNumber: 'SN-SEG-0004', reportedProblem: 'Bateria 48V avariada — diagnostico confirma substituicao', status: 'in-repair', createdByUserId: manager.id, createdAt: daysAgo(5), budgetApproved: true, budgetApprovedAt: daysAgo(3) },
    { customerNif: '567890123', scooterSerialNumber: 'SN-XIA-0005', reportedProblem: 'Controlador ESC com falha intermitente', status: 'in-repair', createdByUserId: manager.id, createdAt: daysAgo(4), budgetApproved: true, budgetApprovedAt: daysAgo(2) },
    { customerNif: '990123456', scooterSerialNumber: 'SN-BKS-0027', reportedProblem: 'Revisao frota — troca pastilhas e pneus', status: 'in-repair', createdByUserId: manager.id, createdAt: daysAgo(3) },
    { customerNif: '978901234', scooterSerialNumber: 'SN-URB-0019', reportedProblem: 'Dobragem danificada apos colisao', status: 'in-repair', createdByUserId: manager.id, createdAt: daysAgo(3) },
    { customerNif: '934567890', scooterSerialNumber: 'SN-GOT-0015', reportedProblem: 'Travao disco a raspar — disco e pastilhas', status: 'in-repair', createdByUserId: manager.id, createdAt: daysAgo(2) },

    // ─── IN-DIAGNOSIS ─────────────────────────────────────────────
    { customerNif: '901234567', scooterSerialNumber: 'SN-XIA-0012', reportedProblem: 'Scooter para a meio do percurso sem aviso', status: 'in-diagnosis', createdByUserId: manager.id, createdAt: daysAgo(2) },
    { customerNif: '945678901', scooterSerialNumber: 'SN-SEG-0016', reportedProblem: 'Erro E06 no display', status: 'in-diagnosis', createdByUserId: manager.id, createdAt: daysAgo(1) },
    { customerNif: '967890123', scooterSerialNumber: 'SN-INM-0018', reportedProblem: 'Nao carrega — verificar carregador e bateria', status: 'in-diagnosis', createdByUserId: manager.id, createdAt: daysAgo(1) },

    // ─── AWAITING PARTS ───────────────────────────────────────────
    { customerNif: '789012345', scooterSerialNumber: 'SN-ECO-0010', reportedProblem: 'Motor avariado — aguarda motor de substituicao', status: 'awaiting-parts', createdByUserId: manager.id, createdAt: daysAgo(7), estimatedCompletionDate: daysAgo(-3) },
    { customerNif: '989012345', scooterSerialNumber: 'SN-SPD-0024', reportedProblem: 'Controlador 48V em falta — aguarda encomenda', status: 'awaiting-parts', createdByUserId: manager.id, createdAt: daysAgo(6), estimatedCompletionDate: daysAgo(-4) },

    // ─── AWAITING CUSTOMER APPROVAL ───────────────────────────────
    { customerNif: '456789012', scooterSerialNumber: 'SN-SEG-0004', reportedProblem: 'Motor hub avariado — orcamento enviado', status: 'awaiting-customer-approval', createdByUserId: manager.id, createdAt: daysAgo(4) },
    { customerNif: '956789012', scooterSerialNumber: 'SN-XIA-0017', reportedProblem: 'Bateria 48V + controlador — orcamento pendente', status: 'awaiting-customer-approval', createdByUserId: manager.id, createdAt: daysAgo(3) },

    // ─── RECEIVED (acabou de dar entrada) ─────────────────────────
    { customerNif: '890123456', scooterSerialNumber: 'SN-ECO-0011', reportedProblem: 'Nao liga — verificar sistema electrico', status: 'received', createdByUserId: manager.id, createdAt: hoursAgo(5) },
    { customerNif: '912345678', scooterSerialNumber: 'SN-KUG-0013', reportedProblem: 'Pneu traseiro furado', status: 'received', createdByUserId: manager.id, createdAt: hoursAgo(3) },
    { customerNif: '567890123', scooterSerialNumber: 'SN-SEG-0030', reportedProblem: 'Revisao anual preventiva', status: 'received', createdByUserId: manager.id, createdAt: hoursAgo(1) },
  ];

  const createdOrders = await Promise.all(
    richOrders.map((order) => prisma.serviceOrder.create({ data: order })),
  );

  // ──────────────────────────────────────────────
  // INTERVENTIONS + PARTS USED
  // ──────────────────────────────────────────────
  console.log('Interventions + parts...');

  type PartUsage = { partReference: string; quantity: number; note?: string };

  type InterventionTemplate = {
    description: string;
    mechanicIdx: number;
    elapsedSeconds: number;
    timerState: 'idle' | 'running' | 'paused' | 'stopped';
    notes?: string;
    parts?: PartUsage[];
  };

  function interventionsForOrder(status: string): InterventionTemplate[] {
    if (status === 'received') return [];
    if (status === 'in-diagnosis') {
      return [
        { description: 'Inspecao visual e diagnostico electronico', mechanicIdx: 0, elapsedSeconds: randomBetween(1800, 3600), timerState: 'paused', notes: 'BMS a apresentar erro de celula' },
      ];
    }
    if (status === 'awaiting-customer-approval') {
      return [
        { description: 'Diagnostico completo — orcamento preparado', mechanicIdx: 0, elapsedSeconds: randomBetween(2700, 5400), timerState: 'stopped' },
      ];
    }
    if (status === 'awaiting-parts') {
      return [
        { description: 'Diagnostico — peca em falta identificada', mechanicIdx: 1, elapsedSeconds: randomBetween(1800, 3600), timerState: 'stopped' },
      ];
    }
    if (status === 'in-repair') {
      return [
        { description: 'Diagnostico inicial', mechanicIdx: 0, elapsedSeconds: randomBetween(1800, 3600), timerState: 'stopped' },
        { description: 'Desmontagem e reparacao', mechanicIdx: 1, elapsedSeconds: randomBetween(3600, 7200), timerState: 'running' },
      ];
    }
    // completed / delivered
    return [
      {
        description: 'Diagnostico e inspecao',
        mechanicIdx: 0,
        elapsedSeconds: randomBetween(1800, 5400),
        timerState: 'stopped',
      },
      {
        description: 'Reparacao e substituicao de componentes',
        mechanicIdx: 1,
        elapsedSeconds: randomBetween(3600, 10800),
        timerState: 'stopped',
        parts: pickRandomParts(),
      },
      ...(Math.random() > 0.5
        ? [{
            description: 'Testes finais e ajustes',
            mechanicIdx: 2,
            elapsedSeconds: randomBetween(900, 2700),
            timerState: 'stopped' as const,
          }]
        : []),
    ];
  }

  const commonParts: PartUsage[][] = [
    [{ partReference: 'BRK-001', quantity: 1 }, { partReference: 'CAB-009', quantity: 1 }],
    [{ partReference: 'PNU-003', quantity: 1 }, { partReference: 'KIT-024', quantity: 1 }],
    [{ partReference: 'DSP-004', quantity: 1 }],
    [{ partReference: 'BAT-012', quantity: 1 }],
    [{ partReference: 'GRP-005', quantity: 1 }, { partReference: 'LUZ-017', quantity: 1 }],
    [{ partReference: 'SUS-006', quantity: 1 }],
    [{ partReference: 'PNU-013', quantity: 1 }, { partReference: 'CAM-014', quantity: 1 }],
    [{ partReference: 'CAR-015', quantity: 1 }],
    [{ partReference: 'LUZ-018', quantity: 1 }, { partReference: 'CAB-020', quantity: 1 }],
    [{ partReference: 'BRK-019', quantity: 1 }, { partReference: 'BRK-001', quantity: 2 }],
    [{ partReference: 'ROL-022', quantity: 2 }],
    [{ partReference: 'CTR-007', quantity: 1 }],
    [{ partReference: 'LUB-002', quantity: 2 }],
    [{ partReference: 'FOL-016', quantity: 1 }],
    [{ partReference: 'BAT-021', quantity: 1 }],
    [{ partReference: 'MOT-011', quantity: 1 }],
    [{ partReference: 'SUS-023', quantity: 1 }, { partReference: 'LUB-002', quantity: 1 }],
  ];

  function pickRandomParts(): PartUsage[] {
    return pickRandom(commonParts);
  }

  for (const order of createdOrders) {
    const templates = interventionsForOrder(order.status);
    for (const tmpl of templates) {
      const intervention = await prisma.intervention.create({
        data: {
          serviceOrderId: order.id,
          description: tmpl.description,
          mechanicUserId: allMechanics[tmpl.mechanicIdx % allMechanics.length],
          elapsedSeconds: tmpl.elapsedSeconds,
          timerState: tmpl.timerState,
          notes: tmpl.notes ?? null,
          timerStartedAt: tmpl.timerState === 'running' ? hoursAgo(tmpl.elapsedSeconds / 3600) : null,
          createdAt: order.createdAt,
        },
      });

      if (tmpl.parts && tmpl.parts.length > 0) {
        for (const part of tmpl.parts) {
          await prisma.interventionPart.create({
            data: {
              interventionId: intervention.id,
              partReference: part.partReference,
              quantity: part.quantity,
              note: part.note ?? null,
            },
          });
        }
      }
    }
  }

  // ──────────────────────────────────────────────
  // STOCK MOVEMENTS (historical)
  // ──────────────────────────────────────────────
  console.log('Stock movements...');
  const stockMovements = [
    { partReference: 'BRK-001', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 100, balanceAfter: 100, note: 'PO BrakeTech Nov', createdAt: daysAgo(150) },
    { partReference: 'CAB-009', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 50, balanceAfter: 50, createdAt: daysAgo(150) },
    { partReference: 'BRK-019', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 40, balanceAfter: 40, createdAt: daysAgo(150) },
    { partReference: 'BAT-012', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 15, balanceAfter: 15, createdAt: daysAgo(120) },
    { partReference: 'MOT-011', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 5, balanceAfter: 5, createdAt: daysAgo(120) },
    { partReference: 'CAR-015', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 20, balanceAfter: 20, createdAt: daysAgo(120) },
    { partReference: 'PNU-003', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 60, balanceAfter: 60, createdAt: daysAgo(90) },
    { partReference: 'PNU-013', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 50, balanceAfter: 50, createdAt: daysAgo(90) },
    { partReference: 'CAM-014', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 80, balanceAfter: 80, createdAt: daysAgo(90) },
    { partReference: 'KIT-024', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 60, balanceAfter: 60, createdAt: daysAgo(90) },
    // consumption through interventions
    { partReference: 'BRK-001', movementType: 'out' as const, origin: 'intervention', quantityDelta: -8, balanceAfter: 92, createdAt: daysAgo(140) },
    { partReference: 'PNU-003', movementType: 'out' as const, origin: 'intervention', quantityDelta: -5, balanceAfter: 55, createdAt: daysAgo(130) },
    { partReference: 'DSP-004', movementType: 'out' as const, origin: 'intervention', quantityDelta: -2, balanceAfter: 18, createdAt: daysAgo(120) },
    { partReference: 'BAT-012', movementType: 'out' as const, origin: 'intervention', quantityDelta: -3, balanceAfter: 12, createdAt: daysAgo(110) },
    { partReference: 'CAB-009', movementType: 'out' as const, origin: 'intervention', quantityDelta: -6, balanceAfter: 44, createdAt: daysAgo(100) },
    { partReference: 'GRP-005', movementType: 'out' as const, origin: 'intervention', quantityDelta: -4, balanceAfter: 22, createdAt: daysAgo(95) },
    { partReference: 'SUS-006', movementType: 'out' as const, origin: 'intervention', quantityDelta: -3, balanceAfter: 12, createdAt: daysAgo(88) },
    { partReference: 'BRK-019', movementType: 'out' as const, origin: 'intervention', quantityDelta: -6, balanceAfter: 34, createdAt: daysAgo(85) },
    { partReference: 'CAR-015', movementType: 'out' as const, origin: 'intervention', quantityDelta: -5, balanceAfter: 15, createdAt: daysAgo(80) },
    { partReference: 'LUZ-017', movementType: 'out' as const, origin: 'intervention', quantityDelta: -4, balanceAfter: 16, createdAt: daysAgo(75) },
    { partReference: 'MOT-011', movementType: 'out' as const, origin: 'intervention', quantityDelta: -2, balanceAfter: 3, createdAt: daysAgo(70) },
    { partReference: 'CTR-007', movementType: 'out' as const, origin: 'intervention', quantityDelta: -2, balanceAfter: 2, createdAt: daysAgo(65) },
    { partReference: 'ROL-022', movementType: 'out' as const, origin: 'intervention', quantityDelta: -4, balanceAfter: 26, createdAt: daysAgo(60) },
    { partReference: 'LUB-002', movementType: 'out' as const, origin: 'intervention', quantityDelta: -10, balanceAfter: 10, createdAt: daysAgo(55) },
    { partReference: 'PNU-013', movementType: 'out' as const, origin: 'intervention', quantityDelta: -8, balanceAfter: 42, createdAt: daysAgo(50) },
    { partReference: 'CAM-014', movementType: 'out' as const, origin: 'intervention', quantityDelta: -12, balanceAfter: 68, createdAt: daysAgo(45) },
    { partReference: 'BRK-001', movementType: 'out' as const, origin: 'intervention', quantityDelta: -15, balanceAfter: 77, createdAt: daysAgo(40) },
    { partReference: 'BAT-012', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 10, balanceAfter: 22, createdAt: daysAgo(30) },
    { partReference: 'BAT-021', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 8, balanceAfter: 8, createdAt: daysAgo(30) },
    { partReference: 'BAT-012', movementType: 'out' as const, origin: 'intervention', quantityDelta: -5, balanceAfter: 17, createdAt: daysAgo(25) },
    { partReference: 'LUZ-018', movementType: 'out' as const, origin: 'intervention', quantityDelta: -5, balanceAfter: 15, createdAt: daysAgo(20) },
    { partReference: 'FOL-016', movementType: 'out' as const, origin: 'intervention', quantityDelta: -3, balanceAfter: 3, createdAt: daysAgo(15) },
    { partReference: 'BRK-001', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 60, balanceAfter: 137, createdAt: daysAgo(14) },
    { partReference: 'CAB-020', movementType: 'in' as const, origin: 'purchase-order', quantityDelta: 25, balanceAfter: 25, createdAt: daysAgo(14) },
    // low-stock adjustment
    { partReference: 'CTR-007', movementType: 'adjustment' as const, origin: 'manual', quantityDelta: -2, balanceAfter: 0, note: 'Ajuste inventario — unidade danificada', createdAt: daysAgo(10) },
    { partReference: 'MOT-011', movementType: 'out' as const, origin: 'intervention', quantityDelta: -2, balanceAfter: 1, createdAt: daysAgo(8) },
  ];

  const existingMovementCount = await prisma.stockMovement.count();
  if (existingMovementCount === 0) {
    for (const m of stockMovements) {
      await prisma.stockMovement.create({ data: m });
    }
  }

  // ──────────────────────────────────────────────
  // INVOICES for completed & delivered orders
  // ──────────────────────────────────────────────
  console.log('Invoices...');

  const finishedStatuses = ['completed', 'delivered'];
  const ordersNeedingInvoice = createdOrders.filter((o) => finishedStatuses.includes(o.status));

  const laborRate = 35;
  const vatRate = 0.23;

  const partSalePrices: Record<string, number> = {
    'BRK-001': 8.50, 'BAT-012': 145.00, 'PNU-003': 12.90, 'CTR-007': 89.00,
    'LUB-002': 6.50, 'DSP-004': 24.50, 'CAB-009': 3.20, 'GRP-005': 7.80,
    'MOT-011': 210.00, 'SUS-006': 32.00, 'PNU-013': 11.50, 'CAM-014': 4.50,
    'CAR-015': 34.00, 'FOL-016': 42.00, 'LUZ-017': 16.50, 'LUZ-018': 13.00,
    'BRK-019': 18.00, 'CAB-020': 5.50, 'BAT-021': 185.00, 'ROL-022': 7.50,
    'SUS-023': 24.00, 'KIT-024': 9.00,
  };

  const paymentMethods = ['Transferencia Bancaria', 'Multibanco', 'MB Way', 'Numerario', 'Cartao de Credito'];
  const paymentStatusCycle: ('paid' | 'pending' | 'overdue')[] = ['paid', 'paid', 'paid', 'pending', 'overdue'];
  let invoiceIdx = 0;

  for (const order of ordersNeedingInvoice) {
    // get interventions for this order
    const interventions = await prisma.intervention.findMany({
      where: { serviceOrderId: order.id },
      include: { parts: true },
    });

    // labor cost
    const totalSeconds = interventions.reduce((s, i) => s + i.elapsedSeconds, 0);
    const laborHours = Math.max(0.5, totalSeconds / 3600);
    const laborCost = Math.round(laborHours * laborRate * 100) / 100;

    // parts cost
    let partsCost = 0;
    for (const intervention of interventions) {
      for (const p of intervention.parts) {
        partsCost += (partSalePrices[p.partReference] ?? 15) * p.quantity;
      }
    }

    const subtotal = Math.round((laborCost + partsCost) * 100) / 100;
    const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;

    const paymentStatus = paymentStatusCycle[invoiceIdx % paymentStatusCycle.length];
    const isDelivered = order.status === 'delivered';
    const paidAt = paymentStatus === 'paid' ? (isDelivered ? order.deliveredAt : order.completedAt) : null;

    await prisma.invoice.create({
      data: {
        serviceOrderId: order.id,
        paymentMethod: pickRandom(paymentMethods),
        subtotal: subtotal.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        paymentStatus,
        paidAt,
        createdAt: isDelivered ? (order.deliveredAt ?? order.completedAt ?? order.createdAt) : (order.completedAt ?? order.createdAt),
      },
    });
    invoiceIdx++;
  }

  // ──────────────────────────────────────────────
  // SERVICE ORDER HISTORY ENTRIES
  // ──────────────────────────────────────────────
  console.log('History entries...');

  const statusFlow: Record<string, string[]> = {
    'received': ['received'],
    'in-diagnosis': ['received', 'in-diagnosis'],
    'awaiting-customer-approval': ['received', 'in-diagnosis', 'awaiting-customer-approval'],
    'awaiting-parts': ['received', 'in-diagnosis', 'awaiting-parts'],
    'in-repair': ['received', 'in-diagnosis', 'in-repair'],
    'completed': ['received', 'in-diagnosis', 'in-repair', 'completed'],
    'delivered': ['received', 'in-diagnosis', 'in-repair', 'completed', 'delivered'],
  };

  const statusLabels: Record<string, string> = {
    'received': 'Ordem recebida',
    'in-diagnosis': 'Diagnostico iniciado',
    'awaiting-customer-approval': 'Orcamento enviado ao cliente',
    'awaiting-parts': 'Aguardando pecas',
    'in-repair': 'Reparacao iniciada',
    'completed': 'Reparacao concluida',
    'delivered': 'Entregue ao cliente',
  };

  for (const order of createdOrders) {
    const flow = statusFlow[order.status] ?? ['received'];
    const daySpread = Math.max(1, Math.floor((Date.now() - order.createdAt.getTime()) / (flow.length * 24 * 60 * 60 * 1000)));

    for (let i = 0; i < flow.length; i++) {
      const fromStatus = i > 0 ? flow[i - 1] : null;
      const toStatus = flow[i];
      await prisma.serviceOrderHistoryEntry.create({
        data: {
          serviceOrderId: order.id,
          action: statusLabels[toStatus] ?? toStatus,
          fromStatus,
          toStatus,
          changedByUserId: manager.id,
          createdAt: new Date(order.createdAt.getTime() + i * daySpread * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log('Rich seed complete!');
  console.log(`  Orders created: ${createdOrders.length}`);
  console.log(`  Invoices created: ${ordersNeedingInvoice.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Rich seed failed:', err);
    process.exit(1);
  });
