'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export default function TestPage() {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  useEffect(() => {
    addLog('🔌 Connecting to socket...');
    
    const socket = io({
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setConnected(true);
      addLog('✅ Socket connected! ID: ' + socket.id);
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      addLog('❌ Connection error: ' + err.message);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      addLog('⚠️ Socket disconnected');
    });

    socket.on('connection-result', (result) => {
      if (result.success) {
        addLog(`✅ TikTok connected! Room: ${result.roomId}`);
        setStatus(`Connected to @${username}`);
      } else {
        addLog(`❌ TikTok connection failed: ${result.error}`);
        setStatus(`Failed: ${result.error}`);
      }
    });

    socket.on('tiktok-event', (ev) => {
      if (ev.type === 'gift') {
        addLog(`🎁 GIFT: ${ev.nickname} sent ${ev.repeatCount}x ${ev.giftName} (${ev.totalDiamonds}💎) for @${ev.streamer}`);
      } else if (ev.type === 'like') {
        addLog(`❤️ LIKE: ${ev.nickname} sent ${ev.count} likes for @${ev.streamer}`);
      } else if (ev.type === 'follow') {
        addLog(`➕ FOLLOW: ${ev.nickname} followed @${ev.streamer}`);
      } else if (ev.type === 'join') {
        addLog(`👤 JOIN: ${ev.nickname} joined @${ev.streamer}`);
      } else if (ev.type === 'chat') {
        addLog(`💬 CHAT: ${ev.nickname}: ${ev.comment}`);
      } else {
        addLog(`📡 EVENT: ${ev.type}`);
      }
    });

    // Test control events
    socket.on('test-ping', () => addLog('🏓 Received PING!'));
    socket.on('2x-points', () => addLog('🔥 2X POINTS ACTIVATED!'));
    socket.on('glove-powerup', () => addLog('🧤 GLOVE POWER-UP!'));

    (window as any).testSocket = socket;
    addLog('💡 Type window.testSocket.emit("control-event", "test-ping", {}) to test');

    return () => {
      socket.disconnect();
    };
  }, []);

  const connectTikTok = () => {
    if (!username.trim()) {
      alert('Enter a TikTok username');
      return;
    }
    addLog(`📡 Connecting to TikTok: @${username}`);
    (window as any).testSocket?.emit('connect-tiktok', username);
  };

  const sendTestCommand = () => {
    addLog(`📤 Sending test-ping command`);
    (window as any).testSocket?.emit('control-event', 'test-ping', { time: Date.now() });
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">🧪 Socket Test</h1>
        
        {/* Status */}
        <div className={`p-3 rounded-lg mb-4 ${connected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          {connected ? '🟢 Connected to Socket' : '🔴 Disconnected'}
        </div>
        
        {/* TikTok Connection */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <h2 className="text-white font-semibold mb-2">📱 TikTok Connection</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="TikTok username (e.g., 'scump')"
              className="flex-1 px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
              onKeyPress={(e) => e.key === 'Enter' && connectTikTok()}
            />
            <button
              onClick={connectTikTok}
              disabled={!connected}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 disabled:opacity-50"
            >
              Connect
            </button>
          </div>
          {status && <div className="text-sm text-gray-400 mt-2">{status}</div>}
        </div>
        
        {/* Test Commands */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <h2 className="text-white font-semibold mb-2">🎮 Test Commands</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={sendTestCommand} className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500 text-sm">
              Send Test Ping
            </button>
            <button onClick={() => (window as any).testSocket?.emit('control-event', '2x-points', {})} className="px-3 py-1 bg-pink-600 rounded hover:bg-pink-500 text-sm">
              Test 2X
            </button>
            <button onClick={() => (window as any).testSocket?.emit('control-event', 'glove-powerup', {})} className="px-3 py-1 bg-cyan-600 rounded hover:bg-cyan-500 text-sm">
              Test Glove
            </button>
          </div>
        </div>
        
        {/* Logs */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h2 className="text-white font-semibold mb-2">📋 Event Log</h2>
          <div className="h-96 overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className="text-gray-300 border-b border-gray-800 py-1">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}