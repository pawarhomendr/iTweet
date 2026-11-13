// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '@/types';
import { AdminPage } from './AdminPage';

const { apiGet, apiPatch, toastError, toastSuccess, authState } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  authState: {
    user: { _id: 'mod-1', username: 'moderator', role: 'moderator' as const },
    authenticated: true,
    mod: true,
  },
}));

vi.mock('@/lib/api', () => ({
  api: { get: apiGet, patch: apiPatch },
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    user: authState.user,
    isAuthenticated: () => authState.authenticated,
    isMod: () => authState.mod,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: toastError, success: toastSuccess },
}));

const stats = {
  users: 18,
  posts: 42,
  pendingPosts: 1,
  openReports: 2,
  feedbackUnread: 3,
};

const pendingPost = {
  _id: 'post-1',
  title: 'A pending platform story',
  category: 'tutorial',
  author: { username: 'writer' },
  createdAt: '2026-01-01T00:00:00.000Z',
  excerpt: 'A pending excerpt.',
  body: 'A pending body.',
} as unknown as Post;

function httpError(status: number): Error & { response: { status: number } } {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status } });
}

function setupSuccess(posts: Post[] = []) {
  apiGet.mockImplementation((url: string) => {
    if (url === '/admin/stats') return Promise.resolve({ data: { data: stats } });
    if (url === '/admin/posts/pending') return Promise.resolve({ data: { data: { posts } } });
    if (url === '/reports?status=open') return Promise.resolve({ data: { data: { reports: [] } } });
    if (url === '/verification') return Promise.resolve({ data: { data: { requests: [] } } });
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
}

function renderAdmin(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminPage reliability and moderation UX', () => {
  beforeEach(() => {
    authState.user = { _id: 'mod-1', username: 'moderator', role: 'moderator' };
    authState.authenticated = true;
    authState.mod = true;
    apiPatch.mockResolvedValue({ data: { data: {} } });
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows loading skeletons while admin requests are pending', () => {
    apiGet.mockReturnValue(new Promise(() => undefined));
    renderAdmin();

    expect(screen.getByTestId('admin-stats-loading')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();
  });

  it('renders real stats, pending content, and existing moderation actions', async () => {
    setupSuccess([pendingPost]);
    renderAdmin();

    expect(await screen.findByText('Platform overview')).toBeTruthy();
    expect(await screen.findByText('A pending platform story')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve & Award Points' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeTruthy();
  });

  it('shows a useful empty state when the pending queue is clear', async () => {
    setupSuccess();
    renderAdmin();

    expect(await screen.findByText('Queue is clear')).toBeTruthy();
    expect(screen.getByText('No posts are currently awaiting moderation review.')).toBeTruthy();
  });

  it('shows a server error and retries the affected section only', async () => {
    let pendingCalls = 0;
    apiGet.mockImplementation((url: string) => {
      if (url === '/admin/stats') return Promise.resolve({ data: { data: stats } });
      if (url === '/admin/posts/pending') {
        pendingCalls += 1;
        return pendingCalls === 1
          ? Promise.reject(httpError(503))
          : Promise.resolve({ data: { data: { posts: [pendingPost] } } });
      }
      return Promise.resolve({ data: { data: { reports: [], requests: [] } } });
    });
    renderAdmin();

    expect(await screen.findByText('Unable to load pending posts.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('A pending platform story')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(pendingCalls).toBe(2);
  });

  it('keeps successful sections visible when another request fails', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url === '/admin/stats') return Promise.resolve({ data: { data: stats } });
      if (url === '/admin/posts/pending') return Promise.reject(httpError(500));
      return Promise.resolve({ data: { data: { reports: [], requests: [] } } });
    });
    renderAdmin();

    expect(await screen.findByText('18')).toBeTruthy();
    expect(await screen.findByText('Unable to load pending posts.')).toBeTruthy();
  });

  it('shows a session-expired action for a 401 response', async () => {
    apiGet.mockRejectedValue(httpError(401));
    renderAdmin();

    expect(await screen.findByText('Your admin session has expired.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in again' })).toBeTruthy();
  });

  it('shows access denied for a 403 without exposing restricted records', async () => {
    apiGet.mockRejectedValue(httpError(403));
    renderAdmin();

    expect(await screen.findByText('Access denied for this section.')).toBeTruthy();
    expect(screen.queryByText('A pending platform story')).toBeNull();
  });

  it('does not request admin data for a regular authenticated user', () => {
    authState.mod = false;
    renderAdmin();

    expect(screen.getByText('Admin access required')).toBeTruthy();
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('preserves the post approval workflow and endpoint contract', async () => {
    setupSuccess([pendingPost]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderAdmin(client);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve & Award Points' }));

    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/admin/posts/post-1/review', {
      status: 'published',
      rejectionReason: undefined,
    }));
    expect(toastSuccess).toHaveBeenCalledWith('Post reviewed successfully');
  });
});
