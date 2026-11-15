import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../models/Feedback', () => ({ Feedback: { find: vi.fn(), countDocuments: vi.fn(), findByIdAndUpdate: vi.fn(), create: vi.fn() } }));
vi.mock('../models/User', () => ({ User: {} }));
vi.mock('../models/Post', () => ({ Post: {} }));
vi.mock('../models/Notification', () => ({ Notification: {} }));
vi.mock('../models/Report', () => ({ Report: {} }));
vi.mock('../services/rewards', () => ({ awardPoints: vi.fn() }));
vi.mock('../config/socket', () => ({ emitNotification: vi.fn() }));

vi.mock('../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireMod: (_req: any, res: any) => res.status(403).json({ success: false, message: 'Forbidden' }),
  requireAdmin: (_req: any, res: any) => res.status(403).json({ success: false, message: 'Forbidden' }),
}));

import adminRouter from './admin';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', adminRouter);
  return app;
}

async function withServer(fn: (baseUrl: string) => Promise<void>) {
  const server = http.createServer(buildApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe('admin feedback authorization (Phase 14C)', () => {
  it('denies unauthorized users from listing feedback', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/feedback`);
      expect(res.status).toBe(403);
    });
  });

  it('denies unauthorized users from marking feedback as read', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/feedback/507f1f77bcf86cd799439011/read`, { method: 'PATCH' });
      expect(res.status).toBe(403);
    });
  });
});
