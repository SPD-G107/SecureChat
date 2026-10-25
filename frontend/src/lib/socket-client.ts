import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    const token = localStorage.getItem('securechat_jwt');
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket as Socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (s && !s.connected) {
    const token = localStorage.getItem('securechat_jwt');
    s.auth = { token };
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};
