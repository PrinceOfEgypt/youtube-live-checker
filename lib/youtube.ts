// lib/youtube.ts
import axios from 'axios';

const API_KEY = process.env.YOUTUBE_API_KEY!;
const CHANNEL_ID = process.env.CHANNEL_ID!;

let cachedChannelName: string | null = null;
let cachedChannelLogo: string | null = null;

export interface ChannelMetadata {
  name: string;
  logo: string;
}

export async function getChannelMetadata(): Promise<ChannelMetadata> {
  if (cachedChannelName && cachedChannelLogo) {
    return { name: cachedChannelName, logo: cachedChannelLogo };
  }

  const res = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
    params: { part: 'snippet', id: CHANNEL_ID, key: API_KEY },
  });

  const channel = res.data.items[0];
  if (!channel) {
    throw new Error('Channel not found');
  }

  const name = channel.snippet.title;
  const logo = channel.snippet.thumbnails.default.url;

  // Ensure they're strings
  if (typeof name !== 'string' || typeof logo !== 'string') {
    throw new Error('Invalid channel data');
  }

  cachedChannelName = name;
  cachedChannelLogo = logo;

  return { name, logo };
}