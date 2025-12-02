# Netlify Deployment - Quick Start Guide

## 🚀 Quick Deployment Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Push to Git
```bash
git add .
git commit -m "Add Netlify deployment setup"
git push origin main
```

### 3. Deploy on Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: (leave empty)
   - **Functions directory**: `netlify/functions`
5. Add all environment variables (see NETLIFY_DEPLOYMENT.md for full list)
6. Click **"Deploy site"**

### 4. Access Your API

Once deployed, your API will be available at:
```
https://your-site-name.netlify.app/api/v1
```

Test it:
```bash
curl https://your-site-name.netlify.app/api/v1/health
```

## 📁 Files Created

- `netlify/functions/server.ts` - Serverless function wrapper for Express app
- `netlify.toml` - Netlify configuration file
- `NETLIFY_DEPLOYMENT.md` - Complete deployment guide

## ⚙️ Configuration

The deployment is configured via `netlify.toml`:
- All `/api/*` requests are routed to the serverless function
- CORS headers are configured
- Security headers are set
- Function timeout and bundler settings are configured

## 🔑 Required Environment Variables

At minimum, you need:
- `MONGODB_URI` - MongoDB connection string (use MongoDB Atlas)
- `JWT_SECRET` - Secret key for JWT tokens
- `CORS_ORIGIN` - Your frontend URL

See `NETLIFY_DEPLOYMENT.md` for the complete list.

## 📚 Full Documentation

For detailed instructions, troubleshooting, and advanced configuration, see [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md).

