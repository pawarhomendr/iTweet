// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Conversation, Message, User } from '@/types';
import { ChatPage } from './ChatPage';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('@/lib/api', () => ({
  api: { get: apiGet, post: vi.fn() },
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: () => ({
    user: { _id: 'user-me', username: 'me' },
  }),
}));

vi.mock('@/store/socket', () => ({
  useSocketStore: () => ({
    socket: null,
    isUserOnline: () => false,
  }),
}));

const currentUser = {
  _id: 'user-me',
  username: 'me',
} as User;

const otherUser = {
  _id: 'user-other',
  username: 'other',
  displayName: 'Other User',
  avatar: '',
  isVerified: false,
} as User;

function makeConversation(participants: unknown[]): Conversation {
  return {
    _id: 'conversation-1',
    participants,
    lastMessage: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as unknown as Conversation;
}

function makeMessage(sender: unknown, text: string): Message {
  return {
    _id: `message-${text}`,
    conversation: 'conversation-1',
    sender,
    text,
    isRead: true,
    createdAt: '2026-01-01T12:00:00.000Z',
  } as unknown as Message;
}

function renderChat(conversation: Conversation, messages: Message[]) {
  apiGet.mockImplementation((url: string) => {
    if (url === '/conversations') {
      return Promise.resolve({ data: { data: { conversations: [conversation] } } });
    }

    return Promise.resolve({ data: { data: { messages } } });
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChatPage nullable data handling', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps valid participant and message rendering intact', async () => {
    renderChat(
      makeConversation([currentUser, otherUser]),
      [makeMessage(otherUser, 'Hello from another user')],
    );

    fireEvent.click(await screen.findByText('Other User'));

    expect(await screen.findByText('Hello from another user')).toBeTruthy();
    expect(screen.getAllByText('Other User').length).toBeGreaterThan(0);
  });

  it('renders a message whose populated sender is null', async () => {
    renderChat(
      makeConversation([currentUser, otherUser]),
      [makeMessage(null, 'Message with unavailable sender')],
    );

    fireEvent.click(await screen.findByText('Other User'));

    expect(await screen.findByText('Message with unavailable sender')).toBeTruthy();
  });

  it('renders an unavailable participant fallback without crashing', async () => {
    renderChat(makeConversation([currentUser, null]), []);

    const fallback = await screen.findByText('Unavailable participant');
    expect(fallback).toBeTruthy();

    fireEvent.click(fallback);
    expect((await screen.findAllByText('Unavailable participant')).length).toBeGreaterThan(0);
  });
});
