import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LeaderboardUser } from '@/types';
import { CheckBadgeIcon } from '@/components/ui/Icons';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const LeaderboardPage: React.FC = () => {
  const [tab, setTab] = useState<'all' | 'monthly'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', tab],
    queryFn: async () => {
      const endpoint = tab === 'all' ? '/rewards/leaderboard' : '/rewards/monthly-leaderboard';
      const res = await api.get<{ data: { leaderboard: LeaderboardUser[] } }>(endpoint);
      return res.data.data.leaderboard;
    },
  });

  const list = data ?? [];

  return (
    <div className="shell page-content" style={{ maxWidth: '820px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '28px' }}>
        <p className="eyebrow">{'// community ranks'}</p>
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
          Creator Leaderboard
        </h1>
        <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
          Transparent points ledger. Earn points by writing approved articles, leaving thoughtful responses, and receiving community recognition.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          type="button"
          className={`chip ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
          aria-pressed={tab === 'all'}
        >
          All-time
        </button>
        <button
          type="button"
          className={`chip ${tab === 'monthly' ? 'active' : ''}`}
          onClick={() => setTab('monthly')}
          aria-pressed={tab === 'monthly'}
        >
          This Month
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="skeleton" style={{ height: '44px', width: '100%' }} />
          <div className="skeleton" style={{ height: '56px', width: '100%' }} />
          <div className="skeleton" style={{ height: '56px', width: '100%' }} />
          <div className="skeleton" style={{ height: '56px', width: '100%' }} />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--rule)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14.5px' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1.5px solid var(--rule)',
                  background: 'var(--surface-2)',
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: 'var(--muted)',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                }}
              >
                <th style={{ padding: '14px 20px', width: '48px' }}>Rank</th>
                <th style={{ padding: '14px 20px' }}>Contributor</th>
                <th style={{ padding: '14px 20px' }}>Level</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                    No creators on the board yet.
                  </td>
                </tr>
              ) : (
                list.map((u, i) => (
                  <tr
                    key={u._id}
                    style={{
                      borderBottom: '1px solid var(--rule-2)',
                      background: i < 3 ? 'var(--beige-soft)' : undefined,
                      transition: 'background-color .12s',
                    }}
                  >
                    <td
                      className="mono"
                      style={{
                        padding: '16px 20px',
                        color: i === 0 ? 'var(--accent)' : i < 3 ? 'var(--ink)' : 'var(--muted)',
                        fontWeight: i < 3 ? 600 : 400,
                        fontSize: '13px',
                      }}
                    >
                      {i === 0 ? '①' : i === 1 ? '②' : i === 2 ? '③' : `${i + 1}`}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Link
                        to={`/u/${u.username}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                      >
                        <img
                          src={
                            u.avatar ||
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(u.username)}`
                          }
                          alt=""
                          aria-hidden="true"
                          className="avatar avatar-sm"
                          style={{ border: '1.5px solid var(--rule)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center' }}>
                            {u.displayName || u.username}
                            {u.isVerified && <CheckBadgeIcon />}
                          </div>
                          <div className="dim mono" style={{ fontSize: '11.5px' }}>@{u.username}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge badge-level" style={{ textTransform: 'capitalize' }}>
                        {u.level}
                      </span>
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: '16px 20px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: 'var(--accent)',
                        fontSize: '14px',
                      }}
                    >
                      {tab === 'monthly' ? u.total ?? 0 : u.points} pts
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
