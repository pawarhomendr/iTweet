// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { useAuthStore } from '@/store/auth';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../lib/api', () => ({
  api: { get: apiGet },
}));

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('HomePage', () => {
  afterEach(() => {
    cleanup();
    useAuthStore.getState().logout();
  });

  beforeEach(() => {
    apiGet.mockResolvedValue({ data: { data: { posts: [], total: 0 } } });
  });

  it('welcomes a broad community without rendering the old JavaScript demo', async () => {
    renderHome();

    expect(await screen.findByText('Share what matters,')).toBeTruthy();
    expect(screen.getByText('find your people.')).toBeTruthy();
    expect(screen.queryByText('why.js')).toBeNull();
    expect(screen.queryByText(/function why/)).toBeNull();
    expect(await screen.findByText('The first story is waiting')).toBeTruthy();
  });

  it('hides account-creation CTAs for authenticated visitors', async () => {
    useAuthStore.getState().setAuth({ _id: 'user-1', username: 'reader', role: 'user' } as any, 'access-token');
    renderHome();

    expect(await screen.findByText('Latest stories')).toBeTruthy();
    expect(screen.queryByText('Join the community')).toBeNull();
    expect(screen.queryByText('Create a free account')).toBeNull();
    useAuthStore.getState().logout();
  });
});
