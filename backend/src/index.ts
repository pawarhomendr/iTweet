import { validateProductionJwtSecrets } from './config/env';
import { loadEnvironmentFiles } from './config/envFiles';

// Canonical local file: backend/.env. Keep the legacy root .env as the first
// fallback so existing setups retain precedence when both files are present.
loadEnvironmentFiles(__dirname);

// ─── FIX S-3: Validate required env vars at startup before anything else ───
const REQUIRED_ENV = [
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'MONGODB_URI',
  'FRONTEND_URL',
];
const REQUIRED_PROD_ENV = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[startup] FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
if (process.env.NODE_ENV === 'production') {
  for (const key of REQUIRED_PROD_ENV) {
    if (!process.env[key]) {
      console.error(`[startup] FATAL: Missing required production environment variable: ${key}`);
      process.exit(1);
    }
  }
  const secretErrors = validateProductionJwtSecrets(process.env);
  if (secretErrors.length > 0) {
    for (const message of secretErrors) {
      console.error(`[startup] FATAL: ${message}`);
    }
    process.exit(1);
  }
}

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';
import { connectDB } from './config/db';
import { initSocket } from './config/socket';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import commentRoutes from './routes/comments';
import likeRoutes from './routes/likes';
import followRoutes from './routes/follows';
import notificationRoutes from './routes/notifications';
import conversationRoutes from './routes/conversations';
import rewardRoutes from './routes/rewards';
import verificationRoutes from './routes/verification';
import reportRoutes from './routes/reports';
import adminRoutes from './routes/admin';
import { errorHandler } from './middleware/errorHandler';
import { REDACTED_MORGAN_FORMAT, registerRedactedMorganTokens } from './services/logging';

const app = express();
const server = http.createServer(app);

// FIX H-3: Trust exactly one reverse-proxy hop so req.ip is the real client IP
// (needed for accurate rate limiting behind Render/Railway/Vercel proxy)
app.set('trust proxy', 1);

// FIX M-1 + H-1: Helmet with HSTS and fixed CSP connectSrc
const frontendOrigin = process.env.FRONTEND_URL!;
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 63_072_000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://api.dicebear.com'],
      // FIX H-1: conditionally include frontend origin — never an empty string
      connectSrc: ["'self'", frontendOrigin],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    },
  },
}));

// FIX H-2: CORS — single explicit origin, never wildcard
app.use(cors({
  origin: frontendOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Body & cookies
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize()); // prevent NoSQL injection via req.body/params/query

// Logging — use 'combined' in production for structured logs; never log request bodies
registerRedactedMorganTokens();
if (process.env.NODE_ENV === 'production') {
  app.use(morgan(REDACTED_MORGAN_FORMAT));
} else if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :safe-url :status :res[content-length] - :response-time ms'));
}

// FIX H-3: Global rate limit — now uses real client IP after trust proxy is set
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000),
  max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', commentRoutes);
app.use('/api/posts', likeRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use(errorHandler);

// Socket.IO
initSocket(server);

// Start
const PORT = Number(process.env.PORT ?? 4000);
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[server] running on http://localhost:${PORT}`);
  });
});

export { app, server };
