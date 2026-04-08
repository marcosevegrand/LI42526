import { hash } from 'bcryptjs';

import { getPrismaClient } from '../src/shared/db/prisma';

async function seed() {
  const prisma = getPrismaClient();
  const passwordHash = await hash('changeme123', 12);

  await prisma.user.upsert({
    where: { email: 'manager@gengiskhan.pt' },
    update: {},
    create: {
      fullName: 'Workshop Manager',
      email: 'manager@gengiskhan.pt',
      passwordHash,
      role: 'manager',
    },
  });
}

void seed();
