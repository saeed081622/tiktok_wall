import { TikTokLiveConnection, WebcastEvent, WebcastGiftMessage, WebcastChatMessage, WebcastMemberMessage, ClientEventMap } from 'tiktok-live-connector';
import { Server as SocketServer } from 'socket.io';

// Store multiple TikTok connections keyed by username
let tiktokConnections: Map<string, TikTokLiveConnection> = new Map();
let io: SocketServer | null = null;

// Keep all your existing interfaces exactly as they were
export interface BattleMVPEvent {
    type: 'battle_mvp';
    battleId?: string;
    mvp: {
        userId: string;
        username: string;
        nickname: string;
        score: number;
        teamId?: string;
    };
    teamScores?: Array<{
        teamId: string;
        score: number;
    }>;
    timestamp: number;
}

export interface BattleStartEvent {
    type: 'battle_start';
    battleId: string;
    users: Array<{
        userId: string;
        username: string;
        nickname: string;
    }>;
    timestamp: number;
}

export interface BattleEndEvent {
    type: 'battle_end';
    battleId: string;
    winner?: {
        userId: string;
        username: string;
        nickname: string;
    };
    mvp?: {
        userId: string;
        username: string;
        nickname: string;
        score: number;
    };
    finalScores: Array<{
        userId: string;
        username: string;
        nickname: string;
        score: number;
    }>;
    timestamp: number;
}

export interface GiftEvent {
    type: 'gift';
    username: string;
    nickname: string;
    giftName: string;
    giftImage?: string;
    repeatCount: number;
    totalDiamonds: number;
    isStreak: boolean;
    streamer?: string;  // NEW: identifies which streamer this gift is for
    timestamp: number;
}

export interface FollowEvent {
    type: 'follow';
    username: string;
    nickname: string;
    streamer?: string;  // NEW
    timestamp: number;
}

export interface ChatEvent {
    type: 'chat';
    username: string;
    nickname: string;
    comment: string;
    streamer?: string;  // NEW
    timestamp: number;
}

export interface JoinEvent {
    type: 'join';
    username: string;
    nickname: string;
    streamer?: string;  // NEW
    timestamp: number;
}

export interface SystemEvent {
    type: 'system';
    message: string;
    subType?: 'connected' | 'disconnected' | 'error';
    streamer?: string;  // NEW
    timestamp: number;
}

export type TikTokEvent = GiftEvent | FollowEvent | ChatEvent | JoinEvent | SystemEvent | BattleMVPEvent | BattleStartEvent | BattleEndEvent;

// Battle state tracking (now supports multiple streamers)
interface BattleState {
    battleId: string;
    streamer: string;
    users: Map<string, { username: string; nickname: string; score: number; teamId?: string }>;
    teams: Map<string, { score: number; users: string[] }>;
    lastUpdate: number;
}

const activeBattles: Map<string, BattleState> = new Map();

export function setSocketIO(socketIO: SocketServer) {
    io = socketIO;
    console.log('✅ Socket.IO instance set');
}

export async function connectToTikTok(username: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
    if (!username) {
        return { success: false, error: 'Username is required' };
    }

    const cleanUsername = username.replace('@', '');
    
    // Check if already connected to this username
    if (tiktokConnections.has(cleanUsername)) {
        console.log(`✅ Already connected to ${cleanUsername}, reusing connection`);
        return { success: true, roomId: 'existing' };
    }

    try {
        console.log(`🔄 Connecting to TikTok live: ${cleanUsername}`);
        
        const connection = new TikTokLiveConnection(cleanUsername, {
            enableExtendedGiftInfo: true,
            processInitialData: false,
            requestPollingIntervalMs: 1000
        });

        const state = await connection.connect();
        console.log(`✅ Connected to TikTok Live: ${cleanUsername} | Room ID: ${state.roomId}`);
        
        tiktokConnections.set(cleanUsername, connection);
        setupEventListenersForConnection(connection, cleanUsername);

        // Broadcast connection status
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'connected',
            message: `Connected to @${cleanUsername}'s live stream`,
            streamer: cleanUsername,
            timestamp: Date.now()
        } as SystemEvent);
        
        return { success: true, roomId: state.roomId };
        
    } catch (error) {
        console.error(`❌ Failed to connect to ${cleanUsername}:`, error);
        
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'error',
            message: `Failed to connect to @${cleanUsername}`,
            streamer: cleanUsername,
            timestamp: Date.now()
        } as SystemEvent);
        
        return { success: false, error: 'Connection failed' };
    }
}

