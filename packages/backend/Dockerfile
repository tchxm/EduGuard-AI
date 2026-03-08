FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy workspace files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY packages/backend ./packages/backend

# Set working directory
WORKDIR /app/packages/backend

# Generate Prisma client
RUN pnpm prisma generate

# Build TypeScript
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
