import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Post, Report, VerificationRequest } from '@/types';
import toast from 'react-hot-toast';

export const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'reports' | 'verification' | 'stats'>('pending');

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: any }>('/admin/stats');
      return res.data.data;
    },
  });

  // Pending Posts
  const { data: pendingPosts } = useQuery({
    queryKey: ['admin-pending-posts'],
    queryFn: async () => {
      const res = await api.get<{ data: { posts: Post[] } }>('/admin/posts/pending');
      return res.data.data.posts;
    },
    enabled: tab === 'pending',
  });

  // Open Reports
  const { data: reports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const res = await api.get<{ data: { reports: Report[] } }>('/reports?status=open');
      return res.data.data.reports;
    },
    enabled: tab === 'reports',
  });

  // Verification Requests
  const { data: verifications } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: async () => {
      const res = await api.get<{ data: { requests: VerificationRequest[] } }>('/verification');
      return res.data.data.requests;
    },
    enabled: tab === 'verification',
  });

  // Review post mutation
  const reviewPostMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'published' | 'rejected'; reason?: string }) => {
      return api.patch(`/admin/posts/${id}/review`, { status, rejectionReason: reason });
    },
    onSuccess: () => {
      toast.success('Post reviewed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-posts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  // Review verification mutation
  const reviewVerificationMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: 'approved' | 'rejected'; note?: string }) => {
      return api.patch(`/verification/${id}`, { status, reviewNote: note });
    },
    onSuccess: () => {
      toast.success('Verification updated');
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
    },
  });

  // Resolve or dismiss a user report
  const reviewReportMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'resolved' | 'dismissed' }) => {
      return api.patch(`/reports/${id}`, { status });
    },
    onSuccess: () => {
      toast.success('Report reviewed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <div className="shell page-content">
      <p className="eyebrow">// moderation &amp; administration</p>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Platform Moderation</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        <button className={`chip ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Pending Posts ({stats?.pendingPosts ?? 0})
        </button>
        <button className={`chip ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          Reports ({stats?.openReports ?? 0})
        </button>
        <button className={`chip ${tab === 'verification' ? 'active' : ''}`} onClick={() => setTab('verification')}>
          Verification Requests
        </button>
        <button className={`chip ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          Overview Stats
        </button>
      </div>

      {/* Pending posts */}
      {tab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(pendingPosts ?? []).length === 0 ? (
            <p className="dim mono">No posts currently awaiting moderation.</p>
          ) : (
            pendingPosts?.map((p) => (
              <div key={p._id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge">{p.category}</span>
                    <h3 style={{ fontSize: '20px', marginTop: '6px' }}>{p.title}</h3>
                    <p className="dim mono" style={{ fontSize: '12px', marginTop: '4px' }}>
                      By @{p.author.username} · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-sm btn-accent"
                      onClick={() => reviewPostMutation.mutate({ id: p._id, status: 'published' })}
                    >
                      Approve &amp; Award Points
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        const reason = prompt('Rejection reason:') || 'Content guidelines';
                        reviewPostMutation.mutate({ id: p._id, status: 'rejected', reason });
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <p style={{ marginTop: '12px', fontFamily: 'var(--prose)', fontSize: '15px' }}>{p.excerpt || p.body.slice(0, 200)}...</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Open reports */}
      {tab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(reports ?? []).length === 0 ? (
            <p className="dim mono">No open reports.</p>
          ) : (
            reports?.map((report) => (
              <div key={report._id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <span className="badge">{report.targetType}</span>
                    <h3 style={{ marginTop: '8px' }}>{report.reason.replace(/_/g, ' ')}</h3>
                    <p className="dim mono" style={{ fontSize: '12px' }}>
                      Reported by @{report.reporter?.username ?? 'unknown'} � {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                    <p style={{ marginTop: '8px' }}>{report.details || 'No additional details provided.'}</p>
                    <p className="dim mono" style={{ marginTop: '8px', fontSize: '12px' }}>Target ID: {report.target}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <button
                      className="btn btn-sm btn-accent"
                      disabled={reviewReportMutation.isPending}
                      onClick={() => reviewReportMutation.mutate({ id: report._id, status: 'resolved' })}
                    >
                      Resolve
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={reviewReportMutation.isPending}
                      onClick={() => reviewReportMutation.mutate({ id: report._id, status: 'dismissed' })}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Verification requests */}
      {tab === 'verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(verifications ?? []).length === 0 ? (
            <p className="dim mono">No pending verification requests.</p>
          ) : (
            verifications?.map((v) => (
              <div key={v._id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <h4>@{v.user.username}</h4>
                    <p className="dim mono" style={{ fontSize: '12px' }}>
                      {v.postsCount} posts · {v.followersCount} followers
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-sm btn-accent"
                      onClick={() => reviewVerificationMutation.mutate({ id: v._id, status: 'approved' })}
                    >
                      Grant Blue Tick
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        const note = prompt('Rejection note:') || 'Did not meet criteria';
                        reviewVerificationMutation.mutate({ id: v._id, status: 'rejected', note });
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
                <p style={{ marginTop: '12px', fontSize: '14px' }}>"{v.statement}"</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Stats tab */}
      {tab === 'stats' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <p className="eyebrow">// members</p>
            <h2 style={{ fontSize: '32px', color: 'var(--accent)' }}>{stats.users}</h2>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <p className="eyebrow">// published posts</p>
            <h2 style={{ fontSize: '32px', color: 'var(--c-str)' }}>{stats.posts}</h2>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <p className="eyebrow">// pending review</p>
            <h2 style={{ fontSize: '32px', color: 'var(--c-fn)' }}>{stats.pendingPosts}</h2>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <p className="eyebrow">// open reports</p>
            <h2 style={{ fontSize: '32px', color: 'var(--error)' }}>{stats.openReports}</h2>
          </div>
        </div>
      )}
    </div>
  );
};


