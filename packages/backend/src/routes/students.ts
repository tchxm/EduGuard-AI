import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { errors } from '../middleware/errorHandler.js';

const createStudentSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

const updateStudentSchema = createStudentSchema.partial();

const enrollStudentSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
});

export const studentRoutes = async (fastify: FastifyInstance) => {
  // Create student (teacher/admin only)
  fastify.post<{ Body: z.infer<typeof createStudentSchema> }>(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
        throw errors.forbidden();
      }

      const body = createStudentSchema.parse(request.body);

      // Check if student already exists
      const existingStudent = await fastify.prisma.student.findUnique({
        where: { email: body.email },
      });

      if (existingStudent) {
        throw errors.conflict('Student email already exists');
      }

      const newStudent = await fastify.prisma.student.create({
        data: body,
      });

      return reply.code(201).send(newStudent);
    }
  );

  // Get all students
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const classId = (request.query as any).classId;

      const students = await fastify.prisma.student.findMany({
        where: classId
          ? {
              classes: {
                some: { classId },
              },
            }
          : undefined,
        include: {
          classes: {
            include: { class: true },
          },
        },
      });

      return reply.send(students);
    }
  );

  // Get student by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const student = await fastify.prisma.student.findUnique({
        where: { id },
        include: {
          classes: {
            include: { class: true },
          },
        },
      });

      if (!student) {
        throw errors.notFound('Student');
      }

      return reply.send(student);
    }
  );

  // Update student
  fastify.patch<{ Body: z.infer<typeof updateStudentSchema>; Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params as { id: string };
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
        throw errors.forbidden();
      }

      const body = updateStudentSchema.parse(request.body);

      const student = await fastify.prisma.student.update({
        where: { id },
        data: body,
      });

      return reply.send(student);
    }
  );

  // Enroll student in class
  fastify.post<{ Body: z.infer<typeof enrollStudentSchema>; Params: { id: string } }>(
    '/:id/enroll',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params as { id: string };
      const body = enrollStudentSchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
        throw errors.forbidden();
      }

      const student = await fastify.prisma.student.findUnique({
        where: { id },
      });

      if (!student) {
        throw errors.notFound('Student');
      }

      const classData = await fastify.prisma.class.findUnique({
        where: { id: body.classId },
      });

      if (!classData) {
        throw errors.notFound('Class');
      }

      // Check if already enrolled
      const existing = await fastify.prisma.studentClass.findUnique({
        where: {
          studentId_classId: {
            studentId: id,
            classId: body.classId,
          },
        },
      });

      if (existing) {
        throw errors.conflict('Student already enrolled in this class');
      }

      const enrollment = await fastify.prisma.studentClass.create({
        data: {
          studentId: id,
          classId: body.classId,
        },
      });

      return reply.code(201).send(enrollment);
    }
  );

  // Remove student from class
  fastify.delete<{ Params: { id: string; classId: string } }>(
    '/:id/classes/:classId',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const { id, classId } = request.params as { id: string; classId: string };

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
        throw errors.forbidden();
      }

      await fastify.prisma.studentClass.deleteMany({
        where: {
          studentId: id,
          classId: classId,
        },
      });

      return reply.send({ success: true });
    }
  );

  // Delete student (soft delete)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params as { id: string };

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
        throw errors.forbidden();
      }

      await fastify.prisma.student.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.send({ success: true });
    }
  );
};
