'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { connectToSocket, disconnectSocket } from '@/app/lib/socket';

interface TikTokEvent {
  type: 'gift';
  username: string;
  nickname: string;
  timestamp: number;
}

export default function UserPage() {
  const params = useParams();
  const userId = params?.id as string; // Gets "244344" from /user/244344
  
  const [currentGifter, setCurrentGifter] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const socket = connectToSocket();

    const handleConnect = () => {
      // Use the userId from URL as the TikTok username
      socket.emit('connect-tiktok', userId);
    };

    const handleTikTokEvent = (event: any) => {
      if (event.type === 'gift') {
        setCurrentGifter(event.nickname);
        setTimeout(() => setCurrentGifter(null), 5000);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('tiktok-event', handleTikTokEvent);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('tiktok-event', handleTikTokEvent);
      disconnectSocket();
    };
  }, [userId]); // Re-run when userId changes

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
      margin: 0,
      padding: 0,
      pointerEvents: 'none'
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
          fontSize: '24px',
          color: 'rgba(255,255,255,0.3)',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
        }}>
          🎁 Watching @{userId}
        </div>
      )}
    </div>
  );
}