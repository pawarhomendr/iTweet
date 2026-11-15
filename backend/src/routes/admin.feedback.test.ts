import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/Feedback', () => ({
  Feedback: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../models/User', () => ({ User: { countDocuments: vi.fn(), findByIdAndUpdate: vi.fn() } }));
vi.mock('../models/Post', () => ({ Post: { countDocuments: vi.fn(), find: vi.fn(), findById: vi.fn() } }));
vi.mock('../models/Notification', () => ({ Notification: { create: vi.fn() } }));
vi.mock('../models/Report', () => ({ Report: { countDocuments: vi.fn() } }));
vi.mock('../services/rewards', () => ({ awardPoints: vi.fn() }));
vi.mock('../config/socket', () => ({ emitNotification: vi.fn() }));

vi.mock('../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireMod: (_req: any, _res: any, next: any) => next(),
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

import { Feedback } from '../models/Feedback';
import adminRouter from './admin';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', adminRouter);
  return app;
}

async function withServer(app: express.Express, fn: (baseUrl: string) => Promise<void>) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

const validId = '507f1f77bcf86cd799439011';

describe('admin feedback routes (Phase 14C)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists feedback entries for authorized moderators with existing contract', async () => {
    const entries = [{ _id: 'f1', email: 'a@example.com', subject: 'Hi', body: 'Body text here', isRead: false, createdAt: '2026-01-01T00:00:00.000Z' }];
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue(entries);
    (Feedback.find as any).mockReturnValue({ sort, skip, limit });
    (Feedback.countDocuments as any).mockResolvedValue(1);

    await withServer(buildApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/feedback?page=1`);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.entries).toEqual(entries);
      expect(json.data.total).toBe(1);
      expect(json.data.page).toBe(1);
      expect(json.data.pages).toBe(1);
    });

    expect(Feedback.find).toHaveBeenCalled();
  });

  it('marks feedback as read for valid id', async () => {
    const entry = { _id: validId, email: 'a@example.com', subject: 'Hi', body: 'Body text here', isRead: true, createdAt: '2026-01-01T00:00:00.000Z' };
    (Feedback.findByIdAndUpdate as any).mockResolvedValue(entry);

    await withServer(buildApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/feedback/${validId}/read`, { method: 'PATCH' });
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.entry.isRead).toBe(true);
    });

    expect(Feedback.findByIdAndUpdate).toHaveBeenCalledWith(validId, { isRead: true }, { new: true });
  });

  it('returns 400 for invalid feedback id', async () => {
    await withServer(buildApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/feedback/not-an-id/read`, { method: 'PATCH' });
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });
    expect(Feedback.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when feedback record is missing', async () => {
    (Feedback.findByIdAndUpdate as any).mockResolvedValue(null);

    await withServer(buildApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/feedback/${validId}/read`, { method: 'PATCH' });
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });

  it('preserves anonymous public feedback submission payload and behavior', async () => {
    (Feedback.create as any).mockResolvedValue({ _id: 'new1', email: 'user@example.com', subject: 'Subject', body: 'This is enough body text.' });

    await withServer(buildApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com', subject: 'Subject', body: 'This is enough body text.' }),
      });
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('new1');
    });

    expect(Feedback.create).toHaveBeenCalledWith({ email: 'user@example.com', subject: 'Subject', body: 'This is enough body text.' });
  });
});
