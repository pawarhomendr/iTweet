import React, { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export const FeedbackPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/feedback', { email, subject, body });
      setSubmitted(true);
      toast.success('Feedback sent!');
    } catch {
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '600px' }}>
      <p className="eyebrow">// community voice</p>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Send Us Feedback</h1>
      <p className="dim" style={{ marginBottom: '28px' }}>
        Suggestions, bug reports, or feature ideas for Off By One.
      </p>

      {submitted ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--c-str)' }}>Thank you for your feedback!</h3>
          <p className="dim" style={{ marginTop: '8px' }}>Our development team reviews all submissions regularly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="field">
            <label>Your email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Subject</label>
            <input
              type="text"
              placeholder="e.g. Bug in code snippet renderer"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Message</label>
            <textarea
              rows={6}
              placeholder="Describe your issue or suggestion in detail..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-accent" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Submitting...' : 'Send Feedback'}
          </button>
        </form>
      )}
    </div>
  );
};
