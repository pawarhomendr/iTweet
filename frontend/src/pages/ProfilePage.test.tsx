// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';

const { apiGet, apiPost, toastError } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: { get: apiGet, post: apiPost, patch: vi.fn() },
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    user: { _id: 'user-me', username: 'me', role: 'user' },
    isAuthenticated: () => true,
    setUser: vi.fn(),
  }),
}));

vi.mock('@/components/feed/PostCard', () => ({
  PostCard: () => <div data-testid="post-card" />,
}));

vi.mock('react-hot-toast', () => ({
  default: { error: toastError, success: vi.fn() },
}));

function makeUser(username: string, overrides: Record<string, unknown> = {}) {
  return {
    _id: `id-${username}`,
    username,
    email: `${username}@example.com`,
    displayName: username === 'alice' ? 'Alice' : username,
    bio: '',
    avatar: '',
    coverImage: '',
    website: '',
    role: 'user',
    isVerified: false,
    isSuspended: false,
    emailVerified: true,
    points: 0,
    level: 'newbie',
    badges: [],
    followersCount: 4,
    followingCount: 2,
    postsCount: 0,
    ...overrides,
  };
}

function renderProfile(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  isFollowing = false,
) {
  apiGet.mockImplementation((url: string) => {
    if (url === '/users/alice') {
      return Promise.resolve({
        data: {
          data: {
            user: makeUser('alice'),
            isFollowing,
            posts: [],
            postTotal: 0,
          },
        },
      });
    }

    if (url === '/users/alice/followers') {
      return Promise.resolve({ data: { data: { followers: [makeUser('bob', { displayName: 'Bob' })] } } });
    }

    return Promise.resolve({ data: { data: { following: [] } } });
  });

  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/u/alice']}>
          <Routes>
            <Route path="/u/:username" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe('ProfilePage follow consistency', () => {
  beforeEach(() => {
    apiPost.mockResolvedValue({ data: { data: { following: true } } });
    toastError.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('refreshes profile, network, and search caches after a successful follow', async () => {
    const { client } = renderProfile();
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');

    fireEvent.click(await screen.findByRole('button', { name: 'Follow' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/users/alice/follow'));
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['profile'] });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['user-network'] });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['search-users'] });
    });
  });

  it('leaves the prior state intact and reports a failed follow', async () => {
    apiPost.mockRejectedValue(new Error('network failure'));
    const { client } = renderProfile();
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');

    fireEvent.click(await screen.findByRole('button', { name: 'Follow' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Unable to follow this user'));
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Follow' })).toBeTruthy();
  });

  it('refreshes the same caches after a successful unfollow', async () => {
    apiPost.mockResolvedValue({ data: { data: { following: false } } });
    const { client } = renderProfile(undefined, true);
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');

    fireEvent.click(await screen.findByRole('button', { name: 'Following' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/users/alice/follow'));
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['profile'] });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['user-network'] });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['search-users'] });
    });
  });

  it('allows only one request during rapid repeated profile clicks', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    apiPost.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    renderProfile();

    const button = await screen.findByRole('button', { name: 'Follow' });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    resolveRequest({ data: { data: { following: true } } });
    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
  });

  it('invalidates the network query after following someone from the modal', async () => {
    const { client } = renderProfile();
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');

    fireEvent.click(await screen.findByRole('button', { name: /followers/ }));
    await screen.findByText('Bob');
    const modalFollow = (await screen.findAllByRole('button', { name: 'Follow' }))[1];
    fireEvent.click(modalFollow);

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/users/bob/follow'));
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['user-network'] }));
  });
});
