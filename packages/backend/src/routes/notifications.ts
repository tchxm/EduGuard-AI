import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { errors } from '../middleware/errorHandler.js';

const createNotificationSchema = z.object({
  type: z.enum(['ATTENDANCE_ALERT', 'ENROLLMENT_CONFIRMATION', 'CLASS_UPDATE', 'IMPORTANT_MESSAGE', 'SYSTEM_ALERT']),
  title: z.string().min(1),
  message: z.string().min(1),
  userId: z.string().optional(),
  studentId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const notificationRoutes = async (fastify: FastifyInstance) => {
  // Create notification (admin/teacher only)
  fastify.post<{ Body: z.infer<typeof createNotificationSchema> }>(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const body = createNotificationSchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !['ADMIN', 'TEACHER'].includes(user.role)) {
        throw errors.forbidden();
      }

      const notification = await fastify.prisma.notification.create({
        data: {
          ...body,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        },
      });

      return reply.code(201).send(notification);
    }
  );

  // Get user notifications
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw errors.notFound('User');
      }

      const notifications = await fastify.prisma.notification.findMany({
        where: {
          OR: [
            { userId },
            user.role === 'STUDENT'
              ? {
                  studentId: userId,
                }
              : {},
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(notifications);
    }
  );

  // Get single notification
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const notification = await fastify.prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        throw errors.notFound('Notification');
      }

      return reply.send(notification);
    }
  );

  // Mark notification as read
  fastify.patch<{ Params: { id: string } }>(
    '/:id/read',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const notification = await fastify.prisma.notification.update({
        where: { id },
        data: { read: true },
      });

      return reply.send(notification);
    }
  );

  // Mark all notifications as read
  fastify.patch(
    '/read-all',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;

      await fastify.prisma.notification.updateMany({
        where: {
          OR: [{ userId }, { studentId: userId }],
          read: false,
        },
        data: { read: true },
      });

      return reply.send({ success: true });
    }
  );

  // Delete notification
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      await fastify.prisma.notification.delete({
        where: { id },
      });

      return reply.send({ success: true });
    }
  );
};
