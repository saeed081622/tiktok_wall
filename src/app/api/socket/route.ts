import { Server as SocketServer } from 'socket.io';
import { NextRequest } from 'next/server';


import { setSocketIO, connectToTikTok, disconnectFromTikTok} from '@/app/lib/tiktokClient';

let io: SocketServer | null = null;

export async function GET(req: NextRequest) {
    if (!io) {
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

            socket.on('connect-tiktok', async (username: string) => {
                try {
                    const result = await connectToTikTok(username);
                    socket.emit('connection-result', result);
                } catch (error) {
                    socket.emit('connection-result', { success: false, error: 'Failed to connect' });
                }
            });

            socket.on('disconnect-tiktok', () => {
                disconnectFromTikTok();
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });

        socketServer.listen(3001);
        io = socketServer;
        setSocketIO(socketServer);
        
        console.log('WebSocket server started on port 3001');
    }

    return new Response('WebSocket server is running', { status: 200 });
}