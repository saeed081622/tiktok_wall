/* eslint-disable react-hooks/purity */
'use client';

import { useEffect, useState } from 'react';
import { GiftEvent, FollowEvent, JoinEvent } from '../lib/tiktokClient';

type AnimationEvent = GiftEvent | FollowEvent | JoinEvent;

interface Props {
    event: AnimationEvent;
}

export default function GiftAnimation({ event }: Props) {
    const [position] = useState({
        left: `${Math.random() * 60 + 20}%`,
        top: `${Math.random() * 60 + 20}%`
    });
    
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 2800);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    // Gift Animation
    if (event.type === 'gift') {
        const giftEvent = event as GiftEvent;
        
        return (
            <div
                className="absolute animate-float-up"
                style={{
                    left: position.left,
                    top: position.top,
                }}
            >
                <div className="relative text-center">
                    {/* Username */}
                    <div className="text-yellow-400 font-bold text-lg mb-1 drop-shadow-lg">
                        {giftEvent.username}
                    </div>
                    
                    {/* Gift Image or Icon */}
                    <div className="relative">
                        {giftEvent.giftImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={giftEvent.giftImage}
                                alt={giftEvent.giftName}
                                className="w-24 h-24 object-contain mx-auto drop-shadow-2xl"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('fallback-gift');
                                }}
                            />
                        ) : (
                            <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-orange-500 
                                          rounded-full flex items-center justify-center text-white text-3xl mx-auto
                                          shadow-[0_0_30px_rgba(255,0,100,0.5)]">
                                🎁
                            </div>
                        )}
                        
                        {/* Streak counter */}
                        {giftEvent.isStreak && (
                            <div className="absolute -top-4 -right-4 w-10 h-10 bg-yellow-400 
                                          rounded-full flex items-center justify-center text-black 
                                          font-bold text-lg animate-pulse shadow-lg">
                                {giftEvent.repeatCount}
                            </div>
                        )}
                    </div>
                    
                    {/* Gift Name */}
                    <div className="mt-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 
                                  rounded-full text-white font-bold text-sm inline-block
                                  shadow-[0_0_20px_rgba(255,0,100,0.5)]">
                        {giftEvent.repeatCount > 1 ? `${giftEvent.repeatCount}x ` : ''}{giftEvent.giftName}
                    </div>
                    
                    {/* Diamond value for expensive gifts */}
                    {giftEvent.totalDiamonds > 100 && (
                        <div className="mt-1 text-yellow-400 font-bold text-xs">
                            💎 {giftEvent.totalDiamonds}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Follow Animation
    if (event.type === 'follow') {
        const followEvent = event as FollowEvent;
        
        return (
            <div
                className="absolute animate-slide-in-right"
                style={{
                    right: '30px',
                    top: `${Math.random() * 70 + 15}%`,
                }}
            >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 
                              text-white px-8 py-4 rounded-full shadow-2xl
                              border-2 border-yellow-400">
                    <div className="text-2xl font-bold">🎉 NEW FOLLOWER 🎉</div>
                    <div className="text-xl mt-1">{followEvent.username}</div>
                </div>
            </div>
        );
    }

    // Join Animation
    if (event.type === 'join') {
        const joinEvent = event as JoinEvent;
        
        return (
            <div
                className="absolute animate-fade-in-out"
                style={{
                    left: '30px',
                    top: `${Math.random() * 80 + 10}%`,
                }}
            >
                <div className="text-green-400 text-2xl font-bold drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]
                              bg-black/30 backdrop-blur-sm px-6 py-3 rounded-full">
                    👋 Welcome {joinEvent.username}!
                </div>
            </div>
        );
    }

    return null;
}