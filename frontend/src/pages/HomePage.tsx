import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Post } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { SearchIcon } from '@/components/ui/Icons';
import { useAuthStore } from '@/store/auth';

export const HomePage: React.FC = () => {
  const [activeTag, setActiveTag] = useState('all');
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  // Fetch published posts
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['posts', activeTag, category, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTag !== 'all') params.append('tag', activeTag);
      if (category !== 'all') params.append('category', category);
      if (search) params.append('search', search);
      const res = await api.get<{ data: { posts: Post[]; total: number } }>(`/posts?${params.toString()}`);
      return res.data.data;
    },
  });

  const posts = data?.posts ?? [];
  const tags = ['all', 'art', 'education', 'travel', 'lifestyle', 'business', 'culture', 'technology', 'news'];
  const categories = ['all', 'news', 'tutorial', 'opinion', 'showcase', 'discussion'];

  return (
    <div>
      {/* Hero — a welcoming introduction for every kind of creator */}
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">{'// a place for every voice'}</p>
          <h1>
            Share what matters,<br />
            <em>find your people.</em>
          </h1>
          <p className="deck">
            Indiagram is a warm, open community for stories, ideas, discoveries, and everyday moments. Read widely, meet curious people, and make something worth sharing.
          </p>
          <div className="hero-acts">
            <a className="btn btn-accent" href="#writing">Explore the feed</a>
            {!isAuthenticated && <Link className="btn btn-ghost" to="/register">Join the community</Link>}
          </div>
        </div>

        {/* CSS illustration: abstract conversation cards, no external media dependency */}
        <figure className="community-visual" role="img" aria-label="Abstract illustration of people sharing stories and ideas">
          <div className="community-orbit community-orbit-one" />
          <div className="community-orbit community-orbit-two" />
          <div className="community-card community-card-main">
            <span className="community-card-mark">✦</span>
            <span className="community-card-title">A story worth sharing</span>
            <span className="community-card-copy">Small moments, big ideas, and the people who make them meaningful.</span>
          </div>
          <div className="community-card community-card-note">
            <span className="community-note-dot" />
            <span>New perspectives</span>
          </div>
          <div className="community-card community-card-tag">listen · learn · belong</div>
        </figure>
      </section>

      {/* Writing / Posts feed */}
      <section className="writing shell" id="writing">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{'// from the community'}</p>
            <h2 style={{ fontSize: '24px', marginTop: '4px', color: 'var(--ink)' }}>Latest stories</h2>
          </div>
          <p className="sec-note">{data?.total ?? 0} {data?.total === 1 ? 'post' : 'posts'}</p>
        </div>

        {/* Filters and search */}
        <div className="filters">
          <div className="search">
            <SearchIcon />
            <input
              type="search"
              placeholder="Search posts or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search posts"
            />
          </div>

          {/* Tag filters */}
          <div className="tags" role="group" aria-label="Filter by tag">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${activeTag === t ? 'active' : ''}`}
                onClick={() => setActiveTag(t)}
                aria-pressed={activeTag === t}
              >
                {t === 'all' ? 'All tags' : `#${t}`}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            paddingBottom: '24px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
          role="group"
          aria-label="Filter by category"
        >
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)', marginRight: '4px' }}>
            Category:
          </span>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              style={{ fontSize: '11px', textTransform: 'capitalize' }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px 0' }}>
            <div className="skeleton" style={{ height: '90px', width: '100%' }} />
            <div className="skeleton" style={{ height: '90px', width: '100%' }} />
            <div className="skeleton" style={{ height: '90px', width: '100%' }} />
          </div>
        ) : isError ? (
          <div className="empty-state">
            <div className="empty-state-mark" aria-hidden="true">⚠️</div>
            <h3>Unable to load feed</h3>
            <p>Could not connect to the server or retrieve stories. Please check your connection and try again.</p>
            <button
              type="button"
              className="btn btn-sm btn-accent"
              style={{ marginTop: '18px' }}
              onClick={() => void refetch()}
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-mark" aria-hidden="true">✦</div>
            <h3>{search || activeTag !== 'all' || category !== 'all' ? 'Nothing here yet' : 'The first story is waiting'}</h3>
            <p>{search || activeTag !== 'all' || category !== 'all' ? 'Try clearing a filter or exploring another interest.' : 'Be the first person to share a story with this community.'}</p>
            {(search || activeTag !== 'all' || category !== 'all') && (
              <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: '18px' }} onClick={() => { setSearch(''); setActiveTag('all'); setCategory('all'); }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ol className="posts">
            {posts.map((p, idx) => (
              <PostCard
                key={p._id}
                post={p}
                isLatest={idx === 0 && activeTag === 'all' && category === 'all' && !search}
              />
            ))}
          </ol>
        )}
      </section>

      {/* About & Community Section */}
      <section className="about shell" id="about">
        <div className="about-grid">
          <div>
            <p className="eyebrow">{'// the platform'}</p>
            <h2>Bring your perspective.</h2>
            <p className="prose">
              Indiagram is a community publishing space for anyone with something to say, show, teach, question, or celebrate. Find thoughtful posts across interests and make room for voices unlike your own.
            </p>
            <p className="prose" style={{ marginTop: '16px' }}>
              Share a recipe, a lesson, a sketch, a travel note, a business idea, or a thoughtful question. Good conversation is the common ground.
            </p>
            <ul className="links">
              <li><Link to="/leaderboard">View the Leaderboard</Link></li>
              <li><Link to="/verification/apply">Verification Policy</Link></li>
              <li><Link to="/feedback">Submit Feedback</Link></li>
            </ul>
          </div>

          {!isAuthenticated && (
            <div className="subscribe" id="subscribe">
              <p className="eyebrow">{'// make yourself at home'}</p>
              <h3>Ready to add your voice?</h3>
              <p className="prose small" style={{ marginTop: '8px' }}>
                Create a free account to publish, follow people you enjoy, and save the conversations you want to return to.
              </p>
              <div style={{ marginTop: '24px' }}>
                <Link to="/register" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }}>
                  Create a free account
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
