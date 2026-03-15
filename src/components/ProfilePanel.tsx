import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../store';
import { userApi, authApi } from '../api';
import { useToast } from './Toast';
import { Avatar } from './Avatar';
import { formatFullTime } from '../utils';

interface ProfilePanelProps {
  onClose: () => void;
}

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const { user, updateUser, clearAuth } = useAuthStore();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { toast.error('Username tidak boleh kosong'); return; }
    setLoading(true);
    try {
      const res = await userApi.updateMe({ username: username.trim(), avatar });
      updateUser(res.data);
      setEditing(false);
      toast.success('Profil berhasil diperbarui');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal update profil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // tetap logout walau request gagal
    } finally {
      clearAuth();
    }
  };

  return (
    <div className="side-panel">
      <header className="side-panel-header" style={{ background: 'var(--accent-dark)' }}>
        <button className="icon-btn" onClick={onClose} style={{ color: '#fff' }}>
          <IconClose />
        </button>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 500 }}>Profil</h2>
      </header>

      <div className="profile-avatar-section">
        <Avatar name={user?.username || ''} src={user?.avatar} size="xl" online={true} />
      </div>

      <div className="side-panel-body">
        {editing ? (
          <form onSubmit={handleSave} className="profile-form">
            <div className="form-group">
              <label>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Avatar URL</label>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                {loading ? <span className="spinner" /> : 'Simpan'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditing(false);
                  setUsername(user?.username || '');
                  setAvatar(user?.avatar || '');
                }}
                style={{ flex: 1 }}
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="profile-info-section">
              <div className="profile-info-item">
                <span className="profile-info-label">Nama</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="profile-info-value">{user?.username}</span>
                  <button className="icon-btn-sm" onClick={() => setEditing(true)} title="Edit">
                    <IconEdit />
                  </button>
                </div>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-value">{user?.email}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Status</span>
                <span className="profile-info-value" style={{ color: 'var(--accent-light)' }}>
                  ● Online
                </span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Bergabung</span>
                <span className="profile-info-value">
                  {user?.createdAt ? formatFullTime(user.createdAt) : '-'}
                </span>
              </div>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              <IconLogout />
              Keluar dari DearTalk
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function IconClose() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>;
}
function IconEdit() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>;
}
function IconLogout() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: 8 }}><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>;
}