function getGiftImageUrl(giftDetails: any): string | undefined {
    if (!giftDetails?.icon) return undefined;
    
    if (giftDetails.icon.urlListList && Array.isArray(giftDetails.icon.urlListList)) {
        return giftDetails.icon.urlListList[0];
    }
    if (giftDetails.icon.urlList && Array.isArray(giftDetails.icon.urlList)) {
        return giftDetails.icon.urlList[0];
    }
    return undefined;
}

function setupEventListenersForConnection(connection: TikTokLiveConnection, streamerName: string) {
    // GIFT EVENTS
    connection.on(WebcastEvent.GIFT, (data: WebcastGiftMessage) => {
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
            streamer: streamerName,
            timestamp: Date.now()
        };

        console.log(`🎁 [${streamerName}] ${giftEvent.username}: ${giftEvent.repeatCount}x ${giftEvent.giftName}`);
        io?.emit('tiktok-event', giftEvent);
    });

    // FOLLOW EVENTS
    connection.on(WebcastEvent.FOLLOW, (data: any) => {
        const followEvent: FollowEvent = {
            type: 'follow',
            username: data.user?.uniqueId || 'anonymous',
            nickname: data.user?.nickname || 'Anonymous',
            streamer: streamerName,
            timestamp: Date.now()
        };

        console.log(`➕ [${streamerName}] ${followEvent.username} followed!`);
        io?.emit('tiktok-event', followEvent);
    });

    // CHAT EVENTS
    connection.on(WebcastEvent.CHAT, (data: WebcastChatMessage) => {
        const chatEvent: ChatEvent = {
            type: 'chat',
            username: data.user?.uniqueId || 'anonymous',
            nickname: data.user?.nickname || 'Anonymous',
            comment: data.comment || '',
            streamer: streamerName,
            timestamp: Date.now()
        };

        io?.emit('tiktok-event', chatEvent);
    });

    // JOIN EVENTS
    connection.on(WebcastEvent.MEMBER, (data: WebcastMemberMessage) => {
        const joinEvent: JoinEvent = {
            type: 'join',
            username: data.user?.uniqueId || 'anonymous',
            nickname: data.user?.nickname || 'Anonymous',
            streamer: streamerName,
            timestamp: Date.now()
        };

        console.log(`👤 [${streamerName}] ${joinEvent.username} joined`);
        io?.emit('tiktok-event', joinEvent);
    });

    // LIKE EVENTS
    connection.on(WebcastEvent.LIKE, (data: any) => {
        console.log(`❤️ [${streamerName}] ${data.user?.uniqueId} sent ${data.likeCount} likes`);
        io?.emit('tiktok-event', {
            type: 'like',
            username: data.user?.uniqueId || 'anonymous',
            nickname: data.user?.nickname || 'Anonymous',
            count: data.likeCount || 1,
            total: data.totalLikeCount || 0,
            streamer: streamerName,
            timestamp: Date.now()
        });
    });

    // BATTLE START
    connection.on(WebcastEvent.LINK_MIC_BATTLE, (data: any) => {
        console.log(`⚔️ [${streamerName}] Battle started!`);
        
        const battleUsers = data.battleUsers || [];
        const battleId = `${streamerName}_${data.battleId || Date.now()}`;
        
        const battleState: BattleState = {
            battleId: battleId,
            streamer: streamerName,
            users: new Map(),
            teams: new Map(),
            lastUpdate: Date.now()
        };
        
        battleUsers.forEach((user: any, index: number) => {
            battleState.users.set(user.userId || user.uniqueId, {
                username: user.uniqueId || user.userId,
                nickname: user.nickname || user.uniqueId,
                score: 0,
                teamId: `team_${index}`
            });
            battleState.teams.set(`team_${index}`, {
                score: 0,
                users: [user.userId || user.uniqueId]
            });
        });
        
        activeBattles.set(battleId, battleState);
        
        const battleStartEvent: BattleStartEvent = {
            type: 'battle_start',
            battleId: battleId,
            users: battleUsers.map((user: any) => ({
                userId: user.userId || user.uniqueId,
                username: user.uniqueId || user.userId,
                nickname: user.nickname || user.uniqueId
            })),
            timestamp: Date.now()
        };
        
        io?.emit('tiktok-event', { ...battleStartEvent, streamer: streamerName });
    });

    // BATTLE UPDATE
    connection.on(WebcastEvent.LINK_MIC_ARMIES, (data: any) => {
        const battleId = data.battleId;
        
        if (!battleId) {
            const activeBattleIds = Array.from(activeBattles.keys());
            const matchingBattle = activeBattleIds.find(id => id.startsWith(streamerName));
            if (matchingBattle) {
                updateBattleState(matchingBattle, data);
            }
        } else {
            const fullBattleId = `${streamerName}_${battleId}`;
            updateBattleState(fullBattleId, data);
        }
    });

    // DISCONNECT
    connection.on('disconnected' as keyof ClientEventMap, () => {
        console.log(`🔌 [${streamerName}] Disconnected from TikTok`);
        tiktokConnections.delete(streamerName);
        
        // Clean up battles for this streamer
        for (const [battleId, battleState] of activeBattles) {
            if (battleState.streamer === streamerName) {
                activeBattles.delete(battleId);
            }
        }
        
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'disconnected',
            message: `Disconnected from @${streamerName}'s live`,
            streamer: streamerName,
            timestamp: Date.now()
        } as SystemEvent);
    });

    // ERROR
    connection.on('error' as keyof ClientEventMap, (error: Error) => {
        console.error(`❌ [${streamerName}] TikTok connection error:`, error);
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'error',
            message: `Error on @${streamerName}'s stream`,
            streamer: streamerName,
            timestamp: Date.now()
        } as SystemEvent);
    });
}

