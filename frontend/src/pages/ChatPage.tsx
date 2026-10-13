import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Conversation, Message } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useSocketStore } from '@/store/socket';
import { CheckBadgeIcon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const withUser = searchParams.get('with');
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const queryClient = useQueryClient();

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // List my conversations
  const { data: convsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get<{ data: { conversations: Conversation[] } }>('/conversations');
      return res.data.data.conversations;
    },
  });

  const conversations = convsData ?? [];

  // If a ?with=username is provided, create/fetch that conversation
  useEffect(() => {
    if (withUser && user) {
      api.post('/conversations', { username: withUser })
        .then((res) => {
          setActiveConv(res.data.data.conversation);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        })
        .catch(() => toast.error(`Could not start conversation with @${withUser}`));
    }
  }, [withUser, user]);

  // Load messages when conversation selected
  useEffect(() => {
    if (!activeConv) return;
    api.get<{ data: { messages: Message[] } }>(`/conversations/${activeConv._id}/messages`)
      .then((res) => setMessages(res.data.data.messages))
      .catch(() => toast.error('Failed to load messages'));

    if (socket) {
      socket.emit('join:conversation', activeConv._id);
    }
  }, [activeConv, socket]);

  // Listen for new messages via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg: Message) => {
      if (activeConv && msg.conversation === activeConv._id) {
        setMessages((prev) => [...prev, msg]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    socket.on('message:new', handleNewMessage);
    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, activeConv]);

  // Scroll to bottom on load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeConv || !socket) return;

    socket.emit('message:send', {
      conversationId: activeConv._id,
      text: text.trim(),
    });

    setText('');
  };

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find((p) => p.username !== user?.username) || conv.participants[0];
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '980px' }}>
      <p className="eyebrow">// creator messages</p>
      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>Direct Messages</h1>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '560px', overflow: 'hidden' }}>
        {/* Sidebar: conversation list */}
        <div style={{ borderRight: '1px solid var(--rule)', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--rule)' }}>
            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }} className="mono">
              Chats
            </h4>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <p className="dim mono" style={{ padding: '24px 16px', fontSize: '12px' }}>
                No active conversations. Start one from any creator's profile.
              </p>
            ) : (
              conversations.map((c) => {
                const other = getOtherParticipant(c);
                const isActive = activeConv?._id === c._id;
                return (
                  <div
                    key={c._id}
                    onClick={() => setActiveConv(c)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--rule-2)',
                      background: isActive ? 'var(--surface)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={other.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${other.username}`}
                        alt={other.username}
                        className="avatar avatar-sm"
                      />
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                          {other.displayName || other.username}
                          {other.isVerified && <CheckBadgeIcon />}
                        </div>
                        <div className="dim mono" style={{ fontSize: '11px' }}>@{other.username}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message view */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '560px' }}>
          {activeConv ? (
            <>
              {/* Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {(() => {
                  const other = getOtherParticipant(activeConv);
                  return (
                    <>
                      <img
                        src={other.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${other.username}`}
                        alt={other.username}
                        className="avatar avatar-sm"
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                          {other.displayName || other.username}
                          {other.isVerified && <CheckBadgeIcon />}
                        </div>
                        <div className="dim mono" style={{ fontSize: '11px' }}>@{other.username}</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Message scroll container */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((m) => {
                  const isMe = m.sender._id === user?._id || m.sender.username === user?.username;
                  return (
                    <div
                      key={m._id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: isMe ? 'var(--accent)' : 'var(--rule-2)',
                        color: isMe ? '#fff' : 'var(--ink)',
                        fontSize: '14px',
                        lineHeight: 1.5,
                      }}
                    >
                      <p>{m.text}</p>
                      <span style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', display: 'block', textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend} style={{ padding: '14px 20px', borderTop: '1px solid var(--rule)', display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '999px',
                    border: '1px solid var(--rule)', background: 'var(--paper)',
                    fontFamily: 'var(--display)', fontSize: '14px', color: 'var(--ink)',
                  }}
                />
                <button type="submit" className="btn btn-sm btn-accent" disabled={!text.trim()}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state" style={{ margin: 'auto' }}>
              <h3>Select a conversation</h3>
              <p>Pick a chat from the left to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
