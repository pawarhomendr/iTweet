import React, { useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User, Post } from '@/types';
import { useAuthStore } from '@/store/auth';
import { PostCard } from '@/components/feed/PostCard';
import { CheckBadgeIcon, CloseIcon, SettingsIcon, PenIcon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';
import { invalidateFollowQueries } from '@/lib/followQueries';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'likes' | 'bookmarks' | 'media'>('posts');
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Edit Profile Form State
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const profileFollowInFlight = useRef(false);
  const modalFollowInFlight = useRef(new Set<string>());

  // Query profile
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

  const user = data?.user;
  const isFollowing = data?.isFollowing ?? false;
  const isMe = currentUser?.username === user?.username;

  // Query specific tab data
  const { data: tabPostsData, isLoading: tabLoading } = useQuery({
    queryKey: ['profile-tab', user?._id, activeTab],
    enabled: Boolean(user?._id) && activeTab !== 'posts',
    queryFn: async () => {
      if (activeTab === 'reposts') {
        const res = await api.get<{ data: { posts: Post[] } }>(`/posts/user/${user!._id}/reposts`);
        return res.data.data.posts;
      }
      if (activeTab === 'likes') {
        const res = await api.get<{ data: { posts: Post[] } }>(`/posts/user/${user!._id}/likes`);
        return res.data.data.posts;
      }
      if (activeTab === 'bookmarks') {
        const res = await api.get<{ data: { bookmarks: Post[] } }>(`/posts/user/${user!._id}/bookmarks`);
        return res.data.data.bookmarks;
      }
      if (activeTab === 'media') {
        const res = await api.get<{ data: { posts: Post[] } }>(`/posts/user/${user!._id}/media`);
        return res.data.data.posts;
      }
      return [];
    },
  });

  // Query followers or following list
  const { data: modalListData, isLoading: modalLoading } = useQuery({
    queryKey: ['user-network', username, modalType],
    enabled: Boolean(username) && Boolean(modalType),
    queryFn: async () => {
      const endpoint = modalType === 'followers'
        ? `/users/${username}/followers`
        : `/users/${username}/following`;
      const res = await api.get<{ data: { followers?: User[]; following?: User[] } }>(endpoint);
      return modalType === 'followers' ? (res.data.data.followers ?? []) : (res.data.data.following ?? []);
    },
  });

  // Follow/unfollow profile owner
  const followMutation = useMutation({
    mutationFn: async () => {
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
      toast.error('Unable to follow this user');
    },
    onSettled: () => {
      profileFollowInFlight.current = false;
    },
  });

  // Follow/unfollow someone from the modal
  const toggleModalFollowMutation = useMutation({
    mutationFn: async (targetUsername: string) => {
      if (!isAuthenticated()) {
        toast.error('Please log in to follow');
        navigate('/login');
        throw new Error('AUTH_REQUIRED');
      }
      return api.post(`/users/${targetUsername}/follow`);
    },
    onSuccess: () => invalidateFollowQueries(queryClient),
    onError: (error) => {
      if (error instanceof Error && error.message === 'AUTH_REQUIRED') return;
      toast.error('Follow action failed');
    },
    onSettled: (_data, _error, targetUsername) => {
      if (targetUsername) modalFollowInFlight.current.delete(targetUsername);
    },
  });

  const handleProfileFollow = () => {
    if (profileFollowInFlight.current || followMutation.isPending) return;
    profileFollowInFlight.current = true;
    followMutation.mutate();
  };

  const handleModalFollow = (targetUsername: string) => {
    if (modalFollowInFlight.current.has(targetUsername)) return;
    modalFollowInFlight.current.add(targetUsername);
    toggleModalFollowMutation.mutate(targetUsername);
  };

  // Edit profile submission
  const editProfileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('displayName', editDisplayName);
      formData.append('bio', editBio);
      formData.append('website', editWebsite);

      if (removeAvatar) formData.append('removeAvatar', 'true');
      else if (avatarFile) formData.append('avatar', avatarFile);

      if (removeCover) formData.append('removeCover', 'true');
      else if (coverFile) formData.append('cover', coverFile);

      const res = await api.patch<{ data: { user: User } }>('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.user;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Profile updated successfully!');
      setEditProfileOpen(false);
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  const openEditModal = () => {
    if (!user) return;
    setEditDisplayName(user.displayName || '');
    setEditBio(user.bio || '');
    setEditWebsite(user.website || '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(false);
    setEditProfileOpen(true);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setRemoveAvatar(false);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setRemoveCover(false);
    setCoverPreview(URL.createObjectURL(file));
  };

  if (isLoading) {
    return (
      <div className="shell page-content" style={{ maxWidth: '820px' }}>
        <div className="skeleton" style={{ height: '140px', width: '100%', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '80px', width: '60%', marginBottom: '32px' }} />
        <div className="skeleton" style={{ height: '120px', width: '100%' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="shell page-content empty-state">
        <h2 style={{ fontFamily: 'var(--heading)', fontSize: '28px' }}>User not found</h2>
        <p style={{ marginTop: '8px' }}>This account does not exist or may have been suspended.</p>
        <Link to="/" className="btn btn-sm btn-ghost" style={{ marginTop: '24px' }}>
          Back to feed
        </Link>
      </div>
    );
  }

  const postsToShow = activeTab === 'posts' ? (data?.posts ?? []) : (tabPostsData ?? []);

  return (
    <div className="shell page-content" style={{ maxWidth: '820px' }}>
      <PageBackButton fallback="/" />
      {/* Cover image banner */}
      {user.coverImage && (
        <div style={{ marginBottom: '24px', overflow: 'hidden', borderRadius: 'var(--radius)' }}>
          <img
            src={user.coverImage}
            alt=""
            aria-hidden="true"
            style={{
              width: '100%',
              height: '190px',
              objectFit: 'cover',
              border: '1px solid var(--rule)',
            }}
          />
        </div>
      )}

      {/* Profile Header */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          marginBottom: '28px',
        }}
      >
        <img
          src={
            user.avatar ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(user.username)}`
          }
          alt={user.username}
          className="avatar avatar-xl"
          style={{ border: '3px solid var(--paper)', boxShadow: 'var(--shadow-sm)' }}
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
              <h1
                style={{
                  fontFamily: 'var(--heading)',
                  fontSize: '26px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {user.displayName || user.username}
                {user.isVerified && <CheckBadgeIcon />}
              </h1>

              <p className="dim mono" style={{ fontSize: '12.5px', marginTop: '2px' }}>
                @{user.username} · <span style={{ textTransform: 'capitalize' }}>{user.level}</span>
              </p>
            </div>

            {/* Actions for own profile */}
            {isMe && isAuthenticated() && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={openEditModal}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <PenIcon />
                  <span>Edit Profile</span>
                </button>
                <Link
                  to="/settings"
                  className="icon-btn"
                  aria-label="Settings"
                  style={{ width: '36px', height: '36px' }}
                >
                  <SettingsIcon />
                </Link>
              </div>
            )}

            {/* Actions for other users */}
            {!isMe && isAuthenticated() && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${isFollowing ? 'btn-ghost' : 'btn-accent'}`}
                   onClick={handleProfileFollow}
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
            <p
              className="prose"
              style={{
                marginTop: '12px',
                fontSize: '15.5px',
                lineHeight: 1.6,
                color: 'var(--ink-2)',
              }}
            >
              {user.bio}
            </p>
          )}

          {/* Website */}
          {user.website && (
            <p className="mono" style={{ marginTop: '8px', fontSize: '12px' }}>
              🔗{' '}
              <a
                href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                {user.website}
              </a>
            </p>
          )}

          {/* Interactive Profile statistics */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '16px',
              fontFamily: 'var(--mono)',
              fontSize: '13px',
              color: 'var(--muted)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span>
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{user.points}</strong> points
            </span>

            <span>
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{user.postsCount}</strong> posts
            </span>

            {/* Clickable Followers count */}
            <button
              type="button"
              onClick={() => setModalType('followers')}
              style={{
                color: 'var(--muted)',
                cursor: 'pointer',
                transition: 'color .12s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--muted)')}
            >
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{user.followersCount}</strong> followers
            </button>

            {/* Clickable Following count */}
            <button
              type="button"
              onClick={() => setModalType('following')}
              style={{
                color: 'var(--muted)',
                cursor: 'pointer',
                transition: 'color .12s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--muted)')}
            >
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{user.followingCount}</strong> following
            </button>
          </div>

          {/* Badges */}
          {user.badges && user.badges.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
              {user.badges.map((badge) => (
                <span key={badge} className="badge badge-level">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--rule)',
          marginBottom: '28px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          style={{
            padding: '10px 16px',
            fontFamily: 'var(--display)',
            fontSize: '14px',
            fontWeight: activeTab === 'posts' ? 600 : 500,
            color: activeTab === 'posts' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'posts' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all .12s ease',
          }}
        >
          Posts ({user.postsCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reposts')}
          style={{
            padding: '10px 16px',
            fontFamily: 'var(--display)',
            fontSize: '14px',
            fontWeight: activeTab === 'reposts' ? 600 : 500,
            color: activeTab === 'reposts' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'reposts' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all .12s ease',
          }}
        >
          Reposts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('likes')}
          style={{
            padding: '10px 16px',
            fontFamily: 'var(--display)',
            fontSize: '14px',
            fontWeight: activeTab === 'likes' ? 600 : 500,
            color: activeTab === 'likes' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'likes' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all .12s ease',
          }}
        >
          Likes
        </button>

        {/* Private Saved Posts / Bookmarks — only visible to account owner */}
        {isMe && (
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            style={{
              padding: '10px 16px',
              fontFamily: 'var(--display)',
              fontSize: '14px',
              fontWeight: activeTab === 'bookmarks' ? 600 : 500,
              color: activeTab === 'bookmarks' ? 'var(--accent)' : 'var(--muted)',
              borderBottom: activeTab === 'bookmarks' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              cursor: 'pointer',
              transition: 'all .12s ease',
            }}
          >
            Saved (Private)
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('media')}
          style={{
            padding: '10px 16px',
            fontFamily: 'var(--display)',
            fontSize: '14px',
            fontWeight: activeTab === 'media' ? 600 : 500,
            color: activeTab === 'media' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'media' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
            cursor: 'pointer',
            transition: 'all .12s ease',
          }}
        >
          Media &amp; Reels
        </button>
      </div>

      {/* Tab Content */}
      <section aria-label="Profile content list">
        {tabLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px 0' }}>
            <div className="skeleton" style={{ height: '80px', width: '100%' }} />
            <div className="skeleton" style={{ height: '80px', width: '100%' }} />
          </div>
        ) : postsToShow.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontFamily: 'var(--prose)', fontStyle: 'italic' }}>
              {activeTab === 'posts' && 'No published posts yet.'}
              {activeTab === 'reposts' && 'No reposts yet.'}
              {activeTab === 'likes' && 'No liked posts yet.'}
              {activeTab === 'bookmarks' && 'No saved posts yet. Bookmarks you save will appear here.'}
              {activeTab === 'media' && 'No media or reels published yet.'}
            </p>
          </div>
        ) : (
          <ol className="posts">
            {postsToShow.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </ol>
        )}
      </section>

      {/* Followers / Following Modal */}
      {modalType && (
        <div
          onClick={() => setModalType(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--rule)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: '17px', fontWeight: 600 }}>
                {modalType === 'followers' ? 'Followers' : 'Following'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                aria-label="Close modal"
                className="icon-btn"
                style={{ width: '32px', height: '32px' }}
              >
                <CloseIcon />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
              {modalLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
                  <div className="skeleton" style={{ height: '48px', width: '100%' }} />
                  <div className="skeleton" style={{ height: '48px', width: '100%' }} />
                </div>
              ) : !modalListData || modalListData.length === 0 ? (
                <p className="dim mono" style={{ textAlign: 'center', padding: '36px 0', fontSize: '13px' }}>
                  {modalType === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {modalListData.map((u) => {
                    const isSelf = currentUser?.username === u.username;

                    return (
                      <div
                        key={u._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <Link
                          to={`/u/${u.username}`}
                          onClick={() => setModalType(null)}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}
                        >
                          <img
                            src={
                              u.avatar ||
                              `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(u.username)}`
                            }
                            alt=""
                            className="avatar avatar-sm"
                            style={{ border: '1.5px solid var(--rule)' }}
                          />
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', display: 'flex', alignItems: 'center' }}>
                              {u.displayName || u.username}
                              {u.isVerified && <CheckBadgeIcon />}
                            </div>
                            <div className="dim mono" style={{ fontSize: '11px' }}>@{u.username}</div>
                            {u.bio && (
                              <p className="dim" style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                {u.bio}
                              </p>
                            )}
                          </div>
                        </Link>

                        {!isSelf && isAuthenticated() && (
                          <button
                            type="button"
                            className={`btn btn-sm ${u.isFollowing ? 'btn-ghost' : 'btn-accent'}`}
                            onClick={() => handleModalFollow(u.username)}
                            disabled={toggleModalFollowMutation.isPending}
                            style={{ padding: '0 12px', fontSize: '12px', height: '30px' }}
                          >
                            {u.isFollowing ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div
          onClick={() => setEditProfileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--rule)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Edit Profile</h3>
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                aria-label="Close modal"
                className="icon-btn"
                style={{ width: '32px', height: '32px' }}
              >
                <CloseIcon />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                editProfileMutation.mutate();
              }}
              style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              {/* Avatar controls */}
              <div className="field">
                <label>Profile Photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img
                    src={
                      removeAvatar
                        ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(user.username)}`
                        : avatarPreview || user.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(user.username)}`
                    }
                    alt=""
                    className="avatar avatar-lg"
                    style={{ border: '2px solid var(--rule)' }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer', width: 'fit-content' }}>
                      <span>Upload new photo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarSelect}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {(user.avatar || avatarFile) && !removeAvatar && (
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveAvatar(true);
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        style={{ fontSize: '12px', color: 'var(--error)', textAlign: 'left', cursor: 'pointer' }}
                      >
                        Restore default avatar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover Photo controls */}
              <div className="field">
                <label>Cover Banner (optional)</label>
                {coverPreview && (
                  <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: '100px', marginBottom: '8px' }}>
                    <img src={coverPreview} alt="Cover preview" style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer', width: 'fit-content' }}>
                    <span>{user.coverImage || coverFile ? 'Replace cover' : 'Upload cover'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleCoverSelect}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {(user.coverImage || coverFile) && !removeCover && (
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveCover(true);
                        setCoverFile(null);
                        setCoverPreview(null);
                      }}
                      style={{ fontSize: '12px', color: 'var(--error)', cursor: 'pointer' }}
                    >
                      Remove banner
                    </button>
                  )}
                </div>
              </div>

              {/* Display Name */}
              <div className="field">
                <label htmlFor="edit-displayname">Display Name</label>
                <input
                  id="edit-displayname"
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  maxLength={60}
                />
              </div>

              {/* Bio */}
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label htmlFor="edit-bio">Bio</label>
                  <span className="mono dim" style={{ fontSize: '11px' }}>{editBio.length}/280</span>
                </div>
                <textarea
                  id="edit-bio"
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={280}
                  placeholder="Tell the community about your engineering interests..."
                />
              </div>

              {/* Website */}
              <div className="field">
                <label htmlFor="edit-website">Website or GitHub link</label>
                <input
                  id="edit-website"
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://github.com/..."
                />
              </div>

              {/* Save & Cancel */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setEditProfileOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-accent"
                  disabled={editProfileMutation.isPending}
                >
                  {editProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
