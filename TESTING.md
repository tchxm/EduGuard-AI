# EduGuard AI - Testing Guide

## Overview

This document outlines the testing strategy and implementation for EduGuard AI 2.0, covering backend API tests, frontend component tests, and integration tests.

## Testing Stack

### Backend
- **Test Framework:** Vitest
- **HTTP Testing:** Supertest
- **Database Testing:** Prisma with test database
- **Mocking:** Vitest's built-in mocking utilities
- **Coverage:** V8 (built-in to Vitest)

### Frontend
- **Test Framework:** Vitest
- **Component Testing:** React Testing Library
- **Snapshot Testing:** Vitest snapshots
- **E2E Testing:** Playwright (optional)

## Backend Testing

### Setup

```bash
# Install testing dependencies
cd packages/backend
pnpm add -D vitest @vitest/ui supertest prisma @prisma/client
```

### Test Structure

```
packages/backend/
├── src/
│   ├── __tests__/
│   │   ├── auth.test.ts
│   │   ├── classes.test.ts
│   │   ├── students.test.ts
│   │   ├── attendance.test.ts
│   │   └── fixtures/
│   │       └── test-data.ts
│   └── ...
└── vitest.config.ts
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

### Example Test - Auth Service

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authService } from '../../services/auth';
import { prisma } from '../../services/prisma';

describe('Auth Service', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'TEACHER',
  };

  beforeEach(async () => {
    // Clean up before each test
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.user.deleteMany();
  });

  describe('Register', () => {
    it('should register a new user', async () => {
      const user = await authService.register(testUser);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(testUser.email);
      expect(user.password).not.toBe(testUser.password); // Should be hashed
    });

    it('should reject duplicate email', async () => {
      await authService.register(testUser);
      
      expect(async () => {
        await authService.register(testUser);
      }).rejects.toThrow('Email already in use');
    });

    it('should hash password', async () => {
      const user = await authService.register(testUser);
      
      expect(user.password).not.toBe(testUser.password);
      expect(user.password.length).toBeGreaterThan(20); // Hashed passwords are longer
    });
  });

  describe('Login', () => {
    it('should return token on successful login', async () => {
      await authService.register(testUser);
      const result = await authService.login(testUser.email, testUser.password);
      
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
    });

    it('should reject invalid password', async () => {
      await authService.register(testUser);
      
      expect(async () => {
        await authService.login(testUser.email, 'WrongPassword123!');
      }).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      expect(async () => {
        await authService.login('nonexistent@example.com', 'AnyPassword123!');
      }).rejects.toThrow('User not found');
    });
  });
});
```

### Example Test - API Routes

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../../index';
import { prisma } from '../../services/prisma';

const request = supertest(app);

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should register new user', async () => {
    const response = await request.post('/api/auth/register').send({
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      name: 'New User',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('newuser@example.com');
    expect(response.body.token).toBeDefined();
  });

  it('should return 400 for invalid data', async () => {
    const response = await request.post('/api/auth/register').send({
      email: 'invalid-email',
      password: '123', // Too short
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    await request.post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
    });
  });

  it('should login with valid credentials', async () => {
    const response = await request.post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'TestPassword123!',
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  it('should return 401 for invalid credentials', async () => {
    const response = await request.post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'WrongPassword123!',
    });

    expect(response.status).toBe(401);
  });
});
```

## Frontend Testing

### Setup

```bash
# Install testing dependencies
cd packages/frontend
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

### Example Component Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick handler', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

## Integration Tests

### Testing Auth Flow

```typescript
describe('Complete Auth Flow', () => {
  it('should register and login user', async () => {
    // Register
    const registerRes = await request.post('/api/auth/register').send({
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      name: 'New User',
    });

    expect(registerRes.status).toBe(201);
    const token = registerRes.body.token;

    // Login
    const loginRes = await request.post('/api/auth/login').send({
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  it('should protect routes with auth middleware', async () => {
    // Try to access protected route without token
    const response = await request.get('/api/classes');
    
    expect(response.status).toBe(401);
  });

  it('should allow access with valid token', async () => {
    // Register and get token
    const registerRes = await request.post('/api/auth/register').send({
      email: 'authtest@example.com',
      password: 'SecurePassword123!',
      name: 'Auth Test',
    });

    const token = registerRes.body.token;

    // Access protected route with token
    const response = await request
      .get('/api/classes')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
  });
});
```

## Test Data Fixtures

Create `src/__tests__/fixtures/test-data.ts`:

```typescript
export const testUsers = {
  teacher: {
    email: 'teacher@example.com',
    password: 'TeacherPassword123!',
    name: 'John Teacher',
    role: 'TEACHER',
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
    role: 'ADMIN',
  },
};

export const testClasses = {
  classA: {
    name: 'Class A',
    section: '10-A',
    grade: 10,
  },
  classB: {
    name: 'Class B',
    section: '10-B',
    grade: 10,
  },
};

export const testStudents = {
  student1: {
    studentId: 'STU001',
    name: 'Student One',
    email: 'student1@example.com',
    phone: '1234567890',
  },
  student2: {
    studentId: 'STU002',
    name: 'Student Two',
    email: 'student2@example.com',
    phone: '0987654321',
  },
};
```

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: eduguard_test
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - run: pnpm install

      - name: Backend Tests
        working-directory: packages/backend
        run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:password@localhost/eduguard_test

      - name: Frontend Tests
        working-directory: packages/frontend
        run: pnpm test

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
```

## Best Practices

1. **Test Naming:** Use clear, descriptive test names
   ```typescript
   // Good
   it('should return 401 when token is missing', () => {});
   
   // Bad
   it('test auth', () => {});
   ```

2. **DRY Principle:** Use `beforeEach`/`afterEach` for setup/cleanup
   ```typescript
   beforeEach(async () => {
     // Clean database
     await prisma.user.deleteMany();
   });
   ```

3. **Test Isolation:** Each test should be independent
   ```typescript
   it('should not affect other tests', () => {
     // Don't rely on execution order
   });
   ```

4. **Assertion Clarity:** Use specific assertions
   ```typescript
   // Good
   expect(response.status).toBe(200);
   expect(response.body.user.email).toBe('test@example.com');
   
   // Less clear
   expect(response).toBeTruthy();
   ```

5. **Error Scenarios:** Test both success and failure cases
   ```typescript
   describe('Login', () => {
     it('should succeed with valid credentials', () => {});
     it('should fail with invalid credentials', () => {});
   });
   ```

## Coverage Goals

- **Target:** 80% overall coverage
- **Critical Paths:** 90%+ (auth, attendance, payments)
- **Views/Components:** 70%+
- **Utilities:** 85%+

## Running Tests Locally

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run tests for specific package
pnpm test packages/backend
pnpm test packages/frontend

# Generate coverage report
pnpm test --coverage

# Watch mode for development
pnpm test --watch
```

## Debugging Tests

```bash
# Run with debug output
DEBUG=* pnpm test

# Run specific test file
pnpm test auth.test.ts

# Run tests matching pattern
pnpm test -t "should register"
```

## Next Steps

1. Implement 20+ unit tests for critical services
2. Add 10+ integration tests for API routes
3. Create component tests for main UI pages
4. Set up CI/CD pipeline with automated test runs
5. Aim for 80%+ code coverage

---

**Last Updated:** March 2024
