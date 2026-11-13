import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Notification } from '@/types';
import { useSocketStore } from '@/store/socket';
import { CheckBadgeIcon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const resetUnread = useSocketStore((state) => state.resetUnread);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{
        data: {
          notifications: Notification[];
          total: number;
          unread: number;
        };
      }>('/notifications');
      return res.data.data;
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread ?? 0;

  // Mark all notifications as read on page visit or button click
  const markAllMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      resetUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const markSingleReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Automatically mark unread on load
  useEffect(() => {
    if (unreadCount > 0) {
      resetUnread();
    }
  }, [unreadCount, resetUnread]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like_post':
      case 'like_comment':
        return '❤️';
      case 'comment':
      case 'reply':
        return '💬';
      case 'follow':
        return '👤';
      case 'post_approved':
      case 'verification_approved':
        return '✨';
      case 'message':
        return '✉️';
      default:
        return '🔔';
    }
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '780px' }}>
      <PageBackButton fallback="/" />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <p className="eyebrow">{'// activity feed'}</p>
          <h1
            style={{
              fontFamily: 'var(--heading)',
              fontSize: '32px',
              fontWeight: 600,
              letterSpacing: '-.02em',
              color: 'var(--ink)',
              marginTop: '4px',
            }}
          >
            Notifications
          </h1>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
          <div className="skeleton" style={{ height: '64px', width: '100%' }} />
          <div className="skeleton" style={{ height: '64px', width: '100%' }} />
          <div className="skeleton" style={{ height: '64px', width: '100%' }} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <h3 style={{ fontFamily: 'var(--heading)' }}>No notifications yet</h3>
          <p>When other developers interact with your posts or follow you, you&apos;ll see alerts here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((n) => {
            const icon = getNotificationIcon(n.type);

            // Determine target link
            let linkTarget = '/';
            if (n.post?.slug) linkTarget = `/post/${n.post.slug}`;
            else if (n.sender?.username) linkTarget = `/u/${n.sender.username}`;
            else if (n.conversation) linkTarget = '/chat';

            return (
              <div
                key={n._id}
                onClick={() => {
                  if (!n.isRead) markSingleReadMutation.mutate(n._id);
                }}
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: n.isRead ? 'var(--surface)' : 'var(--accent-soft)',
                  border: n.isRead ? '1px solid var(--rule)' : '1.5px solid var(--accent)',
                  transition: 'background-color .15s ease',
                }}
              >
                <span style={{ fontSize: '20px' }}>{icon}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {n.sender && (
                      <Link
                        to={`/u/${n.sender.username}`}
                        style={{
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--ink)',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        {n.sender.displayName || n.sender.username}
                        {n.sender.isVerified && <CheckBadgeIcon />}
                      </Link>
                    )}

                    <Link
                      to={linkTarget}
                      style={{
                        fontSize: '14px',
                        color: 'var(--ink-2)',
                      }}
                    >
                      {n.message}
                    </Link>
                  </div>

                  <span className="dim mono" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {!n.isRead && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      flexShrink: 0,
                    }}
                    title="Unread notification"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
