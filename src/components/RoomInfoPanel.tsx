import { useState } from 'react';
import { useAuthStore, useChatStore } from '../store';
import { roomApi, userApi } from '../api';
import { Avatar } from './Avatar';
import { getRoomName, getAvatarColor, formatFullTime } from '../utils';
import type { Room, User } from '../types';

interface RoomInfoPanelProps {
  room: Room;
  onClose: () => void;
  onRoomDeleted: () => void;
}

export function RoomInfoPanel({ room, onClose, onRoomDeleted }: RoomInfoPanelProps) {
  const user = useAuthStore((s) => s.user);
  const { updateRoom, removeRoom, onlineUsers } = useChatStore();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(room.name);
  const [loading, setLoading] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);

  const roomName = getRoomName(room, user);
  const isGroup = room.type === 'group';

  const currentMember = room.members?.find((m) => Number(m.user_id) === Number(user?.id));
  const isAdmin = currentMember?.role === 'admin';

  const handleRenameRoom = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await roomApi.update(room.id, { name: newName });
      updateRoom(res.data);
      setEditingName(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await roomApi.removeMember(room.id, userId);
      const updated = await roomApi.getById(room.id);
      updateRoom(updated.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoom = async () => {
    if (!confirm('Yakin ingin menghapus room ini?')) return;
    try {
      await roomApi.delete(room.id);
      removeRoom(room.id);
      onRoomDeleted();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchMember = async (q: string) => {
    setAddMemberQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await userApi.search(q);
      const existingIds = new Set(room.members?.map((m) => m.user_id));
      setSearchResults((res.data || []).filter((u) => !existingIds.has(u.id) && u.id !== user?.id));
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddMember = async (targetUser: User) => {
    try {
      await roomApi.addMember(room.id, { user_id: targetUser.id });
      const updated = await roomApi.getById(room.id);
      updateRoom(updated.data);
      setShowAddMember(false);
      setAddMemberQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="side-panel">
      <header className="side-panel-header" style={{ background: 'var(--accent)' }}>
        <button className="icon-btn" onClick={onClose} style={{ color: '#fff' }}>
          <IconClose />
        </button>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 500 }}>
          {isGroup ? 'Info Grup' : 'Info Kontak'}
        </h2>
      </header>

      {/* Room Avatar */}
      <div className="profile-avatar-section">
        {isGroup ? (
          <div
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: getAvatarColor(roomName),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconGroupLg />
          </div>
        ) : (
          <Avatar
            name={roomName}
            src={room.members?.find((m) => Number(m.user_id) !== Number(user?.id))?.user?.avatar}
            size="xl"
            online={room.members?.find((m) => Number(m.user_id) !== Number(user?.id))
              ? onlineUsers.has(room.members.find((m) => Number(m.user_id) !== Number(user?.id))!.user_id)
              : false}
          />
        )}
      </div>

      <div className="side-panel-body">
        {/* Room Name */}
        <div className="profile-info-section">
          <div className="profile-info-item">
            <span className="profile-info-label">{isGroup ? 'Nama Grup' : 'Nama'}</span>
            {editingName && isGroup && isAdmin ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
                <button className="btn-primary" onClick={handleRenameRoom} disabled={loading} style={{ padding: '4px 12px', fontSize: 13 }}>
                  {loading ? '...' : 'Simpan'}
                </button>
                <button className="btn-secondary" onClick={() => setEditingName(false)} style={{ padding: '4px 12px', fontSize: 13 }}>Batal</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="profile-info-value">{roomName}</span>
                {isGroup && isAdmin && (
                  <button className="icon-btn-sm" onClick={() => setEditingName(true)}>
                    <IconEdit />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="profile-info-item">
            <span className="profile-info-label">Tipe</span>
            <span className="profile-info-value" style={{ textTransform: 'capitalize' }}>
              {isGroup ? '👥 Grup' : '🔒 Private'}
            </span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-label">Dibuat</span>
            <span className="profile-info-value">{formatFullTime(room.createdAt)}</span>
          </div>
        </div>

        {/* Members */}
        <div className="members-section">
          <div className="members-header">
            <span className="section-label">{room.members?.length || 0} Anggota</span>
            {isGroup && isAdmin && (
              <button
                className="icon-btn-sm"
                onClick={() => setShowAddMember(!showAddMember)}
                title="Tambah anggota"
              >
                <IconAdd />
              </button>
            )}
          </div>

          {/* Add member search */}
          {showAddMember && (
            <div style={{ marginBottom: 12 }}>
              <input
                placeholder="Cari user untuk ditambahkan..."
                value={addMemberQuery}
                onChange={(e) => handleSearchMember(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
                }}
              />
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  className="user-result-item"
                  onClick={() => handleAddMember(u)}
                  style={{ marginTop: 4 }}
                >
                  <Avatar name={u.username} src={u.avatar} size="sm" />
                  <span style={{ marginLeft: 8, fontSize: 14 }}>{u.username}</span>
                </button>
              ))}
            </div>
          )}

          {/* Member list */}
          {room.members?.map((member) => {
            const isOnline = onlineUsers.has(Number(member.user_id));
            const isSelf = Number(member.user_id) === Number(user?.id);
            return (
              <div key={member.id} className="member-item">
                <Avatar
                  name={member.user?.username || ''}
                  src={member.user?.avatar}
                  size="sm"
                  online={isOnline}
                />
                <div className="member-item-info">
                  <span className="member-item-name">
                    {member.user?.username}
                    {isSelf && <span style={{ color: '#8696A0', fontWeight: 400, marginLeft: 4 }}>(Anda)</span>}
                  </span>
                  <span className="member-item-role">{member.role === 'admin' ? '⭐ Admin' : 'Anggota'}</span>
                </div>
                {isAdmin && !isSelf && isGroup && (
                  <button
                    className="icon-btn-sm danger"
                    onClick={() => handleRemoveMember(Number(member.user_id))}
                    title="Hapus dari grup"
                  >
                    <IconRemove />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Danger Zone */}
        {isAdmin && (
          <button className="logout-btn danger" onClick={handleDeleteRoom} style={{ marginTop: 24 }}>
            <IconDelete />
            Hapus {isGroup ? 'Grup' : 'Chat'}
          </button>
        )}
      </div>
    </div>
  );
}

function IconClose() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>;
}
function IconGroupLg() {
  return <svg viewBox="0 0 24 24" width="44" height="44" fill="#fff"><path d="M16.5 13c-1.2 0-3.07.34-4.5 1-1.43-.67-3.3-1-4.5-1C5.33 13 1 14.08 1 16.25V18h22v-1.75c0-2.17-4.33-3.25-6.5-3.25zm-7 3H3v-1.08c.51-.97 2.93-1.92 4.5-1.92.79 0 1.74.18 2.63.5A12.86 12.86 0 007.5 16zm9 0h-7c.05-.41.2-.74.44-1 .96-.79 2.73-1 3.56-1 1.57 0 3.99.95 4.5 1.92V16zm-9-6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm9 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" /></svg>;
}
function IconEdit() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>;
}
function IconAdd() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>;
}
function IconRemove() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>;
}
function IconDelete() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: 8 }}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>;
}
