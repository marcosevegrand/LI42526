export type Customer = {
  id: string;
  name: string;
  nif: string;
  type: 'personal' | 'business';
  email: string;
  phone: string;
  orders: number;
  status: 'ativo' | 'inativo';
};

export const customers: Customer[] = [
  { id: '1', name: 'Transportes Silva Lda.', nif: '509 123 456', type: 'business', email: 'geral@silva.pt', phone: '+351 912 345 678', orders: 18, status: 'ativo' },
  { id: '2', name: 'Ana Rodrigues', nif: '234 567 890', type: 'personal', email: 'ana.r@email.pt', phone: '+351 923 456 789', orders: 5, status: 'ativo' },
  { id: '3', name: 'EcoRide Portugal', nif: '510 234 567', type: 'business', email: 'fleet@ecoride.pt', phone: '+351 934 567 890', orders: 32, status: 'ativo' },
  { id: '4', name: 'Joao Ferreira', nif: '345 678 901', type: 'personal', email: 'joao.f@email.pt', phone: '+351 945 678 901', orders: 3, status: 'ativo' },
  { id: '5', name: 'MobiCity Lda.', nif: '511 345 678', type: 'business', email: 'ops@mobicity.pt', phone: '+351 956 789 012', orders: 24, status: 'ativo' },
  { id: '6', name: 'Sofia Almeida', nif: '456 789 012', type: 'personal', email: 'sofia.a@email.pt', phone: '+351 967 890 123', orders: 2, status: 'inativo' },
  { id: '7', name: 'GreenGo Servicos', nif: '512 456 789', type: 'business', email: 'admin@greengo.pt', phone: '+351 978 901 234', orders: 15, status: 'ativo' },
  { id: '8', name: 'Ricardo Costa', nif: '567 890 123', type: 'personal', email: 'ricardo.c@email.pt', phone: '+351 989 012 345', orders: 7, status: 'ativo' },
];
