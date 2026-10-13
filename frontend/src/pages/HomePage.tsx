import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Post } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { SearchIcon } from '@/components/ui/Icons';

export const HomePage: React.FC = () => {
  const [activeTag, setActiveTag] = useState('all');
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Fetch published posts
  const { data, isLoading } = useQuery({
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
  const tags = ['all', 'react', 'perf', 'databases', 'tooling', 'javascript', 'git', 'typescript', 'news'];
  const categories = ['all', 'news', 'tutorial', 'opinion', 'showcase', 'discussion'];

  return (
    <div>
      {/* Hero (exact match to original Off By One thesis) */}
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">// the premise</p>
          <h1>Software is slow for<br /><em>boring</em> reasons.</h1>
          <p className="deck">
            A community-driven publishing platform for developers. Profilers, query plans, build caches —
            the unglamorous middle of the stack where almost all the time actually goes.
          </p>
          <div className="hero-acts">
            <a className="btn" href="#writing">Read the latest</a>
            <Link className="btn btn-ghost" to="/register">Join the community</Link>
          </div>
        </div>

        {/* Code signature card */}
        <figure className="code-card">
          <figcaption className="code-head">
            <span className="file">why.js</span>
            <span className="lang">js</span>
          </figcaption>
          <pre className="code"><code>{`// Nine years of debugging, compressed.
function why(software) {
  const costs = software.profile().sort(byCost);

  // It is never the clever part.
  return costs.at(0);
}`}</code></pre>
        </figure>
      </section>

      {/* Writing / Posts feed */}
      <section className="writing shell" id="writing">
        <div className="sec-head">
          <p className="eyebrow">// writing &amp; community feed</p>
          <p className="sec-note">{data?.total ?? 0} posts</p>
        </div>

        {/* Filters and search */}
        <div className="filters">
          <div className="search">
            <SearchIcon />
            <input
              type="search"
              placeholder="Search posts or tags"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              >
                {t === 'all' ? 'all' : `#${t}`}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', paddingBottom: '20px', flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
              style={{ fontSize: '11px', textTransform: 'capitalize' }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 0' }}>
            <div className="skeleton" style={{ height: '80px', width: '100%' }} />
            <div className="skeleton" style={{ height: '80px', width: '100%' }} />
            <div className="skeleton" style={{ height: '80px', width: '100%' }} />
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <h3>No posts found</h3>
            <p>Try clearing filters or search terms.</p>
          </div>
        ) : (
          <ol className="posts">
            {posts.map((p, idx) => (
              <PostCard key={p._id} post={p} isLatest={idx === 0 && activeTag === 'all' && !search} />
            ))}
          </ol>
        )}
      </section>

      {/* About & Subscribe Section (preserves original section) */}
      <section className="about shell" id="about">
        <div className="about-grid">
          <div>
            <p className="eyebrow">// about the platform</p>
            <h2>Publish, read, get verified.</h2>
            <p className="prose">
              Off By One is now a community space. Any registered developer can write tech articles,
              share discoveries, earn contribution points, and apply for a verified blue tick once they meet our criteria.
            </p>
            <p className="prose">
              Points are awarded for approved posts, helpful comments, and community recognition. No clickbait, no spam.
            </p>
            <ul className="links">
              <li><Link to="/leaderboard">Leaderboard</Link></li>
              <li><Link to="/verification/apply">Verification Policy</Link></li>
              <li><Link to="/feedback">Submit Feedback</Link></li>
              <li><a href="https://github.com/pawarhomendr/off-by-one" target="_blank" rel="noreferrer">GitHub</a></li>
            </ul>
          </div>

          <div className="subscribe" id="subscribe">
            <p className="eyebrow">// join the writers</p>
            <h3>Ready to share your benchmarks?</h3>
            <p className="prose small">Earn 50 points per approved post and climb the creator ranks.</p>
            <div style={{ marginTop: '20px' }}>
              <Link to="/register" className="btn" style={{ width: '100%' }}>Create Free Account</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
