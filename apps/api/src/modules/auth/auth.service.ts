import { compare } from 'bcryptjs';

import { appError } from '../../shared/auth/session';
import type { SessionUser } from '../../shared/auth/session';
import { AuthRepository } from './auth.repository';

type LoginInput = {
  email: string;
  password: string;
};

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async login(input: LoginInput): Promise<SessionUser> {
    const user = await this.repository.findByEmail(input.email);

    if (!user) {
      throw appError(401, 'invalid_credentials', 'Invalid email or password');
    }

    const isValid = await compare(input.password, user.passwordHash);
    if (!isValid) {
      throw appError(401, 'invalid_credentials', 'Invalid email or password');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role === 'manager' ? 'manager' : 'mechanic',
    };
  }
}