import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { LeaderboardUser } from '@/types';
import { CheckBadgeIcon } from '@/components/ui/Icons';

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
    <div className="shell page-content" style={{ maxWidth: '800px' }}>
      <p className="eyebrow">// community ranks</p>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Creator Leaderboard</h1>
      <p className="dim" style={{ marginBottom: '24px' }}>
        Transparent points ledger. Earn points by writing approved posts, leaving helpful comments, and receiving upvotes.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          className={`chip ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          All-time
        </button>
        <button
          className={`chip ${tab === 'monthly' ? 'active' : ''}`}
          onClick={() => setTab('monthly')}
        >
          This Month
        </button>
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: '240px', width: '100%' }} />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14.5px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)', background: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '11.5px', color: 'var(--muted)' }}>
                <th style={{ padding: '12px 16px', width: '40px' }}>#</th>
                <th style={{ padding: '12px 16px' }}>Creator</th>
                <th style={{ padding: '12px 16px' }}>Level</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u, i) => (
                <tr key={u._id} style={{ borderBottom: '1px solid var(--rule-2)' }}>
                  <td className="mono dim" style={{ padding: '14px 16px' }}>{i + 1}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link to={`/u/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={u.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`}
                        alt={u.username}
                        className="avatar avatar-sm"
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {u.displayName || u.username}
                          {u.isVerified && <CheckBadgeIcon />}
                        </div>
                        <div className="dim mono" style={{ fontSize: '11px' }}>@{u.username}</div>
                      </div>
                    </Link>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge">{u.level}</span>
                  </td>
                  <td className="mono" style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>
                    {tab === 'monthly' ? u.total ?? 0 : u.points} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
