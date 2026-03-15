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
    
    // Epic 3-stage effect sequence
    setTimeout(() => setShowEffects(false), 2000); // Effects last 2 seconds
    
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
            background: testMode ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20,
            cursor: 'pointer',
            fontSize: '12px',
            backdropFilter: 'blur(5px)',
          }}
        >
          {testMode ? '✨ EPIC MODE' : '⚡ TEST'}
        </button>
      </div>

      {/* EPIC EFFECTS LAYER */}
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
          {/* 1. SCREEN SHAKE */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            animation: 'screenShake 0.5s ease-out',
          }} />

          {/* 2. LIGHTNING BOLTS */}
          {[...Array(3)].map((_, i) => (
            <div
              key={`bolt-${i}`}
              style={{
                position: 'absolute',
                top: '0%',
                left: `${20 + i * 30}%`,
                width: '4px',
                height: '100%',
                background: 'linear-gradient(180deg, transparent, #FFD700, #FF69B4, transparent)',
                filter: 'blur(2px)',
                animation: `lightningFlash 0.3s ease-out ${i * 0.1}s`,
                opacity: 0,
              }}
            />
          ))}

          {/* 3. EXPLOSION RINGS */}
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
                border: `3px solid hsl(${300 + i * 20}, 100%, 70%)`,
                borderRadius: '50%',
                animation: `explosionRing ${1 + i * 0.2}s ease-out forwards`,
                opacity: 0,
                boxShadow: `0 0 ${30 + i * 20}px hsl(${300 + i * 20}, 100%, 70%)`,
              }}
            />
          ))}

          {/* 4. SPARKLE SHOWER */}
          {[...Array(30)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: '-10%',
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                background: `hsl(${Math.random() * 60 + 300}, 100%, 70%)`,
                borderRadius: '50%',
                boxShadow: `0 0 ${Math.random() * 20 + 10}px currentColor`,
                animation: `sparkleFall ${1 + Math.random()}s linear forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}

          {/* 5. FIREWORK BURSTS */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`firework-${i}`}
              style={{
                position: 'absolute',
                top: `${30 + Math.random() * 40}%`,
                left: `${30 + Math.random() * 40}%`,
                width: '4px',
                height: '4px',
                background: `hsl(${Math.random() * 360}, 100%, 70%)`,
                borderRadius: '50%',
                boxShadow: `0 0 20px currentColor`,
                animation: `fireworkBurst 1s ease-out forwards`,
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Name with EPIC styling */}
      {currentGifter && (
        <div style={{
          paddingLeft: '8vw',
          paddingRight: '8vw',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
          filter: showEffects ? 'brightness(1.5) contrast(1.2)' : 'none',
          transition: 'filter 0.3s ease',
        }}>
          <div
            ref={textRef}
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: '900',
              fontFamily: 'Arial Black, Impact, sans-serif',
              background: 'linear-gradient(135deg, #FFD700, #FF69B4, #00FFFF, #FFD700)',
              backgroundSize: '300% 300%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              filter: 'drop-shadow(0 0 40px rgba(255,215,0,0.8)) drop-shadow(0 0 80px rgba(255,105,180,0.5))',
              animation: animationState === 'entering' 
                ? 'epicEnter 0.8s cubic-bezier(0.2, 0.9, 0.3, 1.5) forwards' 
                : animationState === 'exiting'
                ? 'explodeOut 1s ease-out forwards'
                : 'none',
              textShadow: showEffects ? '0 0 60px gold, 0 0 120px hotpink' : 'none',
            }}
          >
            {currentGifter}
          </div>
        </div>
      )}

      <style>{`
        @keyframes epicEnter {
          0% {
            opacity: 0;
            transform: scale(0.1) rotate(-20deg) translateY(100px);
            filter: blur(40px);
          }
          30% {
            opacity: 1;
            transform: scale(1.3) rotate(5deg) translateY(-20px);
            filter: blur(0);
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
          }
        }

        @keyframes explodeOut {
          0% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0) brightness(1);
          }
          30% {
            opacity: 0.9;
            transform: scale(1.5);
            filter: blur(2px) brightness(1.5);
          }
          60% {
            opacity: 0.5;
            transform: scale(2.5);
            filter: blur(5px) brightness(2);
          }
          100% {
            opacity: 0;
            transform: scale(4);
            filter: blur(15px) brightness(3);
          }
        }

        @keyframes screenShake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-10px, -5px); }
          20% { transform: translate(8px, 6px); }
          30% { transform: translate(-6px, -8px); }
          40% { transform: translate(10px, 5px); }
          50% { transform: translate(-5px, 10px); }
          60% { transform: translate(5px, -5px); }
          70% { transform: translate(-8px, 3px); }
          80% { transform: translate(6px, -6px); }
          90% { transform: translate(-3px, 4px); }
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
            transform: translate(-50%, -50%) scale(3);
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

        @keyframes fireworkBurst {
          0% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 50px currentColor;
          }
          100% {
            opacity: 0;
            transform: scale(20);
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