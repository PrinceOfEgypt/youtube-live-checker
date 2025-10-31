// lib/youtube.ts
import axios from 'axios';

const API_KEY = process.env.YOUTUBE_API_KEY!;
const CHANNEL_ID = process.env.CHANNEL_ID!;

export interface LiveStatus {
  isLive: boolean;
  title?: string;
  videoId?: string;
  thumbnail?: string;
  startedAt?: string;
  viewerCount?: number;
}

export async function checkChannelLive(): Promise<LiveStatus> {
  try {
    // Step 1: Get the channel's upload playlist ID
    const channelRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels`,
      {
        params: {
          part: 'contentDetails',
          id: CHANNEL_ID,
          key: API_KEY,
        },
      }
    );

    const uploadPlaylistId =
      channelRes.data.items[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadPlaylistId) {
      return { isLive: false };
    }

    // Step 2: Search for live videos in the uploads playlist
    const searchRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/search`,
      {
        params: {
          part: 'snippet',
          channelId: CHANNEL_ID,
          eventType: 'live',
          type: 'video',
          maxResults: 1,
          key: API_KEY,
        },
      }
    );

    const liveItem = searchRes.data.items[0];

    if (!liveItem) {
      return { isLive: false };
    }

    // Step 3: Get live streaming details
    const videoId = liveItem.id.videoId;
    const videoRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos`,
      {
        params: {
          part: 'snippet,liveStreamingDetails',
          id: videoId,
          key: API_KEY,
        },
      }
    );

    const video = videoRes.data.items[0];
    const details = video.liveStreamingDetails;

    return {
      isLive: true,
      title: video.snippet.title,
      videoId,
      thumbnail: video.snippet.thumbnails.high.url,
      startedAt: details.actualStartTime,
      viewerCount: details.concurrentViewers
        ? parseInt(details.concurrentViewers)
        : undefined,
    };
  } catch (error: any) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    return { isLive: false };
  }
}