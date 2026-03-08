import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { errors } from '../middleware/errorHandler.js';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(email: string, password: string, firstName: string, lastName: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw errors.conflict('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async login(email: string, password: string) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw errors.badRequest('Invalid email or password');
    }

    if (!user.isActive) {
      throw errors.badRequest('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw errors.badRequest('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async logout(userId: string) {
    // Delete all sessions for this user
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    return { success: true };
  }

  async validateToken(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw errors.unauthorized();
    }

    return session.user;
  }
}
