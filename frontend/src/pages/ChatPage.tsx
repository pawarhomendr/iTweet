import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Conversation, Message } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useSocketStore } from '@/store/socket';
import { CheckBadgeIcon, ImageIcon, GifIcon, CloseIcon, DownloadIcon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';

// Curated development/testing GIF list for high reliability offline or when external provider keys aren't configured
const POPULAR_GIFS = [
  { id: '1', title: 'Ship It', url: 'https://media.giphy.com/media/DhstvI3zZ598Nb1rFf/giphy.gif' },
  { id: '2', title: 'Celebrate', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif' },
  { id: '3', title: 'Mind Blown', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
  { id: '4', title: 'Bug Hunting', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' },
  { id: '5', title: 'Coffee Time', url: 'https://media.giphy.com/media/3o85xGocUH8RYoDKKs/giphy.gif' },
  { id: '6', title: 'Nice Job', url: 'https://media.giphy.com/media/11ISwbgCxEzMyY/giphy.gif' },
];

interface SafeParticipant {
  id: string | null;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
}

const FALLBACK_PARTICIPANT: SafeParticipant = {
  id: null,
  username: 'Unavailable participant',
  displayName: 'Unavailable participant',
  avatar: '',
  isVerified: false,
};

function normalizeParticipant(value: unknown): SafeParticipant | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const id = typeof record._id === 'string' && record._id.trim() ? record._id.trim() : null;
  const username = typeof record.username === 'string' ? record.username.trim() : '';
  const displayName = typeof record.displayName === 'string' ? record.displayName.trim() : '';
  const avatar = typeof record.avatar === 'string' ? record.avatar : '';

  if (!id && !username && !displayName && !avatar) return null;

  const label = displayName || username || FALLBACK_PARTICIPANT.displayName;
  return {
    id,
    username: username || label,
    displayName: label,
    avatar,
    isVerified: record.isVerified === true,
  };
}

function isCurrentUserSender(
  sender: unknown,
  currentUser: { _id?: unknown; username?: unknown } | null,
): boolean {
  if (!sender || typeof sender !== 'object') return false;

  const record = sender as Record<string, unknown>;
  return (
    (typeof record._id === 'string' && record._id === currentUser?._id) ||
    (typeof record.username === 'string' && record.username === currentUser?.username)
  );
}

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const withUser = searchParams.get('with');
  const { user } = useAuthStore();
  const { socket, isUserOnline } = useSocketStore();
  const queryClient = useQueryClient();

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxMessageId, setLightboxMessageId] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

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
          setPartnerTyping(false);
          setActiveConv(res.data.data.conversation);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        })
        .catch(() => toast.error(`Could not start conversation with @${withUser}`));
    }
  }, [withUser, user, queryClient]);

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

  // Listen for new messages & typing via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (activeConv && msg.conversation === activeConv._id) {
        setMessages((prev) => [...prev, msg]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setPartnerTyping(false);
      }
    };

    const handleTypingStart = ({ conversationId }: { conversationId: string }) => {
      if (activeConv && conversationId === activeConv._id) {
        setPartnerTyping(true);
      }
    };

    const handleTypingStop = ({ conversationId }: { conversationId: string }) => {
      if (activeConv && conversationId === activeConv._id) {
        setPartnerTyping(false);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    const handleReactionUpdate = ({ messageId, reactions }: { messageId: string; reactions: Message['reactions'] }) => {
      setMessages((previous) => previous.map((message) => (
        message._id === messageId ? { ...message, reactions: reactions ?? [] } : message
      )));
    };
    socket.on('reaction:update', handleReactionUpdate);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('reaction:update', handleReactionUpdate);
    };
  }, [socket, activeConv]);

  // Scroll to bottom on load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed in chat');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setAttachedImage(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const clearAttachedImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setAttachedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle typing notification
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (socket && activeConv) {
      socket.emit('typing:start', { conversationId: activeConv._id });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { conversationId: activeConv._id });
      }, 1500);
    }
  };

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !socket) return;
    if (!text.trim() && !attachedImage) return;

    let imageUrl = '';
    if (attachedImage) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('image', attachedImage);
        const res = await api.post<{ data: { url: string } }>(`/conversations/${activeConv._id}/upload`, formData);
        imageUrl = res.data.data.url;
      } catch {
        toast.error('Failed to upload image. Please try again.');
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
      clearAttachedImage();
    }

    socket.emit('message:send', {
      conversationId: activeConv._id,
      text: text.trim(),
      imageUrl,
    });

    setText('');
    if (socket && activeConv) {
      socket.emit('typing:stop', { conversationId: activeConv._id });
    }
  };

  // Send GIF
  const handleSendGif = (gifUrl: string) => {
    if (!activeConv || !socket) return;

    socket.emit('message:send', {
      conversationId: activeConv._id,
      gifUrl,
    });

    setGifPickerOpen(false);
    setGifSearch('');
  };

  const handleDownloadImage = async (messageId: string) => {
    if (!activeConv) return;
    try {
      const response = await api.get(`/conversations/${activeConv._id}/messages/${messageId}/image`, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      const disposition = response.headers['content-disposition'] as string | undefined;
      const filename = disposition?.match(/filename="([^"]+)"/)?.[1];
      anchor.download = filename || `indiagram-chat-${messageId}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Unable to download this image. Please try again.');
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!activeConv || !socket) return;
    socket.emit('reaction:toggle', { conversationId: activeConv._id, messageId, emoji });
    setReactionPickerMessageId(null);
  };

  const getOtherParticipant = (conv: Conversation): SafeParticipant => {
    const rawParticipants = (conv as Conversation & { participants?: unknown }).participants;
    const participants = (Array.isArray(rawParticipants) ? rawParticipants : [])
      .map(normalizeParticipant)
      .filter((participant): participant is SafeParticipant => participant !== null);

    const currentUserId = user?._id;
    const currentUsername = user?.username;
    return participants.find((participant) => (
      participant.id !== currentUserId && participant.username !== currentUsername
    )) ?? FALLBACK_PARTICIPANT;
  };

  const filteredGifs = POPULAR_GIFS.filter((g) =>
    g.title.toLowerCase().includes(gifSearch.toLowerCase())
  );

  return (
    <div className="shell page-content" style={{ maxWidth: '1000px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '20px' }}>
        <p className="eyebrow">{'// real-time messaging'}</p>
        <h1
          style={{
            fontFamily: 'var(--heading)',
            fontSize: '30px',
            fontWeight: 600,
            letterSpacing: '-.02em',
            color: 'var(--ink)',
            marginTop: '4px',
          }}
        >
          Direct Messages
        </h1>
      </div>

      <div
        className="card chat-shell-card"
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          minHeight: '620px',
          overflow: 'hidden',
          border: '1px solid var(--rule)',
        }}
      >
        {/* Sidebar: conversation list */}
        <div
          className={`chat-sidebar ${activeConv ? 'mobile-hidden' : ''}`}
          style={{
            borderRight: '1px solid var(--rule)',
            background: 'var(--surface-2)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Conversations
            </span>
            <span className="mono dim" style={{ fontSize: '11px' }}>
              {conversations.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <p className="dim mono" style={{ fontSize: '12px' }}>
                  No conversations yet.
                </p>
                <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '13px', marginTop: '6px' }}>
                  Start a conversation by visiting any creator&apos;s profile.
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const other = getOtherParticipant(c);
                const isActive = activeConv?._id === c._id;
                const online = other.id ? isUserOnline(other.id) : false;

                return (
                  <div
                    key={c._id}
                    onClick={() => {
                      setPartnerTyping(false);
                      setActiveConv(c);
                    }}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--rule-2)',
                      background: isActive ? 'var(--surface)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                      transition: 'background-color .12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Avatar with live status dot */}
                      <div style={{ position: 'relative' }}>
                        <img
                          src={
                            other.avatar ||
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(other.username)}`
                          }
                          alt=""
                          aria-hidden="true"
                          className="avatar avatar-sm"
                          style={{ border: '1.5px solid var(--rule)' }}
                        />
                        <span
                          title={online ? 'Online now' : 'Offline'}
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: online ? 'var(--success)' : 'var(--muted)',
                            border: '1.5px solid var(--surface)',
                          }}
                        />
                      </div>

                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)', display: 'flex', alignItems: 'center' }}>
                          {other.displayName || other.username}
                          {other.isVerified && <CheckBadgeIcon />}
                        </div>
                        <div className="dim mono" style={{ fontSize: '11px', marginTop: '1px' }}>
                          @{other.username} · {online ? <span style={{ color: 'var(--success)' }}>Online</span> : 'Offline'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message view */}
        <div
          className={`chat-content ${!activeConv ? 'mobile-hidden' : ''}`}
          style={{ display: 'flex', flexDirection: 'column', height: '620px', background: 'var(--surface)' }}
        >
          {activeConv ? (
            <>
              {/* Header */}
              {(() => {
                const other = getOtherParticipant(activeConv);
                const online = other.id ? isUserOnline(other.id) : false;

                return (
                  <div
                    style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--rule)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--surface)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Mobile back button */}
                      <button
                        type="button"
                        className="mobile-back-btn"
                        onClick={() => setActiveConv(null)}
                        aria-label="Back to conversations list"
                        style={{
                          display: 'none',
                          padding: '6px',
                          marginRight: '2px',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                        }}
                      >
                        ←
                      </button>

                      <div style={{ position: 'relative' }}>
                        <img
                          src={
                            other.avatar ||
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(other.username)}`
                          }
                          alt=""
                          aria-hidden="true"
                          className="avatar avatar-sm"
                          style={{ border: '1.5px solid var(--rule)' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: online ? 'var(--success)' : 'var(--muted)',
                            border: '1.5px solid var(--surface)',
                          }}
                        />
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', display: 'flex', alignItems: 'center' }}>
                          {other.displayName || other.username}
                          {other.isVerified && <CheckBadgeIcon />}
                        </div>
                        <div className="mono" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: online ? 'var(--success)' : 'var(--muted)' }}>
                            {online ? 'Active now' : 'Offline'}
                          </span>
                          {partnerTyping && (
                            <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
                              is typing...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Message scroll container */}
              <div
                style={{
                  flex: 1,
                  padding: '24px 20px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {messages.length === 0 ? (
                  <p className="dim" style={{ margin: 'auto', fontFamily: 'var(--prose)', fontStyle: 'italic', fontSize: '14px' }}>
                    Send a message to begin the conversation.
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMe = !!m.sender && isCurrentUserSender(m.sender, user);
                    const reactionCounts = (m.reactions ?? []).reduce<Record<string, { count: number; reacted: boolean }>>((result, reaction) => {
                      const current = result[reaction.emoji] ?? { count: 0, reacted: false };
                      result[reaction.emoji] = {
                        count: current.count + 1,
                        reacted: current.reacted || reaction.userId === user?._id,
                      };
                      return result;
                    }, {});
                    return (
                      <div
                        key={m._id}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        {/* Image message */}
                        {m.imageUrl && (
                          <div className="chat-media-wrap">
                            <img
                              src={m.imageUrl}
                              alt="Attachment"
                              onClick={() => { setLightboxUrl(m.imageUrl || null); setLightboxMessageId(m._id); }}
                              style={{
                                borderRadius: '12px',
                                maxWidth: '100%',
                                maxHeight: '260px',
                                objectFit: 'cover',
                                cursor: 'zoom-in',
                                border: '1px solid var(--rule)',
                              }}
                            />
                            <button type="button" className="chat-media-download" aria-label="Download image" title="Download image" onClick={() => void handleDownloadImage(m._id)}>
                              <DownloadIcon />
                            </button>
                          </div>
                        )}

                        {/* GIF message */}
                        {m.gifUrl && (
                          <div className="chat-media-wrap">
                            <img
                              src={m.gifUrl}
                              alt="GIF"
                              onClick={() => { setLightboxUrl(m.gifUrl || null); setLightboxMessageId(null); }}
                              style={{
                                borderRadius: '12px',
                                maxWidth: '100%',
                                maxHeight: '260px',
                                objectFit: 'cover',
                                cursor: 'zoom-in',
                                border: '1px solid var(--rule)',
                              }}
                            />
                          </div>
                        )}

                        {/* Text bubble */}
                        {m.text && (
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              background: isMe ? 'var(--accent)' : 'var(--surface-2)',
                              color: isMe ? '#FFFFFF' : 'var(--ink)',
                              border: isMe ? 'none' : '1px solid var(--rule)',
                              fontSize: '14px',
                              lineHeight: 1.5,
                              wordBreak: 'break-word',
                            }}
                          >
                            <p>{m.text}</p>
                          </div>
                        )}

                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--muted)',
                            textAlign: isMe ? 'right' : 'left',
                            fontFamily: 'var(--mono)',
                            paddingInline: '2px',
                          }}
                        >
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="message-reaction-row" aria-label="Message reactions">
                          {Object.entries(reactionCounts).map(([emoji, value]) => (
                            <button
                              key={emoji}
                              type="button"
                              className={`message-reaction ${value.reacted ? 'is-reacted' : ''}`}
                              onClick={() => handleReaction(m._id, emoji)}
                              aria-label={`${value.count} ${emoji} reaction${value.count === 1 ? '' : 's'}`}
                            >
                              <span aria-hidden="true">{emoji}</span>
                              <span>{value.count}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="message-reaction-trigger"
                            onClick={() => setReactionPickerMessageId((current) => current === m._id ? null : m._id)}
                            aria-label="Add reaction"
                            aria-expanded={reactionPickerMessageId === m._id}
                          >
                            +
                          </button>
                        </div>

                        {reactionPickerMessageId === m._id && (
                          <div className="message-reaction-picker" role="group" aria-label="Choose a reaction">
                            {['❤️', '👍', '😂', '😮', '😢', '🔥'].map((emoji) => (
                              <button key={emoji} type="button" onClick={() => handleReaction(m._id, emoji)} aria-label={`React ${emoji}`}>
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attached image preview banner */}
              {imagePreviewUrl && (
                <div
                  style={{
                    padding: '8px 20px',
                    background: 'var(--surface-2)',
                    borderTop: '1px solid var(--rule)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                  <div style={{ flex: 1, fontSize: '13px' }}>
                    <p style={{ fontWeight: 500 }}>Image ready to send</p>
                    <p className="dim mono" style={{ fontSize: '11px' }}>{(attachedImage?.size ?? 0) / 1024 < 1000 ? `${Math.round((attachedImage?.size ?? 0) / 1024)} KB` : `${((attachedImage?.size ?? 0) / (1024 * 1024)).toFixed(1)} MB`}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearAttachedImage}
                    className="icon-btn"
                    aria-label="Remove image attachment"
                    style={{ width: '28px', height: '28px' }}
                  >
                    <CloseIcon />
                  </button>
                </div>
              )}

              {/* GIF Selector Panel */}
              {gifPickerOpen && (
                <div
                  style={{
                    padding: '16px 20px',
                    background: 'var(--surface-2)',
                    borderTop: '1px solid var(--rule)',
                    maxHeight: '240px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)' }}>
                      Select a GIF
                    </span>
                    <button
                      type="button"
                      onClick={() => setGifPickerOpen(false)}
                      style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}
                    >
                      Close ✕
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Search GIFs..."
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--rule)',
                      fontSize: '13px',
                      marginBottom: '12px',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                    {filteredGifs.map((gif) => (
                      <div
                        key={gif.id}
                        onClick={() => handleSendGif(gif.url)}
                        style={{
                          borderRadius: '6px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          height: '90px',
                          border: '1.5px solid var(--rule)',
                          background: 'var(--surface)',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={gif.url}
                          alt={gif.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '4px',
                            fontSize: '10px',
                            color: '#fff',
                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                            fontFamily: 'var(--mono)',
                          }}
                        >
                          {gif.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Composer */}
              <form
                onSubmit={handleSend}
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid var(--rule)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--surface)',
                }}
              >
                {/* Hidden image input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                />

                {/* Attach image button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="icon-btn"
                  title="Attach image"
                  aria-label="Attach image"
                  style={{ width: '38px', height: '38px' }}
                >
                  <ImageIcon />
                </button>

                {/* Attach GIF button */}
                <button
                  type="button"
                  onClick={() => setGifPickerOpen(!gifPickerOpen)}
                  className="icon-btn"
                  title="Attach GIF"
                  aria-label="Attach GIF"
                  style={{ width: '38px', height: '38px' }}
                >
                  <GifIcon />
                </button>

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={text}
                  onChange={handleTextChange}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--rule)',
                    background: 'var(--paper)',
                    fontFamily: 'var(--display)',
                    fontSize: '14px',
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                />

                <button
                  type="submit"
                  className="btn btn-sm btn-accent"
                  disabled={uploadingImage || (!text.trim() && !attachedImage)}
                >
                  {uploadingImage ? 'Uploading...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state" style={{ margin: 'auto' }}>
              <h3 style={{ fontFamily: 'var(--heading)' }}>Select a conversation</h3>
              <p>Choose an account from the left to read or send messages.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => { setLightboxUrl(null); setLightboxMessageId(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out',
          }}
        >
          <div onClick={(event) => event.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <img
              src={lightboxUrl}
              alt="Fullscreen media"
              style={{
                maxWidth: '90vw',
                maxHeight: '78vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              }}
            />
            {lightboxMessageId && (
              <button type="button" className="btn btn-sm btn-accent" onClick={() => void handleDownloadImage(lightboxMessageId)}>
                <DownloadIcon />
                Download image
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .chat-shell-card { grid-template-columns: 1fr !important; }
          .mobile-hidden { display: none !important; }
          .mobile-back-btn { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
};
