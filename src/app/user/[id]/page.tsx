'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { connectToSocket, disconnectSocket } from '@/app/lib/socket';

// Top Gifter Interface
interface TopGifter {
  username: string;
  nickname: string;
  totalDiamonds: number;
  giftName: string;
  lastGiftTime: number;
}

export default function UserPage() {
  const params = useParams();
  const userId = params?.id as string;
  
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentGifter, setCurrentGifter] = useState<string | null>(null);
  const [currentGiftImage, setCurrentGiftImage] = useState<string | null>(null);
  const [topGifter, setTopGifter] = useState<TopGifter | null>(null);
  const [currentMVP, setCurrentMVP] = useState<{ nickname: string; score: number } | null>(null);
  const [battleActive, setBattleActive] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [animationState, setAnimationState] = useState<'none' | 'entering' | 'exiting'>('none');
  const [showEffects, setShowEffects] = useState(false);
  const [fontSize, setFontSize] = useState(80);
  const [likes, setLikes] = useState<Array<{ id: number; username: string; x: number; y: number }>>([]);
  const textRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  let nextLikeId = useRef(0);
  const mvpTimeoutRef = useRef<NodeJS.Timeout>();

  const extractLetters = (name: string): string => {
    if (!name) return 'GIFT';
    const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
    return letters || 'GIFT';
  };

  useEffect(() => {
    if (!textRef.current || !currentGifter) return;
    
    const textElement = textRef.current;
    const containerWidth = window.innerWidth * 0.84;
    
    let testSize = 120;
    textElement.style.fontSize = `${testSize}px`;
    
    while (textElement.scrollWidth > containerWidth && testSize > 32) {
      testSize -= 2;
      textElement.style.fontSize = `${testSize}px`;
    }
    
    setFontSize(testSize);
  }, [currentGifter]);

  const triggerGift = (name: string, giftImage?: string, giftName?: string, diamonds?: number, username?: string, nickname?: string) => {
    // Update top gifter
    if (username && diamonds) {
      setTopGifter(current => {
        if (!current || diamonds > current.totalDiamonds) {
          return {
            username: username,
            nickname: nickname || username,
            totalDiamonds: diamonds,
            giftName: giftName || 'Gift',
            lastGiftTime: Date.now()
          };
        }
        return current;
      });
    }

    setCurrentGifter(name);
    setCurrentGiftImage(giftImage || null);
    setAnimationState('entering');
    setShowEffects(true);
    
    setTimeout(() => setShowEffects(false), 2000);
    
    setTimeout(() => {
      setAnimationState('exiting');
      
      setTimeout(() => {
        setCurrentGifter(null);
        setCurrentGiftImage(null);
        setAnimationState('none');
      }, 1000);
    }, 3000);
  };

  // Like animation with constrained area (20% from sides, 20% from top, 40% from bottom)
  const addLike = (username: string) => {
    const id = nextLikeId.current++;
    // X: between 20% and 80% (20% away from both sides)
    const x = Math.random() * 60 + 20;
    // Y: between 20% and 60% (20% from top, 40% from bottom = 60% max)
    const y = Math.random() * 40 + 20;
    
    setLikes(prev => [...prev, { id, username: username || 'someone', x, y }]);
    
    // Remove like after animation completes
    setTimeout(() => {
      setLikes(prev => prev.filter(like => like.id !== id));
    }, 2000);
  };

  const showMVPAlert = (nickname: string, score: number) => {
    // Clear previous timeout
    if (mvpTimeoutRef.current) {
      clearTimeout(mvpTimeoutRef.current);
    }
    
    setCurrentMVP({ nickname, score });
    
    // Set timeout to hide MVP after 15 seconds
    mvpTimeoutRef.current = setTimeout(() => {
      setCurrentMVP(null);
    }, 15000);
  };

  const testGift = () => {
    const testGifters = [
      { name: '👑 ALEXANDER', diamonds: 5000, gift: 'Dragon', username: 'alexander123', nickname: 'Alexander' },
      { name: '⚡ VICTORIA', diamonds: 3500, gift: 'Rose', username: 'victoria456', nickname: 'Victoria' },
      { name: '🔥 CHRISTOPHER', diamonds: 8000, gift: 'Galaxy', username: 'christopher789', nickname: 'Christopher' },
      { name: '💎 ELIZABETH', diamonds: 12000, gift: 'Universe', username: 'elizabeth999', nickname: 'Elizabeth' },
      { name: '🌟 JONATHAN', diamonds: 2000, gift: 'Heart', username: 'jonathan111', nickname: 'Jonathan' },
    ];
    const gifter = testGifters[Math.floor(Math.random() * testGifters.length)];
    const cleanName = extractLetters(gifter.name);
    triggerGift(cleanName, undefined, gifter.gift, gifter.diamonds, gifter.username, gifter.nickname);
  };

  const testLike = () => {
    const names = ['carlyp7996', 'alex123', 'user456', 'fan789', 'coolguy', 'streamerfan'];
    const name = names[Math.floor(Math.random() * names.length)];
    addLike(name);
  };

  const testBattle = () => {
    console.log('🧪 TEST: Simulating battle events');
    // Simulate battle start
    onBattleStart({
      type: 'battle_start',
      battleId: 'test_battle_123',
      users: [
        { userId: '1', username: 'streamer1', nickname: 'Streamer 1' },
        { userId: '2', username: 'streamer2', nickname: 'Streamer 2' }
      ],
      timestamp: Date.now()
    });
    
    // Simulate MVP updates
    setTimeout(() => {
      onBattleMVP({
        type: 'battle_mvp',
        battleId: 'test_battle_123',
        mvp: { userId: '1', username: 'streamer1', nickname: 'Streamer 1', score: 2500 },
        timestamp: Date.now()
      });
    }, 2000);
    
    setTimeout(() => {
      onBattleMVP({
        type: 'battle_mvp',
        battleId: 'test_battle_123',
        mvp: { userId: '2', username: 'streamer2', nickname: 'Streamer 2', score: 5000 },
        timestamp: Date.now()
      });
    }, 5000);
    
    setTimeout(() => {
      onBattleEnd({
        type: 'battle_end',
        battleId: 'test_battle_123',
        winner: { userId: '2', username: 'streamer2', nickname: 'Streamer 2' },
        mvp: { userId: '2', username: 'streamer2', nickname: 'Streamer 2', score: 5000 },
        finalScores: [
          { userId: '1', username: 'streamer1', nickname: 'Streamer 1', score: 2500 },
          { userId: '2', username: 'streamer2', nickname: 'Streamer 2', score: 5000 }
        ],
        timestamp: Date.now()
      });
    }, 8000);
  };

  // Manual handlers for testing
  const onBattleStart = (event: any) => {
    console.log('⚔️ Battle started!', event);
    setBattleActive(true);
  };

  const onBattleMVP = (event: any) => {
    console.log('🏆 MVP update:', event);
    const mvp = event.mvp;
    if (mvp && mvp.score > 0) {
      showMVPAlert(mvp.nickname, mvp.score);
    }
  };

  const onBattleEnd = (event: any) => {
    console.log('🏁 Battle ended!', event);
    setBattleActive(false);
    const finalMVP = event.mvp;
    if (finalMVP) {
      showMVPAlert(`${finalMVP.nickname} 🏆 WINNER!`, finalMVP.score);
    }
  };

  // Test mode for gifts, likes, and battles
  useEffect(() => {
    if (!testMode) return;
    const giftInterval = setInterval(testGift, 8000);
    const likeInterval = setInterval(testLike, 1500);
    const battleInterval = setInterval(testBattle, 30000); // Test battle every 30 seconds
    return () => {
      clearInterval(giftInterval);
      clearInterval(likeInterval);
      clearInterval(battleInterval);
    };
  }, [testMode]);

  // Socket connection and TikTok connection
  useEffect(() => {
    if (!userId) return;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setConnectionStatus('connecting');
    setConnectionError(null);
    
    console.log(`🔌 Initializing connection for user: ${userId}`);
    
    const socket = connectToSocket();
    socketRef.current = socket;
    
    const onConnect = () => {
      console.log('✅ Socket connected, sending connect-tiktok event');
      socket.emit('connect-tiktok', userId);
    };
    
    const onConnectionResult = (result: any) => {
      console.log('📡 Connection result:', result);
      if (result.success) {
        setConnectionStatus('connected');
        setConnectionError(null);
        console.log(`✅ Connected to TikTok! Room ID: ${result.roomId}`);
      } else {
        setConnectionStatus('error');
        setConnectionError(result.error || 'Failed to connect to TikTok');
        console.error('❌ Connection failed:', result.error);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          if (socket.connected) {
            socket.emit('connect-tiktok', userId);
          }
        }, 5000);
      }
    };
    
    const onTikTokEvent = (event: any) => {
      console.log('📡 TikTok event:', event.type, event);
      
      // GIFT EVENT
      if (event.type === 'gift') {
        const rawName = event.nickname || event.username || 'GIFT';
        const cleanName = extractLetters(rawName);
        triggerGift(
          cleanName, 
          event.giftImage, 
          event.giftName, 
          event.totalDiamonds, 
          event.username, 
          event.nickname
        );
      }
      
      // LIKE EVENT
      if (event.type === 'like') {
        console.log(`❤️ Like from ${event.nickname} (${event.count} likes, total: ${event.total})`);
        addLike(event.nickname);
      }
      
      // BATTLE START EVENT
      if (event.type === 'battle_start') {
        console.log('⚔️ BATTLE START RECEIVED:', event);
        setBattleActive(true);
        const battleUsers = event.users?.map((u: any) => u.nickname).join(' vs ') || 'unknown';
        console.log(`⚔️ Battle started! ${battleUsers}`);
      }
      
      // BATTLE MVP EVENT
      if (event.type === 'battle_mvp') {
        console.log('🏆 BATTLE MVP RECEIVED:', event);
        const mvp = event.mvp;
        if (mvp && mvp.score > 0) {
          console.log(`🏆 MVP: ${mvp.nickname} with ${mvp.score} points`);
          showMVPAlert(mvp.nickname, mvp.score);
        }
      }
      
      // BATTLE END EVENT
      if (event.type === 'battle_end') {
        console.log('🏁 BATTLE END RECEIVED:', event);
        setBattleActive(false);
        const finalMVP = event.mvp;
        console.log(`🏁 Battle ended! Final MVP: ${finalMVP?.nickname} with ${finalMVP?.score} points`);
        if (finalMVP) {
          showMVPAlert(`${finalMVP.nickname} 🏆 WINNER!`, finalMVP.score);
        }
      }
      
      // FOLLOW EVENT
      if (event.type === 'follow') {
        console.log(`➕ ${event.nickname} followed!`);
      }
      
      // CHAT EVENT
      if (event.type === 'chat') {
        console.log(`💬 ${event.nickname}: ${event.comment}`);
      }
      
      // JOIN EVENT
      if (event.type === 'join') {
        console.log(`👤 ${event.nickname} joined`);
      }
      
      // SYSTEM EVENT
      if (event.type === 'system') {
        if (event.subType === 'connected') {
          setConnectionStatus('connected');
          setConnectionError(null);
          console.log(`✅ ${event.message}`);
        } else if (event.subType === 'disconnected') {
          setConnectionStatus('connecting');
          console.log(`🔌 ${event.message}`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (socket.connected) {
              socket.emit('connect-tiktok', userId);
            }
          }, 3000);
        } else if (event.subType === 'error') {
          setConnectionStatus('error');
          setConnectionError(event.message);
          console.error(`❌ ${event.message}`);
        }
      }
    };
    
    const onDisconnect = (reason: string) => {
      console.log(`🔌 Socket disconnected: ${reason}`);
      setConnectionStatus('connecting');
      
      if (reason === 'io server disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Reconnecting...');
          socket.connect();
        }, 1000);
      }
    };
    
    const onSocketError = (error: Error) => {
      console.error('❌ Socket error:', error);
      setConnectionStatus('error');
      setConnectionError(error.message);
    };
    
    socket.on('connect', onConnect);
    socket.on('connection-result', onConnectionResult);
    socket.on('tiktok-event', onTikTokEvent);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onSocketError);
    
    if (socket.connected) {
      onConnect();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (mvpTimeoutRef.current) {
        clearTimeout(mvpTimeoutRef.current);
      }
      socket.off('connect', onConnect);
      socket.off('connection-result', onConnectionResult);
      socket.off('tiktok-event', onTikTokEvent);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onSocketError);
      
      if (socketRef.current) {
        socket.emit('disconnect-tiktok');
        disconnectSocket();
        socketRef.current = null;
      }
    };
  }, [userId]);

  // Debug: Check if battle events are registered
  useEffect(() => {
    console.log('🔍 Checking battle event handlers...');
    console.log('Battle Active:', battleActive);
    console.log('MVP:', currentMVP);
  }, [battleActive, currentMVP]);

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      {/* TOP GIFT LEADERBOARD */}
      {topGifter && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(50,0,80,0.9))',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '16px 24px',
          border: '2px solid gold',
          boxShadow: '0 0 40px rgba(255,215,0,0.5), 0 0 20px rgba(255,0,255,0.3)',
          zIndex: 30,
          animation: 'leaderboardGlow 2s ease-in-out infinite, slideInLeft 0.5s ease-out',
          pointerEvents: 'auto',
          minWidth: '280px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px' }}>👑</span>
            <span style={{ 
              fontSize: '20px', 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, gold, #ffd700, #ffb347)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              TOP GIFT GIVER
            </span>
          </div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: '900',
            color: '#FFD700',
            textShadow: '0 0 10px rgba(255,215,0,0.5)',
            marginBottom: '8px'
          }}>
            {topGifter.nickname}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>GIFT</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>{topGifter.giftName}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>DIAMONDS</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFD700' }}>💎 {topGifter.totalDiamonds.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        pointerEvents: 'auto',
        zIndex: 10000,
        background: connectionStatus === 'connected' ? 'rgba(0,255,0,0.3)' : 
                   connectionStatus === 'error' ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,0,0.3)',
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: '12px',
        fontFamily: 'monospace',
        color: 'white',
        backdropFilter: 'blur(5px)',
        border: connectionStatus === 'connected' ? '1px solid #0f0' :
                connectionStatus === 'error' ? '1px solid #f00' : '1px solid #ff0',
      }}>
        {connectionStatus === 'connected' ? '🟢 LIVE' : 
         connectionStatus === 'error' ? `🔴 ERROR${connectionError ? ': ' + connectionError.substring(0, 30) : ''}` : 
         '🟡 CONNECTING...'}
      </div>

      {/* LIKE ANIMATIONS - Constrained area (20% from sides, 20% from top, 40% from bottom) */}
      {likes.map((like) => (
        <div
          key={like.id}
          style={{
            position: 'fixed',
            left: `${like.x}%`,
            top: `${like.y}%`,
            animation: 'likeFloatEase 2s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards',
            pointerEvents: 'none',
            zIndex: 25,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #FF3366, #FF6B6B)',
            padding: '8px 16px',
            borderRadius: '50px',
            boxShadow: '0 0 20px rgba(255,51,102,0.5)',
            backdropFilter: 'blur(5px)',
          }}>
            <span style={{ fontSize: '24px', animation: 'heartBeat 0.3s ease-out' }}>❤️</span>
            <span style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px',
              fontFamily: 'Arial, sans-serif',
              textShadow: '0 0 5px rgba(0,0,0,0.3)',
            }}>
              {like.username}
            </span>
          </div>
        </div>
      ))}

      {/* Test button */}
      <div style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        pointerEvents: 'auto',
        zIndex: 10000,
        display: 'flex',
        gap: '10px',
      }}>
        <button
          onClick={() => setTestMode(!testMode)}
          style={{
            padding: '8px 16px',
            background: testMode ? 'rgba(0,255,255,0.3)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(0,255,255,0.3)',
            borderRadius: 20,
            cursor: 'pointer',
            fontSize: '12px',
            backdropFilter: 'blur(5px)',
          }}
        >
          {testMode ? '✨ COOL MODE' : '⚡ TEST'}
        </button>
        
        {/* Battle Test Button */}
        {testMode && (
          <button
            onClick={testBattle}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,100,0,0.5)',
              color: 'white',
              border: '1px solid rgba(255,165,0,0.8)',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: '12px',
              backdropFilter: 'blur(5px)',
            }}
          >
            ⚔️ TEST BATTLE
          </button>
        )}
        
        {connectionStatus === 'error' && (
          <button
            onClick={() => {
              if (socketRef.current?.connected) {
                socketRef.current.emit('connect-tiktok', userId);
                setConnectionStatus('connecting');
                setConnectionError(null);
              }
            }}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,100,0,0.3)',
              color: 'white',
              border: '1px solid rgba(255,100,0,0.5)',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: '12px',
              backdropFilter: 'blur(5px)',
            }}
          >
            🔄 RETRY
          </button>
        )}
      </div>

      {/* BATTLE MVP ALERT - Enhanced Animation */}
      {currentMVP && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF4500, #FF1493)',
          backgroundSize: '300% 300%',
          padding: '24px 48px',
          borderRadius: '60px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '32px',
          fontFamily: 'Arial Black, Impact, sans-serif',
          textShadow: '0 0 20px rgba(0,0,0,0.5), 0 0 10px rgba(255,215,0,0.8)',
          boxShadow: '0 0 60px rgba(255,215,0,0.8), 0 0 120px rgba(255,69,0,0.5)',
          zIndex: 20,
          animation: 'mvpGlow 1.5s ease-in-out infinite, mvpEntrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          backdropFilter: 'blur(10px)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          border: '3px solid gold',
          letterSpacing: '2px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '48px', animation: 'crownFloat 2s ease-in-out infinite' }}>👑</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px', opacity: 0.9 }}>🏆 MOST VALUABLE PLAYER 🏆</div>
              <div style={{ fontSize: '48px', fontWeight: '900' }}>{currentMVP.nickname}</div>
              <div style={{ fontSize: '24px', marginTop: '8px', color: '#FFD700' }}>{currentMVP.score.toLocaleString()} POINTS</div>
            </div>
            <span style={{ fontSize: '48px', animation: 'crownFloat 2s ease-in-out infinite reverse' }}>👑</span>
          </div>
        </div>
      )}

      {/* BATTLE ACTIVE INDICATOR */}
      {battleActive && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.7)',
          padding: '8px 16px',
          borderRadius: '20px',
          color: '#FFD700',
          fontSize: '14px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          zIndex: 20,
          backdropFilter: 'blur(5px)',
          border: '1px solid #FFD700',
          animation: 'pulse 1s ease-in-out infinite',
          boxShadow: '0 0 15px rgba(255,215,0,0.5)',
        }}>
          ⚔️ BATTLE ACTIVE ⚔️
        </div>
      )}

      {/* GIFT IMAGE OVERLAY */}
      {currentGiftImage && currentGifter && (
        <div style={{
          position: 'fixed',
          top: '30%',
          right: '20px',
          width: '80px',
          height: '80px',
          zIndex: 15,
          animation: 'giftImageFloat 1.5s ease-out forwards',
          pointerEvents: 'none',
        }}>
          <img 
            src={currentGiftImage} 
            alt="gift"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 20px cyan)',
            }}
          />
        </div>
      )}

      {/* COOL COLOR EFFECTS */}
      {showEffects && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          {/* Lightning */}
          {[...Array(3)].map((_, i) => (
            <div
              key={`bolt-${i}`}
              style={{
                position: 'absolute',
                top: '0%',
                left: `${20 + i * 30}%`,
                width: '4px',
                height: '100%',
                background: 'linear-gradient(180deg, transparent, #00FFFF, #4169E1, #4B0082, transparent)',
                filter: 'blur(3px)',
                animation: `lightningFlash 0.3s ease-out ${i * 0.1}s`,
                opacity: 0,
                boxShadow: '0 0 30px #00FFFF',
              }}
            />
          ))}

          {/* Explosion Rings */}
          {[...Array(5)].map((_, i) => (
            <div
              key={`ring-${i}`}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${100 + i * 50}px`,
                height: `${100 + i * 50}px`,
                border: `3px solid ${i % 2 === 0 ? '#00FFFF' : '#9370DB'}`,
                borderRadius: '50%',
                animation: `explosionRing ${1 + i * 0.2}s ease-out forwards`,
                opacity: 0,
                boxShadow: `0 0 ${30 + i * 20}px ${i % 2 === 0 ? '#00FFFF' : '#9370DB'}`,
              }}
            />
          ))}

          {/* Sparkles */}
          {[...Array(40)].map((_, i) => {
            const colors = ['#00FFFF', '#4169E1', '#9370DB', '#8A2BE2', '#4B0082'];
            return (
              <div
                key={`sparkle-${i}`}
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  width: `${Math.random() * 8 + 3}px`,
                  height: `${Math.random() * 8 + 3}px`,
                  background: colors[Math.floor(Math.random() * colors.length)],
                  borderRadius: '50%',
                  boxShadow: `0 0 ${Math.random() * 30 + 15}px currentColor`,
                  animation: `sparkleFall ${1.5 + Math.random()}s linear forwards`,
                  animationDelay: `${Math.random() * 0.8}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Name */}
      {currentGifter && (
        <div style={{
          paddingLeft: '8vw',
          paddingRight: '8vw',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
          filter: showEffects ? 'brightness(1.3) contrast(1.2)' : 'none',
          transition: 'filter 0.3s ease',
        }}>
          <div
            ref={textRef}
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: '900',
              fontFamily: 'Arial Black, Impact, sans-serif',
              background: 'linear-gradient(135deg, #00FFFF, #4169E1, #9370DB, #8A2BE2, #4B0082)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              filter: 'drop-shadow(0 0 40px rgba(0,255,255,0.8)) drop-shadow(0 0 80px rgba(147,112,219,0.6)) drop-shadow(0 0 120px rgba(75,0,130,0.4))',
              animation: animationState === 'entering' 
                ? 'coolEnter 0.8s cubic-bezier(0.2, 0.9, 0.3, 1.5) forwards' 
                : animationState === 'exiting'
                ? 'coolExit 1s ease-out forwards'
                : 'none',
              textShadow: showEffects ? '0 0 60px cyan, 0 0 120px blueviolet' : 'none',
            }}
          >
            {currentGifter}
          </div>
        </div>
      )}

      <style>{`
        @keyframes coolEnter {
          0% {
            opacity: 0;
            transform: scale(0.1) rotate(-20deg) translateY(100px);
            filter: blur(40px) brightness(0.5);
          }
          30% {
            opacity: 1;
            transform: scale(1.3) rotate(5deg) translateY(-20px);
            filter: blur(0) brightness(1.3);
          }
          50% {
            transform: scale(0.95) rotate(-3deg) translateY(5px);
          }
          70% {
            transform: scale(1.05) rotate(2deg) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0) translateY(0);
            filter: brightness(1.2);
          }
        }

        @keyframes coolExit {
          0% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0) brightness(1.2);
          }
          30% {
            opacity: 0.8;
            transform: scale(1.8);
            filter: blur(3px) brightness(1.5) hue-rotate(30deg);
          }
          60% {
            opacity: 0.4;
            transform: scale(3);
            filter: blur(8px) brightness(2) hue-rotate(60deg);
          }
          100% {
            opacity: 0;
            transform: scale(5);
            filter: blur(20px) brightness(3) hue-rotate(90deg);
          }
        }

        @keyframes likeFloatEase {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.3);
          }
          20% {
            opacity: 1;
            transform: translateY(-30px) scale(1);
          }
          60% {
            opacity: 1;
            transform: translateY(-80px) scale(0.95);
          }
          100% {
            opacity: 0;
            transform: translateY(-120px) scale(0.8);
          }
        }

        @keyframes heartBeat {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes mvpEntrance {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2) rotate(-180deg);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }
        }

        @keyframes mvpGlow {
          0%, 100% {
            box-shadow: 0 0 60px rgba(255,215,0,0.8), 0 0 120px rgba(255,69,0,0.5);
            background-position: 0% 50%;
          }
          50% {
            box-shadow: 0 0 100px rgba(255,215,0,1), 0 0 180px rgba(255,69,0,0.8);
            background-position: 100% 50%;
          }
        }

        @keyframes crownFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes leaderboardGlow {
          0%, 100% {
            box-shadow: 0 0 40px rgba(255,215,0,0.5), 0 0 20px rgba(255,0,255,0.3);
            border-color: gold;
          }
          50% {
            box-shadow: 0 0 60px rgba(255,215,0,0.8), 0 0 30px rgba(255,0,255,0.5);
            border-color: #ffd700;
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes lightningFlash {
          0% { opacity: 0; transform: scaleY(0); }
          20% { opacity: 1; transform: scaleY(1); }
          80% { opacity: 0.8; transform: scaleY(1); }
          100% { opacity: 0; transform: scaleY(0); }
        }

        @keyframes explosionRing {
          0% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(0.2);
            border-width: 5px;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(4);
            border-width: 1px;
          }
        }

        @keyframes sparkleFall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); text-shadow: 0 0 8px gold; }
        }

        @keyframes giftImageFloat {
          0% {
            opacity: 0;
            transform: translateX(50px) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(-50px) scale(0.5);
          }
        }

        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}