export type Scooter = {
  id: string;
  serialNumber: string;
  model: string;
  brand: string;
  year: number;
  client: string;
  mileage: string;
  lastService: string;
  status: 'ativo' | 'em_reparacao' | 'inativo';
};

export const scooters: Scooter[] = [
  { id: '1', serialNumber: 'SN-4821', model: 'Pro 2', brand: 'Xiaomi', year: 2024, client: 'Transportes Silva Lda.', mileage: '4,230 km', lastService: '2026-04-10', status: 'em_reparacao' },
  { id: '2', serialNumber: 'SN-7734', model: 'Max G30', brand: 'Ninebot', year: 2023, client: 'Ana Rodrigues', mileage: '8,120 km', lastService: '2026-04-10', status: 'em_reparacao' },
  { id: '3', serialNumber: 'SN-1123', model: 'P100S', brand: 'Segway', year: 2025, client: 'EcoRide Portugal', mileage: '1,850 km', lastService: '2026-03-28', status: 'ativo' },
  { id: '4', serialNumber: 'SN-9956', model: 'Essential', brand: 'Xiaomi', year: 2023, client: 'Joao Ferreira', mileage: '6,780 km', lastService: '2026-04-09', status: 'em_reparacao' },
  { id: '5', serialNumber: 'SN-3342', model: 'F2 Pro', brand: 'Ninebot', year: 2024, client: 'MobiCity Lda.', mileage: '3,450 km', lastService: '2026-04-08', status: 'ativo' },
  { id: '6', serialNumber: 'SN-6678', model: 'Pro 2', brand: 'Xiaomi', year: 2024, client: 'Sofia Almeida', mileage: '5,920 km', lastService: '2026-04-08', status: 'em_reparacao' },
  { id: '7', serialNumber: 'SN-2201', model: 'E2 Plus', brand: 'Segway', year: 2025, client: 'GreenGo Servicos', mileage: '2,100 km', lastService: '2026-04-07', status: 'ativo' },
  { id: '8', serialNumber: 'SN-4489', model: 'Max G30', brand: 'Ninebot', year: 2023, client: 'Ricardo Costa', mileage: '9,340 km', lastService: '2026-04-07', status: 'ativo' },
];
