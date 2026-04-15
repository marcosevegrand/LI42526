export type ServiceOrder = {
  id: string;
  reference: string;
  client: string;
  scooter: string;
  description: string;
  status: 'diagnostico' | 'em_reparacao' | 'pendente' | 'concluido' | 'urgente';
  priority: 'alta' | 'media' | 'baixa';
  mechanic: string;
  createdAt: string;
};

export const serviceOrders: ServiceOrder[] = [
  { id: '1', reference: 'OS-8842', client: 'Transportes Silva Lda.', scooter: 'Xiaomi Pro 2 — SN-4821', description: 'Substituicao de sistema de travagem', status: 'em_reparacao', priority: 'alta', mechanic: 'Carlos Mendes', createdAt: '2026-04-10' },
  { id: '2', reference: 'OS-8841', client: 'Ana Rodrigues', scooter: 'Ninebot Max G30 — SN-7734', description: 'Diagnostico de falha eletrica no controlador', status: 'diagnostico', priority: 'media', mechanic: 'Pedro Santos', createdAt: '2026-04-10' },
  { id: '3', reference: 'OS-8840', client: 'EcoRide Portugal', scooter: 'Segway P100S — SN-1123', description: 'Revisao geral + troca de pneus', status: 'pendente', priority: 'baixa', mechanic: '—', createdAt: '2026-04-09' },
  { id: '4', reference: 'OS-8839', client: 'Joao Ferreira', scooter: 'Xiaomi Essential — SN-9956', description: 'Substituicao de bateria 36V', status: 'em_reparacao', priority: 'alta', mechanic: 'Carlos Mendes', createdAt: '2026-04-09' },
  { id: '5', reference: 'OS-8838', client: 'MobiCity Lda.', scooter: 'Ninebot F2 Pro — SN-3342', description: 'Reprogramacao de firmware', status: 'concluido', priority: 'media', mechanic: 'Pedro Santos', createdAt: '2026-04-08' },
  { id: '6', reference: 'OS-8837', client: 'Sofia Almeida', scooter: 'Xiaomi Pro 2 — SN-6678', description: 'Reparacao urgente — acidente rodoviario', status: 'urgente', priority: 'alta', mechanic: 'Carlos Mendes', createdAt: '2026-04-08' },
  { id: '7', reference: 'OS-8836', client: 'GreenGo Servicos', scooter: 'Segway E2 Plus — SN-2201', description: 'Calibracao de sensores de velocidade', status: 'concluido', priority: 'baixa', mechanic: 'Pedro Santos', createdAt: '2026-04-07' },
  { id: '8', reference: 'OS-8835', client: 'Ricardo Costa', scooter: 'Ninebot Max G30 — SN-4489', description: 'Troca de display e cabos', status: 'concluido', priority: 'media', mechanic: 'Carlos Mendes', createdAt: '2026-04-07' },
];

export const orderKPIs = [
  { label: 'Total Ordens', value: '24', icon: 'assignment', trend: { value: '+4', positive: true } },
  { label: 'Em Reparacao', value: '8', icon: 'build', trend: { value: '+2', positive: false } },
  { label: 'Concluidas Hoje', value: '5', icon: 'check_circle', trend: { value: '+1', positive: true } },
  { label: 'Urgentes', value: '2', icon: 'priority_high', trend: { value: '-1', positive: true } },
];
