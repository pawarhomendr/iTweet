import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { username, email, password, displayName });
      setAuth(res.data.data.user, res.data.data.token);
      toast.success('Account created! Welcome to Off By One.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '440px' }}>
      <p className="eyebrow">// registration</p>
      <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>Create an account</h1>
      <p className="dim" style={{ marginBottom: '28px' }}>Publish news, share code benchmarks, earn rewards.</p>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="field">
          <label>Username (handles lowercase letters, numbers, dash)</label>
          <input
            type="text"
            placeholder="e.g. dev_jane"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            required
          />
        </div>

        <div className="field">
          <label>Display name</label>
          <input
            type="text"
            placeholder="Jane Doe"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Password (at least 8 characters)</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
          {loading ? 'Creating...' : 'Create Account'}
        </button>

        <p className="dim mono" style={{ fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
        </p>
      </form>
    </div>
  );
};
