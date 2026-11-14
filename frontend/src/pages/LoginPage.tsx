import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { isValidEmail } from '@/lib/validation';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: normalizedEmail, password });
      setAuth(res.data.data.user, res.data.data.token);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      if (err.response?.data?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        toast.error('Verify your email before signing in.');
        navigate(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
        return;
      }
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = forgotEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: normalizedEmail });
      toast.success('If the account is eligible, reset instructions will be sent.');
      setForgotOpen(false);
      setForgotEmail('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className="shell page-content"
      style={{
        maxWidth: '440px',
        marginInline: 'auto',
      }}
    >
      <PageBackButton fallback="/" />
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p className="eyebrow" style={{ marginBottom: '8px' }}>{'// authentication'}</p>
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
          Welcome back
        </h1>
        <p
          style={{
            fontFamily: 'var(--prose)',
            fontSize: '15px',
            color: 'var(--muted)',
            fontStyle: 'italic',
          }}
        >
          Sign in to your iTweet account to publish and comment.
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
        noValidate
      >
        <div className="field">
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="login-password">Password</label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              Forgot password?
            </button>
          </div>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="btn btn-accent"
          style={{ width: '100%', marginTop: '6px' }}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
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
             Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>
              Join iTweet
            </Link>
          </p>
        </div>
      </form>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div
          onClick={() => setForgotOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <form
            onSubmit={handleForgotSubmit}
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '28px',
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Reset your password</h3>
            <p className="dim" style={{ fontSize: '14px' }}>
              Enter your email address and we will send you a secure password reset link.
            </p>

            <div className="field">
              <label htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setForgotOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-accent"
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
