#!/bin/bash

# Quran App Backend - Docker Quick Start Script

set -e

echo "🕌 Quran App Backend - Docker Quick Start"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Docker found: $(docker --version)${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose found${NC}"

echo ""
echo "🐳 Starting services with Docker Compose..."
echo "This will start PostgreSQL, MongoDB, Redis, and the API server"
echo ""

# Start Docker Compose
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Services are running!${NC}"
else
    echo -e "${RED}❌ Some services failed to start. Check logs with: docker-compose logs${NC}"
    exit 1
fi

echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🌱 Would you like to seed the database? (y/n)"
read -r seed_db

if [ "$seed_db" = "y" ]; then
    echo "Seeding database..."
    docker-compose exec api npm run seed:duas
    docker-compose exec api npm run seed:quran
    docker-compose exec api npm run seed:hadiths
    echo -e "${GREEN}✅ Database seeded${NC}"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Your services are running:"
echo "- API: http://localhost:5000"
echo "- PostgreSQL: localhost:5432"
echo "- MongoDB: localhost:27017"
echo "- Redis: localhost:6379"
echo ""
echo "🔍 Useful commands:"
echo "- View logs: docker-compose logs -f"
echo "- Stop services: docker-compose down"
echo "- Restart services: docker-compose restart"
echo "- View API logs: docker-compose logs -f api"
echo ""
echo "🧪 Test the API:"
echo "curl http://localhost:5000/api/v1/health"
echo ""
echo "May Allah accept this work! 🤲"

