'use client';

import { useEffect, useState, useCallback } from 'react';
import { connectToSocket, disconnectSocket } from './lib/socket';

// =============================================
// TIKTOK USERNAME - CHANGE THIS
// =============================================
const TIKTOK_USERNAME = 'darnz_45';  // <-- Changed to darnz_45
// =============================================

interface TikTokEvent {
  type: 'gift';
  username: string;
  nickname: string;
  timestamp: number;
}

export default function Home() {
  const [currentGifter, setCurrentGifter] = useState<string | null>(null);

  useEffect(() => {
    const socket = connectToSocket();

    const handleConnect = () => {
      socket.emit('connect-tiktok', TIKTOK_USERNAME);
    };

    const handleTikTokEvent = (event: any) => {
      if (event.type === 'gift') {
        setCurrentGifter(event.nickname);
        
        // Clear after 5 seconds
        setTimeout(() => {
          setCurrentGifter(null);
        }, 5000);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('tiktok-event', handleTikTokEvent);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('tiktok-event', handleTikTokEvent);
      disconnectSocket();
    };
  }, []);

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
      background: '#1a1a1a',
      margin: 0,
      padding: 0
    }}>
      {currentGifter ? (
        <div style={{
          fontSize: '72px',
          fontWeight: 'bold',
          textAlign: 'center',
          background: 'linear-gradient(45deg, #FFD700, #FF69B4, #00FFFF, #FFD700)',
          backgroundSize: '300% 300%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))',
          fontFamily: 'Arial, sans-serif',
          whiteSpace: 'nowrap',
          animation: 'fadeInOut 5s ease-in-out forwards, gradientShift 3s ease infinite'
        }}>
          {currentGifter}
        </div>
      ) : (
        <div style={{
          fontSize: '36px',
          color: '#888',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          opacity: 0.7
        }}>
          💝 Waiting for gifts from @darnz_45...
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.5); }
          10% { opacity: 1; transform: scale(1); }
          90% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.5); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}