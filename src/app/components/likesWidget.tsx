'use client';

import { useEffect, useRef } from 'react';

interface LikesWidgetProps {
  onLike: (callback: (count: number) => void) => void;
  onGloveTrigger?: (callback: () => void) => void;
}

export function LikesWidget({ onLike, onGloveTrigger }: LikesWidgetProps) {
  const likesQueueRef = useRef<any[]>([]);
  const isProcessingLikesRef = useRef(false);
  const likeBatchTimeoutRef = useRef<any>(null);
  const recentLikePositionsRef = useRef<{x: number, y: number, timestamp: number}[]>([]);

  const getRandomIcon = () => {
    const icons = ['❤️', '💖', '💗', '💝', '♥️', '😍', '🥰', '🌸', '⭐', '✨', '🔥', '💎'];
    return icons[Math.floor(Math.random() * icons.length)];
  };

  const getValidPosition = () => {
    const MIN_DISTANCE_PERCENT = 12;
    const isPositionTooClose = (x: number, y: number) => {
      const now = Date.now();
      recentLikePositionsRef.current = recentLikePositionsRef.current.filter(p => now - p.timestamp < 3000);
      return recentLikePositionsRef.current.some(pos => Math.hypot(x - pos.x, y - pos.y) < MIN_DISTANCE_PERCENT);
    };
    
    let attempts = 0, x, y;
    do {
      x = Math.random() * 100;
      y = Math.random() * 100;
      attempts++;
    } while (isPositionTooClose(x, y) && attempts < 30);
    
    recentLikePositionsRef.current.push({ x, y, timestamp: Date.now() });
    if (recentLikePositionsRef.current.length > 8) recentLikePositionsRef.current = recentLikePositionsRef.current.slice(-8);
    return { x, y };
  };

  const createBurstEffect = (x: number, y: number) => {
    const container = document.getElementById('likesContainer');
    if (!container) return;
    
    const particleCount = 12 + Math.floor(Math.random() * 8);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const tx = Math.cos(angle) * speed;
      const ty = Math.sin(angle) * speed;
      
      const particle = document.createElement('div');
      particle.className = 'burst-particle';
      const hue = (Math.random() * 360);
      particle.style.background = `radial-gradient(circle, hsl(${hue}, 100%, 65%), hsl(${hue}, 80%, 55%))`;
      particle.style.left = (x - 4) + 'px';
      particle.style.top = (y - 4) + 'px';
      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');
      container.appendChild(particle);
      
      setTimeout(() => { if (particle && particle.remove) particle.remove(); }, 700);
    }
    
    for (let s = 0; s < 6; s++) {
      const spark = document.createElement('div');
      spark.className = 'burst-spark';
      const angleSpark = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 70;
      spark.style.setProperty('--sx', Math.cos(angleSpark) * dist + 'px');
      spark.style.setProperty('--sy', Math.sin(angleSpark) * dist + 'px');
      spark.style.left = (x - 2) + 'px';
      spark.style.top = (y - 2) + 'px';
      spark.style.background = `radial-gradient(circle, #FFD966, #FFB347)`;
      container.appendChild(spark);
      setTimeout(() => { if (spark && spark.remove) spark.remove(); }, 600);
    }
  };

  const createLikeItem = () => {
    const icon = getRandomIcon();
    const likeItem = document.createElement('div');
    likeItem.className = 'like-item';

    const pos = getValidPosition();
    likeItem.style.left = `${pos.x}%`;
    likeItem.style.top = `${pos.y}%`;

    const isMobile = window.innerWidth < 768;
    const bubbleSize = isMobile ? "68px" : "78px";
    const iconSize = isMobile ? "2.5em" : "2.5em";

    likeItem.innerHTML = `
      <div class="bubble-wrapper" style="width:${bubbleSize};height:${bubbleSize};">
        <div class="bubble-ring"></div>
        <span class="like-icon" style="font-size:${iconSize};">${icon}</span>
      </div>
    `;

    document.getElementById('likesContainer')?.appendChild(likeItem);

    setTimeout(() => {
      likeItem.classList.add('float-up');
    }, 1000);

    const popTimeout = setTimeout(() => {
      if (likeItem && likeItem.parentNode) {
        const rect = likeItem.getBoundingClientRect();
        if (rect && rect.width > 0) {
          createBurstEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
        } else {
          const fallbackX = (pos.x / 100) * window.innerWidth;
          const fallbackY = (pos.y / 100) * window.innerHeight;
          createBurstEffect(fallbackX, fallbackY);
        }
        likeItem.remove();
      }
    }, 1500);

    likeItem.addEventListener('animationend', (e) => {
      if ((e as AnimationEvent).animationName === 'likeFloatUp' && likeItem.parentNode) {
        clearTimeout(popTimeout);
        const rect = likeItem.getBoundingClientRect();
        if (rect.width) {
          createBurstEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        likeItem.remove();
      }
    });
  };

  const processLikesQueue = () => {
    if (isProcessingLikesRef.current || !likesQueueRef.current.length) return;
    isProcessingLikesRef.current = true;
    const toShow = likesQueueRef.current.slice(0, 6);
    likesQueueRef.current = likesQueueRef.current.slice(6);
    toShow.forEach(() => createLikeItem());
    setTimeout(() => {
      isProcessingLikesRef.current = false;
      if (likesQueueRef.current.length) processLikesQueue();
    }, 140);
  };

  const processLikeEvent = (likeCount: number) => {
    if (!likeCount) return;
    const num = Math.min(likeCount, 6);
    for (let i = 0; i < num; i++) likesQueueRef.current.push(1);
    if (likeBatchTimeoutRef.current) clearTimeout(likeBatchTimeoutRef.current);
    likeBatchTimeoutRef.current = setTimeout(() => {
      if (!isProcessingLikesRef.current && likesQueueRef.current.length) processLikesQueue();
    }, 60);
  };

  const triggerGloveEffect = () => {
    for (let i = 0; i < 50; i++) {
      setTimeout(() => createLikeItem(), i * 40);
    }
  };

  useEffect(() => {
    onLike(processLikeEvent);
    if (onGloveTrigger) {
      onGloveTrigger(triggerGloveEffect);
    }
  }, []);
}