export type Supplier = {
  id: string;
  name: string;
  specialization: string;
  contact: string;
  email: string;
  orders: number;
  status: 'ativo' | 'inativo';
};

export const suppliers: Supplier[] = [
  { id: '1', name: 'EuroParts Lda.', specialization: 'Pecas Eletricas', contact: '+351 912 345 678', email: 'vendas@europarts.pt', orders: 34, status: 'ativo' },
  { id: '2', name: 'BrakeTech Solutions', specialization: 'Travagem', contact: '+351 923 456 789', email: 'orders@braketech.pt', orders: 21, status: 'ativo' },
  { id: '3', name: 'WheelPro Distribuicao', specialization: 'Rodas e Pneus', contact: '+351 934 567 890', email: 'info@wheelpro.pt', orders: 18, status: 'ativo' },
  { id: '4', name: 'PowerCell Energy', specialization: 'Baterias', contact: '+351 945 678 901', email: 'supply@powercell.pt', orders: 12, status: 'ativo' },
  { id: '5', name: 'FluidMaster', specialization: 'Lubrificantes e Fluidos', contact: '+351 956 789 012', email: 'comercial@fluidmaster.pt', orders: 8, status: 'inativo' },
];

export const supplierKPIs = [
  { label: 'Em Transito', value: '12', icon: 'local_shipping', trend: { value: '+3', positive: true } },
  { label: 'Pendente Revisao', value: '4', icon: 'rate_review' },
  { label: 'Valor em Stock', value: '€14.2k', icon: 'inventory_2', trend: { value: '+€1.8k', positive: true } },
];

export const recentOrders = [
  { id: '1', ref: 'PO-092', supplier: 'EuroParts Lda.', items: 48, status: 'Em transito', date: '2026-04-09' },
  { id: '2', ref: 'PO-091', supplier: 'BrakeTech Solutions', items: 24, status: 'Recebido', date: '2026-04-08' },
  { id: '3', ref: 'PO-090', supplier: 'PowerCell Energy', items: 6, status: 'Em transito', date: '2026-04-07' },
  { id: '4', ref: 'PO-089', supplier: 'WheelPro Distribuicao', items: 36, status: 'Recebido', date: '2026-04-06' },
];
