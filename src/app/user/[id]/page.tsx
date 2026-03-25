'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { connectToSocket, disconnectSocket } from '@/app/lib/socket';

export default function UserPage() {
  const params = useParams();
  const userId = params?.id as string;
  
  const [currentGifter, setCurrentGifter] = useState<string | null>(null);
  const [currentGiftImage, setCurrentGiftImage] = useState<string | null>(null);
  const [currentMVP, setCurrentMVP] = useState<{ nickname: string; score: number } | null>(null);
  const [battleActive, setBattleActive] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [animationState, setAnimationState] = useState<'none' | 'entering' | 'exiting'>('none');
  const [showEffects, setShowEffects] = useState(false);
  const [fontSize, setFontSize] = useState(80);
  const textRef = useRef<HTMLDivElement>(null);

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

  const triggerGift = (name: string, giftImage?: string) => {
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

  const showMVPAlert = (nickname: string, score: number) => {
    setCurrentMVP({ nickname, score });
    setTimeout(() => setCurrentMVP(null), 4000);
  };

  const testGift = () => {
    const names = ['👑 ALEXANDER', '⚡ VICTORIA', '🔥 CHRISTOPHER', '💎 ELIZABETH', '🌟 JONATHAN', '✨ CATHERINE'];
    const name = names[Math.floor(Math.random() * names.length)];
    triggerGift(name);
  };

  useEffect(() => {
    if (!testMode) return;
    const interval = setInterval(testGift, 5000);
    return () => clearInterval(interval);
  }, [testMode]);

  useEffect(() => {
    if (!userId) return;
    
    const socket = connectToSocket();
    
    socket.on('connect', () => {
      console.log('🔌 Socket connected, connecting to TikTok...');
      socket.emit('connect-tiktok', userId);
    });
    
    socket.on('tiktok-event', (event: any) => {
      console.log('📡 Received event:', event.type);
      
      // GIFT EVENT (with image support)
      if (event.type === 'gift') {
        const rawName = event.nickname || event.username || 'GIFT';
        const cleanName = extractLetters(rawName);
        triggerGift(cleanName, event.giftImage);
      }
      
      // BATTLE START EVENT
      if (event.type === 'battle_start') {
        setBattleActive(true);
        console.log(`⚔️ Battle started! Users: ${event.users?.map((u: any) => u.nickname).join(' vs ')}`);
      }
      
      // BATTLE MVP EVENT (real-time updates)
      if (event.type === 'battle_mvp') {
        const mvp = event.mvp;
        if (mvp && mvp.score > 0) {
          console.log(`🏆 MVP: ${mvp.nickname} with ${mvp.score} points`);
          showMVPAlert(mvp.nickname, mvp.score);
        }
      }
      
      // BATTLE END EVENT
      if (event.type === 'battle_end') {
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
    });
    
    socket.on('tiktok-status', (status: any) => {
      console.log('📡 Status:', status.type, status.message);
      if (status.type === 'error') {
        console.error('Connection error:', status.message);
      }
    });
    
    return () => {
      socket.off('connect');
      socket.off('tiktok-event');
      socket.off('tiktok-status');
      disconnectSocket();
    };
  }, [userId]);

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
      {/* Test button */}
      <div style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        pointerEvents: 'auto',
        zIndex: 10000,
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
      </div>

      {/* BATTLE MVP ALERT */}
      {currentMVP && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #00FFFF, #9370DB, #4B0082)',
          padding: '12px 24px',
          borderRadius: '50px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '18px',
          fontFamily: 'Arial Black, sans-serif',
          textShadow: '0 0 10px rgba(0,0,0,0.5)',
          boxShadow: '0 0 30px rgba(0,255,255,0.6)',
          zIndex: 20,
          animation: 'slideDown 0.5s ease-out, glowPulse 1s ease-in-out infinite',
          backdropFilter: 'blur(5px)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          🏆 {currentMVP.nickname} - {currentMVP.score} POINTS 🏆
        </div>
      )}

      {/* BATTLE ACTIVE INDICATOR */}
      {battleActive && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.7)',
          padding: '6px 12px',
          borderRadius: '20px',
          color: '#00FFFF',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 20,
          backdropFilter: 'blur(5px)',
          border: '1px solid #00FFFF',
          animation: 'pulse 1s ease-in-out infinite',
        }}>
          ⚔️ BATTLE ACTIVE
        </div>
      )}

      {/* GIFT IMAGE OVERLAY (if gift has image) */}
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

      {/* COOL COLOR EFFECTS - Blues, Purples, Cyans */}
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
          {/* 1. COOL LIGHTNING - Electric Blue */}
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

          {/* 2. COOL EXPLOSION RINGS - Purple to Blue */}
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

          {/* 3. COOL SPARKLE SHOWER - Cyan, Purple, Blue */}
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

          {/* 4. COOL ENERGY WAVES */}
          {[...Array(6)].map((_, i) => (
            <div
              key={`wave-${i}`}
              style={{
                position: 'absolute',
                top: `${10 + i * 15}%`,
                left: '-10%',
                width: '120%',
                height: '2px',
                background: `linear-gradient(90deg, transparent, #00FFFF, #9370DB, #4B0082, transparent)`,
                filter: 'blur(2px)',
                animation: `energyWave ${2 + i * 0.3}s ease-out infinite`,
                opacity: 0.3,
                transform: `rotate(${i * 5}deg)`,
              }}
            />
          ))}

          {/* 5. COOL CRYSTAL BURSTS */}
          {[...Array(12)].map((_, i) => (
            <div
              key={`crystal-${i}`}
              style={{
                position: 'absolute',
                top: `${30 + Math.random() * 40}%`,
                left: `${30 + Math.random() * 40}%`,
                width: '6px',
                height: '6px',
                background: `hsl(${240 + Math.random() * 60}, 100%, 70%)`,
                borderRadius: '50%',
                boxShadow: `0 0 40px currentColor`,
                animation: `crystalBurst 1.2s ease-out forwards`,
                animationDelay: `${Math.random() * 0.4}s`,
                filter: 'blur(1px)',
              }}
            />
          ))}
        </div>
      )}

      {/* Name with COOL colors that POP against orange skin */}
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

        @keyframes energyWave {
          0% {
            transform: translateX(-100%) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%) rotate(0deg);
            opacity: 0;
          }
        }

        @keyframes crystalBurst {
          0% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 50px currentColor;
          }
          100% {
            opacity: 0;
            transform: scale(25);
            box-shadow: 0 0 200px currentColor;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0,255,255,0.6);
          }
          50% {
            box-shadow: 0 0 40px rgba(0,255,255,0.9), 0 0 20px rgba(147,112,219,0.6);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; text-shadow: 0 0 5px cyan; }
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