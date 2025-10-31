// components/LiveStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { LiveStatus } from '@/lib/youtube';

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
    const interval = setInterval(fetchStatus, 900000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        Checking live status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500">
        Failed to load live status.
      </div>
    );
  }

  const { isLive, channelName = 'Unknown Channel', channelLogo, videoId } = status!;
  const channelUrl = `https://youtube.com/channel/${process.env.NEXT_PUBLIC_CHANNEL_ID}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Channel Header – Centered */}
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-3 p-6 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition"
        >
          {channelLogo ? (
            <Image
              src={channelLogo}
              alt={channelName}
              width={72}
              height={72}
              className="rounded-full border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-18 h-18 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {channelName.charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-800">{channelName}</h2>
        </a>

        {/* Live / Offline Content – Centered */}
        <div className="p-6 text-center">
          {isLive ? (
            <LiveView status={status!} />
          ) : (
            <OfflineView channelName={channelName} />
          )}
        </div>
      </div>
    </div>
  );
}

function LiveView({ status }: { status: LiveStatus }) {
  return (
    <>
      <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
        <span className="font-bold text-lg">LIVE NOW</span>
      </div>

      {status.thumbnail && (
        <a
          href={`https://youtube.com/watch?v=${status.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-5"
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
        <p className="text-xs text-gray-500 mb-5">
          Started at {new Date(status.startedAt).toLocaleTimeString()}
        </p>
      )}

      <a
        href={`https://youtube.com/watch?v=${status.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block w-full max-w-xs px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
      >
        Watch Live
      </a>
    </>
  );
}

function OfflineView({ channelName }: { channelName: string }) {
  return (
    <div className="py-10">
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