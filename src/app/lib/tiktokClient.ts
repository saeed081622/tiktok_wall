import { TikTokLiveConnection, WebcastEvent, WebcastGiftMessage, WebcastChatMessage, WebcastMemberMessage, ClientEventMap } from 'tiktok-live-connector';
import { Server as SocketServer } from 'socket.io';

let tiktokConnection: TikTokLiveConnection | null = null;
let io: SocketServer | null = null;

// Add Battle MVP interface
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

export type TikTokEvent = GiftEvent | FollowEvent | ChatEvent | JoinEvent | SystemEvent | BattleMVPEvent | BattleStartEvent | BattleEndEvent;

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

// Track battle state to determine MVP
interface BattleState {
    battleId: string;
    users: Map<string, { username: string; nickname: string; score: number; teamId?: string }>;
    teams: Map<string, { score: number; users: string[] }>;
    lastUpdate: number;
}

const activeBattles = new Map<string, BattleState>();

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
        enableExtendedGiftInfo: true,  // Already enabled - gives gift images
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

    // GIFT EVENTS (unchanged - already working with images)
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

    // FOLLOW EVENTS (unchanged)
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

    // CHAT EVENTS (unchanged)
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

    // JOIN EVENTS (unchanged)
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

    // LIKE EVENTS (unchanged)
    tiktokConnection.on(WebcastEvent.LIKE, (data: any) => {
        console.log(`❤️ ${data.user?.uniqueId} sent ${data.likeCount} likes`);
    });

    // ========== NEW: BATTLE START EVENT ==========
    tiktokConnection.on(WebcastEvent.LINK_MIC_BATTLE, (data: any) => {
        console.log('⚔️ Battle started!', data);
        
        const battleUsers = data.battleUsers || [];
        const battleId = data.battleId || `battle_${Date.now()}`;
        
        // Initialize battle state
        const battleState: BattleState = {
            battleId: battleId,
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
        
        io?.emit('tiktok-event', battleStartEvent);
    });

    // ========== NEW: BATTLE UPDATE EVENT (MVP tracking) ==========
    tiktokConnection.on(WebcastEvent.LINK_MIC_ARMIES, (data: any) => {
        const battleId = data.battleId;
        
        if (!battleId) {
            // Try to find active battle
            const activeBattleIds = Array.from(activeBattles.keys());
            if (activeBattleIds.length === 0) return;
            const currentBattleId = activeBattleIds[activeBattleIds.length - 1];
            updateBattleState(currentBattleId, data);
        } else {
            updateBattleState(battleId, data);
        }
    });

    // DISCONNECT EVENT
    tiktokConnection.on('disconnected' as keyof ClientEventMap, () => {
        console.log('🔌 Disconnected from TikTok');
        // Clear active battles
        activeBattles.clear();
        io?.emit('tiktok-event', {
            type: 'system',
            subType: 'disconnected',
            message: 'Disconnected from TikTok',
            timestamp: Date.now()
        } as SystemEvent);
    });

    // ERROR EVENT
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

// Helper function to update battle state and emit MVP updates
function updateBattleState(battleId: string, data: any) {
    let battleState = activeBattles.get(battleId);
    
    if (!battleState) {
        // Create new battle state if not exists
        battleState = {
            battleId: battleId,
            users: new Map(),
            teams: new Map(),
            lastUpdate: Date.now()
        };
        activeBattles.set(battleId, battleState);
    }
    
    battleState.lastUpdate = Date.now();
    
    // Parse armies data to get scores
    // Structure varies based on battle type (1v1, team battle, etc.)
    
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
            
            // Parse individual user scores
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
                    
                    // Add to team users list if not already
                    if (!teamInfo.users.includes(userId)) {
                        teamInfo.users.push(userId);
                    }
                }
            }
        }
    }
    
    // Handle 1v1 battles (older format)
    if (data.battleItems) {
        for (const [userId, userData] of Object.entries(data.battleItems)) {
            const userArmies = (userData as any).userArmy;
            if (userArmies && Array.isArray(userArmies)) {
                for (const army of userArmies) {
                    const score = parseInt(army.score || '0');
                    if (!battleState.users.has(army.userId)) {
                        battleState.users.set(army.userId, {
                            username: army.userId,
                            nickname: army.nickname || army.userId,
                            score: 0
                        });
                    }
                    const userInfo = battleState.users.get(army.userId)!;
                    userInfo.score += score;
                }
            }
        }
    }
    
    // Find current MVP (highest score)
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
    
    // Emit MVP update if there's a current leader
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
        
        console.log(`🏆 Current MVP: ${currentMVP.nickname} with ${currentMVP.score} points`);
        io?.emit('tiktok-event', mvpEvent);
    }
    
    // Check if battle ended (score gap or time-based - we can detect from data)
    // Some battle end events might come through LINK_MIC_BATTLE with action 'finish'
    if (data.action === 'finish' || data.battleStatus === 'finished') {
        emitBattleEnd(battleId, battleState);
    }
}

// Helper to emit battle end event with final MVP
function emitBattleEnd(battleId: string, battleState: BattleState) {
    // Find final MVP
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
    
    // Find winner (team with highest score)
    let winner: { userId: string; username: string; nickname: string } | null = null;
    let highestTeamScore = -1;
    for (const [teamId, teamInfo] of battleState.teams) {
        if (teamInfo.score > highestTeamScore) {
            highestTeamScore = teamInfo.score;
            // Get first user from winning team as representative
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
    
    console.log(`🏁 Battle ended! MVP: ${finalMVP?.nickname} with ${finalMVP?.score} points`);
    io?.emit('tiktok-event', battleEndEvent);
    
    // Clean up
    activeBattles.delete(battleId);
}

export function disconnectFromTikTok() {
    if (tiktokConnection) {
        tiktokConnection.disconnect();
        tiktokConnection = null;
        // Clear active battles
        activeBattles.clear();
        console.log('🔌 Disconnected from TikTok');
    }
}