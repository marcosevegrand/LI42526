export type InventoryItem = {
  id: string;
  reference: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  minimum: number;
  unitPrice: number;
  status: 'critico' | 'limiar' | 'estavel';
};

export const inventoryItems: InventoryItem[] = [
  { id: '1', reference: 'BRK-001', name: 'Pastilhas de Travao Xiaomi', category: 'Travagem', stock: 14, unit: 'un', minimum: 20, unitPrice: 8.50, status: 'limiar' },
  { id: '2', reference: 'BAT-012', name: 'Bateria 36V 10.4Ah', category: 'Eletrico', stock: 3, unit: 'un', minimum: 5, unitPrice: 145.00, status: 'critico' },
  { id: '3', reference: 'PNU-003', name: 'Pneu 10" Tubeless', category: 'Rodas', stock: 42, unit: 'un', minimum: 15, unitPrice: 12.90, status: 'estavel' },
  { id: '4', reference: 'CTR-007', name: 'Controlador ESC 48V', category: 'Eletrico', stock: 2, unit: 'un', minimum: 3, unitPrice: 89.00, status: 'critico' },
  { id: '5', reference: 'LUB-002', name: 'Liquido de Refrigeracao', category: 'Fluidos', stock: 4, unit: 'L', minimum: 10, unitPrice: 6.50, status: 'critico' },
  { id: '6', reference: 'DSP-004', name: 'Display LCD S866', category: 'Eletrico', stock: 18, unit: 'un', minimum: 8, unitPrice: 24.50, status: 'estavel' },
  { id: '7', reference: 'CAB-009', name: 'Cabo de Travao 1.8m', category: 'Travagem', stock: 35, unit: 'un', minimum: 10, unitPrice: 3.20, status: 'estavel' },
  { id: '8', reference: 'GRP-005', name: 'Punho Ergonomico', category: 'Acessorios', stock: 22, unit: 'par', minimum: 8, unitPrice: 7.80, status: 'estavel' },
  { id: '9', reference: 'MOT-011', name: 'Motor 350W Hub', category: 'Eletrico', stock: 1, unit: 'un', minimum: 2, unitPrice: 210.00, status: 'critico' },
  { id: '10', reference: 'SUS-006', name: 'Amortecedor Dianteiro', category: 'Suspensao', stock: 12, unit: 'un', minimum: 5, unitPrice: 32.00, status: 'estavel' },
];

export const inventoryKPIs = [
  { label: 'Total Unidades', value: '4,829', icon: 'inventory_2' },
  { label: 'Itens Criticos', value: '12', icon: 'warning', trend: { value: '+3', positive: false } },
  { label: 'Valor Total', value: '€14,205', icon: 'euro', trend: { value: '+€820', positive: true } },
];
