import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useSocketStore } from '@/store/socket';
import { SunIcon, MoonIcon, BellIcon, PenIcon, MessageIcon } from '@/components/ui/Icons';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isMod, logout } = useAuthStore();
  const { toggle } = useThemeStore();
  const { unreadCount } = useSocketStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="site-head">
      <div className="shell head-inner">
        <Link to="/" className="mark">
          Tech Horizon<span className="caret" aria-hidden="true" />
        </Link>

        {/* Desktop Nav */}
        <nav className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: 'auto' }}>
          <NavLink to="/" style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--ink-2)', fontSize: '14.5px' })}>
            Feed
          </NavLink>
          <NavLink to="/trending" style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--ink-2)', fontSize: '14.5px' })}>
            Trending
          </NavLink>
          <NavLink to="/leaderboard" style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--ink-2)', fontSize: '14.5px' })}>
            Leaderboard
          </NavLink>
          <NavLink to="/feedback" style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--ink-2)', fontSize: '14.5px' })}>
            Feedback
          </NavLink>
          {isMod() && (
            <NavLink to="/admin" style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--ink-2)', fontSize: '14.5px' })}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Right Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAuthenticated() ? (
            <>
              <Link to="/write" className="btn btn-sm btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <PenIcon />
                <span>Write</span>
              </Link>

              <Link to="/chat" className="icon-btn" aria-label="Messages">
                <MessageIcon />
              </Link>

              <Link to="/notifications" className="icon-btn" style={{ position: 'relative' }} aria-label="Notifications">
                <BellIcon />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px',
                    borderRadius: '50%', background: 'var(--accent)',
                  }} />
                )}
              </Link>

              <Link to={`/u/${user?.username}`} style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`}
                  alt={user?.username}
                  className="avatar avatar-sm"
                />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-sm btn-ghost">Log in</Link>
              <Link to="/register" className="btn btn-sm">Join</Link>
            </>
          )}

          <button className="icon-btn" onClick={toggle} type="button" aria-label="Toggle theme">
            <SunIcon className="ico-sun" />
            <MoonIcon className="ico-moon" />
          </button>
        </div>
      </div>
    </header>
  );
};
