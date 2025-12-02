# Complete Setup Guide

This guide will walk you through setting up the Quran App Backend from scratch.

## Step 1: Install Prerequisites

### Node.js
```bash
# Install Node.js v18 or higher
# Visit https://nodejs.org/ or use nvm:
nvm install 18
nvm use 18
```

### PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Verify installation
psql --version
```

### MongoDB
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod

# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Verify installation
mongod --version
```

### Redis
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Windows - Option 1: Using Docker (Recommended)
# Make sure Docker Desktop is installed, then run:
docker-compose up -d redis
# Or start just Redis:
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Windows - Option 2: Using WSL2
wsl
sudo apt update
sudo apt install redis-server
sudo service redis-server start
exit

# Windows - Option 3: Native Windows build
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use Memurai (Redis-compatible): https://www.memurai.com/

# Verify installation
redis-cli ping
# Should return: PONG
```

## Step 2: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd quran-app-backend

# Install dependencies
npm install
```

## Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` file with your settings:

```env
# Server
NODE_ENV=development
PORT=5000

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=quran_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/quran_app

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d

# OpenAI (optional, for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# Pinecone (optional, for vector search)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=islamic-content

# Firebase (optional, for push notifications)
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

## Step 4: Setup PostgreSQL Database

```bash
# Create database
createdb quran_app

# Or using psql
psql -U postgres
CREATE DATABASE quran_app;
\q
```

## Step 5: Seed the Database

```bash
# Create logs directory
mkdir -p logs

# Seed Duas (takes 1-2 minutes)
npm run seed:duas

# Verify Quran API connection (no seeding needed - Quran comes from API)
npm run verify:quran-api

# Verify Hadith API connection (no seeding needed - hadiths come from API)
npm run verify:hadith-api

# Or verify all APIs at once
npm run verify:all-apis
```

## Step 6: Setup Optional Services

### OpenAI API (for AI features)

1. Visit https://platform.openai.com/
2. Create an account and get API key
3. Add to `.env`:
```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Pinecone (for vector search)

1. Visit https://www.pinecone.io/
2. Create account and project
3. Create an index named `islamic-content` with dimension 1536
4. Add credentials to `.env`:
```env
PINECONE_API_KEY=your-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=islamic-content
```

5. Index content for AI search:
```bash
npx ts-node src/scripts/indexContentForAI.ts
```

### Firebase (for push notifications)

1. Visit https://console.firebase.google.com/
2. Create a new project
3. Go to Project Settings > Service Accounts
4. Generate new private key
5. Save as `config/firebase-service-account.json`
6. Update `.env`:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

### Google OAuth (optional)

1. Visit https://console.cloud.google.com/
2. Create OAuth 2.0 credentials
3. Add to `.env`:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Step 7: Run the Application

### Development Mode
```bash
npm run dev
```

The server will start at `http://localhost:5000`

### Test the API
```bash
# Health check
curl http://localhost:5000/api/v1/health

# Get all surahs
curl http://localhost:5000/api/v1/quran/surahs

# Register a user
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

## Step 8: Production Deployment

### Build for production
```bash
npm run build
```

### Run production server
```bash
NODE_ENV=production npm start
```

### Using PM2 (recommended)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name quran-app-backend

# Setup auto-restart on reboot
pm2 startup
pm2 save
```

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U postgres -h localhost
```

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check connection
mongosh
```

### Redis Connection Issues
```bash
# Linux/macOS - Check if Redis is running
sudo systemctl status redis

# Windows - Check if Redis Docker container is running
docker ps | grep redis

# Windows - Start Redis if using Docker
docker-compose up -d redis

# Test connection
redis-cli ping
# Should return: PONG

# Windows - If using Docker, test from inside container
docker exec -it quran-app-redis redis-cli ping
```

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

## Database Maintenance

### Backup PostgreSQL
```bash
pg_dump quran_app > backup.sql
```

### Backup MongoDB
```bash
mongodump --db quran_app --out ./backup
```

### Restore PostgreSQL
```bash
psql quran_app < backup.sql
```

### Restore MongoDB
```bash
mongorestore --db quran_app ./backup/quran_app
```

## Performance Tuning

### PostgreSQL
Edit `/etc/postgresql/14/main/postgresql.conf`:
```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
```

### MongoDB
Edit `/etc/mongod.conf`:
```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1
```

### Redis
Edit `/etc/redis/redis.conf`:
```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## Monitoring

### Check logs
```bash
# Application logs
tail -f logs/combined.log

# Error logs
tail -f logs/error.log

# PM2 logs
pm2 logs quran-app-backend
```

### Database monitoring
```bash
# PostgreSQL
psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# MongoDB
mongosh --eval "db.serverStatus()"

# Redis
redis-cli info
```

## Next Steps

1. Configure your mobile app to connect to the API
2. Setup SSL/TLS certificates for production
3. Configure domain and DNS
4. Setup monitoring (e.g., Sentry, LogRocket)
5. Configure backups
6. Setup CI/CD pipeline

## Support

If you encounter any issues, please:
1. Check the logs in `logs/` directory
2. Review the error messages
3. Check database connections
4. Verify environment variables
5. Open an issue on GitHub

---

**May this project be beneficial. Barakallahu feekum!**

