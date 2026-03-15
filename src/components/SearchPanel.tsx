import { useState, useCallback } from 'react';
import { useChatStore } from '../store';
import { formatFullTime } from '../utils';
import type { Message } from '../types';

interface SearchPanelProps {
  roomId: number;
  onClose: () => void;
  onJumpTo: (messageId: number) => void;
}

export function SearchPanel({ roomId, onClose, onJumpTo }: SearchPanelProps) {
  const messages = useChatStore((s) => s.messages[roomId] || []);
  const [query, setQuery] = useState('');

  const results: Message[] = query.trim().length >= 2
    ? messages.filter(
        (m) =>
          !m.deletedAt &&
          m.type === 'text' &&
          m.content.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const highlight = (text: string, q: string): string => {
    if (!q) return text;
    return text.replace(
      new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
      '<mark>$1</mark>'
    );
  };

  return (
    <div className="search-panel">
      <div className="search-panel-header">
        <button className="icon-btn" onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
          <IconClose />
        </button>
        <input
          autoFocus
          placeholder="Cari pesan..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-panel-input"
        />
        {query && (
          <button className="icon-btn" onClick={() => setQuery('')} style={{ color: 'var(--text-secondary)' }}>
            <IconClose />
          </button>
        )}
      </div>

      <div className="search-panel-results">
        {query.trim().length < 2 && (
          <div className="search-hint">
            <span>Ketik minimal 2 karakter untuk mencari</span>
          </div>
        )}

        {query.trim().length >= 2 && results.length === 0 && (
          <div className="search-hint">
            <span>Tidak ada pesan yang cocok</span>
          </div>
        )}

        {results.map((msg) => (
          <button
            key={msg.id}
            className="search-result-item"
            onClick={() => onJumpTo(msg.id)}
          >
            <div className="search-result-meta">
              <span className="search-result-sender">{msg.sender?.username}</span>
              <span className="search-result-time">{formatFullTime(msg.createdAt)}</span>
            </div>
            <p
              className="search-result-text"
              dangerouslySetInnerHTML={{ __html: highlight(msg.content, query) }}
            />
          </button>
        ))}

        {results.length > 0 && (
          <div className="search-count">
            {results.length} pesan ditemukan
          </div>
        )}
      </div>
    </div>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}
