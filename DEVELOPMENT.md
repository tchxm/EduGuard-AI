# EduGuard AI - Development Guide

This guide provides detailed information for developers working on the EduGuard AI project.

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd eduguard-ai

# Install dependencies
pnpm install

# Set up environment variables
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env with your database URL

# Initialize database
pnpm db:push

# Start development servers
pnpm dev
```

The development servers will run at:
- Backend: http://localhost:3000
- Frontend: http://localhost:3001

## Project Structure

### Backend (`packages/backend`)
- **src/config**: Configuration management
- **src/middleware**: Express middleware (auth, error handling)
- **src/routes**: API route definitions
- **src/services**: Business logic layer
- **prisma**: Database schema and migrations
- **dist**: Compiled TypeScript output

### Frontend (`packages/frontend`)
- **app**: Next.js App Router pages
- **components**: Reusable React components
  - **ui**: Basic UI components (Button, Input, etc.)
  - **layout**: Layout components (Sidebar, Header)
  - **dashboard**: Dashboard-specific components
  - **classes**: Class management components
  - **students**: Student management components
  - **attendance**: Attendance tracking components
  - **reports**: Report components
- **lib**: Utilities and store management
  - **api.ts**: API client and endpoints
  - **store.ts**: Zustand stores (auth, dashboard)
  - **validation.ts**: Input validation utilities
  - **pagination.ts**: Pagination helpers

## Development Workflow

### 1. Creating New Features

```bash
# Create a new branch
git checkout -b feature/my-feature

# Make changes following the code style
# - Use TypeScript strict mode
# - Follow the existing folder structure
# - Write tests for critical logic

# Format and lint
pnpm format
pnpm lint

# Test locally
pnpm test

# Push to GitHub
git push origin feature/my-feature
# Create a Pull Request
```

### 2. Database Changes

```bash
# Create a new migration
pnpm db:migrate

# This will:
# 1. Prompt you for a migration name
# 2. Generate a migration file
# 3. Apply the migration to your local database

# Review the migration file before committing
# Push to repository
git add prisma/migrations
git commit -m "Add migration: <description>"
```

### 3. API Endpoints

Create routes in `src/routes/`:

```typescript
import { FastifyInstance } from 'fastify';

export const myRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/my-endpoint', async (request, reply) => {
    return { message: 'Hello' };
  });
};
```

Register in `src/index.ts`:

```typescript
await fastify.register(myRoutes, { prefix: '/api/my-routes' });
```

### 4. Frontend Components

Create components in appropriate subdirectories:

```typescript
import React from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return <div>{title}</div>;
}
```

Use the component in a page or other component:

```typescript
import { MyComponent } from '@/components/path/MyComponent';

export default function Page() {
  return <MyComponent title="Hello" />;
}
```

## Testing

### Backend Tests

```bash
# Run all tests
pnpm test:backend

# Run tests in watch mode
cd packages/backend && pnpm test:watch

# Run specific test file
cd packages/backend && pnpm test src/routes/auth.test.ts

# Generate coverage report
cd packages/backend && pnpm test:coverage
```

Test structure:

```typescript
// src/routes/auth.test.ts
import { describe, it, expect } from 'vitest';
import { createServer } from '../index';

describe('Auth Routes', () => {
  it('should register a user', async () => {
    const fastify = await createServer();
    
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      },
    });

    expect(response.statusCode).toBe(201);
  });
});
```

### Frontend Tests

```bash
# Run tests
pnpm test:frontend

# Run in watch mode
cd packages/frontend && pnpm test --watch
```

## Code Style

### TypeScript
- Use strict mode
- Prefer interfaces over types (except for unions)
- Export types alongside implementations
- Use `as const` for literal types

### React
- Use functional components with hooks
- Keep components small and focused
- Props interfaces should be prefixed with component name
- Use `React.ReactNode` for children

### Database
- Use Prisma for all database operations
- Create migrations for schema changes
- Use snake_case for database column names
- Use camelCase for TypeScript field names

### API
- Use RESTful conventions
- Version sensitive endpoints (if needed)
- Return consistent error format
- Document endpoints with comments

## Debugging

### Backend Debugging

```bash
# Start with debug logging
DEBUG=* pnpm dev:backend

# Or use Node inspector
node --inspect-brk packages/backend/dist/index.js
# Connect with Chrome DevTools: chrome://inspect
```

### Frontend Debugging

- Use React DevTools browser extension
- Check Network tab in DevTools for API calls
- Use `console.log("[v0] ...")` for debugging info
- Check Next.js logs in terminal

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/eduguard

# Server
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password

# Features
ENABLE_EMAIL_VERIFICATION=true
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Common Tasks

### Add a new npm package

```bash
# Backend package
cd packages/backend && pnpm add package-name

# Frontend package
cd packages/frontend && pnpm add package-name

# Dev dependency
pnpm add --save-dev -w package-name
```

### Update all dependencies

```bash
pnpm update
```

### Reset database

```bash
# ⚠️ This will delete all data
pnpm db:reset
```

### View database with UI

```bash
pnpm db:studio
```

## Docker Development

### Build and run locally

```bash
# Build images
pnpm docker:build

# Start services
pnpm docker:up

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

Services will be available at:
- Backend: http://localhost:3000
- Frontend: http://localhost:3001
- Database: localhost:5432
- Redis: localhost:6379

## Performance Optimization

### Backend
- Use database indexes for frequently queried fields
- Implement caching for repeated queries
- Paginate large result sets
- Use SELECT to fetch only needed fields

### Frontend
- Use code splitting with dynamic imports
- Lazy load images
- Memoize expensive components
- Use SWR for efficient data fetching

## Security Checklist

- [ ] Validate all user inputs on backend
- [ ] Use HTTPS in production
- [ ] Rotate JWT secrets regularly
- [ ] Implement rate limiting
- [ ] Use environment variables for secrets
- [ ] Keep dependencies updated
- [ ] Run security audit: `npm audit`

## Troubleshooting

### Port already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 pnpm dev:backend
```

### Database connection error

```bash
# Check if database is running
psql -U eduguard -d eduguard -c "SELECT 1;"

# Reset database
pnpm db:reset
```

### TypeScript errors

```bash
# Rebuild TypeScript
cd packages/backend && pnpm tsc --noEmit
```

## Resources

- [Fastify Documentation](https://www.fastify.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

1. Check existing GitHub issues
2. Review the API documentation in README.md
3. Check logs for error messages
4. Ask in team channels

## Contributing

Follow the contribution guidelines:
1. Create a branch from `main`
2. Make your changes
3. Write/update tests
4. Update documentation if needed
5. Create a pull request

---

Happy coding! 🚀
