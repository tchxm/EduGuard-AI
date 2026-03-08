import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { config } from './config/index.js';
import { authRoutes } from './routes/auth.js';
import { classRoutes } from './routes/classes.js';
import { studentRoutes } from './routes/students.js';
import { attendanceRoutes } from './routes/attendance.js';
import { userRoutes } from './routes/users.js';
import { notificationRoutes } from './routes/notifications.js';
import { errorHandler } from './middleware/errorHandler.js';

const logger = pino(
  config.nodeEnv === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
    : {}
);

const prisma = new PrismaClient();

export const createServer = async () => {
  const fastify = Fastify({
    logger: logger,
    trustProxy: true,
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register plugins
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await fastify.register(fastifyCors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    cache: 10000,
    allowList: ['/health'],
    redis: config.redisUrl ? { url: config.redisUrl } : undefined,
  });

  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: config.jwtExpiresIn,
    },
  });

  // Attach Prisma to fastify instance
  fastify.decorate('prisma', prisma);
  fastify.decorate('logger', logger);

  // Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(classRoutes, { prefix: '/api/classes' });
  await fastify.register(studentRoutes, { prefix: '/api/students' });
  await fastify.register(attendanceRoutes, { prefix: '/api/attendance' });
  await fastify.register(notificationRoutes, { prefix: '/api/notifications' });

  // Error handler
  fastify.setErrorHandler(errorHandler);

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      try {
        await fastify.close();
        await prisma.$disconnect();
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });
  });

  return fastify;
};

const start = async () => {
  const fastify = await createServer();

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');

    await fastify.listen({ port: config.port, host: config.host });
    logger.info(`Server running on http://${config.host}:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
