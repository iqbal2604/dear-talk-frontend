import { useState, useMemo } from 'react';
import { useAuthStore, useChatStore } from '../store';
import { roomApi, userApi } from '../api';
import { Avatar } from './Avatar';
import {
  getRoomName, getRoomAvatar, formatRelativeTime,
  getAvatarColor, sortRoomsByActivity, truncate,
} from '../utils';
import type { User, Room } from '../types';

interface SidebarProps {
  onRoomSelect: (room: Room) => void;
  onProfileOpen: () => void;
}

export function Sidebar({ onRoomSelect, onProfileOpen }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const { rooms, activeRoomId, setActiveRoom, addRoom, unreadCounts } = useChatStore();
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [searchUsers, setSearchUsers] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<User[]>([]);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [tab, setTab] = useState<'chats' | 'status'>('chats');

  // Sort rooms by last message time
  const sortedRooms = useMemo(() => sortRoomsByActivity(rooms), [rooms]);

  const filteredRooms = useMemo(() =>
    sortedRooms.filter((room) =>
      getRoomName(room, user).toLowerCase().includes(search.toLowerCase())
    ),
    [sortedRooms, search, user]
  );

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const handleSearchUser = async (q: string) => {
    if (!q.trim()) { setSearchUsers([]); return; }
    setSearchLoading(true);
    try {
      const res = await userApi.search(q);
      setSearchUsers((res.data || []).filter((u) => u.id !== user?.id));
    } catch {
      setSearchUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStartPrivateChat = async (target: User) => {
    if (creatingRoom) return;
    // Check if private room with this user already exists
    const existing = rooms.find((r) =>
      r.type === 'private' &&
      r.members?.some((m) => Number(m.user_id) === Number(target.id))
    );
    if (existing) {
      setActiveRoom(existing.id);
      onRoomSelect(existing);
      setShowNewChat(false);
      setSearch('');
      return;
    }
    setCreatingRoom(true);
    try {
      const res = await roomApi.create({
        name: `${user?.username}_${target.username}`,
        type: 'private',
        members: [target.id],
      });
      addRoom(res.data);
      setActiveRoom(res.data.id);
      onRoomSelect(res.data);
      setShowNewChat(false);
      setSearch('');
      setSearchUsers([]);
    } catch {
      // ignore
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleSearchMember = async (q: string) => {
    setMemberSearch(q);
    if (!q.trim()) { setMemberResults([]); return; }
    try {
      const res = await userApi.search(q);
      setMemberResults(
        (res.data || []).filter(
          (u) => u.id !== user?.id && !selectedMembers.find((m) => m.id === u.id)
        )
      );
    } catch {
      setMemberResults([]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1 || creatingRoom) return;
    setCreatingRoom(true);
    try {
      const res = await roomApi.create({
        name: groupName.trim(),
        type: 'group',
        members: selectedMembers.map((m) => m.id),
      });
      addRoom(res.data);
      setActiveRoom(res.data.id);
      onRoomSelect(res.data);
      setShowNewGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      setMemberSearch('');
      setMemberResults([]);
    } catch {
      // ignore
    } finally {
      setCreatingRoom(false);
    }
  };

  const closeNewChat = () => {
    setShowNewChat(false);
    setSearchUsers([]);
  };

  const closeNewGroup = () => {
    setShowNewGroup(false);
    setGroupName('');
    setSelectedMembers([]);
    setMemberSearch('');
    setMemberResults([]);
  };

  return (
    <aside className="sidebar">
      {/* ── Header ─────────────────────────────── */}
      <header className="sidebar-header">
        <button className="sidebar-avatar-btn" onClick={onProfileOpen} title="Profil saya">
          <Avatar name={user?.username || ''} src={user?.avatar} size="md" online={true} />
        </button>
        <div style={{ flex: 1 }}>
          <span className="sidebar-brand">DearTalk</span>
        </div>
        <div className="sidebar-header-actions">
          {totalUnread > 0 && (
            <span className="header-unread-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
          )}
          <button
            className={`icon-btn ${showNewChat ? 'active-icon' : ''}`}
            title="Chat baru"
            onClick={() => { setShowNewChat(!showNewChat); if (showNewGroup) closeNewGroup(); }}
          >
            <IconNewChat />
          </button>
          <button
            className={`icon-btn ${showNewGroup ? 'active-icon' : ''}`}
            title="Grup baru"
            onClick={() => { setShowNewGroup(!showNewGroup); if (showNewChat) closeNewChat(); }}
          >
            <IconGroup />
          </button>
        </div>
      </header>

      {/* ── Tabs ───────────────────────────────── */}
      <div className="sidebar-tabs">
        <button
          className={`tab-btn ${tab === 'chats' ? 'active' : ''}`}
          onClick={() => setTab('chats')}
        >
          PESAN
        </button>
        <button
          className={`tab-btn ${tab === 'status' ? 'active' : ''}`}
          onClick={() => setTab('status')}
        >
          STATUS
        </button>
      </div>

      {/* ── Search ─────────────────────────────── */}
      <div className="sidebar-search">
        <div className="search-input-wrap">
          <IconSearch />
          <input
            placeholder="Cari atau mulai chat baru"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="search-clear">×</button>
          )}
        </div>
      </div>

      {/* ── New Chat Panel ──────────────────────── */}
      {showNewChat && (
        <div className="new-chat-panel">
          <div className="new-chat-header">
            <button onClick={closeNewChat} className="back-btn"><IconBack /></button>
            <span>Chat Baru</span>
          </div>
          <div className="new-chat-search">
            <IconSearch />
            <input
              autoFocus
              placeholder="Cari nama atau email..."
              onChange={(e) => handleSearchUser(e.target.value)}
            />
          </div>
          <div className="new-chat-results">
            {searchLoading && <div className="loading-text">Mencari...</div>}
            {!searchLoading && searchUsers.length === 0 && (
              <div className="loading-text" style={{ color: 'var(--text-muted)' }}>
                Ketik untuk mencari pengguna
              </div>
            )}
            {searchUsers.map((u) => (
              <button
                key={u.id}
                className="user-result-item"
                onClick={() => handleStartPrivateChat(u)}
                disabled={creatingRoom}
              >
                <Avatar name={u.username} src={u.avatar} size="md" online={onlineUsers.has(u.id)} />
                <div className="user-result-info">
                  <span className="user-result-name">{u.username}</span>
                  <span className="user-result-email">
                    {onlineUsers.has(u.id)
                      ? <span style={{ color: 'var(--accent)' }}>● Online</span>
                      : u.email}
                  </span>
                </div>
                {creatingRoom && <span className="spinner-sm" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── New Group Panel ─────────────────────── */}
      {showNewGroup && (
        <div className="new-chat-panel">
          <div className="new-chat-header">
            <button onClick={closeNewGroup} className="back-btn"><IconBack /></button>
            <span>Grup Baru</span>
          </div>
          <div className="new-chat-search" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
            <input
              placeholder="Nama grup..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconSearch />
              <input
                placeholder="Tambah anggota..."
                value={memberSearch}
                onChange={(e) => handleSearchMember(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {selectedMembers.length > 0 && (
            <div className="selected-members">
              {selectedMembers.map((m) => (
                <span key={m.id} className="member-chip">
                  {m.username}
                  <button onClick={() =>
                    setSelectedMembers((prev) => prev.filter((x) => x.id !== m.id))
                  }>×</button>
                </span>
              ))}
            </div>
          )}

          <div className="new-chat-results">
            {memberResults.map((u) => (
              <button
                key={u.id}
                className="user-result-item"
                onClick={() => {
                  setSelectedMembers((prev) => [...prev, u]);
                  setMemberResults([]);
                  setMemberSearch('');
                }}
              >
                <Avatar name={u.username} src={u.avatar} size="md" />
                <div className="user-result-info">
                  <span className="user-result-name">{u.username}</span>
                  <span className="user-result-email">{u.email}</span>
                </div>
              </button>
            ))}
          </div>

          {groupName.trim() && selectedMembers.length > 0 && (
            <div style={{ padding: '12px 16px' }}>
              <button
                className="btn-primary"
                onClick={handleCreateGroup}
                disabled={creatingRoom}
                style={{ width: '100%' }}
              >
                {creatingRoom
                  ? <span className="spinner" />
                  : `Buat Grup (${selectedMembers.length} anggota)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Room List ───────────────────────────── */}
      <div className="room-list">
        {tab === 'status' ? (
          <div className="empty-state">
            <span style={{ fontSize: 40 }}>🔔</span>
            <p>Status segera hadir</p>
            <span>Fitur ini masih dalam pengembangan</span>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="empty-state">
            <IconBubble />
            <p>{search ? 'Tidak ditemukan' : 'Belum ada chat'}</p>
            <span>{search ? 'Coba kata kunci lain' : 'Mulai percakapan baru'}</span>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const name = getRoomName(room, user);
            const avatarSrc = getRoomAvatar(room, user);
            const isActive = room.id === activeRoomId;
            const isGroup = room.type === 'group';
            const lastMsg = room.lastMessage;
            const otherMember = room.members?.find((m) => Number(m.user_id) !== Number(user?.id));
            const isOtherOnline = otherMember ? onlineUsers.has(otherMember.user_id) : false;
            const unread = unreadCounts[room.id] || 0;

            return (
              <button
                key={room.id}
                className={`room-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveRoom(room.id);
                  onRoomSelect(room);
                }}
              >
                {isGroup ? (
                  <div className="group-avatar" style={{ background: getAvatarColor(name) }}>
                    <IconGroupSm />
                  </div>
                ) : (
                  <Avatar name={name} src={avatarSrc} size="md" online={isOtherOnline} />
                )}

                <div className="room-item-content">
                  <div className="room-item-top">
                    <span className="room-item-name">{name}</span>
                    <span className="room-item-time">
                      {lastMsg ? formatRelativeTime(lastMsg.createdAt) : ''}
                    </span>
                  </div>
                  <div className="room-item-bottom">
                    <span className="room-item-preview">
                      {lastMsg
                        ? lastMsg.deletedAt
                          ? '🚫 Pesan dihapus'
                          : lastMsg.type === 'image'
                          ? '📷 Foto'
                          : lastMsg.type === 'file'
                          ? '📎 File'
                          : isGroup
                          ? `${lastMsg.sender?.username}: ${truncate(lastMsg.content, 30)}`
                          : truncate(lastMsg.content, 36)
                        : isGroup
                        ? 'Grup dibuat'
                        : 'Mulai percakapan'}
                    </span>
                    {unread > 0 && (
                      <span className="unread-badge">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

// ── Icons ─────────────────────────────────────────────────────
function IconNewChat() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.825h-6v-2h6v2zm2-4h-8v-2h8v2z" />
    </svg>
  );
}
function IconGroup({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <path d="M16.5 13c-1.2 0-3.07.34-4.5 1-1.43-.67-3.3-1-4.5-1C5.33 13 1 14.08 1 16.25V18h22v-1.75c0-2.17-4.33-3.25-6.5-3.25zm-7 3H3v-1.08c.51-.97 2.93-1.92 4.5-1.92.79 0 1.74.18 2.63.5A12.86 12.86 0 007.5 16zm9 0h-7c.05-.41.2-.74.44-1 .96-.79 2.73-1 3.56-1 1.57 0 3.99.95 4.5 1.92V16zm-9-6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm9 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
    </svg>
  );
}
function IconGroupSm() {
  return <IconGroup size={20} color="#fff" />;
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ color: '#8696A0', flexShrink: 0 }}>
      <path d="M10.5 2a8.5 8.5 0 1 0 5.37 15.086l4.022 4.022 1.414-1.414-4.022-4.022A8.5 8.5 0 0 0 10.5 2zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z" />
    </svg>
  );
}
function IconBack() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );
}
function IconBubble() {
  return (
    <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor"
      style={{ color: '#8696A0', opacity: 0.3 }}>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  );
}
