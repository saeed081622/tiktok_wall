'use client';

import { useState, useEffect } from 'react';

interface EffectWidgetProps {
  onTriggerEffect: (callback: (type: string, username?: string) => void) => void;
  onTriggerGlove: (callback: () => void) => void;
  onTriggerConfetti: (callback: () => void) => void;
  onTriggerFireworks: (callback: () => void) => void;
}

export function EffectWidget({ 
  onTriggerEffect, 
  onTriggerGlove, 
  onTriggerConfetti, 
  onTriggerFireworks 
}: EffectWidgetProps) {
  const [fullScreenEffect, setFullScreenEffect] = useState<{type: string, active: boolean}>({type: '', active: false});

  const showFullScreenEffect = (type: string) => {
    setFullScreenEffect({type, active: true});
    setTimeout(() => {
      setFullScreenEffect({type: '', active: false});
    }, 2000);
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

  // This function handles all effects
  const handleEffect = (type: string, username?: string) => {
    console.log(`🎬 Effect triggered: ${type}`, username);
    
    if (type === '2x') {
      showFullScreenEffect('2x');
      showControlBanner('🔥 2X POINTS ACTIVE!', 2000);
      triggerScreenPulse('#FFD700');
      updateMultiplierDisplay(2);
    } else if (type === '3x') {
      showFullScreenEffect('3x');
      showControlBanner('💎 3X POINTS ACTIVE!', 2000);
      triggerScreenPulse('#FF00CC');
      updateMultiplierDisplay(3);
    } else if (type === '1x') {
      showControlBanner('💰 1X POINTS', 2000);
      updateMultiplierDisplay(1);
    } else if (type === 'mvp' && username) {
      console.log(`👑 Showing MVP for: ${username}`);
      showFullScreenEffect('mvp');
      showControlBanner(`👑 MVP: ${username}`, 3000);
    }
  };

  const handleGlove = () => {
    console.log('🧤 Glove effect triggered');
    showFullScreenEffect('glove');
  };

  useEffect(() => {
    // Register all callbacks with the parent
    onTriggerEffect(() => handleEffect);
    onTriggerGlove(handleGlove);
    onTriggerConfetti(triggerConfetti);
    onTriggerFireworks(triggerFireworks);
    
    console.log('✅ EffectWidget initialized');
  }, []);

  return (
    <>
      {fullScreenEffect.active && (
        <div className={`fullscreen-effect ${fullScreenEffect.type === 'glove' ? 'glove' : ''}`}>
          {fullScreenEffect.type === '2x' && (
            <>
              <div className="effect-text">🔥 2X POINTS 🔥</div>
              <div className="effect-sub">POINT MULTIPLIER ACTIVE</div>
            </>
          )}
          {fullScreenEffect.type === '3x' && (
            <>
              <div className="effect-text">💎 3X POINTS 💎</div>
              <div className="effect-sub">POINT MULTIPLIER ACTIVE</div>
            </>
          )}
          {fullScreenEffect.type === 'mvp' && (
            <>
              <div className="effect-text">👑 MVP 👑</div>
              <div className="effect-sub">TOP GIFT OF THE STREAM</div>
            </>
          )}
          {fullScreenEffect.type === 'glove' && (
            <div className="effect-icon">🧤</div>
          )}
        </div>
      )}
    </>
  );
}