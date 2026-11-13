import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const PrivacyPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="shell page-content" style={{ maxWidth: '800px', marginInline: 'auto', paddingBottom: '80px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '32px' }}>
        <p className="eyebrow" style={{ marginBottom: '8px' }}>{'// data privacy'}</p>
        <h1 style={{ fontFamily: 'var(--heading)', fontSize: '36px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
          {t('legal.privacyTitle', 'Privacy Policy')}
        </h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--muted)' }}>
          {t('legal.lastUpdated', 'Last updated: November 2026')}
        </p>
      </div>
      <div className="card" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px', lineHeight: 1.7, fontSize: '15px' }}>
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>1. Information We Collect</h2>
          <p style={{ color: 'var(--muted)' }}>
            We collect account credentials (username, email, hashed password), profile details, published posts, comments, likes, and explicit consent records (18+ confirmation and Terms acceptance timestamps).
          </p>
        </section>
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>2. How We Use Information</h2>
          <p style={{ color: 'var(--muted)' }}>
            Your information is used strictly to provide platform functionality, authenticate sessions via secure HttpOnly cookies, deliver essential verification emails, and maintain community safety.
          </p>
        </section>
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>3. Data Security & Cookies</h2>
          <p style={{ color: 'var(--muted)' }}>
            We use secure tokens, password hashing (bcrypt), and HttpOnly cookies. We do not sell your personal information to third parties.
          </p>
        </section>
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>4. Your Rights</h2>
          <p style={{ color: 'var(--muted)' }}>
            You may update your profile or request account deletion at any time through your settings or by contacting support.
          </p>
        </section>
      </div>
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link to="/" style={{ color: 'var(--accent)', fontWeight: 500 }}>{t('legal.backToHome', 'Back to home')}</Link>
      </div>
    </div>
  );
};
