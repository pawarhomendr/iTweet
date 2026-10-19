
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User, Post } from '@/types';
import { useAuthStore } from '@/store/auth';
import { PostCard } from '@/components/feed/PostCard';
import { CheckBadgeIcon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', username],
    enabled: Boolean(username),
    queryFn: async () => {
      const res = await api.get<{
        data: {
          user: User;
          isFollowing: boolean;
          posts: Post[];
          postTotal: number;
        };
      }>(`/users/${username}`);

      return res.data.data;
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated()) {
        toast.error('Please log in to follow');
        navigate('/login');
        return;
      }

      return api.post(`/users/${username}/follow`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['profile', username],
      }),
    onError: () => {
      toast.error('Unable to follow this user. Please try again.');
    },
  });

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await api.post('/auth/logout');
    } catch {
      // Clear the local session even if the server request fails.
    } finally {
      logout();
      queryClient.clear();
      navigate('/login', { replace: true });
      toast.success('Logged out successfully');
    }
  };

  if (isLoading) {
    return (
      <div className="shell page-content">
        <div
          className="skeleton"
          style={{
            height: '120px',
            width: '100%',
            marginBottom: '20px',
          }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="shell page-content">
        User not found
      </div>
    );
  }

  const { user, isFollowing, posts } = data;
  const isMe = currentUser?.username === user.username;

  return (
    <div
      className="shell page-content"
      style={{ maxWidth: '840px' }}
    >
      {/* Cover image */}
      {user.coverImage && (
        <img
          src={user.coverImage}
          alt={`${user.username}'s cover`}
          style={{
            width: '100%',
            height: '180px',
            objectFit: 'cover',
            borderRadius: 'var(--radius)',
            marginBottom: '20px',
          }}
        />
      )}

      {/* Profile header */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <img
          src={
            user.avatar ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(user.username)}`
          }
          alt={user.username}
          className="avatar avatar-xl"
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '26px' }}>
                {user.displayName || user.username}
                {user.isVerified && <CheckBadgeIcon />}
              </h1>

              <p className="dim mono">
                @{user.username} · {user.level}
              </p>
            </div>

            {/* Actions for your own profile */}
            {isMe && isAuthenticated() && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Log out of your account"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            )}

            {/* Actions for other users */}
            {!isMe && isAuthenticated() && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className={`btn btn-sm ${
                    isFollowing ? 'btn-ghost' : 'btn-accent'
                  }`}
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending
                    ? 'Please wait...'
                    : isFollowing
                      ? 'Following'
                      : 'Follow'}
                </button>

                <Link
                  to={`/chat?with=${encodeURIComponent(user.username)}`}
                  className="btn btn-sm btn-ghost"
                >
                  Message
                </Link>
              </div>
            )}
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="prose" style={{ marginTop: '12px' }}>
              {user.bio}
            </p>
          )}

          {/* Profile statistics */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '16px',
              fontFamily: 'var(--mono)',
              fontSize: '13px',
              flexWrap: 'wrap',
            }}
          >
            <span>
              <strong>{user.points}</strong> points
            </span>
            <span>
              <strong>{user.postsCount}</strong> posts
            </span>
            <span>
              <strong>{user.followersCount}</strong> followers
            </span>
            <span>
              <strong>{user.followingCount}</strong> following
            </span>
          </div>

          {/* Badges */}
          {user.badges && user.badges.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                marginTop: '12px',
                flexWrap: 'wrap',
              }}
            >
              {user.badges.map((badge) => (
                <span key={badge} className="badge">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <hr
        className="divider"
        style={{ margin: '40px 0' }}
      />

      {/* Published posts */}
      <section>
        <p className="eyebrow">// published writing</p>

        {posts.length === 0 ? (
          <p
            className="dim"
            style={{ padding: '24px 0' }}
          >
            No published posts yet.
          </p>
        ) : (
          <ol className="posts">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};
