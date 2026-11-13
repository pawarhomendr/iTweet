import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="shell page-content empty-state" style={{ padding: '96px 0' }}>
      <p className="eyebrow" style={{ marginBottom: '12px' }}>{'// error 404'}</p>
      <h1
        style={{
          fontFamily: 'var(--heading)',
          fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '16px',
        }}
      >
        Page not found
      </h1>
      <p
        className="dim"
        style={{
          fontFamily: 'var(--prose)',
          fontSize: '18px',
          maxWidth: '48ch',
          marginInline: 'auto',
          marginBottom: '32px',
        }}
      >
        The page you are looking for might have been removed, renamed, or is temporarily unavailable.
      </p>
      <Link to="/" className="btn btn-accent">
        Return to Feed
      </Link>
    </div>
  );
};
