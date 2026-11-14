import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const TermsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="shell page-content" style={{ maxWidth: '800px', marginInline: 'auto', paddingBottom: '80px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '32px' }}>
        <p className="eyebrow" style={{ marginBottom: '8px' }}>{'// legal agreement'}</p>
        <h1 style={{ fontFamily: 'var(--heading)', fontSize: '36px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
          {t('legal.termsTitle', 'Terms & Conditions')}
        </h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--muted)' }}>
          {t('legal.lastUpdated', 'Last updated: November 2026')}
        </p>
      </div>
      <div className="card" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px', lineHeight: 1.7, fontSize: '15px' }}>
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>1. Acceptance of Terms</h2>
          <p style={{ color: 'var(--muted)' }}>
            By registering, accessing, or using iTweet, you agree to be bound by these Terms & Conditions. If you do not agree to all of these terms, you are prohibited from using the platform.
          </p>
        </section>
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>2. Age Requirement & Eligibility</h2>
          <p style={{ color: 'var(--muted)' }}>
            iTweet is strictly intended for users who are 18 years of age or older. By registering an account, you explicitly confirm that you meet this age requirement.
          </p>
        </section>
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>3. User Conduct and Content</h2>
          <p style={{ color: 'var(--muted)' }}>
            Users retain ownership of their posts and comments. However, you agree not to publish unlawful, defamatory, harassing, or malicious material. We reserve the right to suspend accounts violating these standards.
          </p>
        </section>
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>4. Modifications to Service</h2>
          <p style={{ color: 'var(--muted)' }}>
            We reserve the right to modify or discontinue iTweet at any time without notice. Continued use of the platform after updates constitutes acceptance of the revised terms.
          </p>
        </section>
      </div>
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link to="/" style={{ color: 'var(--accent)', fontWeight: 500 }}>{t('legal.backToHome', 'Back to home')}</Link>
      </div>
    </div>
  );
};
