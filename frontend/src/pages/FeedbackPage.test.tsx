// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackPage } from './FeedbackPage';

const { apiPost, toastError, toastSuccess } = vi.hoisted(() => ({
  apiPost: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api: { post: apiPost } }));
vi.mock('react-hot-toast', () => ({ default: { error: toastError, success: toastSuccess } }));

describe('FeedbackPage submission (Phase 14C regression)', () => {
  beforeEach(() => {
    apiPost.mockResolvedValue({ data: { success: true } });
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('submits public feedback payload without authentication changes', async () => {
    render(<MemoryRouter><FeedbackPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Your email address'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Subject' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'This is enough body text.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/admin/feedback', {
      email: 'user@example.com',
      subject: 'Subject',
      body: 'This is enough body text.',
    }));
    expect(toastSuccess).toHaveBeenCalledWith('Thank you — feedback sent!');
    expect(await screen.findByText('Thank you for your feedback')).toBeTruthy();
  });
});
