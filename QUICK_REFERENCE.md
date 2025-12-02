# Quick Reference Guide

Fast reference for common tasks and commands.

## 🚀 Quick Start Commands

```bash
# Standard Setup
npm install
cp .env.example .env
npm run seed:all
npm run dev

# Docker Setup
docker-compose up -d
docker-compose exec api npm run seed:all

# Quick Start Script
./scripts/quick-start.sh
./scripts/docker-quick-start.sh
```

## 📝 NPM Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run seed:quran       # Seed Quran data
npm run seed:hadiths     # Seed Hadith data
npm run seed:duas        # Seed Dua data
npm run seed:all         # Seed all data
npm test                 # Run tests
npm run lint             # Run ESLint
```

## 🔌 API Endpoints Quick Reference

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
```
POST   /auth/register        # Register
POST   /auth/login           # Login
POST   /auth/google          # Google Sign-In
POST   /auth/apple           # Apple Sign-In
GET    /auth/me              # Get current user
PUT    /auth/profile         # Update profile
```

### Quran
```
GET    /quran/surahs                    # All surahs
GET    /quran/surahs/:number            # Specific surah
GET    /quran/surahs/:s/ayahs/:a        # Specific ayah
GET    /quran/search?query=...          # Search
GET    /quran/juz/:number               # Get juz
GET    /quran/page/:number              # Get page
```

### Hadiths
```
GET    /hadiths/collections             # All collections
GET    /hadiths/collections/:name       # By collection
GET    /hadiths/search?query=...        # Search
GET    /hadiths/:id                     # By ID
```

### Duas
```
GET    /duas                            # All duas
GET    /duas/categories                 # All categories
GET    /duas/categories/:category       # By category
GET    /duas/search?query=...           # Search
GET    /duas/:id                        # By ID
```

### Prayer Times
```
GET    /prayer/times?lat=...&lon=...    # By coordinates
GET    /prayer/times/city?city=...      # By city
GET    /prayer/next?lat=...&lon=...     # Next prayer
GET    /prayer/qibla?lat=...&lon=...    # Qibla direction
```

### Bookmarks
```
POST   /bookmarks                       # Create
GET    /bookmarks                       # Get all
GET    /bookmarks/check?...             # Check if bookmarked
PUT    /bookmarks/:id                   # Update
DELETE /bookmarks/:id                   # Delete
```

### AI
```
GET    /ai/search?query=...             # Semantic search
POST   /ai/ask                          # Ask question
POST   /ai/chat                         # AI chat
```

## 🗄️ Database Commands

### PostgreSQL
```bash
# Connect
psql -U postgres -d quran_app

# Create database
createdb quran_app

# Backup
pg_dump quran_app > backup.sql

# Restore
psql quran_app < backup.sql

# List tables
\dt

# Describe table
\d users
```

### MongoDB
```bash
# Connect
mongosh quran_app

# Show collections
show collections

# Query
db.surahs.find({number: 1})

# Count
db.hadiths.countDocuments()

# Backup
mongodump --db quran_app --out backup/

# Restore
mongorestore --db quran_app backup/quran_app/
```

### Redis
```bash
# Connect
redis-cli

# Test
PING

# Get all keys
KEYS *

# Get value
GET key_name

# Clear all
FLUSHALL
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api

# Restart service
docker-compose restart api

# Execute command in container
docker-compose exec api npm run seed:quran

# View running containers
docker-compose ps

# Remove volumes (careful!)
docker-compose down -v
```

## 🔍 Debugging Commands

```bash
# Check if port is in use
lsof -i :5000

# Kill process on port
kill -9 $(lsof -t -i:5000)

# Check service status
systemctl status postgresql
systemctl status mongod
systemctl status redis

# View logs
tail -f logs/combined.log
tail -f logs/error.log

# Check disk space
df -h

# Check memory
free -h

# Check processes
htop
```

## 🔐 Environment Variables

### Required
```env
NODE_ENV=development
PORT=5000
POSTGRES_HOST=localhost
POSTGRES_DB=quran_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
MONGODB_URI=mongodb://localhost:27017/quran_app
REDIS_HOST=localhost
JWT_SECRET=your_secret
```

### Optional (AI Features)
```env
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=islamic-content
```

### Optional (Push Notifications)
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

## 📊 Common Queries

### Get User Count
```sql
-- PostgreSQL
SELECT COUNT(*) FROM users;
```

### Get Surah Count
```javascript
// MongoDB
db.surahs.countDocuments()
```

### Get Most Bookmarked Content
```sql
-- PostgreSQL
SELECT content_type, content_id, COUNT(*) as count
FROM bookmarks
GROUP BY content_type, content_id
ORDER BY count DESC
LIMIT 10;
```

### Clear Cache
```bash
# Redis
redis-cli FLUSHALL
```

## 🧪 Testing Endpoints

### Register User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","name":"Test User"}'
```

### Get Surah Al-Fatiha
```bash
curl http://localhost:5000/api/v1/quran/surahs/1
```

### Search Quran
```bash
curl "http://localhost:5000/api/v1/quran/search?query=patience"
```

### Get Prayer Times
```bash
curl "http://localhost:5000/api/v1/prayer/times?latitude=21.4225&longitude=39.8262"
```

### Create Bookmark (requires auth)
```bash
curl -X POST http://localhost:5000/api/v1/bookmarks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"contentType":"quran","contentId":"2:255","note":"Ayatul Kursi"}'
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
lsof -i :5000
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check if services are running
systemctl status postgresql
systemctl status mongod
systemctl status redis

# Restart services
sudo systemctl restart postgresql
sudo systemctl restart mongod
sudo systemctl restart redis
```

### Cannot Connect to MongoDB
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

### Redis Connection Error
```bash
# Check if Redis is running
redis-cli ping

# Restart Redis
sudo systemctl restart redis
```

### TypeScript Build Errors
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules/
npm install
```

## 📈 Performance Monitoring

### Check API Response Time
```bash
curl -w "@-" -o /dev/null -s http://localhost:5000/api/v1/health << 'EOF'
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
----------\n
time_total:  %{time_total}\n
EOF
```

### Check Database Performance
```sql
-- PostgreSQL slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Check Redis Memory
```bash
redis-cli INFO memory
```

## 🔄 Update & Maintenance

### Update Dependencies
```bash
# Check outdated packages
npm outdated

# Update all
npm update

# Update specific package
npm update package-name
```

### Database Maintenance
```bash
# PostgreSQL vacuum
psql -U postgres -d quran_app -c "VACUUM ANALYZE;"

# MongoDB compact
mongosh quran_app --eval "db.runCommand({compact: 'collection_name'})"
```

### Clear Logs
```bash
# Clear application logs
> logs/combined.log
> logs/error.log

# Rotate logs
logrotate /etc/logrotate.d/quran-app
```

## 📞 Quick Links

- **API Health**: http://localhost:5000/api/v1/health
- **PostgreSQL**: localhost:5432
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## 🆘 Emergency Commands

### Stop Everything
```bash
# Stop Docker
docker-compose down

# Stop services
sudo systemctl stop postgresql mongod redis

# Kill Node processes
pkill -f node
```

### Restart Everything
```bash
# Restart Docker
docker-compose restart

# Restart services
sudo systemctl restart postgresql mongod redis

# Restart with PM2
pm2 restart all
```

### Check System Resources
```bash
# CPU usage
top

# Memory usage
free -h

# Disk usage
df -h

# Network connections
netstat -tulpn
```

---

**Keep this guide handy for quick reference! 📚**

