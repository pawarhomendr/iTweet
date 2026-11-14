import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { isValidEmail } from '@/lib/validation';
import { PageBackButton } from '@/components/layout/PageBackButton';

type VerificationState = 'pending' | 'verifying' | 'verified' | 'failed';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [state, setState] = useState<VerificationState>(token ? 'verifying' : 'pending');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;

    api.get('/auth/verify-email', { params: { token } })
      .then(() => {
        if (active) setState('verified');
      })
      .catch(() => {
        if (active) setState('failed');
      });

    return () => {
      active = false;
    };
  }, [token]);

  const resend = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }

    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: normalizedEmail });
      toast.success('If the account is eligible, a new verification email will be sent.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to request a new verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '560px', marginInline: 'auto' }}>
      <PageBackButton fallback="/" />
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <p className="eyebrow">{'// email verification'}</p>
        <h1 style={{ fontFamily: 'var(--heading)', fontSize: '34px', fontWeight: 600, color: 'var(--ink)', marginTop: '6px' }}>
          {state === 'verified' ? 'Email verified' : state === 'failed' ? 'Verification link expired' : 'Check your inbox'}
        </h1>
      </div>

      <div className="card" style={{ padding: '28px', background: 'var(--surface)' }}>
        {state === 'verifying' && (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <p className="prose">Confirming your email address…</p>
          </div>
        )}

        {state === 'verified' && (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <p className="prose">Your email address is confirmed. You can now sign in and join the community.</p>
            <Link className="btn btn-accent" to="/login" style={{ marginTop: '22px' }}>Continue to sign in</Link>
          </div>
        )}

        {(state === 'pending' || state === 'failed') && (
          <>
            <p className="prose" style={{ fontSize: '16px' }}>
              We need to confirm that you can access this inbox before activating your iTweet account. Verification links expire after 24 hours and work only once.
            </p>
            {state === 'failed' && (
              <p className="field-error" style={{ marginTop: '14px' }}>This link is invalid or has expired. Request a fresh one below.</p>
            )}
            <form onSubmit={resend} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '22px' }}>
              <div className="field">
                <label htmlFor="verification-email">Email address</label>
                <input
                  id="verification-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <button type="submit" className="btn btn-accent" disabled={resending}>
                {resending ? 'Requesting…' : 'Resend verification email'}
              </button>
            </form>
            <p className="dim mono" style={{ textAlign: 'center', fontSize: '12px', marginTop: '18px' }}>
              Already verified? <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
