import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { setSocketIO, connectToTikTok, disconnectFromTikTok, getConnectedUsernames } from '@/app/lib/tiktokClient';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Control panel event forwarder
    socket.on('control-event', (eventName: string, eventData: any) => {
      console.log(`🎮 Control event from ${socket.id}: ${eventName}`, eventData);
      socket.broadcast.emit(eventName, eventData);
      socket.emit(eventName, eventData);
    });

    // TikTok connection
    socket.on('connect-tiktok', async (username: string) => {
      console.log(`📱 Client ${socket.id} connecting to TikTok: ${username}`);
      try {
        const result = await connectToTikTok(username);
        socket.emit('connection-result', result);
        socket.emit('connected-streams', { streams: getConnectedUsernames() });
      } catch (error) {
        socket.emit('connection-result', { success: false, error: 'Failed to connect' });
      }
    });

    socket.on('disconnect-tiktok', async (username?: string) => {
      console.log(`🔌 Client ${socket.id} disconnecting from TikTok: ${username || 'all'}`);
      await disconnectFromTikTok(username);
    });

    socket.on('get-streams', () => {
      socket.emit('connected-streams', { streams: getConnectedUsernames() });
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  setSocketIO(io);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ Socket.IO ready on /api/socket`);
    console.log(`✅ Control event forwarder active`);
    console.log(`✅ Multi-stream support enabled`);
  });
});