// خدمة اتصال مستقلة تعمل في الخلفية طوال حياة التطبيق
// لا تُستخدم لمنع أي شاشة من الفتح — فقط تبث حالتها ليستمع إليها من يريد
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { connectToResolvedServer, getSocket, getServerUrl } from './socket';

export type ConnectionStatus = 'connecting' | 'connected' | 'offline';

type ConnectionContextValue = {
  status: ConnectionStatus;
  serverUrl: string | null;
  retryNow: () => void;
};

const ConnectionContext = createContext<ConnectionContextValue>({
  status: 'connecting',
  serverUrl: null,
  retryNow: () => {},
});

const RETRY_INTERVAL_MS = 5000;

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const attemptingRef = useRef(false);
  const mountedRef = useRef(true);

  const attemptConnect = async () => {
    if (attemptingRef.current) return;
    attemptingRef.current = true;
    try {
      const socket = await connectToResolvedServer();
      if (!mountedRef.current) return;

      if (!socket) {
        setStatus('offline');
        setServerUrl(null);
        return;
      }

      setServerUrl(getServerUrl());
      setStatus(socket.connected ? 'connected' : 'connecting');

      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');

      socket.on('connect', () => {
        if (!mountedRef.current) return;
        setStatus('connected');
        setServerUrl(getServerUrl());
      });

      socket.on('disconnect', () => {
        if (!mountedRef.current) return;
        setStatus('connecting');
      });

      socket.on('connect_error', () => {
        if (!mountedRef.current) return;
        setStatus('connecting');
      });
    } catch (e) {
      if (mountedRef.current) setStatus('offline');
    } finally {
      attemptingRef.current = false;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    attemptConnect();

    const interval = setInterval(() => {
      const s = getSocket();
      if (!s || !s.connected) {
        attemptConnect();
      }
    }, RETRY_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <ConnectionContext.Provider value={{ status, serverUrl, retryNow: attemptConnect }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext);
}
