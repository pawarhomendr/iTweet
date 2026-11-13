import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Post, Report, VerificationRequest } from '@/types';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';

type AdminTab = 'pending' | 'reports' | 'verification' | 'stats';
type ReviewStatus = 'published' | 'rejected';
type VerificationStatus = 'approved' | 'rejected';
type ReportStatus = 'resolved' | 'dismissed';

interface AdminStats {
  users: number;
  posts: number;
  pendingPosts: number;
  openReports: number;
  feedbackUnread: number;
}

interface AdminErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const TABS: Array<{ id: AdminTab; label: string; description: string }> = [
  { id: 'pending', label: 'Pending posts', description: 'Review submissions awaiting publication.' },
  { id: 'reports', label: 'Open reports', description: 'Resolve reports raised by the community.' },
  { id: 'verification', label: 'Verification', description: 'Review creator verification applications.' },
  { id: 'stats', label: 'Overview', description: 'Monitor the current platform snapshot.' },
];

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const response = (error as AdminErrorResponse).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const response = (error as AdminErrorResponse).response;
  return response?.data?.message;
}

function formatDate(value: string | undefined): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
}

function formatLabel(value: string | undefined): string {
  return (value || 'unspecified').replace(/_/g, ' ');
}

function AccessNotice({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action: React.ReactNode;
}) {
  return (
    <div className="shell page-content admin-page">
      <PageBackButton fallback="/" />
      <section className="admin-access card" role="alert" aria-labelledby="admin-access-title">
        <span className="admin-access-mark" aria-hidden="true">!</span>
        <p className="eyebrow">{'// administration'}</p>
        <h1 id="admin-access-title">{title}</h1>
        <p className="dim">{message}</p>
        {action}
      </section>
    </div>
  );
}

function AdminQueryError({
  resource,
  error,
  onRetry,
}: {
  resource: string;
  error: unknown;
  onRetry: () => void;
}) {
  const status = getErrorStatus(error);

  if (status === 401) {
    return (
      <div className="admin-state admin-state-error" role="alert">
        <strong>Your admin session has expired.</strong>
        <p>Sign in again to continue managing the platform.</p>
        <Link to="/login" className="btn btn-sm btn-accent">Sign in again</Link>
      </div>
    );
  }

  if (status === 403) {
    return (
      <div className="admin-state admin-state-error" role="alert">
        <strong>Access denied for this section.</strong>
        <p>Your current account does not have the required moderator or administrator permission.</p>
        <Link to="/" className="btn btn-sm btn-ghost">Return to feed</Link>
      </div>
    );
  }

  return (
    <div className="admin-state admin-state-error" role="alert">
      <strong>Unable to load {resource}.</strong>
      <p>{getErrorMessage(error) || 'The server did not return this section. You can try again.'}</p>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>Try again</button>
    </div>
  );
}

function AdminLoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="admin-loading" aria-label="Loading" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <div className="admin-loading-row" key={index}>
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton admin-loading-action" />
        </div>
      ))}
    </div>
  );
}

function AdminEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="admin-state admin-state-empty">
      <span className="admin-empty-mark" aria-hidden="true">✓</span>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | '—'; tone: 'accent' | 'success' | 'warning' | 'error' }) {
  return (
    <article className="admin-stat card">
      <div className={`admin-stat-dot admin-stat-dot-${tone}`} aria-hidden="true" />
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

export const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isMod = useAuthStore((state) => state.isMod);
  const [tab, setTab] = useState<AdminTab>('pending');

  const isAuthorized = Boolean(currentUser && isAuthenticated() && isMod());

  const statsQuery = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    enabled: isAuthorized,
    retry: false,
    queryFn: async () => {
      const res = await api.get<{ data: AdminStats }>('/admin/stats');
      return res.data.data;
    },
  });

  const pendingPostsQuery = useQuery<Post[]>({
    queryKey: ['admin-pending-posts'],
    enabled: isAuthorized && tab === 'pending',
    retry: false,
    queryFn: async () => {
      const res = await api.get<{ data: { posts: Post[] } }>('/admin/posts/pending');
      return res.data.data.posts;
    },
  });

  const reportsQuery = useQuery<Report[]>({
    queryKey: ['admin-reports'],
    enabled: isAuthorized && tab === 'reports',
    retry: false,
    queryFn: async () => {
      const res = await api.get<{ data: { reports: Report[] } }>('/reports?status=open');
      return res.data.data.reports;
    },
  });

  const verificationsQuery = useQuery<VerificationRequest[]>({
    queryKey: ['admin-verifications'],
    enabled: isAuthorized && tab === 'verification',
    retry: false,
    queryFn: async () => {
      const res = await api.get<{ data: { requests: VerificationRequest[] } }>('/verification');
      return res.data.data.requests;
    },
  });

  const reviewPostMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: ReviewStatus; reason?: string }) => {
      return api.patch(`/admin/posts/${id}/review`, { status, rejectionReason: reason });
    },
    onSuccess: () => {
      toast.success('Post reviewed successfully');
      void queryClient.invalidateQueries({ queryKey: ['admin-pending-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(getErrorMessage(error) || 'Unable to review this post'),
  });

  const reviewVerificationMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: VerificationStatus; note?: string }) => {
      return api.patch(`/verification/${id}`, { status, reviewNote: note });
    },
    onSuccess: () => {
      toast.success('Verification updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
    },
    onError: (error) => toast.error(getErrorMessage(error) || 'Unable to update verification'),
  });

  const reviewReportMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReportStatus }) => {
      return api.patch(`/reports/${id}`, { status });
    },
    onSuccess: () => {
      toast.success('Report reviewed successfully');
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(getErrorMessage(error) || 'Unable to review this report'),
  });

  if (!currentUser) {
    return (
      <AccessNotice
        title="Sign in to continue"
        message="Administrator tools require an authenticated moderator or administrator session."
        action={<Link to="/login" className="btn btn-sm btn-accent">Sign in</Link>}
      />
    );
  }

  if (!isAuthenticated()) {
    return (
      <AccessNotice
        title="Your session has expired"
        message="Sign in again to access platform moderation tools."
        action={<Link to="/login" className="btn btn-sm btn-accent">Sign in again</Link>}
      />
    );
  }

  if (!isMod()) {
    return (
      <AccessNotice
        title="Admin access required"
        message="This workspace is limited to moderators and administrators. No restricted dashboard data was requested."
        action={<Link to="/" className="btn btn-sm btn-ghost">Return to feed</Link>}
      />
    );
  }

  const stats = statsQuery.data;
  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0];
  const statsErrorStatus = statsQuery.isError ? getErrorStatus(statsQuery.error) : undefined;
  const shouldShowSectionError = (error: unknown) => {
    const sectionStatus = getErrorStatus(error);
    return !(sectionStatus && sectionStatus === statsErrorStatus && (sectionStatus === 401 || sectionStatus === 403));
  };

  return (
    <div className="shell page-content admin-page">
      <PageBackButton fallback="/" />

      <header className="admin-hero">
        <div>
          <p className="eyebrow">{'// moderation & administration'}</p>
          <h1>Platform control room</h1>
          <p className="dim">Review community activity, resolve reports, and keep Indiagram healthy.</p>
        </div>
        <span className="admin-role-badge">{currentUser.role === 'admin' ? 'Administrator' : 'Moderator'}</span>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar card" aria-label="Admin sections">
          <div className="admin-sidebar-heading">
            <span className="eyebrow">Workspace</span>
            <span className="badge badge-level">Protected</span>
          </div>
          <nav className="admin-nav" aria-label="Moderation sections">
            {TABS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={tab === item.id ? 'admin-nav-item is-active' : 'admin-nav-item'}
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
              >
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                {item.id === 'pending' && <b>{stats?.pendingPosts ?? '—'}</b>}
                {item.id === 'reports' && <b>{stats?.openReports ?? '—'}</b>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-main">
          <section aria-labelledby="admin-summary-title">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">{'// live snapshot'}</p>
                <h2 id="admin-summary-title">Platform overview</h2>
              </div>
              {statsQuery.isFetching && !statsQuery.isLoading && <span className="mono dim">Refreshing…</span>}
            </div>

            {statsQuery.isLoading ? (
              <div className="admin-stat-grid" data-testid="admin-stats-loading">
                {[1, 2, 3, 4].map((item) => <div className="admin-stat card admin-stat-skeleton" key={item}><span className="skeleton" /><span className="skeleton" /></div>)}
              </div>
            ) : statsQuery.isError ? (
              <AdminQueryError resource="dashboard statistics" error={statsQuery.error} onRetry={() => { void statsQuery.refetch(); }} />
            ) : (
              <div className="admin-stat-grid">
                <StatCard label="Members" value={stats?.users ?? '—'} tone="accent" />
                <StatCard label="Published posts" value={stats?.posts ?? '—'} tone="success" />
                <StatCard label="Pending review" value={stats?.pendingPosts ?? '—'} tone="warning" />
                <StatCard label="Open reports" value={stats?.openReports ?? '—'} tone="error" />
              </div>
            )}
          </section>

          <section className="admin-queue" aria-labelledby="admin-section-title">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">{'// '}{tab === 'stats' ? 'platform signals' : 'queue'}</p>
                <h2 id="admin-section-title">{activeTab.label}</h2>
                <p className="dim">{activeTab.description}</p>
              </div>
              <span className="admin-section-index">{String(TABS.findIndex((item) => item.id === tab) + 1).padStart(2, '0')}</span>
            </div>

            {tab === 'pending' && (
              pendingPostsQuery.isLoading ? <AdminLoadingState /> : pendingPostsQuery.isError ? (
                shouldShowSectionError(pendingPostsQuery.error) ? <AdminQueryError resource="pending posts" error={pendingPostsQuery.error} onRetry={() => { void pendingPostsQuery.refetch(); }} /> : null
              ) : pendingPostsQuery.data?.length === 0 ? (
                <AdminEmptyState title="Queue is clear" message="No posts are currently awaiting moderation review." />
              ) : (
                <div className="admin-record-list">
                  {pendingPostsQuery.data?.map((post) => (
                    <article className="admin-record card" key={post._id}>
                      <div className="admin-record-topline">
                        <div>
                          <span className="badge">{formatLabel(post.category)}</span>
                          <span className="admin-status admin-status-pending">Pending</span>
                        </div>
                        <span className="mono dim">{formatDate(post.createdAt)}</span>
                      </div>
                      <h3>{post.title}</h3>
                      <p className="mono dim">By @{post.author?.username ?? 'deleted user'}</p>
                      <p className="admin-record-copy">{post.excerpt || (post.body || '').slice(0, 240)}{post.excerpt || post.body ? '…' : ''}</p>
                      <div className="admin-record-actions">
                        <button type="button" className="btn btn-sm btn-accent" onClick={() => reviewPostMutation.mutate({ id: post._id, status: 'published' })} disabled={reviewPostMutation.isPending}>
                          Approve &amp; Award Points
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => { const reason = window.prompt('Rejection reason:') || 'Content guidelines'; reviewPostMutation.mutate({ id: post._id, status: 'rejected', reason }); }} disabled={reviewPostMutation.isPending}>
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )
            )}

            {tab === 'reports' && (
              reportsQuery.isLoading ? <AdminLoadingState /> : reportsQuery.isError ? (
                shouldShowSectionError(reportsQuery.error) ? <AdminQueryError resource="open reports" error={reportsQuery.error} onRetry={() => { void reportsQuery.refetch(); }} /> : null
              ) : reportsQuery.data?.length === 0 ? (
                <AdminEmptyState title="No open reports" message="The community has no unresolved reports right now." />
              ) : (
                <div className="admin-record-list">
                  {reportsQuery.data?.map((report) => (
                    <article className="admin-record card" key={report._id}>
                      <div className="admin-record-topline">
                        <div>
                          <span className="badge">{formatLabel(report.targetType)}</span>
                          <span className="admin-status admin-status-open">Open</span>
                        </div>
                        <span className="mono dim">{formatDate(report.createdAt)}</span>
                      </div>
                      <h3>{formatLabel(report.reason)}</h3>
                      <p className="mono dim">Reported by @{report.reporter?.username ?? 'unknown'}</p>
                      <p className="admin-record-copy">{report.details || 'No additional details provided.'}</p>
                      <p className="mono dim admin-target">Target: {report.target}</p>
                      <div className="admin-record-actions">
                        <button type="button" className="btn btn-sm btn-accent" onClick={() => reviewReportMutation.mutate({ id: report._id, status: 'resolved' })} disabled={reviewReportMutation.isPending}>Resolve</button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => reviewReportMutation.mutate({ id: report._id, status: 'dismissed' })} disabled={reviewReportMutation.isPending}>Dismiss</button>
                      </div>
                    </article>
                  ))}
                </div>
              )
            )}

            {tab === 'verification' && (
              verificationsQuery.isLoading ? <AdminLoadingState /> : verificationsQuery.isError ? (
                shouldShowSectionError(verificationsQuery.error) ? <AdminQueryError resource="verification requests" error={verificationsQuery.error} onRetry={() => { void verificationsQuery.refetch(); }} /> : null
              ) : verificationsQuery.data?.length === 0 ? (
                <AdminEmptyState title="No pending applications" message="There are no creator verification requests waiting for review." />
              ) : (
                <div className="admin-record-list">
                  {verificationsQuery.data?.map((request) => (
                    <article className="admin-record card" key={request._id}>
                      <div className="admin-record-topline">
                        <div>
                          <span className="badge">Creator review</span>
                          <span className="admin-status admin-status-pending">Pending</span>
                        </div>
                        <span className="mono dim">{formatDate(request.createdAt)}</span>
                      </div>
                      <h3>@{request.user?.username ?? 'unavailable user'}</h3>
                      <p className="mono dim">{request.postsCount} published posts · {request.followersCount} followers</p>
                      <blockquote className="admin-statement">“{request.statement}”</blockquote>
                      <div className="admin-record-actions">
                        <button type="button" className="btn btn-sm btn-accent" onClick={() => reviewVerificationMutation.mutate({ id: request._id, status: 'approved' })} disabled={reviewVerificationMutation.isPending}>Grant Blue Tick</button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => { const note = window.prompt('Rejection note:') || 'Did not meet criteria'; reviewVerificationMutation.mutate({ id: request._id, status: 'rejected', note }); }} disabled={reviewVerificationMutation.isPending}>Decline</button>
                      </div>
                    </article>
                  ))}
                </div>
              )
            )}

            {tab === 'stats' && (
              statsQuery.isLoading ? <AdminLoadingState rows={2} /> : statsQuery.isError ? (
                <AdminQueryError resource="platform signals" error={statsQuery.error} onRetry={() => { void statsQuery.refetch(); }} />
              ) : (
                <div className="admin-signal-list">
                  <div><span className="mono dim">Unread feedback</span><strong>{stats?.feedbackUnread ?? '—'}</strong></div>
                  <div><span className="mono dim">Moderation queue</span><strong>{stats?.pendingPosts ?? '—'}</strong></div>
                  <div><span className="mono dim">Community reports</span><strong>{stats?.openReports ?? '—'}</strong></div>
                </div>
              )
            )}
          </section>
        </main>
      </div>
    </div>
  );
};
