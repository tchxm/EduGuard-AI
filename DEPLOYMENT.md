# EduGuard AI - Deployment Guide

This guide covers deploying EduGuard AI to production environments.

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] API tests passing
- [ ] Frontend builds without errors
- [ ] SSL/TLS certificates obtained
- [ ] Backup strategy documented
- [ ] Monitoring and logging configured
- [ ] Security audit completed

## Deployment Options

### Option 1: Vercel (Recommended for Frontend)

Vercel offers seamless Next.js deployment with automatic optimizations.

#### Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Link to Vercel account
vercel link

# Deploy
vercel --prod
```

#### Environment Variables

Create `.env.production.local`:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

Add secrets in Vercel dashboard:
- Project Settings → Environment Variables
- Add `NEXT_PUBLIC_API_URL` and other vars

### Option 2: Railway / Heroku (Backend & Frontend)

Ideal for full-stack hosting with database integration.

#### Railway Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

Environment variables via dashboard:
- Database: PostgreSQL plugin
- Redis: Redis plugin (optional)
- Environment variables for JWT, SMTP, etc.

### Option 3: Docker + Cloud Provider (AWS, GCP, DigitalOcean)

#### AWS ECS Deployment

```bash
# Create ECR repository
aws ecr create-repository --repository-name eduguard-ai

# Build and push image
docker build -t eduguard-ai .
docker tag eduguard-ai:latest <account>.dkr.ecr.<region>.amazonaws.com/eduguard-ai:latest
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker push <account>.dkr.ecr.<region>.amazonaws.com/eduguard-ai:latest

# Create ECS task definition and service
# Use AWS Console or CloudFormation
```

#### DigitalOcean Deployment

```bash
# Build Docker image
docker build -t eduguard-ai:latest .

# Push to DigitalOcean Registry
docker tag eduguard-ai:latest registry.digitalocean.com/<namespace>/eduguard-ai:latest
docker push registry.digitalocean.com/<namespace>/eduguard-ai:latest

# Deploy using App Platform
# Connect GitHub repo → Auto-deploy on push
```

### Option 4: Manual Server Deployment (VPS)

For complete control using a VPS (Linode, Vultr, AWS EC2).

#### Setup Ubuntu Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install pnpm
npm install -g pnpm
```

#### Clone & Setup Project

```bash
# Clone repository
git clone <repo-url> /home/app/eduguard-ai
cd /home/app/eduguard-ai

# Install dependencies
pnpm install

# Create .env file
cp packages/backend/.env.example packages/backend/.env
# Edit with production values

# Initialize database
pnpm db:migrate

# Build
pnpm build
```

#### Configure Nginx

```nginx
# /etc/nginx/sites-available/eduguard
upstream backend {
    server localhost:3000;
}

upstream frontend {
    server localhost:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Enable HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate certificates
sudo certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renew (runs daily)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

#### Start Services with PM2

```bash
# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'eduguard-backend',
      script: './packages/backend/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'eduguard-frontend',
      script: 'next start',
      cwd: './packages/frontend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup startup script
pm2 startup
# Copy the output command and run it
```

#### Enable Nginx

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/eduguard /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Database Management

### Backup Strategy

```bash
# Backup PostgreSQL
pg_dump -U eduguard eduguard > backup-$(date +%Y%m%d-%H%M%S).sql

# Automated daily backup (cron)
# Add to crontab: 0 2 * * * pg_dump -U eduguard eduguard > /backups/eduguard-$(date +\%Y\%m\%d).sql
```

### Restore from Backup

```bash
psql -U eduguard eduguard < backup-20240309.sql
```

### Database Migrations in Production

```bash
# Verify migrations
pnpm db:migrate --dry-run

# Apply migrations
pnpm db:migrate --deploy

# Check migration status
prisma migrate status
```

## Monitoring & Logging

### Set Up Monitoring

```bash
# PM2 Monitor
pm2 web  # Starts web dashboard at http://localhost:9615

# Or use PM2+ for cloud monitoring
pm2 plus
```

### Configure Logging

Backend logging with Pino:

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: false,
      destination: '/var/log/eduguard/app.log',
    },
  },
});
```

