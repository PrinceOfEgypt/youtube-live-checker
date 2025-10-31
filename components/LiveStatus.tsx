// components/LiveStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import { LiveStatus } from '@/lib/youtube';
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
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000); // every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center p-8">Checking live status...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">Failed to fetch live status.</div>;
  }

  if (!status?.isLive) {
    return (
      <div className="max-w-md mx-auto p-6 bg-gray-100 rounded-lg text-center">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="font-semibold">Not Live</span>
        </div>
        <p className="mt-2 text-sm text-gray-500">The channel is currently offline.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
        <div className="relative">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
        </div>
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
            alt={status.title}
            width={480}
            height={360}
            className="rounded-lg w-full shadow-md hover:opacity-90 transition"
          />
        </a>
      )}

      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{status.title}</h3>

      {status.viewerCount && (
        <p className="text-sm text-gray-600 mb-1">
          👥 {status.viewerCount.toLocaleString()} watching
        </p>
      )}

      {status.startedAt && (
        <p className="text-xs text-gray-500">
          Started at {new Date(status.startedAt).toLocaleTimeString()}
        </p>
      )}

      <a
        href={`https://youtube.com/watch?v=${status.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
      >
        Watch Live
      </a>
    </div>
  );
}