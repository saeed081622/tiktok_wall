import io from 'socket.io-client';

let socket: ReturnType<typeof io> | null = null;

export interface ServerMessage {
  type: string;
  message: string;
  timestamp: number;
  [key: string]: any;
}

export function connectToSocket(): ReturnType<typeof io> {
  if (!socket) {
    console.log('🔄 Creating new socket connection...');
    
    // For local development, use port 3002
    const SOCKET_URL = process.env.NODE_ENV === 'production'
      ? 'https://saeedofficial.com:3002'  // Production
      : 'http://localhost:3002';           // Local - changed to 3002
    
    socket = io(SOCKET_URL, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected! ID:', socket?.id);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('🔌 Socket disconnected:', reason);
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

export function getSocket(): ReturnType<typeof io> | null {
  return socket;
}