### Application Performance Monitoring

```bash
# Install APM agent
npm install @sentry/node @sentry/tracing

# Configure in app
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

## Security Hardening

### SSL/TLS Configuration

```nginx
# In nginx configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Additional headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

### Environment Variables in Production

Use a secrets manager:

```bash
# AWS Secrets Manager
aws secretsmanager create-secret --name eduguard/prod --secret-string file://secrets.json

# DigitalOcean App Spec
# Use App → Components → Environment → Secrets
```

### Database Encryption

```bash
# PostgreSQL encrypted connections
# In connection string: ?sslmode=require

# At rest encryption (provider-specific)
# AWS RDS: Enable encryption at launch
# DigitalOcean: Select "Enable encryption"
```

## Scaling

### Horizontal Scaling (Multiple Instances)

```bash
# Run multiple backend instances behind load balancer
pm2 start ecosystem.config.js -i max

# Frontend scaling with Vercel
# Automatically handled by Vercel edge network
```

### Database Scaling

```bash
# Read replicas (if using managed service)
# AWS RDS: Add read replica
# DigitalOcean: Add read-only node

# Connection pooling
# Install: npm install pg-pool
# Use in connection string: ?pool=true&poolSize=20
```

### Caching Strategy

```typescript
// Redis caching for frequently accessed data
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache class data
const classData = await redis.get(`class:${classId}`);
if (!classData) {
  const data = await prisma.class.findUnique({ where: { id: classId } });
  await redis.setex(`class:${classId}`, 3600, JSON.stringify(data));
}
```

## Troubleshooting Production Issues

### Health Check

```bash
# Backend
curl https://api.yourdomain.com/health

# Expected response:
# {"status":"ok","timestamp":"2024-03-09T10:00:00Z"}
```

### View Logs

```bash
# PM2 logs
pm2 logs

# Nginx access logs
tail -f /var/log/nginx/access.log

# Application logs
tail -f /var/log/eduguard/app.log
```

### Restart Services

```bash
# Restart all services
pm2 restart all

# Restart specific service
pm2 restart eduguard-backend

# Reload (zero-downtime)
pm2 reload all
```

## Cost Optimization

### Vercel (Frontend Only)

- **Free tier**: Up to 100GB bandwidth/month
- **Pro**: $20/month + overages
- Best for: Small to medium applications

### Railway

- **Starter**: $5/month
- **Pay-as-you-go**: $0.13/GB + compute
- Best for: Full-stack apps with database

### DigitalOcean

- **Droplet (VPS)**: $5-40/month
- **App Platform**: $12/month minimum
- **Managed Database**: $15/month
- Best for: Cost-conscious deployments

### AWS

- **EC2**: $5-100+/month depending on size
- **RDS**: $15+/month
- **ALB**: $16+/month
- Best for: Enterprise applications

## Maintenance Windows

Schedule maintenance during off-peak hours:

```bash
# Example: Sunday 2-3 AM UTC

# During maintenance:
# 1. Stop accepting new requests (put in maintenance mode)
# 2. Wait for in-flight requests to complete
# 3. Apply database migrations
# 4. Deploy new code
# 5. Run tests
# 6. Resume normal operation
```

## Disaster Recovery

### Recovery Plan

1. **Backup frequency**: Daily automated backups
2. **Backup storage**: Multiple geographic locations
3. **Recovery testing**: Monthly restore drills
4. **RTO**: 4 hours (Recovery Time Objective)
5. **RPO**: 1 hour (Recovery Point Objective)

### Disaster Recovery Procedures

```bash
# Restore from backup to new instance
psql -U eduguard -d eduguard < backup-latest.sql

# Verify data integrity
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Student";

# Redeploy application
git pull origin main
pnpm install && pnpm build
pm2 restart all
```

## Post-Deployment Monitoring

- [ ] Check API response times
- [ ] Monitor error rates
- [ ] Verify database performance
- [ ] Test face recognition accuracy
- [ ] Check user feedback channels
- [ ] Review security logs

---

**Need help?** Check the [Development Guide](./DEVELOPMENT.md) or create an issue on GitHub.
