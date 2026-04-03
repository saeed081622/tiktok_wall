'use client';

import { useState, useEffect, useRef } from 'react';

interface GiftWidgetProps {
  onGift: (callback: (name: string, giftName: string, diamonds: number) => void) => void;
}

export function GiftWidget({ onGift }: GiftWidgetProps) {
  const [giftQueue, setGiftQueue] = useState<any[]>([]);
  const [isShowingGift, setIsShowingGift] = useState(false);
  const activeGiftTimeoutRef = useRef<any>(null);
  const activeGiftFadeTimerRef = useRef<any>(null);

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

  const handleGift = (name: string, giftName: string, diamonds: number) => {
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
    onGift(handleGift);
  }, [onGift]);

  return null;
}