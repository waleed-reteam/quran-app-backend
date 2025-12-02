# Deployment Guide

Complete guide for deploying the Quran App Backend to production.

## 🚀 Deployment Options

1. **Docker Compose** (Recommended for small-medium scale)
2. **Cloud Platforms** (AWS, DigitalOcean, Azure, GCP)
3. **Platform as a Service** (Heroku, Railway, Render)
4. **Kubernetes** (For large scale)

## 📋 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database backups enabled
- [ ] SSL/TLS certificates obtained
- [ ] Domain name configured
- [ ] Monitoring tools setup
- [ ] Error tracking configured
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Documentation updated
- [ ] API keys secured

## 🐳 Option 1: Docker Compose Deployment

### Prerequisites
- Ubuntu 20.04+ or similar Linux server
- Docker and Docker Compose installed
- Domain name pointed to server IP
- SSL certificate (Let's Encrypt recommended)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone <your-repo-url>
cd quran-app-backend

# Create production environment file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

### Step 3: Configure Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/quran-app
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/quran-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 4: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
```

### Step 5: Deploy with Docker Compose

```bash
# Build and start services
docker-compose -f docker-compose.yml --env-file .env.production up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 6: Seed Database

```bash
# Seed data
docker-compose exec api npm run seed:all

# Optional: Index for AI search
docker-compose exec api npx ts-node src/scripts/indexContentForAI.ts
```

### Step 7: Setup Monitoring

```bash
# Install PM2 for process management (if not using Docker)
npm install -g pm2

# Or use Docker with restart policies (already configured in docker-compose.yml)
```

## ☁️ Option 2: AWS Deployment

### Architecture
- **EC2**: Application server
- **RDS**: PostgreSQL database
- **DocumentDB**: MongoDB alternative
- **ElastiCache**: Redis
- **S3**: Audio files
- **CloudFront**: CDN
- **Route 53**: DNS
- **Certificate Manager**: SSL/TLS

### Step 1: Setup RDS (PostgreSQL)

```bash
# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier quran-app-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username admin \
    --master-user-password YourPassword123! \
    --allocated-storage 20
```

### Step 2: Setup DocumentDB (MongoDB)

```bash
# Create DocumentDB cluster
aws docdb create-db-cluster \
    --db-cluster-identifier quran-app-mongo \
    --engine docdb \
    --master-username admin \
    --master-user-password YourPassword123!
```

### Step 3: Setup ElastiCache (Redis)

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
    --cache-cluster-id quran-app-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --num-cache-nodes 1
```

### Step 4: Launch EC2 Instance

```bash
# Launch Ubuntu instance
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.small \
    --key-name your-key-pair \
    --security-group-ids sg-xxxxxxxx
```

### Step 5: Deploy Application

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone and setup
git clone <your-repo-url>
cd quran-app-backend
npm install
npm run build

# Setup PM2
npm install -g pm2
pm2 start dist/server.js --name quran-app
pm2 startup
pm2 save
```

### Step 6: Configure Environment

```bash
# Edit .env with AWS service endpoints
nano .env
```

```env
POSTGRES_HOST=your-rds-endpoint.amazonaws.com
MONGODB_URI=mongodb://your-docdb-endpoint:27017/quran_app
REDIS_HOST=your-elasticache-endpoint.amazonaws.com
```

## 🚂 Option 3: Railway Deployment

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialize Project

```bash
railway init
railway link
```

### Step 3: Add Services

```bash
# Add PostgreSQL
railway add --database postgres

# Add MongoDB
railway add --database mongodb

# Add Redis
railway add --database redis
```

### Step 4: Deploy

```bash
railway up
```

### Step 5: Configure Environment

```bash
# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-secret
# ... add other variables
```

## 🌊 Option 4: DigitalOcean Deployment

### Using App Platform

1. **Create App**
   - Go to DigitalOcean App Platform
   - Connect GitHub repository
   - Select branch

2. **Configure Services**
   - Add PostgreSQL database
   - Add MongoDB database
   - Add Redis database

3. **Environment Variables**
   - Add all required variables
   - Use DigitalOcean's connection strings

4. **Deploy**
   - Click "Deploy"
   - Wait for build and deployment

### Using Droplet

```bash
# Create Droplet (Ubuntu 20.04)
# SSH into droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone and deploy
git clone <your-repo-url>
cd quran-app-backend
docker-compose up -d
```

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Environment Variables

```bash
# Never commit .env files
# Use secrets management:
# - AWS Secrets Manager
# - HashiCorp Vault
# - Railway/Heroku Config Vars
```

### 4. Database Security

```bash
# PostgreSQL
# - Enable SSL connections
# - Use strong passwords
# - Restrict IP access
# - Regular backups

# MongoDB
# - Enable authentication
# - Use SSL/TLS
# - IP whitelist
# - Regular backups
```

## 📊 Monitoring Setup

### 1. Application Monitoring

```bash
# Install Sentry
npm install @sentry/node

# Configure in server.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 2. Server Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Setup New Relic / Datadog / CloudWatch
```

### 3. Log Management

```bash
# Centralized logging with ELK Stack or Papertrail
# Configure Winston to send logs to external service
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/app
            git pull
            npm install
            npm run build
            pm2 restart quran-app
```

## 📈 Scaling Strategies

### Horizontal Scaling

```bash
# Add more API servers
# Use load balancer (Nginx, HAProxy, AWS ELB)

# Nginx load balancing configuration
upstream api_servers {
    server api1.yourdomain.com:5000;
    server api2.yourdomain.com:5000;
    server api3.yourdomain.com:5000;
}

server {
    location / {
        proxy_pass http://api_servers;
    }
}
```

### Database Scaling

```bash
# PostgreSQL
# - Read replicas
# - Connection pooling (PgBouncer)
# - Partitioning

# MongoDB
# - Replica sets
# - Sharding
# - Indexes optimization

# Redis
# - Redis Cluster
# - Redis Sentinel
```

## 🔧 Performance Optimization

### 1. Enable Compression

Already configured in `server.ts` with compression middleware.

### 2. CDN Setup

```bash
# Use CloudFlare or AWS CloudFront
# Cache static assets
# Reduce latency globally
```

### 3. Database Optimization

```sql
-- PostgreSQL indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- MongoDB indexes (already in models)
db.surahs.createIndex({ number: 1 });
db.hadiths.createIndex({ collection: 1, hadithNumber: 1 });
```

## 🔐 Backup Strategy

### Automated Backups

```bash
#!/bin/bash
# backup.sh

# PostgreSQL backup
pg_dump -U postgres quran_app > backup_$(date +%Y%m%d).sql

# MongoDB backup
mongodump --db quran_app --out backup_$(date +%Y%m%d)

# Upload to S3
aws s3 cp backup_$(date +%Y%m%d).sql s3://your-backup-bucket/
aws s3 cp backup_$(date +%Y%m%d) s3://your-backup-bucket/ --recursive

# Schedule with cron
# 0 2 * * * /path/to/backup.sh
```

## 🧪 Health Checks

```bash
# API health check
curl https://api.yourdomain.com/api/v1/health

# Database health
psql -U postgres -c "SELECT 1"
mongosh --eval "db.adminCommand('ping')"
redis-cli ping
```

## 📞 Troubleshooting

### Common Issues

1. **Port already in use**
```bash
lsof -i :5000
kill -9 <PID>
```

2. **Database connection failed**
```bash
# Check if services are running
systemctl status postgresql
systemctl status mongod
systemctl status redis
```

3. **Out of memory**
```bash
# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📚 Post-Deployment

1. **Test all endpoints**
2. **Monitor logs for errors**
3. **Check performance metrics**
4. **Verify SSL certificate**
5. **Test backup restoration**
6. **Document any custom configurations**
7. **Share API documentation with frontend team**

## 🎉 Success Checklist

- [ ] Application accessible via HTTPS
- [ ] All API endpoints working
- [ ] Database seeded with data
- [ ] Backups configured
- [ ] Monitoring active
- [ ] SSL certificate valid
- [ ] Rate limiting working
- [ ] Authentication functional
- [ ] Push notifications working
- [ ] Cron jobs running
- [ ] Documentation updated
- [ ] Team notified

---

**Congratulations on your deployment! May this app benefit many people. Barakallahu feekum! 🎉**

