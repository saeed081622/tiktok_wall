'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { connectToSocket, disconnectSocket } from '@/app/lib/socket';

export default function UserPage() {
  const params = useParams();
  const userId = params?.id as string;
  
  const [currentGifter, setCurrentGifter] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [letters, setLetters] = useState<{char: string, id: number, exitX: number, exitY: number, exitRotate: number}[]>([]);
  const [particles, setParticles] = useState<any[]>([]);
  const [isExiting, setIsExiting] = useState(false);

  const createImpactParticles = () => {
    const newParticles = [];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 50 + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        size: Math.random() * 6 + 2,
        color: `hsl(${Math.random() * 60 + 300}, 100%, 70%)`,
        life: 1
      });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 800);
  };

  const testGift = () => {
    const names = ['ALEXANDER', 'VICTORIA', 'CHRISTOPHER', 'ELIZABETH', 'JONATHAN', 'CATHERINE'];
    const name = names[Math.floor(Math.random() * names.length)];
    
    // Create letters with RANDOM exit directions for EACH letter
    const letterArray = name.split('').map((char: string, i: number) => ({
      char,
      id: i,
      exitX: (Math.random() - 0.5) * 800,
      exitY: -300 - Math.random() * 300,
      exitRotate: (Math.random() - 0.5) * 360
    }));
    
    setLetters(letterArray);
    setIsExiting(false);
    createImpactParticles();
    
    setTimeout(() => {
      setIsExiting(true);
      
      setTimeout(() => {
        setLetters([]);
        setIsExiting(false);
      }, 1000);
    }, 3000);
  };

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;
    
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx * 0.5,
          y: p.y + p.vy * 0.5,
          vy: p.vy + 0.1,
          life: p.life - 0.02
        })).filter(p => p.life > 0)
      );
    }, 30);
    
    return () => clearInterval(interval);
  }, [particles]);

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
        const name = event.nickname?.toUpperCase() || 'SOMEONE';
        
        const letterArray = name.split('').map((char: string, i: number) => ({
          char,
          id: i,
          exitX: (Math.random() - 0.5) * 800,
          exitY: -300 - Math.random() * 300,
          exitRotate: (Math.random() - 0.5) * 360
        }));
        
        setLetters(letterArray);
        setIsExiting(false);
        createImpactParticles();
        
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            setLetters([]);
            setIsExiting(false);
          }, 1000);
        }, 3000);
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
        bottom: 20,
        right: 20,
        pointerEvents: 'auto',
        zIndex: 10000,
      }}>
        <button
          onClick={() => setTestMode(!testMode)}
          style={{
            padding: '12px 24px',
            background: testMode ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 30,
            cursor: 'pointer',
            fontSize: 14,
            backdropFilter: 'blur(5px)',
          }}
        >
          {testMode ? '✨ DEMO' : '⚡ TEST'}
        </button>
      </div>

      {/* Impact Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: '50%',
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
            opacity: p.life,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      ))}

      {/* Letters */}
      {letters.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '4px',
          maxWidth: '90vw',
          zIndex: 10,
        }}>
          {letters.map((letter) => (
            <div
              key={`${letter.id}-${letter.char}`}
              style={{
                fontSize: 'clamp(40px, 15vw, 120px)',
                fontWeight: '900',
                fontFamily: '"Arial Black", "Impact", sans-serif',
                background: 'linear-gradient(135deg, #FFD700, #FF69B4, #00FFFF)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textTransform: 'uppercase',
                lineHeight: 1,
                filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))',
                animation: isExiting 
                  ? `explode 0.8s ease-out forwards`
                  : 'hitWall 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.3) forwards',
                transform: isExiting ? 'scale(1)' : 'scale(1)',
                opacity: 1,
                ['--exit-x' as any]: `${letter.exitX}px`,
                ['--exit-y' as any]: `${letter.exitY}px`,
                ['--exit-rotate' as any]: `${letter.exitRotate}deg`,
              }}
            >
              {letter.char === ' ' ? '\u00A0' : letter.char}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes hitWall {
          0% {
            opacity: 0;
            transform: scale(3) translateY(-50px);
            filter: blur(20px);
          }
          40% {
            opacity: 1;
            transform: scale(1.1) translateY(5px);
            filter: blur(0);
          }
          60% {
            transform: scale(0.95) translateY(-2px);
          }
          80% {
            transform: scale(1.02) translateY(1px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes explode {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--exit-x), var(--exit-y)) rotate(var(--exit-rotate)) scale(0.2);
          }
        }

        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: transparent;
        }
      `}</style>
    </div>
  );
}