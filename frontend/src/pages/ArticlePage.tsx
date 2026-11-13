import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Post, Comment } from '@/types';
import { useAuthStore } from '@/store/auth';
import { HeartIcon, BookmarkIcon, CheckBadgeIcon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';
import { isSafeHttpUrl } from '@/lib/validation';
import { normalizeAuthor } from '@/lib/safeAuthor';

export const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
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
        toast.error('Please log in to like this post');
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
        toast.error('Please log in to bookmark this post');
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
      <div className="shell page-content" style={{ maxWidth: '720px' }}>
        <div className="skeleton" style={{ height: '24px', width: '30%', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '48px', width: '90%', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '200px', width: '100%', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '300px', width: '100%' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="shell page-content empty-state">
        <h2 style={{ fontFamily: 'var(--heading)', fontSize: '28px', color: 'var(--ink)' }}>Post not found</h2>
        <p style={{ marginTop: '8px' }}>This post might have been removed or is pending approval.</p>
        <Link to="/" className="btn btn-sm btn-ghost" style={{ marginTop: '24px' }}>
          Back to feed
        </Link>
      </div>
    );
  }

  const { post, liked, bookmarked } = data;
  const comments = commentsData?.comments ?? [];
  const safeSourceUrl = isSafeHttpUrl(post.sourceUrl) ? post.sourceUrl.trim() : null;
  const author = normalizeAuthor(post.author);

  return (
    <article className="shell page-content" style={{ maxWidth: '720px' }}>
      <PageBackButton fallback="/" />
      {/* Category & Date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          color: 'var(--muted)',
        }}
      >
        <span className="badge">{post.category}</span>
        <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
        <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
        <span>{post.readMinutes} min read</span>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: 'var(--editorial)',
          fontSize: 'clamp(30px, 5vw, 46px)',
          fontWeight: 600,
          letterSpacing: '-.025em',
          lineHeight: 1.18,
          marginBottom: '28px',
          color: 'var(--ink)',
        }}
      >
        {post.title}
      </h1>

      {/* Author Byline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          borderTop: '1px solid var(--rule)',
          borderBottom: '1px solid var(--rule)',
          marginBottom: '36px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {author ? (
          <Link
            to={`/u/${author.username}`}
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <img
              src={
                author.avatar ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(author.username)}`
              }
              alt=""
              aria-hidden="true"
              className="avatar avatar-md"
              style={{ border: '2px solid var(--rule)' }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center' }}>
                {author.displayName || author.username}
                {author.isVerified && <CheckBadgeIcon />}
              </div>
              <div className="dim mono" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                @{author.username}{author.level && <> · <span style={{ textTransform: 'capitalize' }}>{author.level}</span></>}
              </div>
            </div>
          </Link>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--muted)' }}>
            <div className="avatar avatar-md" aria-hidden="true" style={{ border: '2px solid var(--rule)' }} />
            <span style={{ fontWeight: 500 }}>Deleted user</span>
          </div>
        )}

        {/* Action bar: Like, Bookmark, Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="icon-btn"
            onClick={() => likeMutation.mutate()}
            aria-label={liked ? 'Unlike post' : 'Like post'}
            style={liked ? { color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined}
          >
            <HeartIcon filled={liked} />
          </button>
          <span className="mono dim" style={{ fontSize: '12px', minWidth: '20px' }}>
            {post.likesCount}
          </span>

          <button
            className="icon-btn"
            onClick={() => bookmarkMutation.mutate()}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
            style={bookmarked ? { color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined}
          >
            <BookmarkIcon filled={bookmarked} />
          </button>

          <button
            className="icon-btn"
            onClick={() => setReportOpen(!reportOpen)}
            aria-label="Report this post"
            aria-expanded={reportOpen}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>⚑</span>
          </button>
        </div>
      </div>

      {/* Report Form */}
      {reportOpen && (
        <div
          className="card"
          style={{
            padding: '20px',
            marginBottom: '32px',
            background: 'var(--surface-2)',
            border: '1.5px solid var(--rule)',
          }}
        >
          <h4 style={{ marginBottom: '10px', fontSize: '15px' }}>Report this post</h4>
          <div className="field" style={{ marginBottom: '14px' }}>
            <label htmlFor="report-reason">Reason for report</label>
            <select
              id="report-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            >
              <option value="spam">Spam or unwanted advertising</option>
              <option value="harassment">Harassment or personal attack</option>
              <option value="misinformation">Misleading technical information</option>
              <option value="hate_speech">Hate speech or abusive content</option>
              <option value="other">Other reason</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setReportOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cover Image */}
      {post.coverImage && (
        <figure style={{ margin: '0 0 36px 0' }}>
          <img
            src={post.coverImage}
            alt={post.title}
            style={{
              width: '100%',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--rule)',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
        </figure>
      )}

      {/* Article Body */}
      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: post.body }}
      />

      {/* Image Gallery */}
      {post.images && post.images.length > 0 && (
        <section style={{ marginTop: '40px' }} aria-label="Attached images">
          <p className="eyebrow">{'// gallery'}</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginTop: '12px',
            }}
          >
            {post.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Post attachment ${i + 1}`}
                style={{
                  borderRadius: 'var(--radius-sm)',
                  width: '100%',
                  height: '190px',
                  objectFit: 'cover',
                  border: '1px solid var(--rule)',
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Source Link */}
      {safeSourceUrl && (
        <p className="mono" style={{ marginTop: '36px', fontSize: '13px' }}>
          <span style={{ color: 'var(--muted)' }}>Source: </span>
          <a
            href={safeSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            {safeSourceUrl}
          </a>
        </p>
      )}

      {/* Tags */}
      <div
        style={{
          marginTop: '28px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)' }}>Tags:</span>
        {post.tags.map((t) => (
          <span key={t} className="chip">#{t}</span>
        ))}
      </div>

      <hr className="divider" style={{ margin: '52px 0 44px' }} />

      {/* Comments Section */}
      <section aria-label="Discussion">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--heading)', fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>
            Discussion
          </h2>
          <span className="mono dim" style={{ fontSize: '13px' }}>
            {comments.length} {comments.length === 1 ? 'response' : 'responses'}
          </span>
        </div>

        {/* Comment Input */}
        {isAuthenticated() ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (commentText.trim()) commentMutation.mutate(commentText);
            }}
            style={{ marginBottom: '36px' }}
          >
            <div className="field">
              <textarea
                placeholder="Share your thoughts, benchmarks, or feedback..."
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                aria-label="Write a comment"
              />
            </div>
            <button
              type="submit"
              className="btn btn-sm btn-accent"
              style={{ marginTop: '12px' }}
              disabled={commentMutation.isPending || !commentText.trim()}
            >
              {commentMutation.isPending ? 'Posting...' : 'Post comment (+5 pts)'}
            </button>
          </form>
        ) : (
          <div
            className="card"
            style={{
              padding: '20px',
              textAlign: 'center',
              marginBottom: '32px',
              background: 'var(--surface-2)',
            }}
          >
            <p className="dim mono" style={{ fontSize: '13px' }}>
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                Sign in
              </Link>{' '}
              to join the discussion and earn points.
            </p>
          </div>
        )}

        {/* Comment List */}
        {comments.length === 0 ? (
          <p className="dim" style={{ fontFamily: 'var(--prose)', fontStyle: 'italic', padding: '16px 0' }}>
            No responses yet. Be the first to share your perspective.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {comments.map((c) => (
              <div
                key={c._id}
                style={{
                  display: 'flex',
                  gap: '14px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid var(--rule-2)',
                }}
              >
                {(() => {
                  const commentAuthor = normalizeAuthor(c.author);
                  return commentAuthor ? (
                    <img
                      src={
                        commentAuthor.avatar ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(commentAuthor.username)}`
                      }
                      alt=""
                      aria-hidden="true"
                      className="avatar avatar-sm"
                      style={{ border: '1.5px solid var(--rule)' }}
                    />
                  ) : (
                    <div className="avatar avatar-sm" aria-hidden="true" style={{ border: '1.5px solid var(--rule)' }} />
                  );
                })()}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {(() => {
                      const commentAuthor = normalizeAuthor(c.author);
                      return commentAuthor ? (
                        <Link
                          to={`/u/${commentAuthor.username}`}
                          style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)' }}
                        >
                          {commentAuthor.displayName || commentAuthor.username}
                          {commentAuthor.isVerified && <CheckBadgeIcon />}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--muted)' }}>
                          Deleted user
                        </span>
                      );
                    })()}
                    <span className="dim mono" style={{ fontSize: '11px' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--prose)', fontSize: '15.5px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
                    {c.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </article>
  );
};
