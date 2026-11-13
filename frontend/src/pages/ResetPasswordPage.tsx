import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token') ?? '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      toast.error('This password reset link is missing its token.');
      return;
    }

    if (password !== confirmation) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '440px', marginInline: 'auto' }}>
      <PageBackButton fallback="/login" />
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p className="eyebrow" style={{ marginBottom: '8px' }}>{'// password recovery'}</p>
        <h1 style={{ fontFamily: 'var(--heading)', fontSize: '32px', fontWeight: 600, letterSpacing: '-.025em', color: 'var(--ink)', marginBottom: '8px' }}>
          Choose a new password
        </h1>
        <p style={{ fontFamily: 'var(--prose)', fontSize: '15px', color: 'var(--muted)', fontStyle: 'italic' }}>
          Use at least eight characters, then sign in again.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', border: '1px solid var(--rule)', background: 'var(--surface)' }}
      >
        <div className="field">
          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="field">
          <label htmlFor="reset-password-confirmation">Confirm new password</label>
          <input
            id="reset-password-confirmation"
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '6px' }} disabled={loading}>
          {loading ? 'Updating password...' : 'Update password'}
        </button>

        <p className="dim mono" style={{ textAlign: 'center', fontSize: '12px' }}>
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Return to sign in</Link>
        </p>
      </form>
    </div>
  );
};
