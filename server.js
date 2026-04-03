const { createServer } = require('http');
const { Server } = require('socket.io');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

let tiktokConnection = null;
let currentStreamer = null;
let currentRoomId = null;
let isConnecting = false;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: [
        'https://saeedofficial.com',
        'http://saeedofficial.com',
        'http://localhost:3000'
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/api/socket',
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);
    
    // Send current streamer info to newly connected client
    if (currentStreamer && tiktokConnection) {
      socket.emit('connected-stream', { streamer: currentStreamer });
      socket.emit('tiktok-status', {
        type: 'connected',
        message: `Connected to @${currentStreamer}'s live`,
        roomId: currentRoomId
      });
    }
    
    // CONTROL PANEL EVENT FORWARDER - No TikTok connection here
    socket.on('control-event', (eventName, eventData) => {
      console.log(`🎮 Control event from ${socket.id}: ${eventName}`, eventData);
      // Broadcast to ALL connected clients (overlay + other panels)
      io.emit(eventName, eventData);
    });
    
    socket.on('connect-tiktok', async (username) => {
      // Prevent multiple simultaneous connection attempts
      if (isConnecting) {
        console.log('⏳ Connection already in progress, skipping...');
        socket.emit('tiktok-status', {
          type: 'info',
          message: 'Connection already in progress, please wait...'
        });
        return;
      }
      
      console.log(`🔄 Client ${socket.id} requesting connection to TikTok: ${username}`);
      const cleanUsername = username.replace('@', '');
      
      // If already connected to the same streamer, just notify
      if (tiktokConnection && currentStreamer === cleanUsername) {
        console.log(`✅ Already connected to ${cleanUsername}, not reconnecting`);
        socket.emit('tiktok-status', {
          type: 'connected',
          message: `Already connected to @${cleanUsername}'s live`,
          roomId: currentRoomId
        });
        socket.emit('connected-stream', { streamer: currentStreamer });
        return;
      }
      
      // If trying to connect to a different streamer, disconnect first
      if (tiktokConnection && currentStreamer !== cleanUsername) {
        console.log(`🔌 Disconnecting from ${currentStreamer} to connect to ${cleanUsername}`);
        tiktokConnection.disconnect();
        tiktokConnection = null;
        currentStreamer = null;
        currentRoomId = null;
      }
      
      isConnecting = true;
      
      try {
        tiktokConnection = new TikTokLiveConnection(cleanUsername, {
          signApiKey: 'euler_ODE4YjUxNTZiNzg2NDgzN2E2OTQwN2QwZjkwZjA0MWU3OTNlMjEzYWRmOTIwNjFlZDVhNzY1',
          enableExtendedGiftInfo: false,
          processInitialData: true,
          requestPollingIntervalMs: 2000,
          webClientHeaders: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.tiktok.com/',
            'Origin': 'https://www.tiktok.com'
          }
        });

        let retries = 3;
        let state = null;
        
        while (retries > 0 && !state) {
          try {
            state = await tiktokConnection.connect();
            currentRoomId = state.roomId;
            currentStreamer = cleanUsername;
            console.log(`✅ Connected to TikTok Live! Room ID: ${state.roomId}`);
            break;
          } catch (err) {
            retries--;
            console.log(`Connection attempt failed, ${retries} retries left:`, err.message);
            if (retries === 0) throw err;
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        // Broadcast to ALL connected clients that we're connected
        io.emit('tiktok-status', {
          type: 'connected',
          message: `Connected to @${cleanUsername}'s live`,
          roomId: state.roomId
        });
        
        io.emit('connected-stream', { streamer: cleanUsername });
        
        // Setup event listeners
        tiktokConnection.on(WebcastEvent.GIFT, (data) => {
          console.log(`🎁 Gift: ${data.user?.uniqueId} sent ${data.giftDetails?.giftName || 'a gift'}`);
          
          io.emit('tiktok-event', {
            type: 'gift',
            username: data.user?.uniqueId || 'anonymous',
            nickname: data.user?.nickname || 'Anonymous',
            giftName: data.giftDetails?.giftName || 'Gift',
            repeatCount: data.repeatCount || 1,
            isStreak: data.giftDetails?.giftType === 1 && !data.repeatEnd,
            diamonds: data.giftDetails?.diamondCount || 0,
            totalDiamonds: (data.giftDetails?.diamondCount || 0) * (data.repeatCount || 1),
            timestamp: Date.now()
          });
        });

        tiktokConnection.on(WebcastEvent.LIKE, (data) => {
          console.log(`❤️ Like: ${data.user?.uniqueId} sent ${data.likeCount} likes`);
          io.emit('tiktok-event', {
            type: 'like',
            username: data.user?.uniqueId || 'anonymous',
            nickname: data.user?.nickname || 'Anonymous',
            count: data.likeCount || 1,
            total: data.totalLikeCount || 0,
            timestamp: Date.now()
          });
        });

        tiktokConnection.on('disconnected', () => {
          console.log('🔌 Disconnected from TikTok');
          currentStreamer = null;
          currentRoomId = null;
          io.emit('tiktok-status', {
            type: 'disconnected',
            message: 'Disconnected from TikTok'
          });
          io.emit('connected-stream', { streamer: null });
        });

        tiktokConnection.on('error', (error) => {
          console.error('❌ TikTok connection error:', error);
          io.emit('tiktok-status', {
            type: 'error',
            message: `Connection error: ${error.message}`
          });
        });

      } catch (error) {
        console.error('❌ Failed to connect to TikTok:', error.message);
        tiktokConnection = null;
        currentStreamer = null;
        currentRoomId = null;
        
        let userMessage = `Failed to connect: ${error.message}`;
        
        if (error.message.includes("isn't online")) {
          userMessage = `❌ @${username} isn't live right now`;
        } else if (error.message.includes("403")) {
          userMessage = `⚠️ TikTok is blocking the connection. Try another username or wait a few minutes.`;
        }
        
        io.emit('tiktok-status', {
          type: 'error',
          message: userMessage
        });
        
        socket.emit('tiktok-status', {
          type: 'error',
          message: userMessage
        });
      } finally {
        isConnecting = false;
      }
    });

    socket.on('disconnect-tiktok', () => {
      console.log(`🔌 Client ${socket.id} requested disconnect from TikTok`);
      if (tiktokConnection) {
        tiktokConnection.disconnect();
        tiktokConnection = null;
        currentStreamer = null;
        currentRoomId = null;
        io.emit('tiktok-status', {
          type: 'disconnected',
          message: 'Disconnected from TikTok'
        });
        io.emit('connected-stream', { streamer: null });
      }
    });
    
    socket.on('get-stream', () => {
      socket.emit('connected-stream', { streamer: currentStreamer });
      if (currentStreamer && tiktokConnection) {
        socket.emit('tiktok-status', {
          type: 'connected',
          message: `Connected to @${currentStreamer}'s live`,
          roomId: currentRoomId
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
      // Only disconnect TikTok if no clients are left
      const connectedClients = io.engine.clientsCount;
      if (connectedClients === 0 && tiktokConnection) {
        console.log('No clients left, disconnecting from TikTok...');
        tiktokConnection.disconnect();
        tiktokConnection = null;
        currentStreamer = null;
        currentRoomId = null;
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`📁 Next.js + Socket.io combined`);
    console.log(`🌐 Allowed origins: https://saeedofficial.com, http://localhost:3000`);
    console.log(`✅ Control event forwarder ACTIVE`);
    console.log(`✅ Single TikTok connection mode - overlay and control panel share the same stream`);
    console.log('\nWaiting for connections...\n');
  });
});