import type { FeedItem } from '@/components/ui/activity-feed';

export const dashboardKPIs = [
  { label: 'Ordens de Servico', value: '24', icon: 'assignment', trend: { value: '+4', positive: true } },
  { label: 'Em Diagnostico', value: '8', icon: 'troubleshoot', trend: { value: '+2', positive: true } },
  { label: 'Stock Critico', value: '3', icon: 'warning', trend: { value: '-1', positive: true } },
  { label: 'Pendentes Financeiros', value: '12', icon: 'account_balance', trend: { value: '+3', positive: false } },
];

export const performanceData = [
  { hora: '08:00', eficiencia: 65 },
  { hora: '09:00', eficiencia: 72 },
  { hora: '10:00', eficiencia: 85 },
  { hora: '11:00', eficiencia: 90 },
  { hora: '12:00', eficiencia: 94 },
  { hora: '13:00', eficiencia: 78 },
  { hora: '14:00', eficiencia: 88 },
  { hora: '15:00', eficiencia: 91 },
  { hora: '16:00', eficiencia: 86 },
  { hora: '17:00', eficiencia: 79 },
];

export const summaryMetrics = [
  { label: 'Pecas Substituidas', value: '142', icon: 'build' },
  { label: 'Horas de Trabalho', value: '32.5h', icon: 'schedule' },
  { label: 'Eficiencia', value: '94%', icon: 'speed' },
];

export const recentActivity: FeedItem[] = [
  { id: '1', icon: 'build', text: 'OS #8842 — Substituicao de travao concluida', time: '14:32', highlight: true },
  { id: '2', icon: 'inventory_2', text: 'Stock de pastilhas atualizado — 14 unidades', time: '14:18' },
  { id: '3', icon: 'person', text: 'Novo cliente registado — Transportes Lda.', time: '13:55' },
  { id: '4', icon: 'receipt_long', text: 'Fatura #1247 emitida — €345.00', time: '13:40' },
  { id: '5', icon: 'local_shipping', text: 'Encomenda #PO-089 recebida — 24 pecas', time: '12:15' },
  { id: '6', icon: 'warning', text: 'Alerta: liquido de refrigeracao abaixo do minimo', time: '11:50', highlight: true },
  { id: '7', icon: 'assignment', text: 'OS #8841 — Diagnostico iniciado', time: '11:30' },
  { id: '8', icon: 'timer', text: 'Cronometro pausado — OS #8839 (2h15m)', time: '10:45' },
];
