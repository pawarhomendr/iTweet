import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { isValidEmail } from '@/lib/validation';
import { PageBackButton } from '@/components/layout/PageBackButton';
import { useTranslation } from 'react-i18next';

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }
    if (!ageConfirmed) {
      toast.error('You must confirm you are 18 years of age or older.');
      return;
    }
    if (!termsAccepted) {
      toast.error('You must accept the Terms & Conditions and Privacy Policy.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        username,
        email: normalizedEmail,
        password,
        displayName,
        ageConfirmed,
        termsAccepted,
      });
      toast.success('Account created. Check your inbox to verify your email.');
      navigate(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="shell page-content"
      style={{
        maxWidth: '460px',
        marginInline: 'auto',
        paddingBottom: '60px',
      }}
    >
      <PageBackButton fallback="/" />
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p className="eyebrow" style={{ marginBottom: '8px' }}>{'// registration'}</p>
        <h1
          style={{
            fontFamily: 'var(--heading)',
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '-.025em',
            color: 'var(--ink)',
            marginBottom: '8px',
          }}
        >
          {t('auth.createAccount', 'Create an account')}
        </h1>
        <p
          style={{
            fontFamily: 'var(--prose)',
            fontSize: '15px',
            color: 'var(--muted)',
            fontStyle: 'italic',
          }}
        >
          Publish articles, share code benchmarks, and earn community rewards.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          border: '1px solid var(--rule)',
          background: 'var(--surface)',
        }}
      >
        <div className="field">
          <label htmlFor="reg-username">
            {t('auth.usernameLabel', 'Username')}{' '}
            <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '12px' }}>
              (letters, numbers, hyphens)
            </span>
          </label>
          <input
            id="reg-username"
            type="text"
            placeholder="e.g. dev_jane"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            required
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label htmlFor="reg-displayname">{t('auth.displayNameLabel', 'Display name (optional)')}</label>
          <input
            id="reg-displayname"
            type="text"
            placeholder="Jane Doe"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div className="field">
          <label htmlFor="reg-email">{t('auth.emailLabel', 'Email address')}</label>
          <input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label htmlFor="reg-password">
            {t('auth.passwordLabel', 'Password')}{' '}
            <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '12px' }}>
              (at least 8 characters)
            </span>
          </label>
          <input
            id="reg-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        {/* Server-side Consent & Age Gate Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px', fontSize: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', color: 'var(--ink)' }}>
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              style={{ marginTop: '3px' }}
              required
            />
            <span>{t('auth.ageConfirmLabel', 'I confirm that I am 18 years of age or older.')}</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', color: 'var(--ink)' }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ marginTop: '3px' }}
              required
            />
            <span>
              {t('auth.termsAgreeLabel', 'I agree to the')}{' '}
              <Link to="/terms" target="_blank" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                {t('auth.termsLink', 'Terms & Conditions')}
              </Link>{' '}
              {t('common.and', 'and')} {t('auth.privacyLink', 'Privacy Policy')}
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-accent"
          style={{ width: '100%', marginTop: '6px' }}
          disabled={loading}
        >
          {loading ? t('common.loading', 'Creating account...') : t('auth.registerBtn', 'Create Account')}
        </button>

        <div
          style={{
            textAlign: 'center',
            marginTop: '8px',
            borderTop: '1px solid var(--rule-2)',
            paddingTop: '16px',
          }}
        >
          <p className="dim mono" style={{ fontSize: '12px' }}>
            {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
              {t('auth.signInBtn', 'Sign in')}
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};
