import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL && !process.env.NEXT_PUBLIC_SOCKET_URL.includes('localhost:5000')) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (port === '3000') {
      return `${protocol}//${hostname}:5000`;
    }
    return `${protocol}//${hostname}`;
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    const token = localStorage.getItem('securechat_jwt');
    socket = io(getSocketUrl(), {
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
