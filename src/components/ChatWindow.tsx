import {
  useState, useEffect, useRef, useCallback,
  type KeyboardEvent, type UIEvent
} from 'react';
import { useAuthStore, useChatStore } from '../store';
import { roomApi, messageApi } from '../api';
import { Avatar } from './Avatar';
import { SearchPanel } from './SearchPanel';
import { MessageSkeletonList } from './Skeleton';
import { useToast } from './Toast';
import { UserProfileModal } from './UserProfileModal';
import {
  getRoomName, getRoomAvatar, formatMessageTime,
  formatFullTime, getAvatarColor
} from '../utils';
import type { Room, Message } from '../types';

interface ChatWindowProps {
  room: Room;
  onSendTyping: (roomId: number, isTyping: boolean) => void;
  onInfoOpen: () => void;
}

const PAGE_SIZE = 50;

export function ChatWindow({ room, onSendTyping, onInfoOpen }: ChatWindowProps) {
  const roomId = Number(room.id); // ← normalize sekali, pakai di semua tempat

  const user = useAuthStore((s) => s.user);
  const roomMessages = useChatStore((s) => s.messages[roomId] || []);
  const setMessages  = useChatStore((s) => s.setMessages);
  const addMessage   = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const typing       = useChatStore((s) => s.typing);
  const onlineUsers  = useChatStore((s) => s.onlineUsers);
  const toast = useToast();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msg: Message; x: number; y: number } | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightMsgId, setHighlightMsgId] = useState<number | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const msgRefs = useRef<Record<number, HTMLDivElement>>({});

  const roomName = getRoomName(room, user);
  const avatarSrc = getRoomAvatar(room, user);
  const isGroup = room.type === 'group';
  const otherMember = !isGroup ? room.members?.find((m) => Number(m.user_id) !== Number(user?.id)) : null;
  const isOtherOnline = otherMember ? onlineUsers.has(Number(otherMember.user_id)) : false;

  const typingUsers = typing[roomId]
    ? Object.entries(typing[roomId])
        .filter(([uid, isTyping]: [string, boolean]) => isTyping && Number(uid) !== Number(user?.id))
        .map(([uid]: [string, boolean]) =>
          room.members?.find((m) => Number(m.user_id) === Number(uid))?.user?.username || 'Seseorang'
        )
    : [];

  // ── Load messages on mount ──────────────────────────────────
  useEffect(() => {
    setLoadingMsgs(true);
    setPage(1);
    setHasMore(true);
    msgRefs.current = {};
    roomApi
      .getMessages(roomId, 1, PAGE_SIZE)
      .then((res) => {
        const data = res.data || [];
        setMessages(roomId, data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => toast.error('Gagal memuat pesan'))
      .finally(() => setLoadingMsgs(false));
  }, [roomId]);

  // ── Mark as read ────────────────────────────────────────────
  useEffect(() => {
    roomApi.markRead(roomId).catch(console.error);
  }, [roomId, roomMessages.length]);

  // ── Scroll to bottom on new message ─────────────────────────
  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomMessages.length]);

  // ── Close context menu on outside click ─────────────────────
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Scroll handler ──────────────────────────────────────────
  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distFromBottom > 300);

    if (el.scrollTop < 80 && !loadingMore && hasMore && roomMessages.length > 0) {
      const nextPage = page + 1;
      const prevScrollHeight = el.scrollHeight;
      setLoadingMore(true);
      roomApi
        .getMessages(roomId, nextPage, PAGE_SIZE)
        .then((res) => {
          const older = res.data || [];
          if (older.length < PAGE_SIZE) setHasMore(false);
          if (older.length > 0) {
            setMessages(roomId, [...older, ...roomMessages]);
            setPage(nextPage);
            requestAnimationFrame(() => {
              if (messagesAreaRef.current) {
                messagesAreaRef.current.scrollTop =
                  messagesAreaRef.current.scrollHeight - prevScrollHeight;
              }
            });
          }
        })
        .catch(() => toast.error('Gagal memuat pesan lama'))
        .finally(() => setLoadingMore(false));
    }
  }, [loadingMore, hasMore, page, roomMessages, roomId]);

  // ── Typing indicator ────────────────────────────────────────
  const handleInputChange = (value: string) => {
    setInput(value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
    onSendTyping(roomId, true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => onSendTyping(roomId, false), 1500);
  };

  // ── Send / Edit ─────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || sending) return;

    if (editingMsg) {
      try {
        const res = await messageApi.edit(editingMsg.id, { content });
        updateMessage(roomId, res.data);
        setEditingMsg(null);
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        toast.success('Pesan diperbarui');
      } catch {
        toast.error('Gagal mengedit pesan');
      }
      return;
    }

    setSending(true);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    try {
      const res = await roomApi.sendMessage(roomId, { content, type: 'text' });
      addMessage(roomId, res.data);
      onSendTyping(roomId, false);
      setShowScrollBottom(false);
    } catch {
      toast.error('Gagal mengirim pesan');
      setInput(content);
    } finally {
      setSending(false);
    }
  }, [input, sending, editingMsg, roomId, toast]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Delete ──────────────────────────────────────────────────
  const handleDeleteMsg = async (msg: Message) => {
    setContextMenu(null);
    try {
      await messageApi.delete(msg.id);
      removeMessage(roomId, msg.id);
      toast.success('Pesan dihapus');
    } catch {
      toast.error('Gagal menghapus pesan');
    }
  };

  // ── Jump to message from search ─────────────────────────────
  const handleJumpTo = (msgId: number) => {
    setShowSearch(false);
    setHighlightMsgId(msgId);
    const el = msgRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setHighlightMsgId(null), 2000);
  };

  // ── Context menu ────────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    if (msg.deletedAt) return;
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 130);
    setContextMenu({ msg, x, y });
  };

  // ── Group by date ────────────────────────────────────────────
  const grouped = roomMessages.reduce<{ date: string; messages: Message[] }[]>((acc, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const g = acc.find((x) => x.date === date);
    if (g) g.messages.push(msg);
    else acc.push({ date, messages: [msg] });
    return acc;
  }, []);

  return (
    <div className="chat-window">

      {/* ── Header ─────────────────────────────────── */}
      <header className="chat-header">
        <button className="chat-header-info" onClick={onInfoOpen}>
          {isGroup ? (
            <div className="group-avatar" style={{ background: getAvatarColor(roomName) }}>
              <IconGroup />
            </div>
          ) : (
            <Avatar name={roomName} src={avatarSrc} size="md" online={isOtherOnline} />
          )}
          <div className="chat-header-text">
            <span className="chat-header-name">{roomName}</span>
            <span className="chat-header-status">
              {typingUsers.length > 0
                ? <em>{typingUsers[0]} sedang mengetik...</em>
                : isGroup
                ? `${room.members?.length || 0} anggota`
                : isOtherOnline
                ? 'Online'
                : 'Terakhir dilihat baru-baru ini'}
            </span>
          </div>
        </button>
        <div className="chat-header-actions">
          <button
            className="icon-btn"
            title="Cari pesan"
            onClick={() => setShowSearch((v) => !v)}
            style={{ color: showSearch ? 'var(--accent)' : undefined }}
          >
            <IconSearch />
          </button>
          <button className="icon-btn" title="Info" onClick={onInfoOpen}>
            <IconInfo />
          </button>
        </div>
      </header>

      {/* ── Search panel ───────────────────────────── */}
      {showSearch && (
        <SearchPanel
          roomId={roomId}
          onClose={() => setShowSearch(false)}
          onJumpTo={handleJumpTo}
        />
      )}

      {/* ── Messages ───────────────────────────────── */}
      <div
        ref={messagesAreaRef}
        className="messages-area"
        onScroll={handleScroll}
        style={{ backgroundImage: 'var(--chat-bg-pattern)' }}
      >
        {loadingMore && (
          <div className="load-more-indicator">
            <div className="spinner-sm" />
          </div>
        )}

        {loadingMsgs ? (
          <MessageSkeletonList />
        ) : (
          grouped.map(({ date, messages: msgs }) => (
            <div key={date}>
              <div className="date-separator"><span>{date}</span></div>
              {msgs.map((msg, idx) => {
                const isOwn = Number(msg.sender_id) === Number(user?.id);
                const isDeleted = !!msg.deletedAt;
                const prevMsg = msgs[idx - 1];
                const showAvatar =
                  isGroup && !isOwn &&
                  (!prevMsg || Number(prevMsg.sender_id) !== Number(msg.sender_id));
                const isHighlighted = msg.id === highlightMsgId;

                return (
                  <div
                    key={msg.id}
                    ref={(el) => { if (el) msgRefs.current[msg.id] = el; }}
                    className={[
                      'message-row',
                      isOwn ? 'own' : 'other',
                      isHighlighted ? 'highlighted' : '',
                    ].filter(Boolean).join(' ')}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                  >
                    {isGroup && !isOwn && (
                      <div style={{ width: 28, flexShrink: 0, alignSelf: 'flex-end' }}>
                        {showAvatar && (
                          <button
                            onClick={() => setViewingUserId(Number(msg.sender_id))}
                            style={{ borderRadius: '50%' }}
                          >
                            <Avatar
                              name={msg.sender?.username || ''}
                              src={msg.sender?.avatar}
                              size="sm"
                            />
                          </button>
                        )}
                      </div>
                    )}

                    <div
                      className={[
                        'message-bubble',
                        isOwn ? 'own' : 'other',
                        isDeleted ? 'deleted' : '',
                        isHighlighted ? 'highlight-pulse' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {isGroup && !isOwn && showAvatar && (
                        <button
                          className="message-sender-name"
                          style={{
                            color: getAvatarColor(msg.sender?.username || ''),
                            background: 'none', border: 'none',
                            padding: 0, cursor: 'pointer', textAlign: 'left',
                          }}
                          onClick={() => setViewingUserId(Number(msg.sender_id))}
                        >
                          {msg.sender?.username}
                        </button>
                      )}

                      <p className="message-text">
                        {isDeleted
                          ? <span className="deleted-text">🚫 Pesan ini dihapus</span>
                          : msg.content}
                      </p>

                      <div className="message-meta">
                        <span className="message-time" title={formatFullTime(msg.createdAt)}>
                          {formatMessageTime(msg.createdAt)}
                        </span>
                        {isOwn && !isDeleted && (
                          <span className="message-check" title="Terkirim">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Typing dots */}
        {typingUsers.length > 0 && (
          <div className="message-row other">
            <div className="message-bubble other typing-bubble">
              <div className="typing-dots"><span /><span /><span /></div>
              <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8 }}>
                {typingUsers[0]} sedang mengetik...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Scroll to bottom ───────────────────────── */}
      {showScrollBottom && (
        <button
          className="scroll-bottom-btn"
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowScrollBottom(false);
          }}
          title="Gulir ke bawah"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
        </button>
      )}

      {/* ── Edit banner ────────────────────────────── */}
      {editingMsg && (
        <div className="edit-banner">
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="edit-label">✏️ Edit Pesan</span>
            <p className="edit-preview">{editingMsg.content}</p>
          </div>
          <button
            onClick={() => {
              setEditingMsg(null);
              setInput('');
              if (inputRef.current) inputRef.current.style.height = 'auto';
            }}
            className="edit-cancel"
          >×</button>
        </div>
      )}

      {/* ── Input ──────────────────────────────────── */}
      <div className="input-area">
        <button className="icon-btn" title="Emoji" style={{ color: '#8696A0' }}>
          <IconEmoji />
        </button>
        <div className="input-wrap">
          <textarea
            ref={inputRef}
            className="message-input"
            placeholder="Ketik pesan"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>
        <button
          className={`send-btn ${input.trim() ? 'active' : ''}`}
          onClick={handleSend}
          disabled={!input.trim() || sending}
          title={input.trim() ? 'Kirim' : 'Rekam suara'}
        >
          {sending
            ? <span className="spinner-sm" style={{ borderTopColor: '#fff' }} />
            : input.trim() ? <IconSend /> : <IconMic />}
        </button>
      </div>

      {/* ── Context menu ───────────────────────────── */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {Number(contextMenu.msg.sender_id) !== Number(user?.id) && (
            <button onClick={() => {
              setViewingUserId(Number(contextMenu.msg.sender_id));
              setContextMenu(null);
            }}>
              👤 Lihat Profil
            </button>
          )}
          {Number(contextMenu.msg.sender_id) === Number(user?.id) && (
            <>
              <button onClick={() => {
                setEditingMsg(contextMenu.msg);
                setInput(contextMenu.msg.content);
                setContextMenu(null);
                inputRef.current?.focus();
              }}>
                ✏️ Edit Pesan
              </button>
              <button className="danger" onClick={() => handleDeleteMsg(contextMenu.msg)}>
                🗑️ Hapus Pesan
              </button>
            </>
          )}
        </div>
      )}

      {/* ── User profile modal ────────────────────── */}
      {viewingUserId !== null && (
        <UserProfileModal
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
        />
      )}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────
function IconGroup() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff">
      <path d="M16.5 13c-1.2 0-3.07.34-4.5 1-1.43-.67-3.3-1-4.5-1C5.33 13 1 14.08 1 16.25V18h22v-1.75c0-2.17-4.33-3.25-6.5-3.25zm-7 3H3v-1.08c.51-.97 2.93-1.92 4.5-1.92.79 0 1.74.18 2.63.5A12.86 12.86 0 007.5 16zm9 0h-7c.05-.41.2-.74.44-1 .96-.79 2.73-1 3.56-1 1.57 0 3.99.95 4.5 1.92V16zm-9-6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm9 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M10.5 2a8.5 8.5 0 1 0 5.37 15.086l4.022 4.022 1.414-1.414-4.022-4.022A8.5 8.5 0 0 0 10.5 2zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  );
}
function IconEmoji() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
    </svg>
  );
}