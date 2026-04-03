// import { Server as SocketServer } from 'socket.io';
// import { NextRequest } from 'next/server';
// import { setSocketIO, connectToTikTok, disconnectFromTikTok, getCurrentStreamer } from '@/app/lib/tiktokClient';

// let io: SocketServer | null = null;
// let serverStarted = false;

// export async function GET(req: NextRequest) {
//     if (!serverStarted) {
//         try {
//             io = new SocketServer({
//                 path: '/api/socket',
//                 addTrailingSlash: false,
//                 cors: {
//                     origin: '*',
//                     methods: ['GET', 'POST']
//                 },
//                 transports: ['websocket', 'polling']
//             });

//             io.on('connection', (socket) => {
//                 console.log('✅ Client connected:', socket.id);

//                 // Control panel event forwarder - sends to ALL clients (global)
//                 socket.on('control-event', (eventName: string, eventData: any) => {
//                     console.log(`🎮 Control event from ${socket.id}: ${eventName}`, eventData);
//                     // Broadcast to ALL connected clients (including the sender)
//                     io?.emit(eventName, eventData);
//                 });

//                 // TikTok connection - single user only
//                 socket.on('connect-tiktok', async (username: string) => {
//                     console.log(`📱 Client ${socket.id} connecting to TikTok: ${username}`);
                    
//                     // Disconnect existing first
//                     if (getCurrentStreamer()) {
//                         console.log(`🔌 Disconnecting from current streamer: ${getCurrentStreamer()}`);
//                         await disconnectFromTikTok();
//                     }
                    
//                     try {
//                         const result = await connectToTikTok(username);
//                         socket.emit('connection-result', result);
//                         socket.emit('connected-stream', { streamer: getCurrentStreamer() });
//                     } catch (error) {
//                         socket.emit('connection-result', { success: false, error: 'Failed to connect' });
//                     }
//                 });

//                 socket.on('disconnect-tiktok', async () => {
//                     console.log(`🔌 Client ${socket.id} disconnecting from TikTok`);
//                     await disconnectFromTikTok();
//                     socket.emit('connected-stream', { streamer: null });
//                 });

//                 socket.on('get-stream', () => {
//                     socket.emit('connected-stream', { streamer: getCurrentStreamer() });
//                 });

//                 socket.on('disconnect', () => {
//                     console.log('❌ Client disconnected:', socket.id);
//                 });
//             });

//             setSocketIO(io);
//             serverStarted = true;
            
//             console.log('✅ Socket.IO server ready');
//             console.log('✅ Control event forwarder active (GLOBAL)');
//             console.log('✅ Single stream mode enabled');
//         } catch (error) {
//             console.error('Socket server error:', error);
//         }
//     }

//     return new Response('Socket server is running', { status: 200 });
// }