import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { VerificationRequest } from '@/types';
import toast from 'react-hot-toast';

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

  return (
    <div className="shell page-content" style={{ maxWidth: '680px' }}>
      <p className="eyebrow">// verified creator program</p>
      <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>Apply for Verified Badge</h1>
      <p className="dim" style={{ marginBottom: '28px' }}>
        The Off By One blue tick is reserved for verified contributors who regularly produce high-signal,
        original engineering articles. Volume of posts alone never guarantees verification.
      </p>

      {/* Criteria Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Eligibility Checklist</h3>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14.5px' }}>
          <li style={{ color: postsCount >= 5 ? 'var(--c-str)' : 'var(--muted)' }}>
            {postsCount >= 5 ? '✓' : '✗'} At least 5 approved published articles ({postsCount} / 5)
          </li>
          <li style={{ color: followersCount >= 20 ? 'var(--c-str)' : 'var(--muted)' }}>
            {followersCount >= 20 ? '✓' : '✗'} At least 20 followers ({followersCount} / 20)
          </li>
          <li style={{ color: points >= 200 ? 'var(--c-str)' : 'var(--muted)' }}>
            {points >= 200 ? '✓' : '✗'} At least 200 contribution points ({points} / 200)
          </li>
          <li style={{ color: 'var(--c-str)' }}>
            ✓ Good standing with no active moderation suspensions
          </li>
        </ul>
      </div>

      {myRequest ? (
        <div className="card" style={{ padding: '24px' }}>
          <h3>Application Status: <span className="badge">{myRequest.status}</span></h3>
          <p className="dim mono" style={{ marginTop: '8px', fontSize: '12px' }}>
            Submitted on {new Date(myRequest.createdAt).toLocaleDateString()}
          </p>
          {myRequest.reviewNote && (
            <p style={{ marginTop: '12px', color: 'var(--ink-2)' }}>
              <strong>Moderator Note:</strong> {myRequest.reviewNote}
            </p>
          )}
        </div>
      ) : !eligible ? (
        <div className="card" style={{ padding: '24px' }}>
          <p className="dim">
            You do not currently meet the eligibility thresholds. Keep writing and engaging to qualify!
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyMutation.mutate();
          }}
          className="card"
          style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div className="field">
            <label>Why should you be verified? (50-800 characters)</label>
            <textarea
              rows={5}
              placeholder="Tell our review team about your background, expertise, and what you publish here..."
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              required
              minLength={50}
              maxLength={800}
            />
          </div>

          <div className="field">
            <label>External links proving your identity / work (GitHub, personal site, Twitter — one per line)</label>
            <textarea
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
          >
            {applyMutation.isPending ? 'Submitting...' : 'Submit Verification Request'}
          </button>
        </form>
      )}
    </div>
  );
};
