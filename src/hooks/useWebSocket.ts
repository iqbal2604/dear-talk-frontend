import { useEffect, useRef, useCallback } from 'react';
import type { WsEvent } from '../types';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

type EventHandler = (payload: unknown) => void;

interface UseWebSocketOptions {
  onNewMessage?: EventHandler;
  onUserOnline?: EventHandler;
  onUserOffline?: EventHandler;
  onTyping?: EventHandler;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useWebSocket(token: string | null, options: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelay = useRef(3000);
  const isMounted = useRef(true);

  // Keep options in ref to avoid stale closures without re-creating connect
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Keep token in ref so connect callback is stable
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    // Don't reconnect if already open/connecting
    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    const socket = new WebSocket(`${WS_BASE}?token=${currentToken}`);
    wsRef.current = socket;

    socket.onopen = () => {
      if (!isMounted.current) return;
      reconnectDelay.current = 3000; // reset backoff
      optionsRef.current.onOpen?.();
    };

    socket.onmessage = (e) => {
      if (!isMounted.current) return;
      try {
        const event: WsEvent = JSON.parse(e.data);
        switch (event.type) {
          case 'new_message':    optionsRef.current.onNewMessage?.(event.payload); break;
          case 'user_online':    optionsRef.current.onUserOnline?.(event.payload); break;
          case 'user_offline':   optionsRef.current.onUserOffline?.(event.payload); break;
          case 'typing':         optionsRef.current.onTyping?.(event.payload); break;
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    socket.onclose = (e) => {
      if (!isMounted.current) return;
      optionsRef.current.onClose?.();
      // Don't reconnect if intentionally closed (code 1000)
      if (e.code === 1000) return;
      // Exponential backoff: 3s → 6s → 12s → max 30s
      reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 30000);
      reconnectTimer.current = setTimeout(connect, reconnectDelay.current);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, []); // stable — uses refs internally

  const sendTyping = useCallback((roomId: number, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { room_id: roomId, is_typing: isTyping },
      }));
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (token) connect();

    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer.current);
      // Close with code 1000 (normal) to prevent reconnect on unmount
      wsRef.current?.close(1000);
    };
  }, [token, connect]);

  return { sendTyping };
}
