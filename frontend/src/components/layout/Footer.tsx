import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer style={{ borderTop: '1px solid var(--rule)', marginTop: 'auto' }}>
      <div className="shell" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', padding: '36px var(--pad)', color: 'var(--ink-2)', fontSize: '13px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p className="mono" style={{ fontWeight: 600 }}>off-by-one — built for developers</p>
          <p className="mono dim">Named after the only bug we still make.</p>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: 'var(--muted)' }}>Feed</Link>
          <Link to="/leaderboard" style={{ color: 'var(--muted)' }}>Leaderboard</Link>
          <Link to="/feedback" style={{ color: 'var(--muted)' }}>Feedback</Link>
          <Link to="/verification/apply" style={{ color: 'var(--muted)' }}>Get Verified</Link>
          <a href="https://github.com/pawarhomendr/off-by-one" target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }}>GitHub</a>
        </div>
      </div>
    </footer>
  );
};
