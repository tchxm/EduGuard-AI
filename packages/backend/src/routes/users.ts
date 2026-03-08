import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { errors } from '../middleware/errorHandler.js';

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
});

export const userRoutes = async (fastify: FastifyInstance) => {
  // Get all users (admin only)
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.role !== 'ADMIN') {
        throw errors.forbidden();
      }

      const users = await fastify.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      return reply.send(users);
    }
  );

  // Get user by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params as { id: string };

      // Users can only view their own profile unless admin
      const requestUser = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (requestUser?.role !== 'ADMIN' && userId !== id) {
        throw errors.forbidden();
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id },
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

  // Update user
  fastify.patch<{ Body: z.infer<typeof updateUserSchema>; Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params as { id: string };
      const body = updateUserSchema.parse(request.body);

      // Users can only update their own profile unless admin
      const requestUser = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (requestUser?.role !== 'ADMIN' && userId !== id) {
        throw errors.forbidden();
      }

      const user = await fastify.prisma.user.update({
        where: { id },
        data: body,
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

      return reply.send(user);
    }
  );

  // Deactivate user (admin only)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params as { id: string };

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.role !== 'ADMIN') {
        throw errors.forbidden();
      }

      await fastify.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.send({ success: true });
    }
  );
};
