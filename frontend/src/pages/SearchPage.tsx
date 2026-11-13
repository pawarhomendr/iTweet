import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User, Post } from '@/types';
import { useAuthStore } from '@/store/auth';
import { SearchIcon, CheckBadgeIcon } from '@/components/ui/Icons';
import { PostCard } from '@/components/feed/PostCard';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';
import { invalidateFollowQueries } from '@/lib/followQueries';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const followInFlight = useRef(new Set<string>());

  // Query users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['search-users', searchQuery],
    enabled: activeTab === 'users' && searchQuery.trim().length > 0,
    queryFn: async () => {
      const res = await api.get<{ data: { users: User[]; total: number } }>(
        `/users?search=${encodeURIComponent(searchQuery.trim())}`
      );
      return res.data.data.users;
    },
  });

  // Query posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['search-posts', searchQuery],
    enabled: activeTab === 'posts' && searchQuery.trim().length > 0,
    queryFn: async () => {
      const res = await api.get<{ data: { posts: Post[]; total: number } }>(
        `/posts?search=${encodeURIComponent(searchQuery.trim())}`
      );
      return res.data.data.posts;
    },
  });

  // Follow/unfollow user mutation
  const followMutation = useMutation({
    mutationFn: async (username: string) => {
      if (!isAuthenticated()) {
        toast.error('Please log in to follow');
        navigate('/login');
        throw new Error('AUTH_REQUIRED');
      }
      return api.post(`/users/${username}/follow`);
    },
    onSuccess: () => invalidateFollowQueries(queryClient),
    onError: (error) => {
      if (error instanceof Error && error.message === 'AUTH_REQUIRED') return;
      toast.error('Follow action failed');
    },
    onSettled: (_data, _error, username) => {
      if (username) followInFlight.current.delete(username);
    },
  });

  const handleFollow = (username: string) => {
    if (followInFlight.current.has(username)) return;
    followInFlight.current.add(username);
    followMutation.mutate(username);
  };

  const users = usersData ?? [];
  const posts = postsData ?? [];

  return (
    <div className="shell page-content" style={{ maxWidth: '820px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '24px' }}>
        <p className="eyebrow">{'// explore & discover'}</p>
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
          Search Indiagram
        </h1>
        <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
          Find people, stories, ideas, and conversations that spark your curiosity.
        </p>
      </div>

      {/* Search Input Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--surface)',
          border: '1.5px solid var(--rule)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 18px',
          marginBottom: '24px',
          transition: 'border-color .15s ease',
        }}
      >
        <SearchIcon />
        <input
          type="search"
          placeholder="Search by name, @username, keywords, or topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--display)',
            fontSize: '15px',
            color: 'var(--ink)',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{ fontSize: '14px', color: 'var(--muted)', cursor: 'pointer' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Search Type Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--rule)',
          marginBottom: '28px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 18px',
            fontFamily: 'var(--display)',
            fontSize: '14px',
            fontWeight: activeTab === 'users' ? 600 : 500,
            color: activeTab === 'users' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'users' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all .12s ease',
          }}
        >
          Accounts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          style={{
            padding: '10px 18px',
            fontFamily: 'var(--display)',
            fontSize: '14px',
            fontWeight: activeTab === 'posts' ? 600 : 500,
            color: activeTab === 'posts' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'posts' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all .12s ease',
          }}
        >
          Articles &amp; Posts
        </button>
      </div>

      {/* Results Area */}
      {!searchQuery.trim() ? (
        <div className="empty-state" style={{ padding: '48px 0' }}>
          <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '16px' }}>
            Enter a search term above to discover creators or technical articles.
          </p>
        </div>
      ) : activeTab === 'users' ? (
        usersLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
            <div className="skeleton" style={{ height: '64px', width: '100%' }} />
            <div className="skeleton" style={{ height: '64px', width: '100%' }} />
            <div className="skeleton" style={{ height: '64px', width: '100%' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <h3 style={{ fontFamily: 'var(--heading)' }}>No accounts found</h3>
            <p>Try searching with another name or username.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {users.map((u) => {
              const isSelf = currentUser?.username === u.username;

              return (
                <div
                  key={u._id}
                  className="card"
                  style={{
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <Link
                    to={`/u/${u.username}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}
                  >
                    <img
                      src={
                        u.avatar ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(u.username)}`
                      }
                      alt=""
                      className="avatar avatar-md"
                      style={{ border: '1.5px solid var(--rule)' }}
                    />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)', display: 'flex', alignItems: 'center' }}>
                        {u.displayName || u.username}
                        {u.isVerified && <CheckBadgeIcon />}
                      </div>
                      <div className="dim mono" style={{ fontSize: '12px' }}>
                        @{u.username} · {u.points} pts
                      </div>
                      {u.bio && (
                        <p className="dim" style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '4px' }}>
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  {!isSelf && isAuthenticated() && (
                    <button
                      type="button"
                      className={`btn btn-sm ${u.isFollowing ? 'btn-ghost' : 'btn-accent'}`}
                       onClick={() => handleFollow(u.username)}
                      disabled={followMutation.isPending}
                    >
                      {u.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : postsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
          <div className="skeleton" style={{ height: '90px', width: '100%' }} />
          <div className="skeleton" style={{ height: '90px', width: '100%' }} />
          <div className="skeleton" style={{ height: '90px', width: '100%' }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h3 style={{ fontFamily: 'var(--heading)' }}>No posts matched your search</h3>
          <p>Try searching for different keywords, topics, or hashtags.</p>
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
