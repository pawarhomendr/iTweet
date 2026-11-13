import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Post } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { PageBackButton } from '@/components/layout/PageBackButton';

type TrendingFilter = 'trending' | 'most_liked' | 'most_discussed' | 'recent';

export const TrendingPage: React.FC = () => {
  const [filter, setFilter] = useState<TrendingFilter>('trending');

  const { data, isLoading } = useQuery({
    queryKey: ['trending-posts', filter],
    queryFn: async () => {
      const res = await api.get<{ data: { posts: Post[] } }>(`/posts/trending?filter=${filter}`);
      return res.data.data.posts;
    },
  });

  const posts = data ?? [];

  return (
    <div className="shell page-content" style={{ maxWidth: '820px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '28px' }}>
        <p className="eyebrow">{'// ranked discovery'}</p>
        <h1
          style={{
            fontFamily: 'var(--heading)',
            fontSize: '34px',
            fontWeight: 600,
            letterSpacing: '-.025em',
            color: 'var(--ink)',
            marginTop: '4px',
            marginBottom: '8px',
          }}
        >
          Trending on Indiagram
        </h1>
        <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
          Discover the most engaged engineering articles, benchmarks, and community discussions.
        </p>
      </div>

      {/* Filter Chips */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '28px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
        role="group"
        aria-label="Filter trending posts"
      >
        <button
          type="button"
          className={`chip ${filter === 'trending' ? 'active' : ''}`}
          onClick={() => setFilter('trending')}
          aria-pressed={filter === 'trending'}
        >
          🔥 Trending Now
        </button>

        <button
          type="button"
          className={`chip ${filter === 'most_liked' ? 'active' : ''}`}
          onClick={() => setFilter('most_liked')}
          aria-pressed={filter === 'most_liked'}
        >
          ❤️ Most Liked
        </button>

        <button
          type="button"
          className={`chip ${filter === 'most_discussed' ? 'active' : ''}`}
          onClick={() => setFilter('most_discussed')}
          aria-pressed={filter === 'most_discussed'}
        >
          💬 Most Discussed
        </button>

        <button
          type="button"
          className={`chip ${filter === 'recent' ? 'active' : ''}`}
          onClick={() => setFilter('recent')}
          aria-pressed={filter === 'recent'}
        >
          ⏱️ Recent
        </button>
      </div>

      {/* Post List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 0' }}>
          <div className="skeleton" style={{ height: '110px', width: '100%' }} />
          <div className="skeleton" style={{ height: '110px', width: '100%' }} />
          <div className="skeleton" style={{ height: '110px', width: '100%' }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h3 style={{ fontFamily: 'var(--heading)' }}>No trending posts right now</h3>
          <p>Check back soon as new articles receive community engagement.</p>
        </div>
      ) : (
        <ol className="posts">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
            />
          ))}
        </ol>
      )}
    </div>
  );
};
