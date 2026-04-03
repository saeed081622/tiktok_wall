'use client';

import { useEffect, useRef, useState } from 'react';

export default function OverlayPage() {
  const [mounted, setMounted] = useState(false);
  const socketRef = useRef<any>(null);
  const activeGiftTimeoutRef = useRef<any>(null);
  const activeGiftFadeTimerRef = useRef<any>(null);
  const demoIntervalRef = useRef<any>(null);
  const updateTimeoutRef = useRef<any>(null);
  const likesQueueRef = useRef<any[]>([]);
  const isProcessingLikesRef = useRef(false);
  const likeBatchTimeoutRef = useRef<any>(null);
  const recentLikePositionsRef = useRef<{x: number, y: number, timestamp: number}[]>([]);
  const giftersMapRef = useRef<Map<string, number>>(new Map());
  const topGiftersRef = useRef<{name: string, diamonds: number}[]>([]);
  const activeMultiplierRef = useRef(1);
  const [isConnected, setIsConnected] = useState(false);
  
  const [leaderboardEnabled] = useState(false);
  const [giftQueue, setGiftQueue] = useState<any[]>([]);
  const [isShowingGift, setIsShowingGift] = useState(false);

  // Get the streamer this overlay is for
  const MY_STREAMER = new URLSearchParams(window.location.search).get('username') || '';
  console.log(`🎯 Overlay configured for streamer: ${MY_STREAMER}`);

  // Helper functions
  const cleanName = (name: string) => {
    if (!name || name === 'undefined' || name === 'null') return 'INCOGNITO';
    let cleaned = String(name);
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    cleaned = cleaned.replace(/javascript:/gi, '');
    cleaned = cleaned.replace(/vbscript:/gi, '');
    cleaned = cleaned.trim();
    return cleaned || 'INCOGNITO';
  };

  const cleanGiftName = (name: string) => {
    if (!name) return null;
    let cleaned = String(name);
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    cleaned = cleaned.trim();
    return cleaned || null;
  };

  const isEmoji = (char: string) => {
    const emojiRegex = /[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE0F}\u{200D}\u{20E3}]/u;
    const simpleEmoji = /[❤️💀✨⭐🌟🔥💎🎁🎉🎊🦅🐉🌈👑💖💗💝😍🥰🌸⭐✨⚡💥]/;
    const complexEmoji = /[\uFE0F\u200D]/;
    return emojiRegex.test(char) || simpleEmoji.test(char) || complexEmoji.test(char);
  };

  const COLOR_PRESETS = {
    rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
    neon: ['#FF00CC', '#FF6600', '#FFFF00', '#00FF66', '#00CCFF', '#FF00FF', '#FF3366'],
  };

  const getActiveColorPalette = () => COLOR_PRESETS.neon;
  
  const getColorForIndex = (index: number, totalLength: number, isEmojiChar: boolean) => {
    if (isEmojiChar) return null;
    const palette = getActiveColorPalette();
    return palette[index % palette.length];
  };

  const createRainbowNameHTML = (text: string) => {
    const chars = [...text];
    let html = '';
    chars.forEach((char, idx) => {
      const isEmojiChar = isEmoji(char);
      const color = getColorForIndex(idx, chars.length, isEmojiChar);
      const colorStyle = color ? `color: ${color};` : '';
      const emojiClass = isEmojiChar ? 'emoji' : '';
      
      if (char === ' ') {
        html += `<span class="letter-wrapper space-wrapper"><span class="letter space">&nbsp;</span></span>`;
      } else {
        html += `<span class="letter-wrapper"><span class="letter ${emojiClass}" style="animation-delay: ${idx * 0.08}s; ${colorStyle}">${char}</span></span>`;
      }
    });
    return html;
  };

  const showControlBanner = (message: string, duration: number = 2000) => {
    const existingBanner = document.getElementById('controlBanner');
    if (existingBanner) existingBanner.remove();
    
    const banner = document.createElement('div');
    banner.id = 'controlBanner';
    banner.textContent = message;
    banner.style.cssText = `
      position: fixed;
      top: 25%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #FFD700, #FF8C00, #FF1493);
      background-size: 200% 200%;
      color: white;
      font-family: 'Poppins', sans-serif;
      font-size: clamp(24px, 5vw, 48px);
      font-weight: bold;
      padding: 20px 40px;
      border-radius: 60px;
      z-index: 10000;
      animation: bannerFadeInOut ${duration}ms ease forwards, gradientShift 0.5s ease infinite;
      white-space: nowrap;
      box-shadow: 0 0 50px rgba(0,0,0,0.7), 0 0 20px rgba(255,215,0,0.5);
      border: 3px solid white;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      letter-spacing: 2px;
    `;
    document.body.appendChild(banner);
    
    setTimeout(() => {
      if (banner && banner.remove) banner.remove();
    }, duration);
  };

  const updateMultiplierDisplay = (multiplier: number) => {
    let multiplierDiv = document.getElementById('multiplierIndicator');
    if (!multiplierDiv) {
      multiplierDiv = document.createElement('div');
      multiplierDiv.id = 'multiplierIndicator';
      multiplierDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.7);
        color: #FFD700;
        font-family: 'Poppins', sans-serif;
        font-size: 24px;
        font-weight: bold;
        padding: 10px 20px;
        border-radius: 40px;
        z-index: 1000;
        border: 2px solid #FFD700;
        backdrop-filter: blur(5px);
        pointer-events: none;
      `;
      document.body.appendChild(multiplierDiv);
    }
    
    if (multiplier > 1) {
      multiplierDiv.innerHTML = `🔥 ${multiplier}X ACTIVE 🔥`;
      multiplierDiv.style.display = 'block';
    } else {
      multiplierDiv.style.display = 'none';
    }
  };

  const triggerScreenPulse = (color: string) => {
    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background: radial-gradient(circle, ${color}88, transparent);
      animation: screenPulse 0.5s ease-out forwards;
      z-index: 9999;
    `;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 500);
  };

  const getRandomIcon = () => {
    const icons = ['❤️', '💖', '💗', '💝', '♥️', '😍', '🥰', '🌸'];
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

  const processLikeEvent = (likeCount: number) => {
    if (!likeCount) return;
    likesQueueRef.current.push(1);
    if (likeBatchTimeoutRef.current) clearTimeout(likeBatchTimeoutRef.current);
    likeBatchTimeoutRef.current = setTimeout(() => {
      if (!isProcessingLikesRef.current && likesQueueRef.current.length) processLikesQueue();
    }, 60);
  };

  const processLikesQueue = () => {
    if (isProcessingLikesRef.current || !likesQueueRef.current.length) return;
    isProcessingLikesRef.current = true;
    const toShow = likesQueueRef.current.slice(0, 1);
    likesQueueRef.current = likesQueueRef.current.slice(1);
    toShow.forEach(() => createLikeItem());
    setTimeout(() => {
      isProcessingLikesRef.current = false;
      if (likesQueueRef.current.length) processLikesQueue();
    }, 140);
  };

  const triggerGloveEffect = () => {
    const likeCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < likeCount; i++) {
      setTimeout(() => createLikeItem(), i * 100);
    }
  };

  const triggerConfetti = () => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10001;
    `;
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: any[] = [];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800'];
    
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 5 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: Math.random() * 0.1 - 0.05
      });
    }
    
    let animationId: number;
    let startTime = Date.now();
    
    const animateConfetti = () => {
      if (Date.now() - startTime > 3000) {
        cancelAnimationFrame(animationId);
        canvas.remove();
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.y += p.speed;
        p.rotation += p.rotationSpeed;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
        
        if (p.y > canvas.height) {
          p.y = -p.size;
          p.x = Math.random() * canvas.width;
        }
      });
      
      animationId = requestAnimationFrame(animateConfetti);
    };
    
    animateConfetti();
  };

  const triggerFireworks = () => {
    const container = document.getElementById('likesContainer');
    if (!container) return;
    const colors = ['#FF0000', '#FFD700', '#00FF00', '#FF1493', '#00FFFF', '#FF6600'];
    
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight * 0.6;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        for (let j = 0; j < 20; j++) {
          const angle = (j / 20) * Math.PI * 2;
          const speed = 50 + Math.random() * 50;
          const particle = document.createElement('div');
          particle.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 6px;
            height: 6px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 10002;
            animation: fireworkParticle 1s ease-out forwards;
          `;
          const tx = Math.cos(angle) * speed;
          const ty = Math.sin(angle) * speed;
          particle.style.setProperty('--tx', tx + 'px');
          particle.style.setProperty('--ty', ty + 'px');
          container.appendChild(particle);
          
          setTimeout(() => particle.remove(), 1000);
        }
      }, i * 100);
    }
  };

  const adjustGifterNameFontSize = () => {
    const container = document.getElementById('gifterNameDisplay');
    const letters = document.querySelectorAll('#gifterNameDisplay .letter:not(.space)');
    if (!letters.length || !container) return;
    
    const containerWidth = container.offsetWidth;
    let testSize = 120;
    const minSize = 28;
    
    while (testSize > minSize) {
      let totalWidth = 0;
      letters.forEach(() => { totalWidth += testSize * 0.7; });
      if (totalWidth <= containerWidth * 0.92) break;
      testSize -= 4;
    }
    
    const finalSize = Math.min(Math.max(testSize, minSize), 120);
    document.querySelectorAll('#gifterNameDisplay .letter').forEach(letter => {
      (letter as HTMLElement).style.fontSize = finalSize + 'px';
    });
  };

  const showGift = (name: string, giftName: string, diamonds: number, durationMs: number) => {
    if (activeGiftTimeoutRef.current) clearTimeout(activeGiftTimeoutRef.current);
    if (activeGiftFadeTimerRef.current) clearTimeout(activeGiftFadeTimerRef.current);
    
    const cleanedName = cleanName(name);
    const cleanedGift = cleanGiftName(giftName) || 'GIFT';
    
    const giftBannerDiv = document.getElementById('giftBannerContainer');
    const nameDisplayDiv = document.getElementById('gifterNameDisplay');
    const giftNameBadge = document.getElementById('giftNameBadge');
    const worthBadge = document.getElementById('worthBadge');
    const diamondAmountSpan = document.getElementById('diamondAmount');
    
    if (giftNameBadge) giftNameBadge.textContent = cleanedGift;
    if (diamondAmountSpan) diamondAmountSpan.textContent = diamonds.toLocaleString();
    
    if (giftNameBadge) giftNameBadge.style.display = 'inline-block';
    if (worthBadge) worthBadge.style.display = 'inline-flex';
    
    const nameContainer = document.getElementById('nameContainer');
    if (nameContainer) nameContainer.innerHTML = createRainbowNameHTML(cleanedName);
    
    if (giftBannerDiv) {
      giftBannerDiv.style.opacity = '1';
      giftBannerDiv.style.display = 'block';
    }
    if (nameDisplayDiv) {
      nameDisplayDiv.style.opacity = '1';
      nameDisplayDiv.style.display = 'flex';
    }
    
    setTimeout(() => adjustGifterNameFontSize(), 20);
    
    activeGiftFadeTimerRef.current = setTimeout(() => {
      if (giftBannerDiv) {
        giftBannerDiv.style.transition = `opacity 800ms ease-out`;
        giftBannerDiv.style.opacity = '0';
      }
      if (nameDisplayDiv) {
        nameDisplayDiv.style.transition = `opacity 800ms ease-out`;
        nameDisplayDiv.style.opacity = '0';
      }
    }, durationMs);
    
    activeGiftTimeoutRef.current = setTimeout(() => {
      if (giftBannerDiv) {
        giftBannerDiv.style.display = 'none';
        giftBannerDiv.style.opacity = '1';
        giftBannerDiv.style.transition = '';
      }
      if (nameDisplayDiv) {
        nameDisplayDiv.style.display = 'none';
        nameDisplayDiv.style.opacity = '1';
        nameDisplayDiv.style.transition = '';
      }
    }, durationMs + 800);
  };

  const addGifterDiamonds = (name: string, diamonds: number) => {
    if (!leaderboardEnabled) return;
    if (!name || diamonds <= 0) return;
    const current = giftersMapRef.current.get(name) || 0;
    giftersMapRef.current.set(name, current + diamonds);
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => updateTopGifters(), 100);
  };

  const updateTopGifters = () => {
    if (!leaderboardEnabled) return;
    const sorted = Array.from(giftersMapRef.current.entries())
      .map(([name, diamonds]) => ({ name, diamonds }))
      .sort((a, b) => b.diamonds - a.diamonds);
    const newTop = sorted.slice(0, 3);
    topGiftersRef.current = newTop;
    renderLeaderboard();
  };

  const renderLeaderboard = () => {
    if (!leaderboardEnabled) return;
    const container = document.getElementById('topGiftersContainer');
    if (!container) return;
    if (topGiftersRef.current.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    let html = '';
    const rankColors = ['rank-1', 'rank-2', 'rank-3'];
    topGiftersRef.current.forEach((gifter, idx) => {
      const chars = [...gifter.name];
      let nameHtml = '';
      chars.forEach((char, charIdx) => {
        if (char === ' ') {
          nameHtml += `<span style="width:0.35em; display:inline-block;">&nbsp;</span>`;
        } else {
          const isEmojiChar = isEmoji(char);
          const color = getColorForIndex(charIdx, chars.length, isEmojiChar);
          const colorStyle = color ? `color: ${color};` : '';
          const emojiClass = isEmojiChar ? 'emoji' : '';
          const delay = (charIdx * 0.05).toFixed(3);
          nameHtml += `<span class="gifter-letter ${emojiClass}" style="animation-delay: ${delay}s; ${colorStyle}">${char}</span>`;
        }
      });
      html += `
        <div class="gifter-entry">
          <div class="rank-badge ${rankColors[idx]}">${idx + 1}</div>
          <div class="gifter-name-letters">${nameHtml}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  };

  const handleGift = (name: string, giftName: string, diamonds: number) => {
    addGifterDiamonds(name, diamonds);
    setGiftQueue(prev => {
      const newQueue = [...prev, { name, giftName, diamonds, showFunction: showGift }];
      newQueue.sort((a, b) => b.diamonds - a.diamonds);
      return newQueue;
    });
  };

  useEffect(() => {
    if (!isShowingGift && giftQueue.length > 0) {
      setIsShowingGift(true);
      const next = giftQueue[0];
      setGiftQueue(prev => prev.slice(1));
      const queueSize = giftQueue.length - 1;
      
      const getBaseDuration = (diamonds: number) => {
        if (diamonds < 100) return 3000;
        if (diamonds < 1000) return 5000;
        if (diamonds < 10000) return 8000;
        return 10000;
      };
      
      const getQueueMultiplier = (size: number) => {
        if (size <= 2) return 1.0;
        if (size <= 5) return 0.8;
        if (size <= 10) return 0.65;
        return 0.5;
      };
      
      const duration = Math.max(Math.floor(getBaseDuration(next.diamonds) * getQueueMultiplier(queueSize)), 2500);
      
      next.showFunction(next.name, next.giftName, next.diamonds, duration);
      
      setTimeout(() => {
        setIsShowingGift(false);
      }, duration + 800);
    }
  }, [giftQueue, isShowingGift]);

  useEffect(() => {
    setMounted(true);
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bannerFadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); visibility: hidden; }
      }
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes screenPulse {
        0% { background: rgba(255,215,0,0); }
        50% { background: rgba(255,215,0,0.3); }
        100% { background: rgba(255,215,0,0); }
      }
      @keyframes fireworkParticle {
        0% { opacity: 1; transform: translate(0, 0); }
        100% { opacity: 0; transform: translate(var(--tx), var(--ty)); }
      }
      .like-item {
        position: absolute;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        bottom: 0;
        animation: likeFloatUp 2.8s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
      }
      .like-item.float-up {
        animation: likeFloatUp 0.5s ease-out forwards;
      }
      @keyframes likeFloatUp {
        0% { opacity: 0; transform: translateY(0) scale(0.75); }
        15% { opacity: 1; transform: translateY(-10px) scale(1.02); }
        40% { transform: translateY(-45px) scale(1); }
        70% { opacity: 0.9; transform: translateY(-90px) scale(0.97); }
        100% { opacity: 0; transform: translateY(-150px) scale(0.9); }
      }
      .burst-particle {
        position: absolute;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 26;
        will-change: transform, opacity;
        animation: particleExplode 0.7s cubic-bezier(0.2, 0.9, 0.4, 1) forwards;
      }
      @keyframes particleExplode {
        0% { opacity: 1; transform: scale(0.2) translate(0, 0); }
        30% { opacity: 0.9; transform: scale(1.2) translate(var(--tx), var(--ty)); }
        70% { opacity: 0.6; transform: scale(0.8) translate(calc(var(--tx) * 1.3), calc(var(--ty) * 1.3)); }
        100% { opacity: 0; transform: scale(0) translate(calc(var(--tx) * 1.8), calc(var(--ty) * 1.8)); }
      }
      .burst-spark {
        position: absolute;
        width: 4px;
        height: 4px;
        background: radial-gradient(circle, #fff, gold);
        border-radius: 50%;
        pointer-events: none;
        animation: sparkFly 0.6s ease-out forwards;
      }
      @keyframes sparkFly {
        0% { opacity: 1; transform: scale(0.5) translate(0, 0); }
        100% { opacity: 0; transform: scale(0) translate(var(--sx), var(--sy)); }
      }
      .bubble-wrapper {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .bubble-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 20%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.15) 100%);
        border: 1.5px solid rgba(255,255,255,1);
        box-shadow: 0 0 14px rgba(255,255,255,0.6), inset 0 2px 6px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.15);
        backdrop-filter: blur(2px);
      }
      .like-icon {
        font-size: 2.2em;
        position: relative;
        z-index: 2;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }
      @keyframes bounceLetter {
        0% { opacity: 0; transform: translateY(40px) scale(0.7); filter: blur(6px); }
        30% { opacity: 1; transform: translateY(-10px) scale(1.05); filter: blur(0); }
        50% { transform: translateY(3px) scale(1.01); }
        70% { transform: translateY(-2px) scale(1); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .letter {
        display: inline-block;
        font-weight: 400;
        font-family: "Rubik Vinyl", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif;
        text-transform: uppercase;
        position: relative;
        z-index: 35;
        line-height: 1;
        opacity: 0;
        animation: bounceLetter 0.6s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
        text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        white-space: nowrap;
      }
      .letter.emoji {
        font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif;
      }
      .letter.space { opacity: 0; }
      .letter-wrapper { display: inline-block; flex-shrink: 0; }
      .letter-wrapper.space-wrapper { width: 0.5em; flex-shrink: 0; }
      .gifter-letter {
        display: inline-block;
        font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif;
        text-transform: uppercase;
        opacity: 0;
        animation: bounceLetter 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
        line-height: 1;
        font-size: 24px;
        text-shadow: 0 1px 3px rgba(0,0,0,0.4);
      }
      .gifter-entry {
        position: relative;
        display: flex;
        align-items: center;
        background: transparent;
        border-radius: 50px;
        border: 2px solid rgba(255, 255, 255, 0.85);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
        white-space: nowrap;
        width: auto;
        min-width: 170px;
        max-width: 85vw;
        padding: 6px 20px 6px 44px;
      }
      .rank-badge {
        position: absolute;
        left: -10px;
        top: 50%;
        transform: translateY(-50%);
        width: 38px;
        height: 38px;
        background: radial-gradient(circle, #FFD700, #FF8C00);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "Rubik Vinyl", system-ui;
        font-size: 22px;
        font-weight: bold;
        color: #000;
        box-shadow: 0 0 10px rgba(255,215,0,0.7);
        border: 2px solid rgba(255,255,255,0.9);
      }
      .rank-1 { background: radial-gradient(circle, #FFD700, #FFA500); }
      .rank-2 { background: radial-gradient(circle, #E0E0E0, #A0A0A0); }
      .rank-3 { background: radial-gradient(circle, #D4AF37, #B87333); }
      .gift-banner {
        font-family: 'Poppins', 'Montserrat', Arial, sans-serif;
        font-weight: 300;
        font-size: 2.5vw;
        letter-spacing: 2px;
        color: #FFFFFF;
        text-transform: uppercase;
        margin-bottom: 5px;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        flex-wrap: nowrap;
        width: 100%;
      }
      .gift-name-badge {
        font-weight: 700;
        color: #FFFFFF;
        background: transparent;
        padding: 0 25px;
        border-radius: 40px;
        border: 2px solid #FFFFFF;
        letter-spacing: 3px;
        margin: 0 5px;
        font-size: 1.5em;
        white-space: nowrap;
        display: inline-block;
      }
      .worth-badge {
        font-weight: 700;
        color: #FFFFFF;
        background: transparent;
        padding: 0 20px;
        border-radius: 40px;
        border: 2px solid #FFFFFF;
        letter-spacing: 2px;
        margin: 0 5px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 1.5em;
        white-space: nowrap;
      }
      @media (max-width: 768px) {
        .gift-banner { font-size: 4vw; }
        .gifter-name-display { bottom: 16%; width: 85%; }
        .every-gift-container { bottom: 6%; }
        .gifter-letter { font-size: 18px; }
        .gifter-entry { padding: 5px 16px 5px 38px; min-width: 140px; }
        .rank-badge { width: 32px; height: 32px; font-size: 18px; left: -8px; }
      }
    `;
    document.head.appendChild(style);

    // Load Socket.IO dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.5.0/socket.io.min.js';
  script.onload = () => {
  const socket = (window as any).io(window.location.origin, {
    path: '/api/socket',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    timeout: 10000
  });
  
  socketRef.current = socket;
  const statusEl = document.getElementById('status');
  
  socket.on('connect', () => {
    console.log('✅ Socket connected!');
    setIsConnected(true);
    if (statusEl) statusEl.style.background = '#00ff66';
    socket.emit('connect-tiktok', MY_STREAMER);
    console.log(`✅ Connecting to TikTok: ${MY_STREAMER}`);
  });
  
  socket.on('connect_error', (err: any) => {
    console.error('Socket connection error:', err);
    setIsConnected(false);
    if (statusEl) statusEl.style.background = '#ff3b3b';
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
    setIsConnected(false);
    if (statusEl) statusEl.style.background = '#ff3b3b';
  });
  
  // TikTok events - NO FILTERING NEEDED (only one streamer)
  socket.on('tiktok-event', (ev: any) => {
    console.log('📥 TikTok event:', ev?.type);
    
    if (ev?.type === 'gift') {
      const name = cleanName(ev.nickname || ev.username);
      const diamonds = ev.totalDiamonds || 0;
      const giftName = cleanGiftName(ev.giftName);
      handleGift(name, giftName || "", diamonds);
    }
    if (ev?.type === 'like') {
      processLikeEvent(ev.likeCount || 1);
    }
    if (ev?.type === 'follow') {
      console.log(`➕ ${ev.username} followed!`);
      // Optional: Add follow animation
    }
    if (ev?.type === 'join') {
      console.log(`👤 ${ev.username} joined`);
      // Optional: Add join animation
    }
  });
  
  // Control panel events - GLOBAL (no target filtering)
  socket.on('1x-points', () => {
    console.log('💰 1X POINTS ACTIVATED');
    showControlBanner('💰 1X POINTS', 2000);
    activeMultiplierRef.current = 1;
  });
  
  socket.on('2x-points', () => {
    console.log('🔥 2X POINTS ACTIVATED!');
    showControlBanner('🔥 2X POINTS ACTIVE!', 3000);
    activeMultiplierRef.current = 2;
    triggerScreenPulse('#FFD700');
  });
  
  socket.on('3x-points', () => {
    console.log('💎 3X POINTS ACTIVATED!');
    showControlBanner('💎 3X POINTS ACTIVE!', 3000);
    activeMultiplierRef.current = 3;
    triggerScreenPulse('#FF00CC');
  });
  
  socket.on('glove-powerup', () => {
    console.log('🧤 GLOVE POWER-UP!');
    showControlBanner('🧤 GLOVE POWER-UP!', 2000);
    triggerGloveEffect();
  });
  
  socket.on('mvp-crown', (data: any) => {
    const username = data?.username || 'Top Gifter';
    console.log(`👑 MVP: ${username}`);
    showControlBanner(`👑 MVP: ${username}`, 3000);
  });
  
  socket.on('confetti', () => {
    console.log('🎉 CONFETTI!');
    triggerConfetti();
  });
  
  socket.on('fireworks', () => {
    console.log('🎆 FIREWORKS!');
    triggerFireworks();
  });
  
  // Any custom events (global)
  socket.onAny((eventName: string, ...args: any[]) => {
    // Skip internal events
    if (!eventName.startsWith('tiktok') && 
        eventName !== 'connect' && 
        eventName !== 'disconnect' && 
        eventName !== 'connect_error' &&
        eventName !== 'connection-result' &&
        eventName !== 'connected-stream') {
      
      console.log(`🎨 Custom event: ${eventName}`, args[0]);
      showControlBanner(`✨ ${eventName.toUpperCase()} ✨`, 2000);
    }
  });
};
    document.head.appendChild(script);
    
    // Demo mode fallback
    const fallbackTimeout = setTimeout(() => {
      if (!isConnected && !socketRef.current?.connected) {
        console.log('🎮 DEMO MODE ACTIVE - Socket not connected');
        const demoGifters = ['SΛEΞD JΛTT 🦅', 'STAR✨GIFTER', '🌟日本語ネーム🌟', 'الراعي العربي 🐪', '❤️КРАСАВЧИК❤️'];
        const demoGifts = ['DRAGON', 'UNIVERSE', 'GALAXY', 'ROSE', 'CROWN'];
        demoIntervalRef.current = setInterval(() => {
          const randomDiamonds = Math.floor(Math.random() * 8000) + 100;
          const randomName = demoGifters[Math.floor(Math.random() * demoGifters.length)];
          const randomGift = demoGifts[Math.floor(Math.random() * demoGifts.length)];
          handleGift(randomName, randomGift, randomDiamonds);
        }, 8000);
      }
    }, 5000);
    
    return () => {
      clearTimeout(fallbackTimeout);
      if (socketRef.current) socketRef.current.disconnect();
      if (activeGiftTimeoutRef.current) clearTimeout(activeGiftTimeoutRef.current);
      if (activeGiftFadeTimerRef.current) clearTimeout(activeGiftFadeTimerRef.current);
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      if (likeBatchTimeoutRef.current) clearTimeout(likeBatchTimeoutRef.current);
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      <div id="container">
        <div id="likesContainer" className="likes-container"></div>
        <div id="giftBannerContainer" className="every-gift-container">
          <div className="gift-banner" id="giftBanner">
            <span className="gift-name-badge" id="giftNameBadge"></span>
            <span className="worth-badge" id="worthBadge">
              <span id="diamondAmount">0</span>
              <span className="diamond-icon">💎</span>
            </span>
          </div>
        </div>
        <div id="gifterNameDisplay" className="gifter-name-display">
          <div className="name-container" id="nameContainer"></div>
        </div>
        <div id="topGiftersContainer" className="top-gifters-container"></div>
        <div id="status"></div>
      </div>
      
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          margin: 0;
          overflow: hidden;
          background: transparent;
        }
        #container {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: transparent;
        }
        .likes-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 25;
          overflow: visible;
        }
        .every-gift-container {
          position: fixed;
          bottom: 8%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 30;
          text-align: center;
          pointer-events: none;
          background: transparent;
          display: none;
          transition: opacity 1s ease-out;
          width: auto;
          min-width: 320px;
          max-width: 85vw;
        }
        .gifter-name-display {
          position: fixed;
          bottom: 18%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 30;
          text-align: center;
          pointer-events: none;
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: opacity 1s ease-out;
          width: 80%;
          max-width: 80%;
        }
        .name-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          width: 100%;
          flex-wrap: nowrap;
          white-space: nowrap;
          overflow: visible;
        }
        .top-gifters-container {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 35;
          pointer-events: none;
          display: none;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        .gifter-name-letters {
          display: flex;
          gap: 4px;
          white-space: nowrap;
        }
        #status {
          position: fixed;
          top: 10px;
          right: 10px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: red;
          z-index: 10000;
          box-shadow: 0 0 6px rgba(0,0,0,0.4);
        }
      `}</style>
    </>
  );
}