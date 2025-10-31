// app/api/check-live/route.ts
import { NextResponse } from 'next/server';
import { checkChannelLive } from '@/lib/youtube';

export async function GET() {
  const status = await checkChannelLive();
  return NextResponse.json(status);
}