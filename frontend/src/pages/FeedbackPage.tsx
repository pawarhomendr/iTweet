import React, { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';

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
      toast.success('Thank you — feedback sent!');
    } catch {
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '600px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '28px' }}>
        <p className="eyebrow">{'// community voice'}</p>
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
          Send Feedback
        </h1>
        <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
          Suggestions, bug reports, or feature ideas for Indiagram. Every message is reviewed by the team.
        </p>
      </div>

      {submitted ? (
        <div
          className="card"
          style={{
            padding: '40px 32px',
            textAlign: 'center',
            border: '1px solid var(--rule)',
            background: 'var(--surface-2)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--accent-soft)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              color: 'var(--accent)',
              fontSize: '20px',
            }}
          >
            ✓
          </div>
          <h3 style={{ fontFamily: 'var(--heading)', fontSize: '22px', color: 'var(--ink)', marginBottom: '8px' }}>
            Thank you for your feedback
          </h3>
          <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
            Our development team reviews all submissions regularly.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ marginTop: '24px' }}
            onClick={() => {
              setSubmitted(false);
              setSubject('');
              setBody('');
            }}
          >
            Send another message
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            border: '1px solid var(--rule)',
          }}
        >
          <div className="field">
            <label htmlFor="feedback-email">Your email address</label>
            <input
              id="feedback-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="feedback-subject">Subject</label>
            <input
              id="feedback-subject"
              type="text"
              placeholder="e.g. Bug in article renderer or idea for tag filters"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="feedback-message">Message</label>
            <textarea
              id="feedback-message"
              rows={6}
              placeholder="Describe your issue or suggestion in detail..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-accent"
            disabled={loading}
            style={{ marginTop: '6px' }}
          >
            {loading ? 'Submitting...' : 'Send Feedback'}
          </button>
        </form>
      )}
    </div>
  );
};
