const { createServer } = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

const httpServer = createServer();
const io = new Server(httpServer, {
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

let tiktokConnection = null;

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.on('connect-tiktok', async (username) => {
    console.log(`🔄 Connecting to TikTok live: ${username}`);
    
    try {
      if (tiktokConnection) {
        tiktokConnection.disconnect();
      }

      const cleanUsername = username.replace('@', '');
      
      tiktokConnection = new TikTokLiveConnection(cleanUsername, {
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
          console.log(`✅ Connected to TikTok Live! Room ID: ${state.roomId}`);
          break;
        } catch (err) {
          retries--;
          console.log(`Connection attempt failed, ${retries} retries left:`, err.message);
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      socket.emit('tiktok-status', {
        type: 'connected',
        message: `Connected to @${cleanUsername}'s live`,
        roomId: state.roomId
      });

      tiktokConnection.on(WebcastEvent.GIFT, (data) => {
        console.log(`🎁 Gift: ${data.user?.uniqueId} sent ${data.giftDetails?.giftName || 'a gift'}`);
        
        socket.emit('tiktok-event', {
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
        socket.emit('tiktok-event', {
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
        socket.emit('tiktok-status', {
          type: 'disconnected',
          message: 'Disconnected from TikTok'
        });
      });

    } catch (error) {
      console.error('❌ Failed to connect to TikTok:', error.message);
      
      let userMessage = `Failed to connect: ${error.message}`;
      
      if (error.message.includes("isn't online")) {
        userMessage = `❌ @${username} isn't live right now`;
      } else if (error.message.includes("403")) {
        userMessage = `⚠️ TikTok is blocking the connection. Try another username or wait a few minutes.`;
      }
      
      socket.emit('tiktok-status', {
        type: 'error',
        message: userMessage
      });
    }
  });

  socket.on('disconnect-tiktok', () => {
    if (tiktokConnection) {
      tiktokConnection.disconnect();
      tiktokConnection = null;
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    if (tiktokConnection) {
      tiktokConnection.disconnect();
      tiktokConnection = null;
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log('\n🚀 Socket server is running!');
  console.log(`📡 Port: ${PORT}`);
  console.log(`📁 Path: /api/socket`);
  console.log(`🌐 Allowed origins: https://saeedofficial.com, http://localhost:3000`);
  console.log('\nWaiting for client connections...\n');
});