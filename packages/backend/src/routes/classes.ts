import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { errors } from '../middleware/errorHandler.js';

const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  code: z.string().min(1, 'Class code is required'),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  room: z.string().optional(),
  schedule: z.string().optional(),
});

const updateClassSchema = createClassSchema.partial();

export const classRoutes = async (fastify: FastifyInstance) => {
  // Create class (teacher only)
  fastify.post<{ Body: z.infer<typeof createClassSchema> }>(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== 'TEACHER') {
        throw errors.forbidden();
      }

      const body = createClassSchema.parse(request.body);

      // Check if class code already exists
      const existingClass = await fastify.prisma.class.findUnique({
        where: { code: body.code },
      });

      if (existingClass) {
        throw errors.conflict('Class code already exists');
      }

      const newClass = await fastify.prisma.class.create({
        data: {
          ...body,
          teacherId: userId,
        },
      });

      return reply.code(201).send(newClass);
    }
  );

  // Get all classes for teacher
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

      let classes;
      if (user.role === 'TEACHER') {
        classes = await fastify.prisma.class.findMany({
          where: { teacherId: userId },
          include: {
            _count: {
              select: { students: true },
            },
          },
        });
      } else if (user.role === 'ADMIN') {
        classes = await fastify.prisma.class.findMany({
          include: {
            _count: {
              select: { students: true },
            },
          },
        });
      } else {
        // Students - classes they're enrolled in
        classes = await fastify.prisma.class.findMany({
          where: {
            students: {
              some: {
                studentId: userId,
              },
            },
          },
          include: {
            _count: {
              select: { students: true },
            },
          },
        });
      }

      return reply.send(classes);
    }
  );

  // Get class by ID with students
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const classData = await fastify.prisma.class.findUnique({
        where: { id },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          students: {
            include: {
              student: true,
            },
          },
          _count: {
            select: {
              students: true,
              attendance: true,
            },
          },
        },
      });

      if (!classData) {
        throw errors.notFound('Class');
      }

      return reply.send(classData);
    }
  );

  // Update class (teacher only)
  fastify.patch<{ Body: z.infer<typeof updateClassSchema>; Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params as { id: string };
      const body = updateClassSchema.parse(request.body);

      const classData = await fastify.prisma.class.findUnique({
        where: { id },
      });

      if (!classData) {
        throw errors.notFound('Class');
      }

      if (classData.teacherId !== userId) {
        throw errors.forbidden();
      }

      const updated = await fastify.prisma.class.update({
        where: { id },
        data: body,
      });

      return reply.send(updated);
    }
  );

  // Delete class (teacher only)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params as { id: string };

      const classData = await fastify.prisma.class.findUnique({
        where: { id },
      });

      if (!classData) {
        throw errors.notFound('Class');
      }

      if (classData.teacherId !== userId) {
        throw errors.forbidden();
      }

      await fastify.prisma.class.delete({
        where: { id },
      });

      return reply.send({ success: true });
    }
  );
};
