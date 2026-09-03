// طبقة الاتصال بالسيرفر عبر Socket.io: دخول الغرفة، الحضور، ترحيل إشارة WebRTC، الشات
import { io, Socket } from 'socket.io-client';

export type PresenceMember = { id: string; name: string };
export type SignalPayload = { from: string; name: string; data: any };
export type ChatPayload = { name: string; text: string; from: string; time: number };
export type FileSharedPayload = {
  filename: string;
  originalName: string;
  size: number;
  room: string;
  from: string;
  uploadedAt: number;
};

let socket: Socket | null = null;
let currentServerUrl: string | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function getServerUrl(): string | null {
  return currentServerUrl;
}

export function connectSocket(serverUrl: string): Socket {
  if (socket && currentServerUrl === serverUrl && socket.connected) {
    return socket;
  }
  if (socket) {
    socket.disconnect();
  }
  currentServerUrl = serverUrl;
  socket = io(serverUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  });
  return socket;
}

export function joinRoom(room: string, name: string) {
  socket?.emit('join-room', { room, name });
}

export function sendSignal(to: string, data: any) {
  socket?.emit('signal', { to, data });
}

export function sendChat(text: string) {
  socket?.emit('chat', { text });
}

export function sendBroadcast(data: any) {
  socket?.emit('room-broadcast', data);
}

export function onBroadcast(cb: (payload: any) => void) {
  socket?.on('room-broadcast', cb);
  return () => socket?.off('room-broadcast', cb);
}

export function onPresence(cb: (members: PresenceMember[]) => void) {
  socket?.on('presence', cb);
  return () => socket?.off('presence', cb);
}

export function requestPresence() {
  socket?.emit('get-presence');
}

export function onRoomMembers(cb: (members: PresenceMember[]) => void) {
  socket?.on('room-members', cb);
  return () => socket?.off('room-members', cb);
}

export function onPeerJoined(cb: (member: PresenceMember) => void) {
  socket?.on('peer-joined', cb);
  return () => socket?.off('peer-joined', cb);
}

export function onPeerLeft(cb: (info: { id: string }) => void) {
  socket?.on('peer-left', cb);
  return () => socket?.off('peer-left', cb);
}

export function onSignal(cb: (payload: SignalPayload) => void) {
  socket?.on('signal', cb);
  return () => socket?.off('signal', cb);
}

export function onChat(cb: (payload: ChatPayload) => void) {
  socket?.on('chat', cb);
  return () => socket?.off('chat', cb);
}

export function onFileShared(cb: (payload: FileSharedPayload) => void) {
  socket?.on('file-shared', cb);
  return () => socket?.off('file-shared', cb);
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  currentServerUrl = null;
}


export async function connectToResolvedServer(): Promise<Socket | null> {
  const { resolveServerUrl } = await import('./serverDiscovery');
  const serverUrl = await resolveServerUrl();

  if (!serverUrl) return null;

  return connectSocket(serverUrl);
}
