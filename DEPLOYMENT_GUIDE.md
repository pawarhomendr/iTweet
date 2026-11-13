# Off By One — Complete Deployment Guide

This guide walks you from a local development environment to a live, production-ready application.

---

## Phase 1: Local Development & Testing

### 1.1 Prerequisites
```bash
# Check installed versions
node --version    # Should be >= 20.x
npm --version     # Should be >= 9.x
mongod --version  # Should be running on localhost:27017
```

### 1.2 Install Dependencies
```bash
cd off-by-one
npm install              # Installs all workspaces
```

### 1.3 Configure Environment Variables

Create the canonical local-development file at `backend/.env`:
```bash
# Required
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/off-by-one
JWT_SECRET=your-super-secure-random-64-char-secret
REFRESH_TOKEN_SECRET=another-different-64-char-random-string

# Cloudinary (get free credentials at cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173

# SMTP (use Gmail app password or Mailgun)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="Off By One <noreply@yourdomain.com>"
```

For compatibility, the backend also checks a legacy repository-root `.env` first. If both files exist, root `.env` values retain precedence and `backend/.env` only fills unset values. Production deployments should provide these variables through the hosting platform rather than creating a repository file.

### 1.4 Run Local Development
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend API: http://localhost:4000
```

### 1.5 Run Tests
```bash
npm run test
# Backend unit tests:
# - rewards.test.ts: Reward ledger deduplication, daily caps, reversals
# - auth.test.ts: Role-based access control
```

### 1.6 Verify API Health
```bash
curl http://localhost:4000/api/health
# {"status":"ok","ts":"2026-10-12T..."}
```

---

## Phase 2: Cloud Services Setup (Free Tier)

### 2.1 MongoDB Atlas
1. Go to [atlas.mongodb.com](https://atlas.mongodb.com) → Create free account
2. Create cluster → Select AWS/Free tier → Name: `off-by-one`
3. Create database user (username + auto-generated password)
4. Network Access → Add IP `0.0.0.0/0` (or your deployment platform's IPs)
5. Connect → Copy connection string:
   ```
   mongodb+srv://<username>:<password>@off-by-one.mongodb.net/off-by-one?retryWrites=true&w=majority
   ```

### 2.2 Cloudinary (Media Storage)
1. Go to [cloudinary.com](https://cloudinary.com) → Sign up (free)
2. Dashboard → Copy these values:
   - Cloud Name
   - API Key
   - API Secret
3. Settings → Upload → Add upload preset named: `off-by-one-unsigned`
   - Signing Mode: Unsigned
   - Folder: `off-by-one`
   - Save

### 2.3 SMTP Email (Optional - for password reset)
- **Option A**: Gmail with [App Password](https://support.google.com/accounts/answer/185833) (requires 2FA)
- **Option B**: [Mailgun](https://mailgun.com) free tier (10,000 emails/month)
- **Option C**: Log emails to console in development (default behavior with `NODE_ENV=test`)

---

## Phase 3: Deploy Backend (API)

### Option A: Render (Recommended - Free Tier)
1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create off-by-one --public --source=.
   git push -u origin main
   ```

2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
    - **Environment Variables**: Add the backend variables from `.env.example` directly in the deployment platform
   - **Plan**: Free

5. After deploy, your API will be at: `https://your-service.onrender.com`

### Option B: Railway (Paid but simpler)
1. Go to [railway.app](https://railway.app) → New Project
2. Link GitHub repo
3. Add MongoDB plugin (creates Atlas connection automatically)
4. Add Environment Variables
5. Deploy → Get URL

### Option C: Fly.io (Edge deployment)
```bash
fly launch
# Follow prompts - creates Dockerfile automatically
fly deploy
```

---

## Phase 4: Deploy Frontend

### Option A: Vercel (Recommended)
1. Go to [vercel.com](https://vercel.com) → Import GitHub repo
2. Framework Preset: `Vite`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variables:
   ```
   VITE_API_URL=https://your-backend-api.onrender.com/api
   ```
6. Deploy → Get URL

### Option B: Netlify
1. Connect GitHub repo on Netlify
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
3. Add env var: `VITE_API_URL`
4. Deploy

### Option C: Cloudflare Pages
1. Go to Cloudflare Dashboard → Pages → Create project
2. Connect GitHub → Select repo
3. Build command: `npm run build`
4. Build output directory: `frontend/dist`
5. Add variable: `VITE_API_URL`

---

## Phase 5: Update Frontend API URL

After backend deployment, edit `frontend/src/lib/api.ts`:

```typescript
export const api = axios.create({
  baseURL: '/api',  // If Vercel proxy configured, OR
  baseURL: 'https://your-backend-api.onrender.com/api',  // Direct URL
  withCredentials: true,
  timeout: 15_000,
});
```

Or set environment variable at build time and reference via `import.meta.env.VITE_API_URL`.

---

## Phase 6: Connect Custom Domain (Optional)

### Using Vercel
1. Go to Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `off-by-one.dev`)
3. Update DNS records as instructed

### Using Cloudflare (Recommended)
1. Add domain to Cloudflare
2. Create CNAME record pointing to Vercel/Render URL
3. Enable "Always Use HTTPS"

---

## Phase 7: Production Checklist

Before going live, verify:

- [ ] `NODE_ENV=production` in backend
- [ ] CORS restricted to your frontend domain only
- [ ] JWT secret is 64+ random characters
- [ ] Rate limiting enabled
- [ ] MongoDB Atlas backup enabled
- [ ] Cloudinary signed uploads enabled
- [ ] Password reset emails working
- [ ] All backend environment variables configured in the deployment platform; no repository `.env` file required
- [ ] SSL certificate active (automatic on Vercel/Render)

---

## Quick Start Commands

```bash
# Full local run
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Deploy manually (after push)
# Backend: Automatic via Render/Railway
# Frontend: Automatic via Vercel
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Add frontend URL to `FRONTEND_URL` env var in backend |
| MongoDB connection failed | Check Atlas IP whitelist includes deployment IP |
| Images not uploading | Verify Cloudinary upload preset is "Unsigned" |
| 401 on every request | Check JWT_SECRET matches between env and token |
| Socket.IO connection failed | Ensure backend uses `withCredentials: true` and correct CORS origin |

Your live application should now be accessible at your chosen domain. The original "Software is slow for boring reasons" hero section remains exactly as designed, with a fully functional community platform behind it.
