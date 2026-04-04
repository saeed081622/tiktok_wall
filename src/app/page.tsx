'use client';

import React from 'react';

export default function TestPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4 animate-pulse">
          Welcome! 🎉
        </h1>
        <p className="text-gray-400 text-xl">Socket test page is ready</p>
      </div>
    </div>
  );
}