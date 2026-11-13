import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer
      style={{
        borderTop: '1px solid var(--rule)',
        background: 'var(--surface-2)',
        marginTop: 'auto',
      }}
    >
      <div
        className="shell"
        style={{
          paddingTop: '40px',
          paddingBottom: '40px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '32px',
          flexWrap: 'wrap',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '260px' }}>
          <span
            style={{
              fontFamily: 'var(--heading)',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '-.02em',
              color: 'var(--ink)',
            }}
          >
            Indi<span style={{ color: 'var(--accent)' }}>agram</span>
          </span>
          <p
            style={{
              fontFamily: 'var(--prose)',
              fontSize: '13.5px',
              lineHeight: 1.55,
              color: 'var(--muted)',
              fontStyle: 'italic',
            }}
          >
            A welcoming community for stories, ideas, discoveries, and everyday moments.
          </p>
        </div>

        {/* Links */}
        <nav
          aria-label="Footer navigation"
          style={{
            display: 'flex',
            gap: '40px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Explore
            </span>
            <FooterLink to="/">Feed</FooterLink>
            <FooterLink to="/trending">Trending</FooterLink>
            <FooterLink to="/leaderboard">Leaderboard</FooterLink>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Contribute
            </span>
            <FooterLink to="/write">Write a Post</FooterLink>
            <FooterLink to="/verification/apply">Get Verified</FooterLink>
            <FooterLink to="/feedback">Send Feedback</FooterLink>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Legal & Policy
            </span>
            <FooterLink to="/terms">{t('auth.termsLink', 'Terms & Conditions')}</FooterLink>
            <FooterLink to="/privacy">{t('auth.privacyLink', 'Privacy Policy')}</FooterLink>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Project
            </span>
            <a
              href="https://github.com/pawarhomendr/off-by-one"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--muted)', fontSize: '13.5px' }}
            >
              GitHub
            </a>
          </div>
        </nav>
      </div>

      {/* Bottom bar */}
      <div
        className="shell"
        style={{
          paddingBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--muted)',
          }}
        >
          © {new Date().getFullYear()} Indiagram · made for curious people
        </p>
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--muted)',
            fontStyle: 'italic',
          }}
        >
          Come as you are. Leave room for another voice.
        </p>
      </div>
    </footer>
  );
};

const FooterLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link
    to={to}
    style={{
      color: 'var(--muted)',
      fontSize: '13.5px',
      transition: 'color .15s',
    }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent)')}
    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--muted)')}
  >
    {children}
  </Link>
);
