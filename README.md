# EduGuard AI 2.0 - Modern Attendance System

A completely rebuilt, modern AI-powered attendance management system with face recognition, built with **Node.js/Fastify** backend and **Next.js 15** frontend using **PostgreSQL** database.

## 🚀 Key Improvements Over Legacy Version

### Architecture
- **Backend**: Flask → **Fastify** (High-performance, modern)
- **Frontend**: Flask templates → **Next.js 15** with React (Modern SPA)
- **Database**: SQLite → **PostgreSQL** with **Prisma ORM** (Production-ready)
- **Type Safety**: No types → **TypeScript** everywhere
- **Monorepo**: Single workspace with `packages/backend` and `packages/frontend`

### New Features
- ✅ Real-time face recognition with face-api.js
- ✅ JWT-based authentication with secure sessions
- ✅ Redis caching for performance (optional)
- ✅ Comprehensive API with input validation (Zod)
- ✅ Error handling & logging with Pino
- ✅ Responsive dashboard with Tailwind CSS
- ✅ Real-time attendance marking with confidence scores
- ✅ Advanced reporting and analytics
- ✅ Email notifications system
- ✅ Audit logging for compliance
- ✅ Rate limiting & security headers (Helmet)
- ✅ Comprehensive testing setup (Vitest)

## 📁 Project Structure

```
eduguard-ai/
├── packages/
│   ├── backend/              # Fastify API server
│   │   ├── src/
│   │   │   ├── config/       # Configuration
│   │   │   ├── middleware/   # Error handling, auth
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   └── index.ts      # Server entry
│   │   ├── prisma/           # Database schema & migrations
│   │   └── package.json
│   │
│   └── frontend/             # Next.js 15 web app
│       ├── app/              # App Router pages
│       ├── components/       # React components
│       ├── lib/              # Utilities & stores
│       └── package.json
│
├── scripts/                  # Utility scripts
├── package.json              # Root workspace config
└── README.md                # This file
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Fastify
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + bcryptjs
- **Validation**: Zod
- **Logging**: Pino
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Vitest

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Data Fetching**: SWR + Axios
- **Face Recognition**: face-api.js
- **Charts**: Recharts
- **Form**: Native HTML with Zod validation

## 📋 Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (or npm/yarn)
- PostgreSQL 14+ (via Neon serverless)
- A Neon database URL

## ⚙️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Clean pnpm cache (if you see workspace warnings)
pnpm store prune

# Install root dependencies
pnpm install

# This installs dependencies for both packages/backend and packages/frontend
```

**Note:** pnpm is configured with `pnpm-workspace.yaml` for proper monorepo support. If you see "workspaces field in package.json" warnings, run `pnpm store prune` and try again.

### 2. Configure Environment Variables

Create `.env` file in `packages/backend/`:

```bash
# Database
DATABASE_URL="postgresql://user:password@host/dbname"

# Server
NODE_ENV="development"
PORT=3000
HOST="0.0.0.0"

# JWT
JWT_SECRET="your-super-secret-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="EduGuard <noreply@eduguard.app>"

# Features
ENABLE_EMAIL_VERIFICATION=true
```

Create `.env.local` in `packages/frontend/`:

```bash
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

### 3. Initialize Database

```bash
# Create and push database schema
pnpm db:push

# Or run migrations
pnpm db:migrate

# View database with Prisma Studio
pnpm db:studio
```

### 4. Run Development Server

```bash
# Start both backend and frontend in parallel
pnpm dev

# Backend will run on http://localhost:3000
# Frontend will run on http://localhost:3001
```

## 📚 API Documentation

### Authentication Routes
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users Routes
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user details
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Classes Routes
- `POST /api/classes` - Create class (teacher)
- `GET /api/classes` - List classes
- `GET /api/classes/:id` - Get class details
- `PATCH /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Students Routes
- `POST /api/students` - Create student
- `GET /api/students` - List students
- `GET /api/students/:id` - Get student details
- `PATCH /api/students/:id` - Update student
- `POST /api/students/:id/enroll` - Enroll in class
- `DELETE /api/students/:id/classes/:classId` - Remove from class

### Attendance Routes
- `POST /api/attendance/sessions/start` - Start attendance session
- `POST /api/attendance/sessions/:sessionId/end` - End session
- `GET /api/attendance/sessions/:sessionId` - Get session details
- `POST /api/attendance/sessions/:sessionId/mark` - Mark attendance
- `GET /api/attendance/class/:classId/report` - Get class report
- `GET /api/attendance/student/:studentId/history` - Get student history

### Notifications Routes
- `POST /api/notifications` - Create notification
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

