#!/bin/bash

# Quran App Backend - Quick Start Script
# This script helps you set up the backend quickly

set -e

echo "🕌 Quran App Backend - Quick Start"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js v18 or higher.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found. Please install PostgreSQL.${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL found${NC}"
fi

# Check if MongoDB is running
if ! command -v mongosh &> /dev/null && ! command -v mongo &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB not found. Please install MongoDB.${NC}"
else
    echo -e "${GREEN}✅ MongoDB found${NC}"
fi

# Check if Redis is running
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis not found. Please install Redis.${NC}"
else
    echo -e "${GREEN}✅ Redis found${NC}"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env with your configuration${NC}"
else
    echo -e "${YELLOW}⚠️  .env already exists, skipping...${NC}"
fi

echo ""
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p config
echo -e "${GREEN}✅ Directories created${NC}"

echo ""
echo "🗄️  Database setup..."
echo "Would you like to create the PostgreSQL database? (y/n)"
read -r create_db

if [ "$create_db" = "y" ]; then
    echo "Enter PostgreSQL username (default: postgres):"
    read -r pg_user
    pg_user=${pg_user:-postgres}
    
    echo "Creating database 'quran_app'..."
    createdb -U "$pg_user" quran_app 2>/dev/null || echo "Database might already exist"
    echo -e "${GREEN}✅ Database setup complete${NC}"
fi

echo ""
echo "🌱 Would you like to seed the database now? (y/n)"
read -r seed_db

if [ "$seed_db" = "y" ]; then
    echo "This will take 5-10 minutes..."
    echo "Seeding Duas..."
    npm run seed:duas
    
    echo "Seeding Quran (this takes the longest)..."
    npm run seed:quran
    
    echo "Seeding Hadiths..."
    npm run seed:hadiths
    
    echo -e "${GREEN}✅ Database seeded successfully${NC}"
else
    echo -e "${YELLOW}⚠️  You can seed the database later with: npm run seed:all${NC}"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env with your configuration (database credentials, API keys, etc.)"
echo "2. Make sure PostgreSQL, MongoDB, and Redis are running"
echo "3. If you haven't seeded the database, run: npm run seed:all"
echo "4. Start the development server: npm run dev"
echo ""
echo "📚 Documentation:"
echo "- README.md - Project overview"
echo "- SETUP.md - Detailed setup guide"
echo "- API_EXAMPLES.md - API usage examples"
echo ""
echo "🚀 To start the server now, run:"
echo "   npm run dev"
echo ""
echo "May Allah accept this work! 🤲"

