import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-this',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',

  // Email
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'noreply@eduguard.app',
  },

  // Redis
  redisUrl: process.env.REDIS_URL,

  // Face Recognition
  faceApi: {
    modelUrl: process.env.FACE_API_MODEL_URL,
    threshold: parseFloat(process.env.FACE_DETECTION_THRESHOLD || '0.6'),
  },

  // Features
  enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
};
