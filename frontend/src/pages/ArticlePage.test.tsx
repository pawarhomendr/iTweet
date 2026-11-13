// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '@/types';
import { ArticlePage } from './ArticlePage';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('@/lib/api', () => ({
  api: { get: apiGet, post: vi.fn() },
}));

function makePost(author: unknown): Post {
  return {
    _id: 'post-1',
    author,
    title: 'A story worth sharing',
    slug: 'story',
    excerpt: 'A short excerpt.',
    body: '<p>The full story.</p>',
    coverImage: '',
    images: [],
    category: 'discussion',
    tags: ['community'],
    sourceUrl: '',
    status: 'published',
    rejectionReason: '',
    publishedAt: '2026-01-01T00:00:00.000Z',
    likesCount: 0,
    commentsCount: 0,
    bookmarksCount: 0,
    viewsCount: 0,
    readMinutes: 1,
    isPinned: false,
    isFeatured: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  } as unknown as Post;
}

function renderArticle(author: unknown) {
  apiGet.mockImplementation((url: string) => {
    if (url === '/posts/story') {
      return Promise.resolve({ data: { data: { post: makePost(author), liked: false, bookmarked: false } } });
    }

    return Promise.resolve({ data: { data: { comments: [] } } });
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/post/story']}>
        <Routes>
          <Route path="/post/:slug" element={<ArticlePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ArticlePage author rendering', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('preserves a valid author profile link', async () => {
    const { container } = renderArticle({
      _id: 'user-1',
      username: 'alice',
      displayName: 'Alice',
      avatar: '',
      isVerified: false,
      level: 'newbie',
    });

    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(container.querySelector('a[href="/u/alice"]')).toBeTruthy();
  });

  it('renders a fallback without a profile link when the author is missing', async () => {
    const { container } = renderArticle(null);

    expect(await screen.findByText('Deleted user')).toBeTruthy();
    expect(container.querySelector('a[href^="/u/"]')).toBeNull();
  });
});
