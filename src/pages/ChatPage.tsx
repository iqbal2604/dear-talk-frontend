import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore, useChatStore } from '../store';
import { roomApi, userApi } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../components/Toast';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';
import { ProfilePanel } from '../components/ProfilePanel';
import { RoomInfoPanel } from '../components/RoomInfoPanel';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { RoomSkeleton } from '../components/Skeleton';
import type { Room, Message, WsTypingPayload, WsUserStatusPayload } from '../types';

// PWA install prompt event type
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function ChatPage() {
  const { user, token, updateUser } = useAuthStore();
  const {
    setRooms, addMessage, activeRoomId, rooms,
    setTyping, setUserOnline, setUserOffline,
    incrementUnread, clearUnread,
  } = useChatStore();
  const toast = useToast();

  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnecting, setWsReconnecting] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const activeRoomIdRef = useRef(activeRoomId);
  activeRoomIdRef.current = activeRoomId;

  // ── Load rooms + refresh user profile on mount ─────────────
  useEffect(() => {
    if (!user) return;

    // Refresh user profile from server
    userApi.getMe()
      .then((res) => updateUser(res.data))
      .catch(console.error);

    // Load all rooms
    setLoadingRooms(true);
    roomApi.getAll()
      .then((res) => setRooms(res.data || []))
      .catch(() => toast.error('Gagal memuat daftar chat'))
      .finally(() => setLoadingRooms(false));
  }, [user?.id]);

  // ── Sync active room when rooms updates ────────────────────
  useEffect(() => {
    if (!activeRoomId) { setActiveRoom(null); return; }
    const room = rooms.find((r) => r.id === activeRoomId);
    if (room) setActiveRoom(room);
  }, [activeRoomId, rooms]);

  // ── PWA install prompt ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 5s delay (not too aggressive)
      setTimeout(() => setShowInstallBanner(true), 5000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    setShowInstallBanner(false);
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('DearTalk berhasil dipasang!');
      setInstallPrompt(null);
    }
  };

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showProfile) { setShowProfile(false); return; }
        if (showRoomInfo) { setShowRoomInfo(false); return; }
        if (mobileView === 'chat') { setMobileView('list'); return; }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showProfile, showRoomInfo, mobileView]);

  // ── WebSocket: new message ─────────────────────────────────
  const handleNewMessage = useCallback((payload: unknown) => {
    const msg = payload as Message;
    addMessage(msg.room_id, msg);
    // If message is in a different room → increment unread
    if (msg.room_id !== activeRoomIdRef.current) {
      incrementUnread(msg.room_id);
      // Browser notification (if permission granted)
      if (Notification.permission === 'granted') {
        new Notification(msg.sender?.username || 'Pesan baru', {
          body: msg.content,
          icon: '/icon.svg',
          tag: `room-${msg.room_id}`,
        });
      }
    }
  }, [addMessage, incrementUnread]);

  const handleUserOnline = useCallback((payload: unknown) => {
    setUserOnline((payload as WsUserStatusPayload).user_id);
  }, [setUserOnline]);

  const handleUserOffline = useCallback((payload: unknown) => {
    setUserOffline((payload as WsUserStatusPayload).user_id);
  }, [setUserOffline]);

  const handleTyping = useCallback((payload: unknown) => {
    setTyping(payload as WsTypingPayload);
  }, [setTyping]);

  const handleWsOpen = useCallback(() => {
    setWsConnected(true);
    setWsReconnecting(false);
  }, []);

  const handleWsClose = useCallback(() => {
    setWsConnected(false);
    setWsReconnecting(true);
  }, []);

  const { sendTyping } = useWebSocket(token, {
    onNewMessage: handleNewMessage,
    onUserOnline: handleUserOnline,
    onUserOffline: handleUserOffline,
    onTyping: handleTyping,
    onOpen: handleWsOpen,
    onClose: handleWsClose,
  });

  // ── Request notification permission ───────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Request after 3s — not immediate
      const t = setTimeout(() => Notification.requestPermission(), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleRoomSelect = (room: Room) => {
    setActiveRoom(room);
    setShowRoomInfo(false);
    setMobileView('chat');
    clearUnread(room.id);
  };

  const handleRoomDeleted = () => {
    setActiveRoom(null);
    setShowRoomInfo(false);
    setMobileView('list');
  };

  // ── Panel click-outside to close ──────────────────────────
  const handleOverlayClick = (e: React.MouseEvent, close: () => void) => {
    if (e.target === e.currentTarget) close();
  };

  return (
    <div className={`app-layout ${mobileView === 'chat' ? 'mobile-chat' : ''}`}>

      {/* ── Connection banner ─────────────────────────────── */}
      {wsReconnecting && (
        <div className="connection-banner offline" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500 }}>
          <span className="spinner-sm" style={{ width: 12, height: 12, borderTopColor: '#ffd666' }} />
          <span>Menghubungkan ulang...</span>
        </div>
      )}
      {wsConnected && !wsReconnecting && (
        <div className="connection-banner online" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500 }}>
          <span>● Terhubung</span>
        </div>
      )}

      {/* ── PWA install banner ────────────────────────────── */}
      {showInstallBanner && installPrompt && (
        <div className="install-banner">
          <div className="install-banner-icon">
            <img src="/icon.svg" alt="DearTalk" width={32} height={32} />
          </div>
          <div className="install-banner-text">
            <strong>Pasang DearTalk</strong>
            <span>Akses lebih cepat dari layar utama</span>
          </div>
          <button className="install-banner-btn" onClick={handleInstallApp}>
            Pasang
          </button>
          <button className="install-banner-dismiss" onClick={() => setShowInstallBanner(false)}>
            ×
          </button>
        </div>
      )}

      {/* ── Sidebar ───────────────────────────────────────── */}
      <div className={`sidebar-wrapper ${mobileView === 'chat' ? 'mobile-hidden' : ''}`}>
        {loadingRooms ? (
          <div style={{ background: 'var(--bg-secondary)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              height: 60, background: 'var(--bg-tertiary)', flexShrink: 0,
              display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
            }}>
              <div className="skeleton-avatar" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skeleton-line short" />
              </div>
            </div>
            <div style={{ padding: '8px 0', flex: 1 }}>
              {Array.from({ length: 8 }).map((_, i) => <RoomSkeleton key={i} />)}
            </div>
          </div>
        ) : (
          <Sidebar
            onRoomSelect={handleRoomSelect}
            onProfileOpen={() => setShowProfile(true)}
          />
        )}
      </div>

      {/* ── Main area ─────────────────────────────────────── */}
      <main className="main-area">
        {activeRoom ? (
          <ChatWindow
            key={activeRoom.id}
            room={activeRoom}
            onSendTyping={sendTyping}
            onInfoOpen={() => setShowRoomInfo(true)}
          />
        ) : (
          <WelcomeScreen />
        )}
        {mobileView === 'chat' && (
          <button className="mobile-back-btn" onClick={() => setMobileView('list')}>
            ←
          </button>
        )}
      </main>

      {/* ── Profile panel ────────────────────────────────── */}
      {showProfile && (
        <div
          className="panel-overlay-backdrop"
          onClick={(e) => handleOverlayClick(e, () => setShowProfile(false))}
        >
          <div className="panel-overlay">
            <ProfilePanel onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}

      {/* ── Room info panel ───────────────────────────────── */}
      {showRoomInfo && activeRoom && (
        <div
          className="panel-overlay-backdrop"
          onClick={(e) => handleOverlayClick(e, () => setShowRoomInfo(false))}
        >
          <div className="panel-overlay">
            <RoomInfoPanel
              room={activeRoom}
              onClose={() => setShowRoomInfo(false)}
              onRoomDeleted={handleRoomDeleted}
            />
          </div>
        </div>
      )}
    </div>
  );
}
