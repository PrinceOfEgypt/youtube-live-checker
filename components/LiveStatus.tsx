// components/LiveStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LiveStatus {
  isLive: boolean;
  title?: string;
  videoId?: string;
  thumbnail?: string;
  startedAt?: string;
  viewerCount?: number;
  channelName?: string;
  channelLogo?: string;
}

export default function LiveStatus() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const eventSource = new EventSource('/api/live-sse');

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setStatus(data);
      setLoading(false);
    };

    eventSource.onerror = () => {
      console.error('SSE error');
      eventSource.close();
      setLoading(false);
    };

    return () => eventSource.close();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        Connecting to live updates...
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500">
        No data
      </div>
    );
  }

  const { isLive, channelName = 'Unknown', channelLogo, videoId } = status;
  const channelUrl = `https://youtube.com/channel/${process.env.NEXT_PUBLIC_CHANNEL_ID}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
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
              {channelName.charAt(0)}
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-800">{channelName}</h2>
        </a>

        <div className="p-6 text-center">
          {isLive ? (
            <div>
              <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="font-bold text-lg">LIVE NOW</span>
              </div>

              {status.thumbnail && (
                <a href={`https://youtube.com/watch?v=${videoId}`} target="_blank" className="block mb-5">
                  <Image
                    src={status.thumbnail}
                    alt={status.title ?? 'Live'}
                    width={480}
                    height={270}
                    className="rounded-lg w-full object-cover shadow-md hover:opacity-90 transition"
                  />
                </a>
              )}

              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {status.title ?? 'Untitled'}
              </h3>

              {status.viewerCount !== undefined && (
                <p className="text-sm text-gray-600 mb-1">
                  {status.viewerCount.toLocaleString()} watching
                </p>
              )}

              <a
                href={`https://youtube.com/watch?v=${videoId}`}
                target="_blank"
                className="inline-block w-full max-w-xs px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
              >
                Watch Live
              </a>
            </div>
          ) : (
            <div className="py-10">
              <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="font-semibold">Not Live</span>
              </div>
              <p className="text-sm text-gray-500">
                {channelName} is currently offline.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-4 text-center text-xs text-green-600">
          Live updates via webhook
        </div>
      </div>
    </div>
  );
}