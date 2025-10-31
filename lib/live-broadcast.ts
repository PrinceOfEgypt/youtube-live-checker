// lib/live-broadcast.ts
import axios from 'axios';

const API_KEY = process.env.YOUTUBE_API_KEY!;
const CHANNEL_ID = process.env.CHANNEL_ID!;

let currentStatus: any = null;

// === INITIAL POLL (SERVER START) ===
async function pollInitialStatus() {
  if (currentStatus) return; // Already have status

  try {
    console.log('Polling initial status...');

    const [channelRes, searchRes] = await Promise.all([
      axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { part: 'snippet', id: CHANNEL_ID, key: API_KEY },
      }),
      axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          channelId: CHANNEL_ID,
          eventType: 'live',
          type: 'video',
          maxResults: 1,
          key: API_KEY,
        },
      }),
    ]);

    const channel = channelRes.data.items[0];
    if (!channel) throw new Error('Channel not found');

    const channelName = channel.snippet.title;
    const channelLogo = channel.snippet.thumbnails.default.url;

    const liveItem = searchRes.data.items[0];
    if (!liveItem) {
      currentStatus = { isLive: false, channelName, channelLogo };
      broadcast(currentStatus);
      return;
    }

    const videoId = liveItem.id.videoId;
    const videoRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: { part: 'snippet,liveStreamingDetails', id: videoId, key: API_KEY },
    });

    const video = videoRes.data.items[0];
    const details = video.liveStreamingDetails;

    currentStatus = {
      isLive: true,
      title: video.snippet.title,
      videoId,
      thumbnail: video.snippet.thumbnails.high.url,
      startedAt: details.actualStartTime,
      viewerCount: details.concurrentViewers ? Number(details.concurrentViewers) : undefined,
      channelName,
      channelLogo,
    };

    broadcast(currentStatus);
  } catch (error: any) {
    console.error('Poll failed:', error.message);
    currentStatus = { isLive: false };
    broadcast(currentStatus);
  }
}

// Run on server start
pollInitialStatus();

// === BROADCAST ===
export function broadcast(status: any) {
  currentStatus = status;

  const controller = (global as any).__sseController as ReadableStreamDefaultController | undefined;
  if (controller) {
    const payload = `data: ${JSON.stringify(status)}\n\n`;
    const encoded = new TextEncoder().encode(payload);
    try {
      controller.enqueue(encoded);
    } catch {
      // Disconnected
    }
  }
}

export function getCurrentStatus() {
  return currentStatus;
}

export { pollInitialStatus }; // Export for per-client use