function updateBattleState(battleId: string, data: any) {
    let battleState = activeBattles.get(battleId);
    
    if (!battleState) {
        return;
    }
    
    battleState.lastUpdate = Date.now();
    
    // Handle team battles
    if (data.teamArmies && Array.isArray(data.teamArmies)) {
        for (const team of data.teamArmies) {
            const teamId = team.teamId;
            const teamTotalScore = parseInt(team.teamTotalScore || team.totalScore || '0');
            
            if (!battleState.teams.has(teamId)) {
                battleState.teams.set(teamId, { score: 0, users: [] });
            }
            const teamInfo = battleState.teams.get(teamId)!;
            teamInfo.score = teamTotalScore;
            
            if (team.userArmies?.userArmy && Array.isArray(team.userArmies.userArmy)) {
                for (const user of team.userArmies.userArmy) {
                    const userId = user.userId;
                    const score = parseInt(user.score || '0');
                    const username = user.userId;
                    const nickname = user.nickname || username;
                    
                    if (!battleState.users.has(userId)) {
                        battleState.users.set(userId, {
                            username: username,
                            nickname: nickname,
                            score: 0,
                            teamId: teamId
                        });
                    }
                    
                    const userInfo = battleState.users.get(userId)!;
                    userInfo.score = score;
                    userInfo.nickname = nickname;
                    
                    if (!teamInfo.users.includes(userId)) {
                        teamInfo.users.push(userId);
                    }
                }
            }
        }
    }
    
    // Find current MVP
    let currentMVP: { userId: string; username: string; nickname: string; score: number; teamId?: string } | null = null;
    let highestScore = -1;
    
    for (const [userId, userInfo] of battleState.users) {
        if (userInfo.score > highestScore) {
            highestScore = userInfo.score;
            currentMVP = {
                userId: userId,
                username: userInfo.username,
                nickname: userInfo.nickname,
                score: userInfo.score,
                teamId: userInfo.teamId
            };
        }
    }
    
    if (currentMVP && currentMVP.score > 0) {
        const mvpEvent: BattleMVPEvent = {
            type: 'battle_mvp',
            battleId: battleId,
            mvp: currentMVP,
            teamScores: Array.from(battleState.teams.entries()).map(([teamId, teamInfo]) => ({
                teamId,
                score: teamInfo.score
            })),
            timestamp: Date.now()
        };
        
        console.log(`🏆 [${battleState.streamer}] Current MVP: ${currentMVP.nickname} with ${currentMVP.score} points`);
        io?.emit('tiktok-event', { ...mvpEvent, streamer: battleState.streamer });
    }
    
    if (data.action === 'finish' || data.battleStatus === 'finished') {
        emitBattleEnd(battleId, battleState);
    }
}

