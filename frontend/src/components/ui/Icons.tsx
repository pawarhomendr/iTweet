import React from 'react';

export const SunIcon: React.FC<{ className?: string }> = ({ className = 'ico' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9" />
  </svg>
);

export const MoonIcon: React.FC<{ className?: string }> = ({ className = 'ico' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </svg>
);

export const BellIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const MessageIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const PenIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

export const HeartIcon: React.FC<{ filled?: boolean }> = ({ filled }) => (
  <svg className="ico" viewBox="0 0 24 24" style={{ fill: filled ? 'var(--c-fn)' : 'none', stroke: filled ? 'var(--c-fn)' : 'currentColor' }}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const BookmarkIcon: React.FC<{ filled?: boolean }> = ({ filled }) => (
  <svg className="ico" viewBox="0 0 24 24" style={{ fill: filled ? 'var(--accent)' : 'none', stroke: filled ? 'var(--accent)' : 'currentColor' }}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const CheckBadgeIcon: React.FC = () => (
  <svg style={{ width: '16px', height: '16px', color: 'var(--c-str)', verticalAlign: 'middle', marginLeft: '4px' }} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const SearchIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L21 21" />
  </svg>
);
