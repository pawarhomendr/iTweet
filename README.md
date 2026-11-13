# Off By One — Community Publishing Platform
> An upgraded, community-driven publishing platform for developers. Built on Node.js, Express, TypeScript, MongoDB, React, and Socket.IO.

---

## 🏗️ Architecture & Stack

```
off-by-one/
├── frontend/             # React 18, TypeScript, Vite, TanStack Query, Zustand
│   ├── src/
│   │   ├── components/   # Modular, accessible UI (Feed, Header, Footer, Icons)
│   │   ├── pages/        # Home, Article, Profile, Editor, Chat, Leaderboard, Admin
│   │   ├── store/        # Zustand state (Auth, Theme, Socket)
│   │   └── styles/       # Original brand CSS variables & typography tokens
├── backend/              # Node.js, Express, TypeScript, Mongoose, Socket.IO
│   ├── src/
│   │   ├── models/       # Validated Mongoose schemas (11 models)
│   │   ├── routes/       # Auth, Posts, Comments, Users, Rewards, Chat, Admin
│   │   ├── services/     # Server-authoritative rewards, Cloudinary uploads, Email
│   │   └── middleware/   # JWT auth, RBAC, input sanitization, rate limiting
└── shared/               # Shared TypeScript domain contracts
```

---

## 🚀 Quickstart (Local Development)

### Prerequisites
- Node.js >= 20.x
- MongoDB running locally on `localhost:27017` (or MongoDB Atlas connection URI)
- Cloudinary account for media hosting (free tier)

### 1. Clone & Install
```bash
git clone https://github.com/pawarhomendr/off-by-one.git
cd off-by-one
npm install
```

### 2. Configure Environment
Use `backend/.env` as the canonical local-development environment file and fill in credentials:
```bash
cp .env.example backend/.env
```

For compatibility, the backend also reads a legacy repository-root `.env` first. If both files exist, root `.env` values retain precedence and `backend/.env` only fills unset values. Production deployments should set environment variables through the hosting platform instead of creating a file.

### JWT secrets
For local development, set `NODE_ENV=development` and provide non-empty local values for `JWT_SECRET` and `REFRESH_TOKEN_SECRET`. Before a production start, the backend requires both secrets to be independently generated, at least 32 characters long, high-entropy, free of placeholders or repeated patterns, and different from each other. Generate them separately without putting the values in source control:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run Development Servers
```bash
# Starts both frontend (:5173) and backend (:4000) concurrently
npm run dev
```

### Email delivery (Gmail SMTP)
Password reset and email verification require a working SMTP provider. For Gmail, enable two-step verification on the sending Google account and create a Google **App Password**. Use that App Password as `SMTP_PASS`; do not use the normal Gmail account password.

Configure these variables on the backend only:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=your-sending-account@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM="Indiagram <your-sending-account@gmail.com>"
FRONTEND_URL=http://localhost:5173
```

The application never returns reset or verification tokens in API responses and does not log full links. If SMTP configuration is missing or the provider rejects delivery, the API returns a safe delivery error and server diagnostics identify only the missing variable names or provider error code.

---

## 🔒 Security Measures Implemented
- **NoSQL Injection Defense**: Sanitization via `express-mongo-sanitize`.
- **Stored XSS Prevention**: HTML stripping and escaping via `xss` library on all article bodies, comments, and bios.
- **Password Safety**: Salted bcrypt hashing (cost factor 12). Passwords excluded by default on user queries (`select: false`).
- **HTTP Protection**: Strict `helmet` headers, CORS whitelisting, httpOnly refresh cookie flags.
- **JWT Secret Validation**: Production startup rejects missing, short, weak, placeholder, or identical access and refresh secrets.
- **Rate Limiting**: IP-based rate limiting on global traffic and dedicated tight limits on `/api/auth/*`.
- **Authoritative Rewards**: Ledger cannot be directly credited by frontend requests; rewards are calculated and verified server-side with deduplication and daily earning caps.
- **Zero Base64 in Database**: Images streamed directly into Cloudinary with MIME-type and 5MB size validation.

---

## 🌐 Phased Migration Guide (GitHub Pages to Full-Stack)

1. **Phase 1 (Dual Operation)**:
   - Keep `gh-pages` active with static blog.
   - Deploy backend to **Render**, **Railway**, or **Fly.io**.
   - Create MongoDB cluster in **MongoDB Atlas**.
2. **Phase 2 (Staging)**:
   - Deploy frontend to **Vercel** or **Cloudflare Pages** pointing to the production API.
   - Run seed scripts to import legacy static posts into MongoDB with `status: 'published'`.
3. **Phase 3 (Production DNS Cutover)**:
   - Point your custom domain `off-by-one.dev` (or GitHub Pages apex) to the new frontend host.
