'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import GiftAnimation from '../components/GiftAnimation';
import ChatOverlay from '../components/ChatOverlay';
import ConnectionStatus from '../components/ConnectionStatus';
import { TikTokEvent, GiftEvent, FollowEvent, JoinEvent, ChatEvent, SystemEvent } from '../lib/tiktokClient';

export default function TVPage() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [events, setEvents] = useState<TikTokEvent[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
    const [stats, setStats] = useState({
        gifts: 0,
        followers: 0,
        joins: 0,
        chats: 0
    });
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const usernameRef = useRef<string>('');
    const socketRef = useRef<Socket | null>(null);

    // Get username from localStorage
    useEffect(() => {
        const savedUsername = localStorage.getItem('tiktokUsername');
        if (savedUsername) {
            usernameRef.current = savedUsername;
        }
    }, []);

    // Initialize socket connection
    useEffect(() => {
        const socketIo = io('http://localhost:3001', {
            path: '/api/socket',
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socketRef.current = socketIo;
        setSocket(socketIo);

        return () => {
            socketIo.disconnect();
        };
    }, []);

    // Set up socket event listeners
    useEffect(() => {
        if (!socketRef.current) return;

        const socket = socketRef.current;

        const handleConnect = () => {
            console.log('✅ Connected to WebSocket server');
            setConnectionStatus('connected');
            
            if (usernameRef.current) {
                socket.emit('connect-tiktok', usernameRef.current);
            }
        };

        const handleTikTokEvent = (event: TikTokEvent) => {
            setEvents(prev => {
                const newEvents = [...prev, event];
                return newEvents.slice(-100);
            });

            // Update stats based on event type
            if (event.type === 'gift') {
                setStats(prev => ({ ...prev, gifts: prev.gifts + 1 }));
            } else if (event.type === 'follow') {
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            } else if (event.type === 'join') {
                setStats(prev => ({ ...prev, joins: prev.joins + 1 }));
            } else if (event.type === 'chat') {
                setStats(prev => ({ ...prev, chats: prev.chats + 1 }));
            }
        };

        const handleConnectionResult = (result: any) => {
            if (result.success) {
                console.log('✅ TikTok connection successful:', result.roomId);
            } else {
                console.error('❌ TikTok connection failed:', result.error);
            }
        };

        const handleDisconnect = () => {
            console.log('🔌 Disconnected from WebSocket server');
            setConnectionStatus('disconnected');
        };

        const handleConnectError = (error: Error) => {
            console.error('WebSocket connection error:', error);
            setConnectionStatus('disconnected');
        };

        // Add event listeners
        socket.on('connect', handleConnect);
        socket.on('tiktok-event', handleTikTokEvent);
        socket.on('connection-result', handleConnectionResult);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        // Cleanup event listeners
        return () => {
            socket.off('connect', handleConnect);
            socket.off('tiktok-event', handleTikTokEvent);
            socket.off('connection-result', handleConnectionResult);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, []); // Empty dependency array - only run once

    // Handle video playback
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(e => console.error('Video playback failed:', e));
        }
    }, []);

    // Type guard for filtering chat messages
    const isChatEvent = (event: TikTokEvent): event is ChatEvent => {
        return event.type === 'chat';
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black">
            {/* Background Video */}
            <video
                ref={videoRef}
                className="absolute top-0 left-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
            >
                <source src="/videos/background.mp4" type="video/mp4" />
            </video>

            {/* Dark overlay for better text visibility */}
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />

            {/* Connection Status */}
            <ConnectionStatus status={connectionStatus} />

            {/* Stats Overlay */}
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg text-white z-40">
                <div className="text-xs text-gray-300 mb-1">Live Stats</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>🎁 Gifts: {stats.gifts}</div>
                    <div>➕ Follows: {stats.followers}</div>
                    <div>👤 Joins: {stats.joins}</div>
                    <div>💬 Chats: {stats.chats}</div>
                </div>
            </div>

            {/* Animations Container */}
            <div className="absolute inset-0 pointer-events-none z-10">
                {events
                    .filter(event => event.type !== 'chat' && event.type !== 'system')
                    .map((event, index) => {
                        // Type assertion for the animation component
                        const animationEvent = event as Exclude<TikTokEvent, ChatEvent | SystemEvent>;
                        return (
                            <GiftAnimation 
                                key={`${event.timestamp}-${index}`} 
                                event={animationEvent}
                            />
                        );
                    })}
            </div>

            {/* Chat Overlay - only pass chat messages */}
            <ChatOverlay 
                messages={events.filter(isChatEvent)} 
            />

            {/* Bottom gradient for better chat readability */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-5" />
        </div>
    );
}