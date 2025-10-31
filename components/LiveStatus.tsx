// components/LiveStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import type { LiveStatus } from '@/lib/youtube';
import Image from 'next/image';

export default function LiveStatus() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch('/api/check-live');
      const data: LiveStatus = await res.json();
      setStatus(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-center p-6 text-gray-500">
        Checking live status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-red-500">
        Failed to load live status.
      </div>
    );
  }

  const { isLive, channelName = 'Unknown Channel', channelLogo, videoId } = status!;
  const channelUrl = `https://youtube.com/channel/${process.env.NEXT_PUBLIC_CHANNEL_ID}`;

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden font-sans">
      {/* Channel Header – Logo + Name (clickable) */}
      <a
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-5 bg-gray-50 hover:bg-gray-100 transition"
      >
        {channelLogo ? (
          <Image
            src={channelLogo}
            alt={channelName}
            width={72}
            height={72}
            className="rounded-full border-2 border-white shadow-sm flex-shrink-0"
          />
        ) : (
          <div className="w-18 h-18 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {channelName.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-800 truncate">
          {channelName}
        </h2>
      </a>

      {/* Live / Offline Content */}
      <div className="p-5">
        {isLive ? (
          <LiveView status={status!} />
        ) : (
          <OfflineView channelName={channelName} />
        )}
      </div>
    </div>
  );
}

function LiveView({ status }: { status: LiveStatus }) {
  return (
    <>
      <div className="flex items-center gap-2 text-red-600 mb-3">
        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
        <span className="font-bold text-lg">LIVE NOW</span>
      </div>

      {status.thumbnail && (
        <a
          href={`https://youtube.com/watch?v=${status.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-4"
        >
          <Image
            src={status.thumbnail}
            alt={status.title ?? 'Live stream'}
            width={480}
            height={270}
            className="rounded-lg w-full object-cover shadow-md hover:opacity-90 transition"
          />
        </a>
      )}

      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
        {status.title ?? 'Untitled Stream'}
      </h3>

      {status.viewerCount !== undefined && (
        <p className="text-sm text-gray-600 mb-1">
          {status.viewerCount.toLocaleString()} watching
        </p>
      )}

      {status.startedAt && (
        <p className="text-xs text-gray-500 mb-4">
          Started at {new Date(status.startedAt).toLocaleTimeString()}
        </p>
      )}

      <a
        href={`https://youtube.com/watch?v=${status.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block w-full text-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
      >
        Watch Live
      </a>
    </>
  );
}

function OfflineView({ channelName }: { channelName: string }) {
  return (
    <div className="text-center py-8">
      <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
        <span className="font-semibold">Not Live</span>
      </div>
      <p className="text-sm text-gray-500">
        {channelName} is currently offline.
      </p>
    </div>
  );
}