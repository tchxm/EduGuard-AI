# Multi-stage build for EduGuard AI

# Stage 1: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy workspace and package files
COPY package.json pnpm-lock.yaml ./
COPY packages/backend ./packages/backend

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build backend
WORKDIR /app/packages/backend
RUN pnpm run build

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy workspace and package files
COPY package.json pnpm-lock.yaml ./
COPY packages/frontend ./packages/frontend

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build frontend
WORKDIR /app/packages/frontend
RUN pnpm run build

# Stage 3: Production backend
FROM node:18-alpine AS backend-prod

WORKDIR /app/packages/backend

# Copy built files and dependencies
COPY --from=backend-builder /app/packages/backend/dist ./dist
COPY --from=backend-builder /app/packages/backend/node_modules ./node_modules
COPY --from=backend-builder /app/packages/backend/package.json ./

# Copy Prisma client
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

# Stage 4: Production frontend (with Node.js server)
FROM node:18-alpine AS frontend-prod

WORKDIR /app/packages/frontend

# Copy built Next.js app and dependencies
COPY --from=frontend-builder /app/packages/frontend/.next ./.next
COPY --from=frontend-builder /app/packages/frontend/public ./public
COPY --from=frontend-builder /app/packages/frontend/node_modules ./node_modules
COPY --from=frontend-builder /app/packages/frontend/package.json ./next.config.js ./

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "node_modules/.bin/next", "start"]

# Stage 5: Combined production image (for simplicity)
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace package files
COPY package.json pnpm-lock.yaml ./

# Copy built backend and frontend
COPY --from=backend-builder /app/packages/backend ./packages/backend
COPY --from=frontend-builder /app/packages/frontend ./packages/frontend

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Build backend
WORKDIR /app/packages/backend
RUN pnpm run build

# Build frontend  
WORKDIR /app/packages/frontend
RUN pnpm run build

WORKDIR /app

EXPOSE 3000 3001

ENV NODE_ENV=production

# Run both services (in production, use separate containers)
CMD ["sh", "-c", "cd packages/backend && node dist/index.js & cd packages/frontend && node node_modules/.bin/next start"]
