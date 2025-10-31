// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';
import { broadcast } from '@/lib/live-broadcast';
import { getChannelMetadata } from '@/lib/youtube';
import axios from 'axios';

const CHANNEL_ID = 'UCw3BCSojo1NKBw0xvfKa4ZQ'

export const GET = async (req: NextRequest) => {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && challenge) {
    console.log('PubSubHubbub verification');
    return new NextResponse(challenge);
  }
  return new NextResponse('OK');
};

export const POST = async (req: NextRequest) => {
  const raw = await req.text();
  let xml: any;
  try {
    xml = await parseStringPromise(raw);
  } catch {
    return new NextResponse('Invalid XML', { status: 400 });
  }

  const entry = xml?.feed?.entry?.[0];
  if (!entry) return new NextResponse('No entry', { status: 200 });

  const videoId = entry['yt:videoId']?.[0];
  const channelId = entry['yt:channelId']?.[0];
  if (channelId !== CHANNEL_ID) return new NextResponse('Wrong channel', { status: 200 });

  try {
    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,liveStreamingDetails',
        id: videoId,
        key: process.env.YOUTUBE_API_KEY,
      },
    });

    const video = data.items[0];
    if (!video) throw new Error('Video not found');

    const details = video.liveStreamingDetails;
    const isLive = !details.actualEndTime;

    const meta = await getChannelMetadata();

    const status = {
      isLive,
      ...(isLive && {
        title: video.snippet.title,
        videoId,
        thumbnail: video.snippet.thumbnails.high.url,
        startedAt: details.actualStartTime,
        viewerCount: details.concurrentViewers
          ? Number(details.concurrentViewers)
          : undefined,
      }),
      channelName: meta.name,
      channelLogo: meta.logo,
    };

    broadcast(status);
  } catch (e) {
    console.error('Webhook error:', e);
  }

  return new NextResponse('OK');
};