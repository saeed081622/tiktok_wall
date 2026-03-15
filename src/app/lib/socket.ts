import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export interface ServerMessage {
  type: string;
  message: string;
  timestamp: number;
  [key: string]: any;
}

export function connectToSocket(): Socket {
  if (!socket) {
    console.log('🔄 Creating new socket connection...');
    
    socket = io('http://localhost:3001', {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true
    });

    // Log all connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected! ID:', socket?.id);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });
  }
  
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected manually');
  }
}

export function getSocket(): Socket | null {
  return socket;
}