import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuth(res.data.data.user, res.data.data.token);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '420px' }}>
      <p className="eyebrow">// authentication</p>
      <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>Log in to Off By One</h1>
      <p className="dim" style={{ marginBottom: '28px' }}>Join the conversations, publish your own findings.</p>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p className="dim mono" style={{ fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent)' }}>Join here</Link>
        </p>
      </form>
    </div>
  );
};
