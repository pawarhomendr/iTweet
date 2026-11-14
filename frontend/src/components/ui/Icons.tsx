import React from 'react';

export const GlobeIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.66 8.24 6.5 10" />
    <path d="M12 22a10 10 0 0 0 10-10c0-4.42-2.66-8.24-6.5-10" />
  </svg>
);

export const ArrowLeftIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
);

export const SearchIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L21 21" />
  </svg>
);

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
  <svg
    className="ico"
    viewBox="0 0 24 24"
    style={{
      fill: filled ? '#E0245E' : 'none',
      stroke: filled ? '#E0245E' : 'currentColor',
      transition: 'all .15s ease',
    }}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const RepostIcon: React.FC<{ reposted?: boolean }> = ({ reposted }) => (
  <svg
    className="ico"
    viewBox="0 0 24 24"
    style={{
      stroke: reposted ? '#17BF63' : 'currentColor',
      color: reposted ? '#17BF63' : 'inherit',
      transition: 'all .15s ease',
    }}
    aria-hidden="true"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

export const BookmarkIcon: React.FC<{ filled?: boolean }> = ({ filled }) => (
  <svg
    className="ico"
    viewBox="0 0 24 24"
    style={{
      fill: filled ? 'var(--accent)' : 'none',
      stroke: filled ? 'var(--accent)' : 'currentColor',
      transition: 'all .15s ease',
    }}
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const ShareIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

export const DownloadIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

export const CommentIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

// Twitter/X-level polished blue tick badge with accessible tooltip
export const CheckBadgeIcon: React.FC<{ size?: number; tooltip?: string }> = ({ size = 16, tooltip = 'Verified account' }) => (
  <span
    title={tooltip}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      verticalAlign: 'middle',
      marginLeft: '4px',
      cursor: 'help',
      flexShrink: 0,
    }}
    aria-label={tooltip}
  >
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {/* Premium blue scallop seal */}
      <path
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238.65 1.273 2.02 2.148 3.6 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"
        fill="#1D9BF0"
      />
      {/* Crisp white checkmark */}
      <path
        d="M10.2 16.2l-3.6-3.6 1.4-1.4 2.2 2.2 5.6-5.6 1.4 1.4-7 7z"
        fill="#FFFFFF"
      />
    </svg>
  </span>
);

export const VideoIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

export const ImageIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export const GifIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" style={{ strokeWidth: 1.5 }}>
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <text
      x="12"
      y="15.5"
      textAnchor="middle"
      fontSize="8.5"
      fontFamily="sans-serif"
      fontWeight="700"
      fill="currentColor"
      stroke="none"
    >
      GIF
    </text>
  </svg>
);

export const CloseIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const SettingsIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const MenuIcon: React.FC = () => (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
