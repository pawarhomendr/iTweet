import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useSocketStore } from '@/store/socket';
import { SunIcon, MoonIcon, BellIcon, PenIcon, MessageIcon, MenuIcon, CloseIcon } from '@/components/ui/Icons';
import { LanguageSelector } from '@/components/common/LanguageSelector';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isMod } = useAuthStore();
  const { toggle } = useThemeStore();
  const { unreadCount } = useSocketStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const wasMenuOpenRef = useRef(false);

  const closeMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverflowX = document.body.style.overflowX;
    document.body.style.overflow = 'hidden';
    document.body.style.overflowX = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overflowX = previousOverflowX;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (firstFocusable ?? drawerRef.current)?.focus();
    } else if (wasMenuOpenRef.current) {
      menuButtonRef.current?.focus();
    }
    wasMenuOpenRef.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  const navStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? 'var(--accent)' : 'var(--ink-2)',
  });

  return (
    <header className="site-head">
      <div className="shell head-inner">
        <Link to="/" className="mark" onClick={closeMenu}>
          Indi<span style={{ color: 'var(--accent)' }}>agram</span><span className="caret" aria-hidden="true" />
        </Link>

        {/* Desktop Nav */}
        <nav className="nav-desktop" aria-label="Primary">
          <NavLink to="/" style={navStyle} className="nav-link">Feed</NavLink>
          <NavLink to="/trending" style={navStyle} className="nav-link">Trending</NavLink>
          <NavLink to="/search" style={navStyle} className="nav-link">Explore</NavLink>
          <NavLink to="/leaderboard" style={navStyle} className="nav-link">Leaderboard</NavLink>
          <NavLink to="/feedback" style={navStyle} className="nav-link">Feedback</NavLink>
          {isMod() && (
            <NavLink to="/admin" style={navStyle} className="nav-link">Admin</NavLink>
          )}
        </nav>

        {/* Right Tools */}
        <div className="head-tools">
          <div className="head-lang">
            <LanguageSelector />
          </div>

          {isAuthenticated() ? (
            <>
              <Link to="/write" className="btn btn-sm btn-accent nav-write-btn" aria-label="Write">
                <PenIcon />
                <span className="nav-write-label">Write</span>
              </Link>

              <Link to="/chat" className="icon-btn nav-icon-item nav-chat-btn" aria-label="Messages">
                <MessageIcon />
              </Link>

              <Link to="/notifications" className="icon-btn nav-icon-item nav-notify-btn" aria-label="Notifications">
                <BellIcon />
                {unreadCount > 0 && <span className="nav-notify-dot" aria-hidden="true" />}
              </Link>

              <Link to={`/u/${user?.username}`} className="nav-avatar-item" aria-label="Profile">
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`}
                  alt={user?.username || 'Profile'}
                  className="avatar avatar-sm"
                />
              </Link>
            </>
          ) : (
            <div className="nav-auth-buttons">
              <Link to="/login" className="btn btn-sm btn-ghost">Log in</Link>
              <Link to="/register" className="btn btn-sm">Join</Link>
            </div>
          )}

          <button className="icon-btn head-theme-btn" onClick={toggle} type="button" aria-label="Toggle theme">
            <SunIcon className="ico-sun" />
            <MoonIcon className="ico-moon" />
          </button>

          {/* Mobile menu trigger */}
          <button
            ref={menuButtonRef}
            className="icon-btn mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((open) => !open)}
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="mobile-nav-backdrop"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <nav
            id="mobile-nav-drawer"
            ref={drawerRef}
            className="mobile-nav-drawer"
            aria-label="Mobile"
            tabIndex={-1}
          >
            <div className="mobile-nav-links">
              <Link to="/" onClick={closeMenu} className="mobile-nav-link">Feed</Link>
              <Link to="/trending" onClick={closeMenu} className="mobile-nav-link">Trending</Link>
              <Link to="/search" onClick={closeMenu} className="mobile-nav-link">Explore</Link>
              <Link to="/leaderboard" onClick={closeMenu} className="mobile-nav-link">Leaderboard</Link>
              <Link to="/feedback" onClick={closeMenu} className="mobile-nav-link">Feedback</Link>
              {isMod() && (
                <Link to="/admin" onClick={closeMenu} className="mobile-nav-link mobile-nav-link-accent">Admin</Link>
              )}
            </div>

            {isAuthenticated() ? (
              <div className="mobile-nav-actions">
                <Link to="/write" onClick={closeMenu} className="btn btn-sm btn-accent">Write a Post</Link>
                <Link to="/chat" onClick={closeMenu} className="btn btn-sm btn-ghost">Chat</Link>
                <Link to="/notifications" onClick={closeMenu} className="btn btn-sm btn-ghost">Notifications</Link>
                {user?.username && (
                  <Link to={`/u/${user.username}`} onClick={closeMenu} className="btn btn-sm btn-ghost">Profile</Link>
                )}
              </div>
            ) : (
              <div className="mobile-nav-actions">
                <Link to="/login" onClick={closeMenu} className="btn btn-sm btn-ghost">Log in</Link>
                <Link to="/register" onClick={closeMenu} className="btn btn-sm">Join</Link>
              </div>
            )}
          </nav>
        </>
      )}
    </header>
  );
};
