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
  channelName?: string;
  channelLogo?: string;
}

export async function checkChannelLive(): Promise<LiveStatus> {
  try {
    // Step 1: Get channel details (name + logo)
    const channelRes = await axios.get(
      'https://www.googleapis.com/youtube/v3/channels',
      {
        params: {
          part: 'snippet,contentDetails',
          id: CHANNEL_ID,
          key: API_KEY,
        },
      }
    );

    const channel = channelRes.data.items[0];
    if (!channel) {
      return { isLive: false };
    }

    const channelName = channel.snippet.title;
    const channelLogo = channel.snippet.thumbnails.default.url;
    const uploadPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    // Step 2: Search for live video
    const searchRes = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
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
      return {
        isLive: false,
        channelName,
        channelLogo,
      };
    }

    // Step 3: Get live video details
    const videoId = liveItem.id.videoId;
    const videoRes = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
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
      channelName,
      channelLogo,
    };
  } catch (error: any) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    return { isLive: false };
  }
}