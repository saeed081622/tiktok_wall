'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { connectToSocket, disconnectSocket } from '@/app/lib/socket';

export default function UserPage() {
  const params = useParams();
  const userId = params?.id as string;
  
  const [currentGifter, setCurrentGifter] = useState<string | null>(null);
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

  const triggerGift = (name: string) => {
    setCurrentGifter(name);
    setAnimationState('entering');
    setShowEffects(true);
    
    setTimeout(() => setShowEffects(false), 2000);
    
    setTimeout(() => {
      setAnimationState('exiting');
      
      setTimeout(() => {
        setCurrentGifter(null);
        setAnimationState('none');
      }, 1000);
    }, 3000);
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
    socket.on('connect', () => socket.emit('connect-tiktok', userId));
    socket.on('tiktok-event', (event: any) => {
      if (event.type === 'gift') {
        const rawName = event.nickname || 'GIFT';
        const cleanName = extractLetters(rawName);
        triggerGift(cleanName);
      }
    });
    return () => disconnectSocket();
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
              // COOL gradient - blues and purples (contrasts with orange skin)
              background: 'linear-gradient(135deg, #00FFFF, #4169E1, #9370DB, #8A2BE2, #4B0082)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              // Cool-toned glows
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