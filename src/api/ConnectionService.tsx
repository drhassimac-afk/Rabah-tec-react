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
    if (mountedRef.current) setStatus('connecting');

    try {
      console.log('[ConnectionService] بدء اكتشاف السيرفر...');

      const socket = await connectToResolvedServer();

      if (!mountedRef.current) return;

      if (!socket) {
        console.log('[ConnectionService] لم يتم العثور على سيرفر');
        setServerUrl(null);
        setStatus('offline');
        return;
      }

      const url = getServerUrl();
      setServerUrl(url);

      console.log('[ConnectionService] السيرفر:', url);

      const onConnect = () => {
        if (!mountedRef.current) return;
        console.log('[ConnectionService] CONNECTED:', socket.id);
        setServerUrl(getServerUrl());
        setStatus('connected');
      };

      const onDisconnect = (reason: string) => {
        if (!mountedRef.current) return;
        console.log('[ConnectionService] DISCONNECTED:', reason);
        setStatus('connecting');
      };

      const onConnectError = (error: Error) => {
        if (!mountedRef.current) return;
        console.log('[ConnectionService] CONNECT ERROR:', error.message);
        setStatus('connecting');
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onConnectError);

      if (socket.connected) {
        onConnect();
      }
    } catch (error) {
      console.log('[ConnectionService] ERROR:', error);
      if (mountedRef.current) {
        setStatus('offline');
      }
    } finally {
      attemptingRef.current = false;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    attemptConnect();

    const interval = setInterval(() => {
      const socket = getSocket();

      if (!socket || !socket.connected) {
        attemptConnect();
      }
    }, RETRY_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        status,
        serverUrl,
        retryNow: attemptConnect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext);
}
