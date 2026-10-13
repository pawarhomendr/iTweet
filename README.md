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
Copy `.env.example` into `backend/.env` and fill in credentials:
```bash
cp .env.example backend/.env
```

### 3. Run Development Servers
```bash
# Starts both frontend (:5173) and backend (:4000) concurrently
npm run dev
```

---

## 🔒 Security Measures Implemented
- **NoSQL Injection Defense**: Sanitization via `express-mongo-sanitize`.
- **Stored XSS Prevention**: HTML stripping and escaping via `xss` library on all article bodies, comments, and bios.
- **Password Safety**: Salted bcrypt hashing (cost factor 12). Passwords excluded by default on user queries (`select: false`).
- **HTTP Protection**: Strict `helmet` headers, CORS whitelisting, httpOnly refresh cookie flags.
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
