import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Post } from '@/types';
import { useAuthStore } from '@/store/auth';
import { PostCard } from '@/components/feed/PostCard';
import { Link } from 'react-router-dom';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const BookmarksPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ['my-bookmarks', user?._id],
    enabled: Boolean(user?._id),
    queryFn: async () => {
      const res = await api.get<{ data: { bookmarks: Post[]; total: number } }>(
        `/posts/user/${user!._id}/bookmarks`
      );
      return res.data.data.bookmarks;
    },
  });

  const posts = data ?? [];

  return (
    <div className="shell page-content" style={{ maxWidth: '820px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '28px' }}>
        <p className="eyebrow">{'// private library'}</p>
        <h1
          style={{
            fontFamily: 'var(--heading)',
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '-.02em',
            color: 'var(--ink)',
            marginTop: '4px',
            marginBottom: '6px',
          }}
        >
          Saved Posts
        </h1>
        <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
          Your personal collection of saved articles and benchmarks. These are private to your account.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
          <div className="skeleton" style={{ height: '90px', width: '100%' }} />
          <div className="skeleton" style={{ height: '90px', width: '100%' }} />
          <div className="skeleton" style={{ height: '90px', width: '100%' }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h3 style={{ fontFamily: 'var(--heading)' }}>No saved posts yet</h3>
          <p>Click the bookmark icon on any post in your feed to save it for reading later.</p>
          <Link to="/" className="btn btn-sm btn-ghost" style={{ marginTop: '20px' }}>
            Browse Feed
          </Link>
        </div>
      ) : (
        <ol className="posts">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </ol>
      )}
    </div>
  );
};
