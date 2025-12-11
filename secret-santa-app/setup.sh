#!/bin/bash

# Secret Santa Game Setup Script
echo "🎄 Setting up Secret Santa Game..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if PostgreSQL is available
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL found"
else
    echo "⚠️  PostgreSQL not found locally. You'll need a database URL."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check for environment file
if [ ! -f ".env.local" ]; then
    echo "📝 Creating environment file..."
    cp env.example .env.local
    echo "⚠️  Please edit .env.local with your configuration:"
    echo "   - Database URL"
    echo "   - NextAuth secret"
    echo "   - SendGrid API key and from email"
    echo "   - Optional: Google OAuth credentials"
    echo ""
    echo "💡 Tip: Generate a secret with: openssl rand -base64 32"
else
    echo "✅ Environment file exists"
fi

# Generate Prisma client
echo "🔧 Setting up database..."
npx prisma generate

# Try to push database schema
echo "📊 Setting up database schema..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Database setup complete"
else
    echo "⚠️  Database setup failed - please check your DATABASE_URL in .env.local"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your configuration"
echo "2. Run: npm run dev"
echo "3. Visit: http://localhost:3000"
echo ""
echo "📚 For detailed setup instructions, see README.md"
