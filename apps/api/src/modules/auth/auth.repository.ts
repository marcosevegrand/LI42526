import { getPrismaClient } from '../../shared/db/prisma';

export class AuthRepository {
  async findByEmail(email: string) {
    return getPrismaClient().user.findUnique({
      where: { email },
    });
  }
}