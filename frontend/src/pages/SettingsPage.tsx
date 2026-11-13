import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
    } catch {
      // Proceed with local logout regardless
    } finally {
      logout();
      toast.success('Account session closed');
      navigate('/login', { replace: true });
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Always clear the local session even if the server is unavailable.
    } finally {
      logout();
      toast.success('Signed out successfully');
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '720px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '28px' }}>
        <p className="eyebrow">{'// preferences & security'}</p>
        <h1
          style={{
            fontFamily: 'var(--heading)',
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '-.02em',
            color: 'var(--ink)',
            marginTop: '4px',
            marginBottom: '6px',
          }}
        >
          Account Settings
        </h1>
        <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
          Manage your account security, session, and preferences.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Account Info Card */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Account Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14.5px' }}>
            <div>
              <span className="dim mono" style={{ fontSize: '12px' }}>Username: </span>
              <strong>@{user?.username}</strong>
            </div>
            <div>
              <span className="dim mono" style={{ fontSize: '12px' }}>Email: </span>
              <strong>{user?.email}</strong>
            </div>
            <div>
              <span className="dim mono" style={{ fontSize: '12px' }}>Creator Level: </span>
              <span className="badge badge-level" style={{ textTransform: 'capitalize' }}>
                {user?.level}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Password */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Security</h3>
          <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '14.5px', marginBottom: '16px' }}>
            Access tokens are securely stored in memory only. Refresh tokens are secured in HTTP-only cookies.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              void handleLogout();
            }}
          >
            Sign out of all sessions
          </button>
        </div>

        {/* Danger Zone */}
        <div
          className="card"
          style={{
            padding: '24px',
            border: '1.5px solid color-mix(in srgb, var(--error) 40%, transparent)',
            background: 'var(--surface)',
          }}
        >
          <h3 style={{ fontSize: '18px', color: 'var(--error)', marginBottom: '8px' }}>Danger Zone</h3>
          <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '14.5px', marginBottom: '16px' }}>
            Permanently remove your account and associated session data from Indiagram.
          </p>

          {!deleteConfirmOpen ? (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete Account
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--error)' }}>
                Are you absolutely sure? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, delete my account'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
