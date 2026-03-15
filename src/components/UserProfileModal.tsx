import { useState, useEffect } from 'react';
import { userApi } from '../api';
import { Avatar } from './Avatar';
import { formatFullTime } from '../utils';
import { useChatStore } from '../store';
import type { User } from '../types';

interface UserProfileModalProps {
  userId: number;
  onClose: () => void;
  onStartChat?: (user: User) => void;
}

export function UserProfileModal({ userId, onClose, onStartChat }: UserProfileModalProps) {
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  useEffect(() => {
    userApi.getById(userId)
      .then((res) => setTargetUser(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const isOnline = targetUser ? onlineUsers.has(Number(targetUser.id)) : false;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>

        {loading ? (
          <div className="modal-loading">
            <div className="spinner" />
          </div>
        ) : targetUser ? (
          <>
            <div className="modal-avatar-section">
              <Avatar
                name={targetUser.username}
                src={targetUser.avatar}
                size="xl"
                online={isOnline}
              />
            </div>
            <div className="modal-info">
              <h3 className="modal-name">{targetUser.username}</h3>
              <p className="modal-email">{targetUser.email}</p>
              <span className={`modal-status ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? '● Online' : '● Offline'}
              </span>
              {targetUser.createdAt && (
                <p className="modal-joined">
                  Bergabung {formatFullTime(targetUser.createdAt)}
                </p>
              )}
            </div>
            {onStartChat && (
              <button
                className="btn-primary"
                onClick={() => onStartChat(targetUser)}
                style={{ width: '100%', marginTop: 16 }}
              >
                Kirim Pesan
              </button>
            )}
          </>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            User tidak ditemukan
          </p>
        )}
      </div>
    </div>
  );
}
