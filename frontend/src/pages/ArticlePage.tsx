import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Post, Comment } from '@/types';
import { useAuthStore } from '@/store/auth';
import { HeartIcon, BookmarkIcon, CheckBadgeIcon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

export const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');

  // Fetch article
  const { data, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const res = await api.get<{ data: { post: Post; liked: boolean; bookmarked: boolean } }>(`/posts/${slug}`);
      return res.data.data;
    },
  });

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['comments', data?.post?._id],
    queryFn: async () => {
      const res = await api.get<{ data: { comments: Comment[] } }>(`/posts/${data!.post._id}/comments`);
      return res.data.data;
    },
    enabled: !!data?.post?._id,
  });

  // Toggle like
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated()) {
        toast.error('Please log in to like');
        return;
      }
      return api.post(`/posts/${data!.post._id}/like`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', slug] }),
  });

  // Toggle bookmark
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated()) {
        toast.error('Please log in to bookmark');
        return;
      }
      return api.post(`/posts/${data!.post._id}/bookmark`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', slug] }),
  });

  // Submit comment
  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      return api.post(`/posts/${data!.post._id}/comments`, { text });
    },
    onSuccess: () => {
      setCommentText('');
      toast.success('Comment posted (+5 points)');
      queryClient.invalidateQueries({ queryKey: ['comments', data?.post?._id] });
      queryClient.invalidateQueries({ queryKey: ['post', slug] });
    },
  });

  // Submit report
  const reportMutation = useMutation({
    mutationFn: async () => {
      return api.post('/reports', {
        targetType: 'post',
        target: data!.post._id,
        reason: reportReason,
      });
    },
    onSuccess: () => {
      setReportOpen(false);
      toast.success('Report submitted to moderators');
    },
    onError: () => toast.error('Already reported or error occurred'),
  });

  if (isLoading) {
    return (
      <div className="shell page-content">
        <div className="skeleton" style={{ height: '40px', width: '70%', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '300px', width: '100%' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="shell page-content empty-state">
        <h2>Post not found</h2>
        <p>This post might have been removed or is pending approval.</p>
        <Link to="/" className="btn btn-sm" style={{ marginTop: '20px' }}>Back to feed</Link>
      </div>
    );
  }

  const { post, liked, bookmarked } = data;
  const comments = commentsData?.comments ?? [];

  return (
    <article className="shell page-content" style={{ maxWidth: '780px' }}>
      {/* Category & Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', fontFamily: 'var(--mono)', fontSize: '12px' }}>
        <span className="badge">{post.category}</span>
        <span className="dim">·</span>
        <span className="dim">{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
        <span className="dim">·</span>
        <span className="dim">{post.readMinutes} min read</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: 'clamp(32px, 5vw, 44px)', letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: '20px' }}>
        {post.title}
      </h1>

      {/* Author Card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', marginBottom: '32px' }}>
        <Link to={`/u/${post.author.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={post.author.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${post.author.username}`}
            alt={post.author.username}
            className="avatar avatar-md"
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>
              {post.author.displayName || post.author.username}
              {post.author.isVerified && <CheckBadgeIcon />}
            </div>
            <div className="dim mono" style={{ fontSize: '12px' }}>@{post.author.username} · {post.author.level}</div>
          </div>
        </Link>

        {/* Actions: Like, Bookmark, Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="icon-btn" onClick={() => likeMutation.mutate()} aria-label="Like post">
            <HeartIcon filled={liked} />
          </button>
          <span className="mono dim" style={{ fontSize: '12px' }}>{post.likesCount}</span>

          <button className="icon-btn" onClick={() => bookmarkMutation.mutate()} aria-label="Bookmark post">
            <BookmarkIcon filled={bookmarked} />
          </button>

          <button className="icon-btn" onClick={() => setReportOpen(!reportOpen)} aria-label="Report post">
            <span style={{ fontSize: '14px' }}>⚑</span>
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '8px' }}>Report this post</h4>
          <div className="field" style={{ marginBottom: '12px' }}>
            <label>Reason</label>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
              <option value="spam">Spam / Advertising</option>
              <option value="harassment">Harassment</option>
              <option value="misinformation">Misinformation</option>
              <option value="hate_speech">Hate Speech</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-danger" onClick={() => reportMutation.mutate()}>Submit Report</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setReportOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Cover Image */}
      {post.coverImage && (
        <img
          src={post.coverImage}
          alt={post.title}
          style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: '32px' }}
        />
      )}

      {/* Article Body */}
      <div className="article-body" dangerouslySetInnerHTML={{ __html: post.body }} />

      {/* Image Gallery */}
      {post.images && post.images.length > 0 && (
        <div style={{ marginTop: '36px' }}>
          <p className="eyebrow">// gallery</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {post.images.map((img, i) => (
              <img key={i} src={img} alt={`Gallery ${i}`} style={{ borderRadius: 'var(--radius-sm)', width: '100%', height: '180px', objectFit: 'cover' }} />
            ))}
          </div>
        </div>
      )}

      {/* Source Link */}
      {post.sourceUrl && (
        <p className="mono" style={{ marginTop: '32px', fontSize: '13px' }}>
          Source: <a href={post.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{post.sourceUrl}</a>
        </p>
      )}

      {/* Tags */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {post.tags.map((t) => (
          <span key={t} className="chip">#{t}</span>
        ))}
      </div>

      <hr className="divider" style={{ margin: '48px 0' }} />

      {/* Comments Section */}
      <section>
        <h3 style={{ fontSize: '22px', marginBottom: '20px' }}>Discussion ({comments.length})</h3>

        {/* Comment Input */}
        {isAuthenticated() ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (commentText.trim()) commentMutation.mutate(commentText);
            }}
            style={{ marginBottom: '32px' }}
          >
            <div className="field">
              <textarea
                placeholder="Leave a thoughtful response..."
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-sm btn-accent"
              style={{ marginTop: '10px' }}
              disabled={commentMutation.isPending || !commentText.trim()}
            >
              Post comment
            </button>
          </form>
        ) : (
          <p className="mono dim" style={{ marginBottom: '24px' }}>
            <Link to="/login" style={{ color: 'var(--accent)' }}>Log in</Link> to join the discussion.
          </p>
        )}

        {/* Comment List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {comments.map((c) => (
            <div key={c._id} style={{ display: 'flex', gap: '14px' }}>
              <img
                src={c.author.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.author.username}`}
                alt={c.author.username}
                className="avatar avatar-sm"
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Link to={`/u/${c.author.username}`} style={{ fontWeight: 600, fontSize: '14px' }}>
                    {c.author.displayName || c.author.username}
                    {c.author.isVerified && <CheckBadgeIcon />}
                  </Link>
                  <span className="dim mono" style={{ fontSize: '11px' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--prose)', fontSize: '16px', color: 'var(--ink-2)' }}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
};
