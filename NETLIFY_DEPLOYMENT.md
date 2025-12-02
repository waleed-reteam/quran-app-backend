# Netlify Deployment Guide for Quran App Backend

Complete step-by-step guide to deploy your Quran App Backend to Netlify.

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] A Netlify account (sign up at [netlify.com](https://www.netlify.com))
- [ ] Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- [ ] All environment variables documented
- [ ] MongoDB Atlas account (for cloud MongoDB) or MongoDB connection string
- [ ] Redis cloud service (optional, for caching)
- [ ] PostgreSQL database (if using) or alternative

## 🚀 Deployment Steps

### Step 1: Install Netlify CLI (Optional but Recommended)

```bash
npm install -g netlify-cli
```

Or use it locally:
```bash
npm install --save-dev netlify-cli
```

### Step 2: Install Required Dependencies

Make sure you have the `serverless-http` package installed:

```bash
npm install serverless-http
```

The package.json has been updated to include this dependency.

### Step 3: Build the Project

Build your TypeScript project:

```bash
npm run build
```

This will compile your TypeScript code to JavaScript in the `dist` folder.

### Step 4: Configure Environment Variables

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Sign in or create an account

2. **Create a New Site**
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository (GitHub/GitLab/Bitbucket)

3. **Set Environment Variables**
   - In your site settings, go to **Site settings** → **Environment variables**
   - Add all required environment variables from your `.env` file:

   ```env
   NODE_ENV=production
   PORT=5000
   API_VERSION=v1
   
   # Database - MongoDB (Use MongoDB Atlas for cloud)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quran_app?retryWrites=true&w=majority
   
   # Database - PostgreSQL (if using)
   POSTGRES_HOST=your-postgres-host
   POSTGRES_PORT=5432
   POSTGRES_DB=quran_app
   POSTGRES_USER=your-username
   POSTGRES_PASSWORD=your-password
   
   # Redis (Optional - use Redis Cloud or Upstash)
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   
   # JWT
   JWT_SECRET=your-jwt-secret-key
   JWT_EXPIRE=7d
   JWT_REFRESH_SECRET=your-refresh-secret-key
   JWT_REFRESH_EXPIRE=30d
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=https://your-site.netlify.app/api/v1/auth/google/callback
   
   # Firebase (for push notifications)
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-4-turbo-preview
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   
   # Pinecone
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_ENVIRONMENT=your_pinecone_environment
   PINECONE_INDEX_NAME=islamic-content
   
   # AWS S3 (for audio files)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=quran-app-audio
   
   # External APIs
   ALADHAN_API_URL=https://api.aladhan.com/v1
   ALQURAN_API_URL=https://api.alquran.cloud/v1
   HADITH_API_KEY=your_hadith_api_key
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # CORS - Update with your frontend URL
   CORS_ORIGIN=https://your-frontend-domain.com
   
   # Logging
   LOG_LEVEL=info
   ```

### Step 5: Configure Build Settings

In Netlify Dashboard, go to **Site settings** → **Build & deploy** → **Build settings**:

- **Build command**: `npm run build`
- **Publish directory**: Leave empty (not needed for serverless functions)
- **Functions directory**: `netlify/functions`

**Note**: Netlify will automatically compile TypeScript files in the functions directory using esbuild, so you don't need to pre-compile the function.

### Step 6: Deploy

#### Option A: Deploy via Git (Recommended)

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Add Netlify deployment configuration"
   git push origin main
   ```

2. **Netlify will automatically deploy**
   - Netlify detects the push and starts building
   - Monitor the build in the Netlify dashboard
   - Wait for deployment to complete

#### Option B: Deploy via Netlify CLI

```bash
# Login to Netlify
netlify login

# Initialize Netlify in your project (if not already done)
netlify init

# Deploy
netlify deploy --prod
```

### Step 7: Verify Deployment

Once deployed, your API will be available at:
```
https://your-site-name.netlify.app/api/v1
```

Test the health endpoint:
```bash
curl https://your-site-name.netlify.app/api/v1/health
```

You should receive:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Configuration Files

### netlify.toml

The `netlify.toml` file has been created with the following configuration:

- **Functions directory**: `netlify/functions`
- **Redirects**: All `/api/*` requests are routed to the serverless function
- **Headers**: CORS and security headers configured
- **Function settings**: External node modules and timeout settings

### Netlify Function

The Express app has been wrapped in a serverless function at `netlify/functions/server.ts`. This function:
- Wraps your Express app using `serverless-http`
- Initializes database connections (reused between invocations)
- Handles all API routes

## 🌐 Accessing Your API

After deployment, your API endpoints will be available at:

```
https://your-site-name.netlify.app/api/v1/auth/...
https://your-site-name.netlify.app/api/v1/quran/...
https://your-site-name.netlify.app/api/v1/hadiths/...
https://your-site-name.netlify.app/api/v1/duas/...
https://your-site-name.netlify.app/api/v1/prayer/...
https://your-site-name.netlify.app/api/v1/bookmarks/...
https://your-site-name.netlify.app/api/v1/ai/...
https://your-site-name.netlify.app/api/v1/docs
```

## ⚠️ Important Considerations

### 1. Database Connections

- **MongoDB**: Use MongoDB Atlas (free tier available) for cloud MongoDB
- **PostgreSQL**: Use services like Supabase, Neon, or Railway for cloud PostgreSQL
- **Redis**: Use Redis Cloud, Upstash, or Railway for cloud Redis

### 2. Function Timeout

- Netlify free tier: 10 seconds timeout
- Netlify Pro: 26 seconds timeout
- For long-running operations, consider:
  - Using background jobs
  - Breaking operations into smaller chunks
  - Using Netlify Background Functions

### 3. Cold Starts

Serverless functions have cold starts. To minimize:
- Keep database connections warm (reuse connections)
- Use connection pooling
- Consider upgrading to Netlify Pro for better performance

### 4. Cron Jobs

Netlify doesn't support traditional cron jobs. Alternatives:
- Use Netlify Scheduled Functions (Pro plan)
- Use external services like:
  - [cron-job.org](https://cron-job.org)
  - [EasyCron](https://www.easycron.com)
  - [GitHub Actions](https://github.com/features/actions) with scheduled workflows

### 5. File Uploads

For file uploads:
- Use AWS S3 or similar cloud storage
- Process uploads through the API
- Store file URLs in the database

### 6. Environment Variables

- Never commit `.env` files
- Use Netlify's environment variables UI
- Different values for production, staging, etc.

## 🔍 Troubleshooting

### Build Fails

1. **Check build logs** in Netlify dashboard
2. **Verify TypeScript compilation**:
   ```bash
   npm run build
   ```
3. **Check for missing dependencies**:
   ```bash
   npm install
   ```

### Function Timeout

1. **Check function logs** in Netlify dashboard
2. **Optimize database queries**
3. **Add timeout handling** in your code
4. **Consider upgrading** to Netlify Pro

### Database Connection Issues

1. **Verify connection strings** in environment variables
2. **Check IP whitelist** in MongoDB Atlas/PostgreSQL
3. **Test connection** locally with production credentials
4. **Check firewall rules**

### CORS Errors

1. **Update CORS_ORIGIN** environment variable
2. **Add your frontend domain** to allowed origins
3. **Check netlify.toml** headers configuration

### API Not Responding

1. **Check function logs** in Netlify dashboard
2. **Verify redirects** in netlify.toml
3. **Test health endpoint** first
4. **Check function deployment** status

## 📊 Monitoring

### Netlify Dashboard

- **Function logs**: View real-time logs
- **Analytics**: Monitor function invocations
- **Deploy logs**: Check build and deployment status

### External Monitoring

Consider adding:
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **New Relic**: Performance monitoring

## 🔄 Continuous Deployment

Netlify automatically deploys when you push to your connected branch:

1. **Push to main/master**: Deploys to production
2. **Create pull request**: Creates preview deployment
3. **Merge PR**: Deploys to production

## 🎯 Next Steps

After successful deployment:

1. ✅ **Test all API endpoints**
2. ✅ **Update frontend** to use new API URL
3. ✅ **Monitor logs** for errors
4. ✅ **Set up custom domain** (optional)
5. ✅ **Configure SSL** (automatic with Netlify)
6. ✅ **Set up monitoring** and alerts

## 📝 Custom Domain Setup

1. Go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Enter your domain name
4. Follow DNS configuration instructions
5. SSL certificate is automatically provisioned

## 🔐 Security Best Practices

1. **Never commit secrets** to Git
2. **Use environment variables** for all sensitive data
3. **Enable rate limiting** (already configured)
4. **Use HTTPS** (automatic with Netlify)
5. **Regularly update dependencies**
6. **Monitor for security vulnerabilities**

## 📚 Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Serverless HTTP Documentation](https://github.com/dougmoscrop/serverless-http)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [MongoDB Atlas Setup](https://www.mongodb.com/cloud/atlas/register)
- [Redis Cloud](https://redis.com/try-free/)

## 🎉 Success Checklist

- [ ] Project deployed to Netlify
- [ ] All environment variables configured
- [ ] Health endpoint responding
- [ ] Database connections working
- [ ] API endpoints accessible
- [ ] CORS configured correctly
- [ ] Frontend updated with new API URL
- [ ] Monitoring set up
- [ ] Custom domain configured (optional)
- [ ] Documentation updated

---

**Congratulations! Your Quran App Backend is now deployed on Netlify! 🎉**

For any issues or questions, check the Netlify dashboard logs or refer to the troubleshooting section above.

