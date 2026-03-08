#!/bin/bash

# Initialize the database with Prisma
echo "Initializing EduGuard AI Database..."

# Change to backend directory
cd packages/backend

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed the database (optional)
echo "Database initialization complete!"
echo "You can now run: npm run dev"
