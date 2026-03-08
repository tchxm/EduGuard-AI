import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.js';
import { errors } from '../middleware/errorHandler.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const authRoutes = async (fastify: FastifyInstance) => {
  const authService = new AuthService(fastify.prisma);

  // Register
  fastify.post<{ Body: z.infer<typeof registerSchema> }>(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = registerSchema.parse(request.body);

      const user = await authService.register(
        body.email,
        body.password,
        body.firstName,
        body.lastName
      );

      const token = fastify.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.code(201).send({
        user,
        token,
      });
    }
  );

  // Login
  fastify.post<{ Body: z.infer<typeof loginSchema> }>(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = loginSchema.parse(request.body);

      const user = await authService.login(body.email, body.password);

      const token = fastify.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.send({
        user,
        token,
      });
    }
  );

  // Logout
  fastify.post(
    '/logout',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      await authService.logout(userId);
      return reply.send({ success: true });
    }
  );

  // Get current user
  fastify.get(
    '/me',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw errors.notFound('User');
      }

      return reply.send(user);
    }
  );
};
