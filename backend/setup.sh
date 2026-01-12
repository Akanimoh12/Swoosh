#!/bin/bash

# Swoosh Backend Setup Script
# Automated setup for local development

set -e

echo "🚀 Swoosh Backend Setup"
echo "======================="
echo ""

# Check Node.js version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Found: $(node -v)"
  exit 1
fi
echo "✓ Node.js version OK: $(node -v)"
echo ""

# Check Docker
echo "✓ Checking Docker..."
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Please install Docker first."
  exit 1
fi
echo "✓ Docker found: $(docker --version)"
echo ""

# Start database services
echo "📦 Starting PostgreSQL and Redis..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check PostgreSQL
until docker exec swoosh-postgres pg_isready -U swoosh &>/dev/null; do
  echo "   Waiting for PostgreSQL..."
  sleep 2
done
echo "✓ PostgreSQL is ready"

# Check Redis
until docker exec swoosh-redis redis-cli ping &>/dev/null; do
  echo "   Waiting for Redis..."
  sleep 2
done
echo "✓ Redis is ready"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Setup environment file
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "✓ .env file created"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env and add your OPENAI_API_KEY"
  echo ""
else
  echo "✓ .env file already exists"
  echo ""
fi

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npm run prisma:generate
echo "✓ Prisma client generated"
echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
npm run prisma:migrate
echo "✓ Database migrations complete"
echo ""

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env and add your OPENAI_API_KEY"
echo "   2. Run 'npm run dev' to start the development server"
echo "   3. Visit http://localhost:3000/health to verify"
echo ""
echo "🔗 Useful commands:"
echo "   - npm run dev          # Start development server"
echo "   - npm run prisma:studio # Open database GUI"
echo "   - docker-compose logs   # View service logs"
echo "   - docker-compose down   # Stop services"
echo ""
