'use client';

interface Props {
    status: 'connected' | 'disconnected' | 'connecting';
}

export default function ConnectionStatus({ status }: Props) {
    const colors = {
        connected: 'bg-green-500',
        disconnected: 'bg-red-500',
        connecting: 'bg-yellow-500 animate-pulse'
    };

    const labels = {
        connected: 'Connected to TikTok Live',
        disconnected: 'Disconnected',
        connecting: 'Connecting...'
    };

    return (
        <div className="absolute top-4 right-4 z-50">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm 
                          px-4 py-2 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${colors[status]}`} />
                <span className="text-white text-sm font-medium">
                    {labels[status]}
                </span>
            </div>
        </div>
    );
}