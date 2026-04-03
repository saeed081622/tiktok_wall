'use client';

import { useEffect, useRef, useState } from 'react';

type Gift = {
  name: string;
  giftName: string;
  diamonds: number;
};

export default function OverlayPage() {
  const socketRef = useRef<any>(null);

  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [giftQueue, setGiftQueue] = useState<Gift[]>([]);
  const [activeGift, setActiveGift] = useState<Gift | null>(null);

  const [likes, setLikes] = useState<number[]>([]);

  const MY_STREAMER =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('username') || ''
      : '';

  // ------------------------
  // CLEAN HELPERS
  // ------------------------
  const cleanName = (name: string) => {
    if (!name) return 'INCOGNITO';
    return name.replace(/<[^>]*>/g, '').trim() || 'INCOGNITO';
  };

  const cleanGiftName = (name: string) => {
    if (!name) return 'GIFT';
    return name.replace(/<[^>]*>/g, '').trim() || 'GIFT';
  };

  // ------------------------
  // SOCKET
  // ------------------------
  useEffect(() => {
    setMounted(true);

    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.5.0/socket.io.min.js';

    script.onload = () => {
      const socket = (window as any).io(window.location.origin, {
        path: '/api/socket',
        transports: ['websocket'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        socket.emit('connect-tiktok', MY_STREAMER);
      });

      socket.on('disconnect', () => setIsConnected(false));

      socket.on('tiktok-event', (ev: any) => {
        if (ev?.type === 'gift') {
          setGiftQueue((prev) => [
            ...prev,
            {
              name: cleanName(ev.nickname || ev.username),
              giftName: cleanGiftName(ev.giftName),
              diamonds: ev.totalDiamonds || 0,
            },
          ]);
        }

        if (ev?.type === 'like') {
          setLikes((prev) => [...prev, Date.now()]);
        }
      });
    };

    document.head.appendChild(script);

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // ------------------------
  // GIFT QUEUE SYSTEM
  // ------------------------
  useEffect(() => {
    if (!activeGift && giftQueue.length > 0) {
      const next = giftQueue[0];
      setActiveGift(next);
      setGiftQueue((prev) => prev.slice(1));

      const duration =
        next.diamonds < 100
          ? 3000
          : next.diamonds < 1000
          ? 5000
          : 8000;

      setTimeout(() => {
        setActiveGift(null);
      }, duration);
    }
  }, [giftQueue, activeGift]);

  // ------------------------
  // LIKE CLEANUP
  // ------------------------
  useEffect(() => {
    if (likes.length > 50) {
      setLikes((prev) => prev.slice(-30));
    }
  }, [likes]);

  if (!mounted) return null;

  return (
    <div className="w-screen h-screen fixed inset-0 pointer-events-none">
      {/* STATUS DOT */}
      <div
        className={`fixed top-3 right-3 w-3 h-3 rounded-full z-50 ${
          isConnected ? 'bg-green-400' : 'bg-red-500'
        }`}
      />

      {/* LIKES */}
      <div className="absolute inset-0 overflow-hidden">
        {likes.map((id) => (
          <div
            key={id}
            className="absolute animate-floatUp text-3xl"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '0%',
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* GIFT BANNER */}
      {activeGift && (
        <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 text-white text-center animate-fadeIn">
          <div className="flex items-center gap-3 border-2 border-white px-6 py-2 rounded-full text-xl font-bold">
            <span>{activeGift.giftName}</span>
            <span className="flex items-center gap-1">
              {activeGift.diamonds} 💎
            </span>
          </div>

          <div className="mt-3 text-4xl font-bold tracking-wider">
            {activeGift.name}
          </div>
        </div>
      )}
    </div>
  );
}