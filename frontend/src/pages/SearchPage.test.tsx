// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPage } from './SearchPage';

const { apiGet, apiPost, toastError } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: { get: apiGet, post: apiPost },
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    user: { _id: 'user-me', username: 'me', role: 'user' },
    isAuthenticated: () => true,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: toastError },
}));

function renderSearch(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  apiGet.mockResolvedValue({
    data: {
      data: {
        users: [{
          _id: 'user-alice',
          username: 'alice',
          displayName: 'Alice',
          avatar: '',
          bio: '',
          points: 10,
          isVerified: false,
          isFollowing: false,
        }],
        total: 1,
      },
    },
  });

  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe('SearchPage follow consistency', () => {
  beforeEach(() => {
    apiPost.mockResolvedValue({ data: { data: { following: true } } });
    toastError.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  async function showResults() {
    const input = screen.getByPlaceholderText('Search by name, @username, keywords, or topics...');
    fireEvent.change(input, { target: { value: 'alice' } });
    return screen.findByRole('button', { name: 'Follow' });
  }

  it('refreshes related caches after a successful search follow', async () => {
    const { client } = renderSearch();
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(await showResults());

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/users/alice/follow'));
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['search-users'] }));
  });

  it('does not invalidate or show a false success after a failed search follow', async () => {
    apiPost.mockRejectedValue(new Error('network failure'));
    const { client } = renderSearch();
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(await showResults());

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Follow action failed'));
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Follow' })).toBeTruthy();
  });

  it('deduplicates rapid clicks for the same search result', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    apiPost.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    renderSearch();
    const button = await showResults();

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    resolveRequest({ data: { data: { following: true } } });
    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
  });
});
