import React from 'react';
import { Link } from 'react-router-dom';
import type { Post } from '@/types';
import { CheckBadgeIcon } from '@/components/ui/Icons';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface PostCardProps {
  post: Post;
  isLatest?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ post, isLatest }) => {
  const d = new Date(post.publishedAt || post.createdAt);
  const mo = MONTHS[d.getMonth()];
  const yr = d.getFullYear();

  return (
    <li className="post" style={{ borderTop: '1px solid var(--rule-2)' }}>
      <Link
        to={`/post/${post.slug}`}
        className="post-link"
        style={{
          display: 'grid',
          gridTemplateColumns: '78px 1fr 30px',
          gap: '22px',
          alignItems: 'start',
          padding: '26px 0',
          position: 'relative',
        }}
      >
        {/* Date gutter */}
        <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--mono)', fontSize: '11.5px', lineHeight: 1.5, paddingTop: '5px' }}>
          <span style={{ color: 'var(--ink-2)', letterSpacing: '.08em' }}>{mo}</span>
          <span style={{ color: 'var(--muted)' }}>{yr}</span>
        </div>

        {/* Post body */}
        <div>
          <h3 style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-.022em' }}>
            {post.title}
            {isLatest && <span className="badge" style={{ marginLeft: '10px' }}>latest</span>}
          </h3>

          <p style={{ marginTop: '9px', maxWidth: '62ch', fontFamily: 'var(--prose)', fontSize: '17px', lineHeight: 1.55, color: 'var(--ink-2)' }}>
            {post.excerpt || post.body.slice(0, 160) + '...'}
          </p>

          <div style={{ marginTop: '13px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--mono)', fontSize: '11.5px', color: 'var(--muted)', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
              {post.author.displayName || post.author.username}
              {post.author.isVerified && <CheckBadgeIcon />}
            </span>
            <span aria-hidden="true">·</span>
            <span style={{ color: 'var(--accent)' }}>
              {post.tags.map((t) => `#${t}`).join(' ')}
            </span>
            <span aria-hidden="true">·</span>
            <span>{post.readMinutes} min read</span>
            <span aria-hidden="true">·</span>
            <span>{post.likesCount} likes</span>
            <span aria-hidden="true">·</span>
            <span>{post.commentsCount} comments</span>
          </div>
        </div>

        {/* Arrow */}
        <span style={{ justifySelf: 'end', paddingTop: '4px', fontSize: '17px', color: 'var(--muted)' }} aria-hidden="true">
          &rarr;
        </span>
      </Link>
    </li>
  );
};
