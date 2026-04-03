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
  const [currentGiftName, setCurrentGiftName] = useState<string>('');
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
  const giftTimeoutRef = useRef<NodeJS.Timeout>();

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

    setCurrentGiftName(giftName || '');
    setCurrentGifter(name);
    setCurrentGiftImage(giftImage || null);
    setAnimationState('entering');
    setShowEffects(true);
    
    // Clear previous timeout
    if (giftTimeoutRef.current) {
      clearTimeout(giftTimeoutRef.current);
    }
    
    // Effects last 2 seconds
    setTimeout(() => setShowEffects(false), 2000);
    
    // Animation sequence
    giftTimeoutRef.current = setTimeout(() => {
      setAnimationState('exiting');
      
      setTimeout(() => {
        setCurrentGifter(null);
        setCurrentGiftImage(null);
        setCurrentGiftName('');
        setAnimationState('none');
      }, 1000);
    }, 3000);
  };

  // Like animation - scale up with gradual fade from start
  const addLike = (username: string) => {
    const id = nextLikeId.current++;
    // X: between 20% and 80% (20% away from both sides)
    const x = Math.random() * 60 + 20;
    // Y: between 20% and 60% (20% from top, 40% from bottom = 60% max)
    const y = Math.random() * 40 + 20;
    
    setLikes(prev => [...prev, { id, username: username || 'someone', x, y }]);
    
    // Remove like after animation completes (1.5 seconds)
    setTimeout(() => {
      setLikes(prev => prev.filter(like => like.id !== id));
    }, 1500);
  };

  const showMVPAlert = (nickname: string, score: number) => {
    if (mvpTimeoutRef.current) {
      clearTimeout(mvpTimeoutRef.current);
    }
    
    setCurrentMVP({ nickname, score });
    
    mvpTimeoutRef.current = setTimeout(() => {
      setCurrentMVP(null);
    }, 15000);
  };

  const testGift = () => {
    const testGifters = [
      { name: '👑 ALEXANDER', diamonds: 5000, gift: 'Dragon', username: 'alexander123', nickname: 'Alexander', image: 'https://cdn-icons-png.flaticon.com/512/1864/1864514.png' },
      { name: '⚡ VICTORIA', diamonds: 3500, gift: 'Rose', username: 'victoria456', nickname: 'Victoria', image: 'https://cdn-icons-png.flaticon.com/512/2103/2103735.png' },
      { name: '🔥 CHRISTOPHER', diamonds: 8000, gift: 'Galaxy', username: 'christopher789', nickname: 'Christopher', image: 'https://cdn-icons-png.flaticon.com/512/1164/1164845.png' },
      { name: '💎 ELIZABETH', diamonds: 12000, gift: 'Universe', username: 'elizabeth999', nickname: 'Elizabeth', image: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' },
      { name: '🌟 JONATHAN', diamonds: 2000, gift: 'Heart', username: 'jonathan111', nickname: 'Jonathan', image: 'https://cdn-icons-png.flaticon.com/512/833/833472.png' },
    ];
    const gifter = testGifters[Math.floor(Math.random() * testGifters.length)];
    const cleanName = extractLetters(gifter.name);
    triggerGift(cleanName, gifter.image, gifter.gift, gifter.diamonds, gifter.username, gifter.nickname);
  };

  const testLike = () => {
    const names = ['carlyp7996', 'alex123', 'user456', 'fan789', 'coolguy', 'streamerfan'];
    const name = names[Math.floor(Math.random() * names.length)];
    addLike(name);
  };

  const testBattle = () => {
    console.log('🧪 TEST: Simulating battle events');
    onBattleStart({
      type: 'battle_start',
      battleId: 'test_battle_123',
      users: [
        { userId: '1', username: 'streamer1', nickname: 'Streamer 1' },
        { userId: '2', username: 'streamer2', nickname: 'Streamer 2' }
      ],
      timestamp: Date.now()
    });
    
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

  useEffect(() => {
    if (!testMode) return;
    const giftInterval = setInterval(testGift, 8000);
    const likeInterval = setInterval(testLike, 1500);
    const battleInterval = setInterval(testBattle, 30000);
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
      
      if (event.type === 'like') {
        console.log(`❤️ Like from ${event.nickname} (${event.count} likes, total: ${event.total})`);
        addLike(event.nickname);
      }
      
      if (event.type === 'battle_start') {
        console.log('⚔️ BATTLE START RECEIVED:', event);
        setBattleActive(true);
      }
      
      if (event.type === 'battle_mvp') {
        console.log('🏆 BATTLE MVP RECEIVED:', event);
        const mvp = event.mvp;
        if (mvp && mvp.score > 0) {
          showMVPAlert(mvp.nickname, mvp.score);
        }
      }
      
      if (event.type === 'battle_end') {
        console.log('🏁 BATTLE END RECEIVED:', event);
        setBattleActive(false);
        const finalMVP = event.mvp;
        if (finalMVP) {
          showMVPAlert(`${finalMVP.nickname} 🏆 WINNER!`, finalMVP.score);
        }
      }
      
      if (event.type === 'follow') {
        console.log(`➕ ${event.nickname} followed!`);
      }
      
      if (event.type === 'chat') {
        console.log(`💬 ${event.nickname}: ${event.comment}`);
      }
      
      if (event.type === 'join') {
        console.log(`👤 ${event.nickname} joined`);
      }
      
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
      if (giftTimeoutRef.current) {
        clearTimeout(giftTimeoutRef.current);
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
      {/* TOP GIFT LEADERBOARD - Bottom Left (40% from bottom, 10% from left) */}
      {topGifter && (
        <div style={{
          position: 'fixed',
          bottom: '40%',
          left: '10%',
          transform: 'translateY(50%)',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.85), rgba(50,0,80,0.95))',
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          padding: '20px 28px',
          border: '2px solid gold',
          boxShadow: '0 0 50px rgba(255,215,0,0.6), 0 0 25px rgba(255,0,255,0.4)',
          zIndex: 30,
          animation: 'leaderboardGlow 2s ease-in-out infinite, slideInLeft 0.5s ease-out',
          pointerEvents: 'auto',
          minWidth: '300px',
        }}>
          {/* <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '36px', animation: 'crownSpin 3s ease-in-out infinite' }}>👑</span>
            <span style={{ 
              fontSize: '22px', 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, gold, #ffd700, #ffb347)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              TOP GIFT GIVER
            </span>
          </div> */}
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '900',
            color: '#FFD700',
            textShadow: '0 0 15px rgba(255,215,0,0.8)',
            marginBottom: '12px',
            letterSpacing: '1px'
          }}>
            {topGifter.nickname}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>GIFT</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎁 {topGifter.giftName}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>DIAMONDS</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFD700' }}>💎 {topGifter.totalDiamonds.toLocaleString()}</div>
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

      {/* LIKE ANIMATIONS - Scale up with gradual fade from start */}
      {likes.map((like) => (
        <div
          key={like.id}
          style={{
            position: 'fixed',
            left: `${like.x}%`,
            top: `${like.y}%`,
            animation: 'likeFloatScale 1.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards',
            pointerEvents: 'none',
            zIndex: 25,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #FF3366, #FF6B6B, #FF1493)',
            padding: '10px 20px',
            borderRadius: '60px',
            boxShadow: '0 0 25px rgba(255,51,102,0.6), 0 0 10px rgba(255,20,147,0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            <span style={{ fontSize: '28px', animation: 'heartBeatScale 0.4s ease-out' }}>❤️</span>
            <span style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
              fontFamily: 'Arial Black, sans-serif',
              textShadow: '0 0 8px rgba(0,0,0,0.5)',
              letterSpacing: '0.5px',
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

      {/* BATTLE MVP ALERT */}
      {currentMVP && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF4500, #FF1493)',
          backgroundSize: '300% 300%',
          padding: '28px 56px',
          borderRadius: '70px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '36px',
          fontFamily: 'Arial Black, Impact, sans-serif',
          textShadow: '0 0 25px rgba(0,0,0,0.6), 0 0 15px rgba(255,215,0,0.9)',
          boxShadow: '0 0 80px rgba(255,215,0,0.9), 0 0 150px rgba(255,69,0,0.6)',
          zIndex: 20,
          animation: 'mvpGlow 1.5s ease-in-out infinite, mvpEntrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          backdropFilter: 'blur(12px)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          border: '4px solid gold',
          letterSpacing: '3px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <span style={{ fontSize: '56px', animation: 'crownFloat 2s ease-in-out infinite' }}>👑</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '10px', opacity: 0.95 }}>🏆 MOST VALUABLE PLAYER 🏆</div>
              <div style={{ fontSize: '56px', fontWeight: '900' }}>{currentMVP.nickname}</div>
              <div style={{ fontSize: '28px', marginTop: '12px', color: '#FFD700' }}>{currentMVP.score.toLocaleString()} POINTS</div>
            </div>
            <span style={{ fontSize: '56px', animation: 'crownFloat 2s ease-in-out infinite reverse' }}>👑</span>
          </div>
        </div>
      )}

      {/* BATTLE ACTIVE INDICATOR */}
      {battleActive && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.75)',
          padding: '10px 20px',
          borderRadius: '25px',
          color: '#FFD700',
          fontSize: '16px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          zIndex: 20,
          backdropFilter: 'blur(8px)',
          border: '1px solid #FFD700',
          animation: 'pulseBattle 1s ease-in-out infinite',
          boxShadow: '0 0 20px rgba(255,215,0,0.6)',
        }}>
          ⚔️ BATTLE ACTIVE ⚔️
        </div>
      )}

      {/* AMAZING GIFT ANIMATION - Enhanced with multi-layer effects */}
      {currentGifter && (
        <>
          {/* Glow ring behind text */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${fontSize * 3}px`,
            height: `${fontSize * 1.5}px`,
            background: 'radial-gradient(circle, rgba(0,255,255,0.4), rgba(147,112,219,0.2), transparent)',
            borderRadius: '50%',
            filter: 'blur(30px)',
            animation: 'glowPulse 1s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 8,
          }} />
          
          {/* Floating particles around text */}
          {[...Array(12)].map((_, i) => (
            <div
              key={`particle-${i}`}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                width: '8px',
                height: '8px',
                background: `hsl(${200 + i * 20}, 100%, 60%)`,
                borderRadius: '50%',
                boxShadow: '0 0 15px currentColor',
                animation: `particleOrbit ${1.5 + i * 0.1}s ease-out forwards`,
                animationDelay: `${i * 0.05}s`,
                pointerEvents: 'none',
                zIndex: 9,
              }}
            />
          ))}
          
          {/* Name text */}
          <div style={{
            paddingLeft: '8vw',
            paddingRight: '8vw',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10,
            filter: showEffects ? 'brightness(1.4) contrast(1.2)' : 'none',
            transition: 'filter 0.3s ease',
          }}>
            <div
              ref={textRef}
              style={{
                fontSize: `${fontSize}px`,
                fontWeight: '900',
                fontFamily: 'Arial Black, Impact, sans-serif',
                background: 'linear-gradient(135deg, #00FFFF, #4169E1, #9370DB, #8A2BE2, #4B0082, #FF00FF)',
                backgroundSize: '400% 400%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                filter: 'drop-shadow(0 0 50px rgba(0,255,255,0.9)) drop-shadow(0 0 100px rgba(147,112,219,0.7)) drop-shadow(0 0 150px rgba(255,0,255,0.5))',
                animation: animationState === 'entering' 
                  ? 'giftEnterEpic 0.8s cubic-bezier(0.2, 0.9, 0.3, 1.5) forwards, gradientShift 2s ease infinite' 
                  : animationState === 'exiting'
                  ? 'giftExitEpic 1s ease-out forwards'
                  : 'gradientShift 2s ease infinite',
                textShadow: showEffects ? '0 0 80px cyan, 0 0 150px blueviolet' : 'none',
                letterSpacing: '4px',
              }}
            >
              {currentGifter}
            </div>
          </div>
          
          {/* Gift name subtitle */}
          {currentGiftName && (
            <div style={{
              position: 'fixed',
              bottom: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(100,0,100,0.7))',
              backdropFilter: 'blur(10px)',
              padding: '8px 24px',
              borderRadius: '40px',
              border: '1px solid cyan',
              animation: 'giftNameSlide 0.6s ease-out forwards',
              pointerEvents: 'none',
              zIndex: 11,
              whiteSpace: 'nowrap',
            }}>
              <span style={{
                color: '#FFD700',
                fontWeight: 'bold',
                fontSize: '20px',
                fontFamily: 'Arial Black, sans-serif',
              }}>
                🎁 {currentGiftName} 🎁
              </span>
            </div>
          )}
        </>
      )}

      {/* GIFT IMAGE OVERLAY */}
      {currentGiftImage && currentGifter && (
        <div style={{
          position: 'fixed',
          top: '35%',
          right: '30px',
          width: '100px',
          height: '100px',
          zIndex: 15,
          animation: 'giftImageEpic 1.2s cubic-bezier(0.2, 0.8, 0.4, 1.2) forwards',
          pointerEvents: 'none',
        }}>
          <img 
            src={currentGiftImage} 
            alt="gift"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 30px cyan) drop-shadow(0 0 15px magenta)',
              animation: 'giftImageSpin 1s ease-in-out',
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
          {[...Array(3)].map((_, i) => (
            <div
              key={`bolt-${i}`}
              style={{
                position: 'absolute',
                top: '0%',
                left: `${20 + i * 30}%`,
                width: '6px',
                height: '100%',
                background: 'linear-gradient(180deg, transparent, #00FFFF, #4169E1, #FF00FF, transparent)',
                filter: 'blur(4px)',
                animation: `lightningFlashEpic 0.4s ease-out ${i * 0.1}s`,
                opacity: 0,
                boxShadow: '0 0 40px cyan',
              }}
            />
          ))}

          {[...Array(6)].map((_, i) => (
            <div
              key={`ring-${i}`}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${100 + i * 60}px`,
                height: `${100 + i * 60}px`,
                border: `4px solid ${i % 2 === 0 ? '#00FFFF' : '#FF00FF'}`,
                borderRadius: '50%',
                animation: `explosionRingEpic ${1 + i * 0.15}s ease-out forwards`,
                opacity: 0,
                boxShadow: `0 0 ${40 + i * 25}px ${i % 2 === 0 ? 'cyan' : 'magenta'}`,
              }}
            />
          ))}

          {[...Array(60)].map((_, i) => {
            const colors = ['#00FFFF', '#4169E1', '#9370DB', '#FF00FF', '#FF1493', '#4B0082'];
            return (
              <div
                key={`sparkle-${i}`}
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  width: `${Math.random() * 10 + 4}px`,
                  height: `${Math.random() * 10 + 4}px`,
                  background: colors[Math.floor(Math.random() * colors.length)],
                  borderRadius: '50%',
                  boxShadow: `0 0 ${Math.random() * 40 + 20}px currentColor`,
                  animation: `sparkleFallEpic ${1.8 + Math.random()}s linear forwards`,
                  animationDelay: `${Math.random() * 0.6}s`,
                }}
              />
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes giftEnterEpic {
          0% {
            opacity: 0;
            transform: scale(0.05) rotate(-45deg) translateY(200px);
            filter: blur(60px) brightness(0);
          }
          40% {
            opacity: 1;
            transform: scale(1.2) rotate(10deg) translateY(-30px);
            filter: blur(0) brightness(1.4);
          }
          70% {
            transform: scale(0.95) rotate(-2deg) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0) translateY(0);
            filter: brightness(1.2);
          }
        }

        @keyframes giftExitEpic {
          0% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0) brightness(1.2);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.5) rotate(15deg);
            filter: blur(5px) brightness(1.6) hue-rotate(60deg);
          }
          100% {
            opacity: 0;
            transform: scale(2.5) rotate(45deg);
            filter: blur(25px) brightness(2.5) hue-rotate(120deg);
          }
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes giftImageEpic {
          0% {
            opacity: 0;
            transform: translateX(100px) scale(0.2) rotate(-90deg);
          }
          30% {
            opacity: 1;
            transform: translateX(0) scale(1.2) rotate(10deg);
          }
          70% {
            transform: translateX(0) scale(1) rotate(0deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes giftImageSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(1); }
        }

        @keyframes giftNameSlide {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(50px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes particleOrbit {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(0, 0) scale(0);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) translate(${Math.random() * 200 - 100}px, ${Math.random() * 100 - 50}px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(${Math.random() * 300 - 150}px, ${Math.random() * 200 - 100}px) scale(0);
          }
        }

        @keyframes likeFloatScale {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.2);
          }
          15% {
            opacity: 1;
            transform: translateY(-20px) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-60px) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(1.2);
          }
        }

        @keyframes heartBeatScale {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }

        @keyframes lightningFlashEpic {
          0% { opacity: 0; transform: scaleY(0); }
          15% { opacity: 1; transform: scaleY(1); }
          85% { opacity: 0.8; transform: scaleY(1); }
          100% { opacity: 0; transform: scaleY(0); }
        }

        @keyframes explosionRingEpic {
          0% {
            opacity: 0.9;
            transform: translate(-50%, -50%) scale(0.1);
            border-width: 8px;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(5);
            border-width: 1px;
          }
        }

        @keyframes sparkleFallEpic {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes mvpEntrance {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.1) rotate(-360deg);
          }
          40% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2) rotate(10deg);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }
        }

        @keyframes mvpGlow {
          0%, 100% {
            box-shadow: 0 0 80px rgba(255,215,0,0.9), 0 0 150px rgba(255,69,0,0.7);
            background-position: 0% 50%;
          }
          50% {
            box-shadow: 0 0 120px rgba(255,215,0,1.2), 0 0 200px rgba(255,69,0,1);
            background-position: 100% 50%;
          }
        }

        @keyframes crownFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(5deg); }
        }

        @keyframes crownSpin {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }

        @keyframes leaderboardGlow {
          0%, 100% {
            box-shadow: 0 0 50px rgba(255,215,0,0.6), 0 0 25px rgba(255,0,255,0.4);
            border-color: gold;
          }
          50% {
            box-shadow: 0 0 80px rgba(255,215,0,1), 0 0 40px rgba(255,0,255,0.7);
            border-color: #ffd700;
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-150px) translateY(50%);
          }
          to {
            opacity: 1;
            transform: translateX(0) translateY(50%);
          }
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        @keyframes pulseBattle {
          0%, 100% { opacity: 0.8; transform: scale(1); text-shadow: 0 0 5px gold; }
          50% { opacity: 1; transform: scale(1.05); text-shadow: 0 0 15px gold; }
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