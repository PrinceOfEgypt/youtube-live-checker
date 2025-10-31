// components/LiveStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LiveStatusData {
  isLive: boolean;
  title?: string;
  videoId?: string;
  thumbnail?: string;
  startedAt?: string;
  viewerCount?: number;
  channelName: string;
  channelLogo: string;
}

export default function LiveStatus() {
  const [status, setStatus] = useState<LiveStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/live-sse');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle special messages
        if (data.loading) {
          setLoading(true);
          setError(false);
          return;
        }
        if (data.error) {
          setError(true);
          setLoading(false);
          return;
        }

        // Normal status update
        setStatus(data);
        setLoading(false);
        setError(false);
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection failed');
      eventSource.close();
      setError(true);
      setLoading(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // === Render States ===
  if (loading) {
    return (
      <WidgetContainer>
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Checking live status...</p>
        </div>
      </WidgetContainer>
    );
  }

  if (error || !status) {
    return (
      <WidgetContainer>
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load live status.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </WidgetContainer>
    );
  }

  const { isLive, channelName, channelLogo, videoId } = status;
  const channelUrl = `https://youtube.com/channel/UCw3BCSojo1NKBw0xvfKa4ZQ`;

  return (
    <WidgetContainer>
      {/* Channel Header */}
      <a
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-3 p-6 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition rounded-t-xl"
      >
        {channelLogo ? (
          <Image
            src={channelLogo}
            alt={channelName}
            width={72}
            height={72}
            className="rounded-full border-4 border-white shadow-lg"
            unoptimized
          />
        ) : (
          <div className="w-18 h-18 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {channelName.charAt(0)}
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-800">{channelName}</h2>
      </a>

      {/* Live / Offline Content */}
      <div className="p-6 text-center">
        {isLive ? (
          <LiveContent status={status} />
        ) : (
          <OfflineContent channelName={channelName} />
        )}
      </div>
    </WidgetContainer>
  );
}

// === Subcomponents ===
function LiveContent({ status }: { status: LiveStatusData }) {
  const { title, thumbnail, viewerCount, startedAt, videoId } = status;

  return (
    <>
      <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
        <span className="font-bold text-lg">LIVE NOW</span>
      </div>

      {thumbnail && (
        <a
          href={`https://youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-5 rounded-lg overflow-hidden shadow-md hover:opacity-90 transition"
        >
          <Image
            src={thumbnail}
            alt={title ?? 'Live stream'}
            width={480}
            height={270}
            className="w-full object-cover"
            unoptimized
          />
        </a>
      )}

      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title ?? 'Untitled Stream'}</h3>

      {viewerCount !== undefined && (
        <p className="text-sm text-gray-600 mb-1">{viewerCount.toLocaleString()} watching</p>
      )}

      {startedAt && (
        <p className="text-xs text-gray-500 mb-5">
          Started at {new Date(startedAt).toLocaleTimeString()}
        </p>
      )}

      <a
        href={`https://youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block w-full max-w-xs px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
      >
        Watch Live
      </a>
    </>
  );
}

function OfflineContent({ channelName }: { channelName: string }) {
  return (
    <div className="py-10">
      <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
        <span className="font-semibold">Not Live</span>
      </div>
      <p className="text-sm text-gray-500">{channelName} is currently offline.</p>
    </div>
  );
}

// === Reusable Container ===
function WidgetContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden font-sans">
        {children}
      </div>
    </div>
  );
}