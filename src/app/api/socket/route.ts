import { Server as SocketServer } from 'socket.io';
import { NextRequest } from 'next/server';
import { setSocketIO, connectToTikTok, disconnectFromTikTok, getConnectedUsernames } from '@/app/lib/tiktokClient';

let io: SocketServer | null = null;
let serverStarted = false;

export async function GET(req: NextRequest) {
    // Only start the server once and not during build
    if (!serverStarted && process.env.NODE_ENV !== 'production') {
        try {
            const socketServer = new SocketServer({
                path: '/api/socket',
                addTrailingSlash: false,
                cors: {
                    origin: '*',
                    methods: ['GET', 'POST']
                },
                transports: ['websocket', 'polling']
            });

            socketServer.on('connection', (socket) => {
                console.log('Client connected:', socket.id);

                // ========== CONTROL PANEL EVENT FORWARDER ==========
                socket.on('control-event', (eventName: string, eventData: any) => {
                    console.log(`🎮 Control event from ${socket.id}: ${eventName}`, eventData);
                    // Forward to ALL connected clients
                    socketServer.emit(eventName, eventData);
                });

                // ========== TIKTOK CONNECTION (Supports multiple streamers) ==========
                socket.on('connect-tiktok', async (username: string) => {
                    console.log(`📱 Client ${socket.id} connecting to TikTok: ${username}`);
                    try {
                        const result = await connectToTikTok(username);
                        socket.emit('connection-result', result);
                        // Optional: send list of all connected streams
                        socket.emit('connected-streams', { streams: getConnectedUsernames() });
                    } catch (error) {
                        socket.emit('connection-result', { success: false, error: 'Failed to connect' });
                    }
                });

                // Disconnect specific user or all
                socket.on('disconnect-tiktok', async (username?: string) => {
                    console.log(`🔌 Client ${socket.id} disconnecting from TikTok: ${username || 'all'}`);
                    await disconnectFromTikTok(username);
                });

                // Get list of connected streams
                socket.on('get-streams', () => {
                    socket.emit('connected-streams', { streams: getConnectedUsernames() });
                });

                socket.on('disconnect', () => {
                    console.log('Client disconnected:', socket.id);
                });
            });

            socketServer.listen(3001);
            io = socketServer;
            setSocketIO(socketServer);
            serverStarted = true;
            
            console.log('✅ WebSocket server started on port 3001');
            console.log('✅ Control event forwarder active');
            console.log('✅ Multi-stream support enabled');
        } catch (error) {
            console.log('Socket server already running or port in use');
        }
    }

    return new Response('WebSocket server is running', { status: 200 });
}