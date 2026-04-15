export type Invoice = {
  id: string;
  number: string;
  date: string;
  client: string;
  orderRef: string;
  total: number;
  vat: number;
  status: 'pago' | 'pendente' | 'vencido';
};

export const invoices: Invoice[] = [
  { id: '1', number: 'FT-1252', date: '2026-04-10', client: 'Transportes Silva Lda.', orderRef: 'OS-8838', total: 345.00, vat: 79.35, status: 'pendente' },
  { id: '2', number: 'FT-1251', date: '2026-04-09', client: 'Ana Rodrigues', orderRef: 'OS-8835', total: 128.50, vat: 29.56, status: 'pago' },
  { id: '3', number: 'FT-1250', date: '2026-04-09', client: 'EcoRide Portugal', orderRef: 'OS-8833', total: 892.00, vat: 205.16, status: 'pago' },
  { id: '4', number: 'FT-1249', date: '2026-04-08', client: 'MobiCity Lda.', orderRef: 'OS-8830', total: 1245.00, vat: 286.35, status: 'vencido' },
  { id: '5', number: 'FT-1248', date: '2026-04-07', client: 'Joao Ferreira', orderRef: 'OS-8828', total: 67.90, vat: 15.62, status: 'pago' },
  { id: '6', number: 'FT-1247', date: '2026-04-07', client: 'GreenGo Servicos', orderRef: 'OS-8827', total: 523.40, vat: 120.38, status: 'pendente' },
  { id: '7', number: 'FT-1246', date: '2026-04-06', client: 'Sofia Almeida', orderRef: 'OS-8825', total: 198.00, vat: 45.54, status: 'pago' },
  { id: '8', number: 'FT-1245', date: '2026-04-05', client: 'Ricardo Costa', orderRef: 'OS-8822', total: 895.00, vat: 205.85, status: 'vencido' },
];

export const billingKPIs = [
  { label: 'Pendente', value: '€12,450', icon: 'hourglass_top', trend: { value: '+€1.2k', positive: false } },
  { label: 'Faturacao Mensal', value: '€45,820', icon: 'trending_up', trend: { value: '+12%', positive: true } },
  { label: 'Em Atraso', value: '€2,140', icon: 'warning', trend: { value: '-€340', positive: true } },
];
