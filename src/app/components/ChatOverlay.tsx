'use client';

import { useEffect, useRef } from 'react';

export interface ChatMessage {
    type: 'chat';
    username: string;
    nickname: string;
    comment: string;
    timestamp: number;
}

interface Props {
    messages: ChatMessage[];
}

export default function ChatOverlay({ messages }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div
            ref={containerRef}
            className="absolute bottom-24 left-8 right-8 max-h-64 overflow-y-auto 
                     flex flex-col-reverse gap-2 pointer-events-none z-20
                     scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        >
            {messages.slice(-8).map((msg, idx) => (
                <div
                    key={`${msg.timestamp}-${idx}`}
                    className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-2xl 
                             max-w-[70%] animate-fade-in border-l-4 border-pink-500
                             shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                    style={{
                        alignSelf: idx % 2 === 0 ? 'flex-start' : 'flex-end'
                    }}
                >
                    <span className="text-pink-400 font-bold mr-2 text-sm">
                        {msg.username}:
                    </span>
                    <span className="text-sm break-words">{msg.comment}</span>
                </div>
            ))}
        </div>
    );
}