function emitBattleEnd(battleId: string, battleState: BattleState) {
    let finalMVP: { userId: string; username: string; nickname: string; score: number; teamId?: string } | null = null;
    let highestScore = -1;
    let allScores: Array<{ userId: string; username: string; nickname: string; score: number }> = [];
    
    for (const [userId, userInfo] of battleState.users) {
        allScores.push({
            userId: userId,
            username: userInfo.username,
            nickname: userInfo.nickname,
            score: userInfo.score
        });
        
        if (userInfo.score > highestScore) {
            highestScore = userInfo.score;
            finalMVP = {
                userId: userId,
                username: userInfo.username,
                nickname: userInfo.nickname,
                score: userInfo.score,
                teamId: userInfo.teamId
            };
        }
    }
    
    let winner: { userId: string; username: string; nickname: string } | null = null;
    let highestTeamScore = -1;
    for (const [teamId, teamInfo] of battleState.teams) {
        if (teamInfo.score > highestTeamScore) {
            highestTeamScore = teamInfo.score;
            const winnerUserId = teamInfo.users[0];
            const winnerInfo = battleState.users.get(winnerUserId);
            if (winnerInfo) {
                winner = {
                    userId: winnerUserId,
                    username: winnerInfo.username,
                    nickname: winnerInfo.nickname
                };
            }
        }
    }
    
    const battleEndEvent: BattleEndEvent = {
        type: 'battle_end',
        battleId: battleId,
        winner: winner || undefined,
        mvp: finalMVP || undefined,
        finalScores: allScores.sort((a, b) => b.score - a.score),
        timestamp: Date.now()
    };
    
    console.log(`🏁 [${battleState.streamer}] Battle ended! MVP: ${finalMVP?.nickname} with ${finalMVP?.score} points`);
    io?.emit('tiktok-event', { ...battleEndEvent, streamer: battleState.streamer });
    
    activeBattles.delete(battleId);
}

// ========== HELPER FUNCTIONS ==========

export function isTikTokConnected(username?: string): boolean {
    if (username) {
        return tiktokConnections.has(username);
    }
    return tiktokConnections.size > 0;
}

export function getConnectedUsernames(): string[] {
    return Array.from(tiktokConnections.keys());
}

export async function disconnectFromTikTok(username?: string) {
    if (username) {
        const connection = tiktokConnections.get(username);
        if (connection) {
            connection.disconnect();
            tiktokConnections.delete(username);
            console.log(`🔌 Disconnected from ${username}`);
            
            // Clean up battles for this streamer
            for (const [battleId, battleState] of activeBattles) {
                if (battleState.streamer === username) {
                    activeBattles.delete(battleId);
                }
            }
            
            io?.emit('tiktok-event', {
                type: 'system',
                subType: 'disconnected',
                message: `Disconnected from @${username}'s live`,
                streamer: username,
                timestamp: Date.now()
            } as SystemEvent);
        }
    } else {
        // Disconnect all
        for (const [name, connection] of tiktokConnections) {
            connection.disconnect();
            console.log(`🔌 Disconnected from ${name}`);
        }
        tiktokConnections.clear();
        activeBattles.clear();
        
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'disconnected',
            message: 'Disconnected from all streams',
            timestamp: Date.now()
        } as SystemEvent);
    }
}