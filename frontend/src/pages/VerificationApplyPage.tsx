import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { VerificationRequest } from '@/types';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const VerificationApplyPage: React.FC = () => {
  const { user } = useAuthStore();
  const [statement, setStatement] = useState('');
  const [links, setLinks] = useState('');

  const { data: myRequest, isLoading } = useQuery({
    queryKey: ['my-verification'],
    queryFn: async () => {
      const res = await api.get<{ data: { request: VerificationRequest | null } }>('/verification/my');
      return res.data.data.request;
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const linkArr = links.split('\n').map((l) => l.trim()).filter(Boolean);
      return api.post('/verification/apply', { statement, links: linkArr });
    },
    onSuccess: () => {
      toast.success('Verification application submitted! A moderator will review it.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Application failed');
    },
  });

  const postsCount = user?.postsCount ?? 0;
  const followersCount = user?.followersCount ?? 0;
  const points = user?.points ?? 0;

  const eligible = postsCount >= 5 && followersCount >= 20 && points >= 200;

  if (isLoading) {
    return (
      <div className="shell page-content" style={{ maxWidth: '680px' }}>
        <div className="skeleton" style={{ height: '32px', width: '40%', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '160px', width: '100%' }} />
      </div>
    );
  }

  return (
    <div className="shell page-content" style={{ maxWidth: '680px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '28px' }}>
        <p className="eyebrow">{'// verified contributor program'}</p>
        <h1
          style={{
            fontFamily: 'var(--heading)',
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '-.02em',
            color: 'var(--ink)',
            marginTop: '4px',
            marginBottom: '8px',
          }}
        >
          Apply for Verified Badge
        </h1>
        <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
          The iTweet blue tick recognizes verified contributors who consistently produce high-signal,
          original engineering articles. Volume of posts alone never guarantees verification.
        </p>
      </div>

      {/* Criteria Card */}
      <div
        className="card"
        style={{
          padding: '28px',
          marginBottom: '32px',
          border: '1px solid var(--rule)',
          background: 'var(--surface-2)',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--heading)',
            fontSize: '17px',
            fontWeight: 600,
            marginBottom: '16px',
            color: 'var(--ink)',
          }}
        >
          Eligibility Requirements
        </h3>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '11px',
                fontWeight: 700,
                background: postsCount >= 5 ? 'var(--success)' : 'var(--rule)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {postsCount >= 5 ? '✓' : '–'}
            </span>
            <span style={{ color: postsCount >= 5 ? 'var(--ink)' : 'var(--muted)' }}>
              At least 5 approved published articles{' '}
              <strong style={{ fontFamily: 'var(--mono)' }}>({postsCount}/5)</strong>
            </span>
          </li>

          <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '11px',
                fontWeight: 700,
                background: followersCount >= 20 ? 'var(--success)' : 'var(--rule)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {followersCount >= 20 ? '✓' : '–'}
            </span>
            <span style={{ color: followersCount >= 20 ? 'var(--ink)' : 'var(--muted)' }}>
              At least 20 followers{' '}
              <strong style={{ fontFamily: 'var(--mono)' }}>({followersCount}/20)</strong>
            </span>
          </li>

          <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '11px',
                fontWeight: 700,
                background: points >= 200 ? 'var(--success)' : 'var(--rule)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {points >= 200 ? '✓' : '–'}
            </span>
            <span style={{ color: points >= 200 ? 'var(--ink)' : 'var(--muted)' }}>
              At least 200 contribution points{' '}
              <strong style={{ fontFamily: 'var(--mono)' }}>({points}/200)</strong>
            </span>
          </li>

          <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '11px',
                fontWeight: 700,
                background: 'var(--success)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            <span style={{ color: 'var(--ink)' }}>
              Good community standing with no active moderation suspensions
            </span>
          </li>
        </ul>
      </div>

      {myRequest ? (
        <div
          className="card"
          style={{
            padding: '28px',
            border: '1px solid var(--rule)',
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ fontFamily: 'var(--heading)', fontSize: '18px' }}>Your Application</h3>
            <span className={`badge ${myRequest.status === 'approved' ? 'badge-verified' : ''}`}>
              {myRequest.status}
            </span>
          </div>
          <p className="dim mono" style={{ fontSize: '12px' }}>
            Submitted on {new Date(myRequest.createdAt).toLocaleDateString()}
          </p>
          {myRequest.reviewNote && (
            <div
              style={{
                marginTop: '16px',
                padding: '14px',
                background: 'var(--surface-2)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--accent)',
              }}
            >
              <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
                <strong>Moderator Note:</strong> {myRequest.reviewNote}
              </p>
            </div>
          )}
        </div>
      ) : !eligible ? (
        <div
          className="card"
          style={{
            padding: '28px',
            textAlign: 'center',
            border: '1px solid var(--rule)',
          }}
        >
          <h3 style={{ fontFamily: 'var(--heading)', fontSize: '20px', marginBottom: '8px' }}>
            Not yet eligible
          </h3>
          <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
            You do not currently meet all the thresholds above. Keep writing, sharing benchmarks, and engaging to qualify!
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyMutation.mutate();
          }}
          className="card"
          style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            border: '1px solid var(--rule)',
          }}
        >
          <div className="field">
            <label htmlFor="verify-statement">
              Why should you be verified?{' '}
              <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '12px' }}>
                (50–800 characters)
              </span>
            </label>
            <textarea
              id="verify-statement"
              rows={5}
              placeholder="Tell our review team about your engineering background, what you publish here, and any public projects you maintain..."
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              required
              minLength={50}
              maxLength={800}
            />
            <span
              className="mono dim"
              style={{ fontSize: '11px', textAlign: 'right' }}
            >
              {statement.length}/800
            </span>
          </div>

          <div className="field">
            <label htmlFor="verify-links">
              External links confirming your identity or work{' '}
              <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '12px' }}>
                (GitHub, personal site, X — one per line)
              </span>
            </label>
            <textarea
              id="verify-links"
              rows={3}
              placeholder="https://github.com/yourhandle&#10;https://yourblog.com"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-accent"
            disabled={applyMutation.isPending || statement.length < 50}
            style={{ marginTop: '4px' }}
          >
            {applyMutation.isPending ? 'Submitting...' : 'Submit Verification Request'}
          </button>
        </form>
      )}
    </div>
  );
};