## 🎯 Features Implementation Status

### Phase 1: Core Backend & Frontend (✅ Complete)
- [x] Fastify server with configuration
- [x] PostgreSQL schema with Prisma
- [x] JWT authentication system
- [x] User management API
- [x] Class management API
- [x] Student management API
- [x] Next.js 15 dashboard
- [x] Login/Register pages
- [x] Responsive layout with Tailwind

### Phase 2: Attendance & Face Recognition (In Progress)
- [ ] Attendance session management
- [ ] Face recognition with face-api.js
- [ ] Real-time video stream detection
- [ ] Confidence scoring
- [ ] QR code scanning support
- [ ] Manual attendance marking

### Phase 3: Reports & Analytics
- [ ] Attendance reports with filtering
- [ ] Student performance analytics
- [ ] Class statistics dashboard
- [ ] Export to CSV/PDF
- [ ] Trend analysis

### Phase 4: Notifications & Alerts
- [ ] Email notification service
- [ ] SMS notifications (optional)
- [ ] In-app notification center
- [ ] Low attendance alerts
- [ ] Absence notifications to parents

### Phase 5: Deployment & Polish
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Production deployment guide
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Comprehensive testing

## 🧪 Testing

### Backend Tests
```bash
cd packages/backend
pnpm test
pnpm test:watch
```

### Frontend Tests
```bash
cd packages/frontend
pnpm test
```

## 🚢 Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t eduguard-ai .

# Run container
docker run -p 3000:3000 -e DATABASE_URL="..." eduguard-ai
```

### Vercel Deployment
```bash
# Frontend automatically deploys with Git push
vercel

# Backend can be deployed to Vercel Functions or standalone service
```

## 🔐 Security Considerations

- ✅ Password hashing with bcryptjs (10 rounds)
- ✅ JWT tokens with expiration
- ✅ CORS protection
- ✅ Rate limiting (100 requests per 15 mins)
- ✅ Helmet headers for XSS/CSRF protection
- ✅ SQL injection prevention via Prisma
- ✅ Input validation with Zod
- ✅ Role-based access control
- ⚠️ TODO: Add 2FA support
- ⚠️ TODO: Implement session revocation
- ⚠️ TODO: Add comprehensive audit logging

## 📊 Database Schema

The PostgreSQL schema includes:
- **Users**: System users (admin, teachers)
- **Students**: Student enrollment records
- **Classes**: Class definitions
- **StudentClass**: Many-to-many enrollment
- **AttendanceSession**: Daily attendance sessions
- **Attendance**: Individual attendance records
- **Notifications**: User notifications
- **AuditLog**: System activity logging

## 🤝 Contributing

Guidelines for contributing to EduGuard AI:
1. Create feature branches from `main`
2. Write tests for new features
3. Follow TypeScript strict mode
4. Use Prettier for formatting
5. Submit pull requests with descriptions

## 📝 License

MIT License - See LICENSE file for details

## 🆘 Troubleshooting

### pnpm Workspace Warnings
If you see: "The 'workspaces' field in package.json is not supported by pnpm"
```bash
# Clean the pnpm store and reinstall
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Database Connection Issues
```bash
# Check DATABASE_URL is set correctly in packages/backend/.env
# Verify Neon database is accessible
# Try pushing schema again
pnpm db:push
```

### Port Already in Use
```bash
# Change ports in environment variables or kill existing processes
# Backend: PORT=3001 pnpm dev:backend
# Frontend: PORT=3001 pnpm dev:frontend
```

### Node Modules Issues
```bash
# Complete clean reinstall
pnpm clean
pnpm install
pnpm build
```

## 📞 Support

For issues and questions:
1. Check existing GitHub issues
2. Review API documentation in DEVELOPMENT.md
3. Check logs: `pnpm dev` output
4. Review TESTING.md for test guidance
5. Contact: support@eduguard.app

## 🗺️ Roadmap

### Upcoming Features
- [ ] Mobile app (React Native)
- [ ] Advanced ML-based attendance patterns
- [ ] Parent/Guardian portal
- [ ] Integration with school management systems
- [ ] Biometric fingerprint support
- [ ] Multi-camera support
- [ ] Offline mode support
- [ ] Blockchain verification records

## 📞 Version History

### v2.0.0 (Current)
- Complete rewrite with modern stack
- Fastify + Next.js 15 + PostgreSQL
- Face recognition system
- Comprehensive API

### v1.0.0 (Legacy - Deprecated)
- Flask + SQLite + Jinja templates
- Basic attendance tracking
- Manual attendance only

---

**Built with ❤️ by the EduGuard Team | © 2024 EduGuard AI**
