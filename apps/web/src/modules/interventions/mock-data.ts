export type Part = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export const currentIntervention = {
  orderRef: 'OS-8842-GK',
  status: 'em_reparacao' as const,
  client: 'Transportes Silva Lda.',
  mechanic: 'Carlos Mendes',
  startTime: '09:15',
  elapsedTime: '02:47:32',
  description: 'Substituicao completa do sistema de travagem dianteiro e traseiro. Inspecao do cabo de travao e ajuste da alavanca.',
  scooter: {
    model: 'Xiaomi Pro 2',
    chassis: 'SN-4821-XP2-2024',
    mileage: '4,230 km',
    year: '2024',
  },
};

export const interventionParts: Part[] = [
  { id: '1', name: 'Pastilhas de Travao', quantity: 14, unit: 'un', unitPrice: 8.50 },
  { id: '2', name: 'Liquido de Refrigeracao', quantity: 4.2, unit: 'L', unitPrice: 6.50 },
  { id: '3', name: 'Cabo de Travao 1.8m', quantity: 2, unit: 'un', unitPrice: 3.20 },
];

export const interventionHistory = [
  { id: '1', time: '14:32', text: 'Travao traseiro montado com sucesso', icon: 'check_circle' },
  { id: '2', time: '13:45', text: 'Pastilhas novas instaladas (x4)', icon: 'build' },
  { id: '3', time: '12:20', text: 'Liquido de refrigeracao substituido', icon: 'water_drop' },
  { id: '4', time: '11:10', text: 'Desmontagem do sistema de travagem iniciada', icon: 'construction' },
  { id: '5', time: '09:15', text: 'Intervencao iniciada — OS #8842', icon: 'play_circle' },
];
