import { TikTokLiveConnection, WebcastEvent, WebcastGiftMessage, WebcastChatMessage, WebcastMemberMessage, ClientEventMap } from 'tiktok-live-connector';
import { Server as SocketServer } from 'socket.io';

let tiktokConnection: TikTokLiveConnection | null = null;
let io: SocketServer | null = null;

export interface GiftEvent {
    type: 'gift';
    username: string;
    nickname: string;
    giftName: string;
    giftImage?: string;
    repeatCount: number;
    totalDiamonds: number;
    isStreak: boolean;
    timestamp: number;
}

export interface FollowEvent {
    type: 'follow';
    username: string;
    nickname: string;
    timestamp: number;
}

export interface ChatEvent {
    type: 'chat';
    username: string;
    nickname: string;
    comment: string;
    timestamp: number;
}

export interface JoinEvent {
    type: 'join';
    username: string;
    nickname: string;
    timestamp: number;
}

export interface SystemEvent {
    type: 'system';
    message: string;
    subType?: 'connected' | 'disconnected' | 'error';
    timestamp: number;
}

export type TikTokEvent = GiftEvent | FollowEvent | ChatEvent | JoinEvent | SystemEvent;

// Define proper types for TikTok data structures
interface TikTokImage {
    urlListList?: string[];
    urlList?: string[];
}

interface TikTokGiftDetails {
    giftName?: string;
    diamondCount?: number;
    giftType?: number;
    icon?: TikTokImage;
    describe?: string;
}

interface TikTokUser {
    uniqueId?: string;
    nickname?: string;
}

interface TikTokGiftMessage {
    giftDetails?: TikTokGiftDetails;
    user?: TikTokUser;
    repeatCount?: number;
    repeatEnd?: boolean;
}

interface TikTokFollowMessage {
    user?: TikTokUser;
}

interface TikTokChatMessage {
    user?: TikTokUser;
    comment?: string;
}

interface TikTokMemberMessage {
    user?: TikTokUser;
}

interface TikTokLikeMessage {
    user?: TikTokUser;
    likeCount?: number;
    totalLikeCount?: number;
}

export function setSocketIO(socketIO: SocketServer) {
    io = socketIO;
    console.log('✅ Socket.IO instance set');
}

export async function connectToTikTok(username: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
    if (tiktokConnection) {
        tiktokConnection.disconnect();
    }

    if (!username) {
        return { success: false, error: 'Username is required' };
    }

    tiktokConnection = new TikTokLiveConnection(username, {
        enableExtendedGiftInfo: true,
        processInitialData: false,
        requestPollingIntervalMs: 1000
    });

    try {
        console.log(`🔄 Connecting to TikTok live: ${username}`);
        const state = await tiktokConnection.connect();
        console.log(`✅ Connected to TikTok Live! Room ID: ${state.roomId}`);

        // Broadcast connection status
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'connected',
            message: `Connected to ${username}'s live stream`,
            timestamp: Date.now()
        } as SystemEvent);

        setupEventListeners();
        return { success: true, roomId: state.roomId };
    } catch (error) {
        console.error('❌ Failed to connect:', error);
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'error',
            message: 'Failed to connect to TikTok',
            timestamp: Date.now()
        } as SystemEvent);
        return { success: false, error: 'Connection failed' };
    }
}

function getGiftImageUrl(giftDetails: any): string | undefined {
    if (!giftDetails?.icon) return undefined;
    
    // Try different possible property names for the image URL array
    if (giftDetails.icon.urlListList && Array.isArray(giftDetails.icon.urlListList)) {
        return giftDetails.icon.urlListList[0];
    }
    if (giftDetails.icon.urlList && Array.isArray(giftDetails.icon.urlList)) {
        return giftDetails.icon.urlList[0];
    }
    return undefined;
}

function setupEventListeners() {
    if (!tiktokConnection) return;

    // GIFT EVENTS
    tiktokConnection.on(WebcastEvent.GIFT, (data: WebcastGiftMessage) => {
        const giftDetails = data.giftDetails;
        const user = data.user;
        
        const giftImageUrl = getGiftImageUrl(giftDetails);
        
        const giftEvent: GiftEvent = {
            type: 'gift',
            username: user?.uniqueId || 'anonymous',
            nickname: user?.nickname || 'Anonymous',
            giftName: giftDetails?.giftName || 'Unknown Gift',
            giftImage: giftImageUrl,
            repeatCount: data.repeatCount || 1,
            totalDiamonds: (giftDetails?.diamondCount || 0) * (data.repeatCount || 1),
            isStreak: giftDetails?.giftType === 1 && !data.repeatEnd,
            timestamp: Date.now()
        };

        console.log(`🎁 ${giftEvent.username}: ${giftEvent.repeatCount}x ${giftEvent.giftName}`);
        io?.emit('tiktok-event', giftEvent);
    });

    // FOLLOW EVENTS
    tiktokConnection.on(WebcastEvent.FOLLOW, (data: any) => {
        const followEvent: FollowEvent = {
            type: 'follow',
            username: data.user?.uniqueId || 'anonymous',
            nickname: data.user?.nickname || 'Anonymous',
            timestamp: Date.now()
        };

        console.log(`➕ ${followEvent.username} followed!`);
        io?.emit('tiktok-event', followEvent);
    });

    // CHAT EVENTS
    tiktokConnection.on(WebcastEvent.CHAT, (data: WebcastChatMessage) => {
        const chatEvent: ChatEvent = {
            type: 'chat',
            username: data.user?.uniqueId || 'anonymous',
            nickname: data.user?.nickname || 'Anonymous',
            comment: data.comment || '',
            timestamp: Date.now()
        };

        io?.emit('tiktok-event', chatEvent);
    });

    // JOIN EVENTS
    tiktokConnection.on(WebcastEvent.MEMBER, (data: WebcastMemberMessage) => {
        const joinEvent: JoinEvent = {
            type: 'join',
            username: data.user?.uniqueId || 'anonymous',
            nickname: data.user?.nickname || 'Anonymous',
            timestamp: Date.now()
        };

        console.log(`👤 ${joinEvent.username} joined`);
        io?.emit('tiktok-event', joinEvent);
    });

    // LIKE EVENTS
    tiktokConnection.on(WebcastEvent.LIKE, (data: any) => {
        console.log(`❤️ ${data.user?.uniqueId} sent ${data.likeCount} likes`);
    });

    // DISCONNECT EVENT - Using type assertion to handle the event name
    tiktokConnection.on('disconnected' as keyof ClientEventMap, () => {
        console.log('🔌 Disconnected from TikTok');
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'disconnected',
            message: 'Disconnected from TikTok',
            timestamp: Date.now()
        } as SystemEvent);
    });

    // ERROR EVENT - Using type assertion to handle the event name
    tiktokConnection.on('error' as keyof ClientEventMap, (error: Error) => {
        console.error('❌ TikTok connection error:', error);
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'error',
            message: 'TikTok connection error',
            timestamp: Date.now()
        } as SystemEvent);
    });
}

export function disconnectFromTikTok() {
    if (tiktokConnection) {
        tiktokConnection.disconnect();
        tiktokConnection = null;
        console.log('🔌 Disconnected from TikTok');
    }
}