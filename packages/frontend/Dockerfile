FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY packages/frontend ./packages/frontend

# Set working directory and build
WORKDIR /app/packages/frontend
RUN pnpm run build

# Production stage
FROM node:18-alpine

WORKDIR /app/packages/frontend

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-lock.yaml /app/

# Copy frontend files
COPY packages/frontend ./

# Install production dependencies only
RUN pnpm install --prod

# Copy built Next.js app from builder
COPY --from=builder /app/packages/frontend/.next ./.next

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["pnpm", "start"]
