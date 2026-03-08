import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { FaceRecognitionService } from '../services/faceRecognition';

// Validation schemas
const StartSessionSchema = z.object({
  classId: z.string().min(1),
  useFaceRecognition: z.boolean().default(false),
});

const MarkAttendanceSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  detectionMethod: z.enum(['face', 'manual', 'qr']).default('manual'),
  confidence: z.number().min(0).max(1).optional(),
  faceEmbedding: z.array(z.number()).optional(),
});

const MarkFaceSchema = z.object({
  detectedEmbedding: z.array(z.number()),
  confidence: z.number().min(0).max(1),
});

export const attendanceRoutes = async (fastify: FastifyInstance) => {
  const prisma = fastify.prisma as PrismaClient;
  const faceService = new FaceRecognitionService(prisma);

  /**
   * Start an attendance session for a class
   */
  fastify.post<{ Body: z.infer<typeof StartSessionSchema> }>(
    '/sessions/start',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { classId, useFaceRecognition } = StartSessionSchema.parse(
        request.body
      );

      try {
        // Verify user is teacher and owns this class
        const classData = await prisma.class.findUnique({
          where: { id: classId },
          select: { userId: true },
        });

        if (!classData || classData.userId !== request.user.sub) {
          return reply.status(403).send({
            statusCode: 403,
            code: 'FORBIDDEN',
            message: 'Not authorized to manage this class',
          });
        }

        // Check if session already exists for today
        const today = new Date().toISOString().split('T')[0];
        const existingSession = await prisma.attendanceSession.findFirst({
          where: {
            classId,
            createdAt: {
              gte: new Date(`${today}T00:00:00Z`),
              lt: new Date(`${today}T23:59:59Z`),
            },
          },
        });

        if (existingSession) {
          return reply.status(400).send({
            statusCode: 400,
            code: 'SESSION_EXISTS',
            message: 'Session already exists for today',
          });
        }

        // Create new session
        const session = await prisma.attendanceSession.create({
          data: {
            classId,
            userId: request.user.sub,
            status: 'ONGOING',
            useFaceRecognition,
            sessionDate: new Date(),
          },
          include: {
            class: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        });

        return reply.status(201).send(session);
      } catch (error) {
        fastify.log.error('Error starting session:', error);
        return reply.status(500).send({
          statusCode: 500,
          code: 'SESSION_START_ERROR',
          message: 'Failed to start attendance session',
        });
      }
    }
  );

  /**
   * End an attendance session
   */
  fastify.post<{ Params: { sessionId: string } }>(
    '/sessions/:sessionId/end',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params;

      try {
        const session = await prisma.attendanceSession.findUnique({
          where: { id: sessionId },
          select: { userId: true, status: true },
        });

        if (!session) {
          return reply.status(404).send({
            statusCode: 404,
            code: 'SESSION_NOT_FOUND',
            message: 'Attendance session not found',
          });
        }

        if (session.userId !== request.user.sub) {
          return reply.status(403).send({
            statusCode: 403,
            code: 'FORBIDDEN',
            message: 'Not authorized to end this session',
          });
        }

        // Update session status
        const updatedSession = await prisma.attendanceSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            endedAt: new Date(),
          },
          include: {
            _count: {
              select: { records: true },
            },
          },
        });

        return reply.send(updatedSession);
      } catch (error) {
        fastify.log.error('Error ending session:', error);
        return reply.status(500).send({
          statusCode: 500,
          code: 'SESSION_END_ERROR',
          message: 'Failed to end attendance session',
        });
      }
    }
  );

  /**
   * Get session details
   */
  fastify.get<{ Params: { sessionId: string } }>(
    '/sessions/:sessionId',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params;

      try {
        const session = await prisma.attendanceSession.findUnique({
          where: { id: sessionId },
          include: {
            records: {
              include: {
                student: {
                  select: {
                    id: true,
                    enrollmentId: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

        if (!session) {
          return reply.status(404).send({
            statusCode: 404,
            code: 'SESSION_NOT_FOUND',
            message: 'Attendance session not found',
          });
        }

        return reply.send(session);
      } catch (error) {
        fastify.log.error('Error fetching session:', error);
        return reply.status(500).send({
          statusCode: 500,
          code: 'SESSION_FETCH_ERROR',
          message: 'Failed to fetch session details',
        });
      }
    }
  );

  /**
   * Mark attendance (manual)
   */
  fastify.post<{ Params: { sessionId: string }; Body: z.infer<typeof MarkAttendanceSchema> }>(
    '/sessions/:sessionId/mark',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const data = MarkAttendanceSchema.parse(request.body);

      try {
        // Verify session exists and is ongoing
        const session = await prisma.attendanceSession.findUnique({
          where: { id: sessionId },
          select: { status: true, classId: true },
        });

        if (!session) {
          return reply.status(404).send({
            statusCode: 404,
            code: 'SESSION_NOT_FOUND',
            message: 'Attendance session not found',
          });
        }

        if (session.status !== 'ONGOING') {
          return reply.status(400).send({
            statusCode: 400,
            code: 'SESSION_INACTIVE',
            message: 'Session is not active',
          });
        }

        // Check for existing record
        const existingRecord = await prisma.attendance.findFirst({
          where: {
            sessionId,
            studentId: data.studentId,
          },
        });

        if (existingRecord) {
          return reply.status(400).send({
            statusCode: 400,
            code: 'ALREADY_MARKED',
            message: 'Student already marked for this session',
          });
        }

        // Create attendance record
        const attendance = await prisma.attendance.create({
          data: {
            sessionId,
            studentId: data.studentId,
            status: data.status,
            detectionMethod: data.detectionMethod,
            confidence: data.confidence,
            markedAt: new Date(),
            markedBy: request.user.sub,
          },
          include: {
            student: {
              select: {
                enrollmentId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return reply.status(201).send(attendance);
      } catch (error) {
        fastify.log.error('Error marking attendance:', error);
        return reply.status(500).send({
          statusCode: 500,
          code: 'MARK_ERROR',
          message: 'Failed to mark attendance',
        });
      }
    }
  );

  /**
   * Mark attendance using face recognition
   */
  fastify.post<{ Params: { sessionId: string }; Body: z.infer<typeof MarkFaceSchema> }>(
    '/sessions/:sessionId/mark-face',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const { detectedEmbedding, confidence } = MarkFaceSchema.parse(request.body);

      try {
        // Get session
        const session = await prisma.attendanceSession.findUnique({
          where: { id: sessionId },
          select: { classId: true, status: true },
        });

        if (!session || session.status !== 'ONGOING') {
          return reply.status(400).send({
            statusCode: 400,
            code: 'INVALID_SESSION',
            message: 'Session not found or not active',
          });
        }

        // Validate embedding
        if (!faceService.validateEmbedding(detectedEmbedding)) {
          return reply.status(400).send({
            statusCode: 400,
            code: 'INVALID_EMBEDDING',
            message: 'Invalid face embedding',
          });
        }

        // Find matching student
        const match = await faceService.findMatchingStudent(
          detectedEmbedding,
          session.classId,
          0.65 // threshold
        );

        if (!match) {
          return reply.status(404).send({
            statusCode: 404,
            code: 'NO_MATCH',
            message: 'No matching student found',
          });
        }

        // Check if already marked
        const existingRecord = await prisma.attendance.findFirst({
          where: {
            sessionId,
            studentId: match.studentId,
          },
        });

        if (existingRecord) {
          return reply.status(400).send({
            statusCode: 400,
            code: 'ALREADY_MARKED',
            message: 'Student already marked',
          });
        }

        // Create attendance record
        const attendance = await prisma.attendance.create({
          data: {
            sessionId,
            studentId: match.studentId,
            status: 'PRESENT',
            detectionMethod: 'face',
            confidence: match.confidence,
            markedAt: new Date(),
            markedBy: request.user.sub,
          },
          include: {
            student: {
              select: {
                enrollmentId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return reply.status(201).send(attendance);
      } catch (error) {
        fastify.log.error('Error marking attendance with face:', error);
        return reply.status(500).send({
          statusCode: 500,
          code: 'FACE_MARK_ERROR',
          message: 'Failed to mark attendance with face recognition',
        });
      }
    }
  );

  /**
   * Get attendance report for a class
   */
  fastify.get<{ Params: { classId: string }; Querystring: { startDate?: string; endDate?: string } }>(
    '/class/:classId/report',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { classId } = request.params;
      const { startDate, endDate } = request.query;

      try {
        const whereClause: any = {
          session: {
            classId,
          },
        };

        if (startDate || endDate) {
          whereClause.session.sessionDate = {};
          if (startDate) {
            whereClause.session.sessionDate.gte = new Date(startDate);
          }
          if (endDate) {
            whereClause.session.sessionDate.lte = new Date(endDate);
          }
        }

        const records = await prisma.attendance.findMany({
          where: whereClause,
          include: {
            student: {
              select: {
                id: true,
                enrollmentId: true,
                firstName: true,
                lastName: true,
              },
            },
            session: {
              select: {
                sessionDate: true,
              },
            },
          },
          orderBy: {
            markedAt: 'desc',
          },
        });

        // Calculate statistics
        const stats = {
          totalRecords: records.length,
          presentCount: records.filter((r) => r.status === 'PRESENT').length,
          absentCount: records.filter((r) => r.status === 'ABSENT').length,
          lateCount: records.filter((r) => r.status === 'LATE').length,
          attendanceRate:
            records.length > 0
              ? (records.filter((r) => r.status === 'PRESENT').length /
                  records.length) *
                100
              : 0,
        };

        return reply.send({
          classId,
          records,
          stats,
        });
      } catch (error) {
        fastify.log.error('Error fetching attendance report:', error);
        return reply.status(500).send({
          statusCode: 500,
          code: 'REPORT_ERROR',
          message: 'Failed to generate attendance report',
        });
      }
    }
  );

  /**
   * Get attendance history for a student
   */
  fastify.get<{ Params: { studentId: string } }>(
    '/student/:studentId/history',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { studentId } = request.params;

      try {
        const history = await prisma.attendance.findMany({
          where: { studentId },
          include: {
            session: {
              select: {
                id: true,
                sessionDate: true,
                class: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
          orderBy: {
            markedAt: 'desc',
          },
          take: 100,
        });

        // Calculate attendance percentage
        const attendanceCount = history.filter((h) => h.status === 'PRESENT').length;
        const attendancePercentage =
          history.length > 0 ? (attendanceCount / history.length) * 100 : 0;

        return reply.send({
          studentId,
          totalRecords: history.length,
          attendancePercentage,
          history,
        });
      } catch (error) {
        fastify.log.error('Error fetching attendance history:', error);
        return reply.status(500).send({
          statusCode: 500,
          code: 'HISTORY_ERROR',
          message: 'Failed to fetch attendance history',
        });
      }
    }
  );
};
