export const reportsKPIs = [
  { label: 'Faturacao Total', value: '€42,850', icon: 'payments', trend: { value: '+18%', positive: true } },
  { label: 'Ordens Concluidas', value: '184', icon: 'check_circle', trend: { value: '+12', positive: true } },
  { label: 'Ticket Medio', value: '€232.80', icon: 'confirmation_number', trend: { value: '+€14', positive: true } },
  { label: 'Itens em Stock', value: '1,240', icon: 'inventory_2', trend: { value: '-24', positive: false } },
];

export const revenueData = [
  { dia: '01 Abr', receita: 1850 },
  { dia: '02 Abr', receita: 2340 },
  { dia: '03 Abr', receita: 1920 },
  { dia: '04 Abr', receita: 3100 },
  { dia: '05 Abr', receita: 2780 },
  { dia: '06 Abr', receita: 1450 },
  { dia: '07 Abr', receita: 980 },
  { dia: '08 Abr', receita: 3420 },
  { dia: '09 Abr', receita: 2890 },
  { dia: '10 Abr', receita: 2150 },
];

export const orderStatusData = [
  { name: 'Concluidas', value: 147, fill: '#cdc990' },
  { name: 'Em Reparacao', value: 61, fill: '#ffb4a8' },
  { name: 'Pendentes', value: 37, fill: '#57423e' },
];

export const topParts = [
  { name: 'Pastilhas de Travao', consumed: 342 },
  { name: 'Pneu 10" Tubeless', consumed: 198 },
  { name: 'Cabo de Travao', consumed: 156 },
  { name: 'Display LCD', consumed: 89 },
  { name: 'Bateria 36V', consumed: 45 },
];

export const mechanicPerformance = [
  { name: 'Carlos Mendes', orders: 92, avgTime: '2.4h', efficiency: '96%' },
  { name: 'Pedro Santos', orders: 78, avgTime: '2.8h', efficiency: '91%' },
  { name: 'Ana Costa', orders: 64, avgTime: '3.1h', efficiency: '88%' },
];
