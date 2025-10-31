// src/index.ts
import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';

interface Env {
  LIVE_STATUS: KVNamespace;
  YOUTUBE_API_KEY: string;
  CHANNEL_ID: string;
  DEBUG?: string;  // ← From wrangler.toml
}

interface LiveStatus {
  isLive: boolean;
  title?: string;
  videoId?: string;
  thumbnail?: string;
  startedAt?: string;
  viewerCount?: number;
  channelName: string;
  channelLogo: string;
  updatedAt: number;
}

// === DEBUG MODE ===
const DEBUG = (globalThis as any).DEBUG === 'true';

const log = (...args: any[]) => {
  if (DEBUG) console.log('[DEBUG]', ...args);
};

const error = (...args: any[]) => {
  console.error('[ERROR]', ...args);
};

// === HARDCODED FALLBACK ===
const FALLBACK_CHANNEL = {
  name: "St. Marina ACOC DFW",
  logo: "",  // ← Replace with real URL if needed
};

// === Debug API Key ===
async function testAPIKey(env: Env) {
  log('=== DEBUG START ===');
  log('CHANNEL_ID:', env.CHANNEL_ID);
  log('API_KEY present?', env.YOUTUBE_API_KEY ? 'YES' : 'NO');
  log('KV binding:', env.LIVE_STATUS ? 'OK' : 'MISSING');
  try {
    const res = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'snippet', id: env.CHANNEL_ID, key: env.YOUTUBE_API_KEY },
      timeout: 5000,
    });
    log('API TEST SUCCESS:', res.data.items?.[0]?.snippet?.title || 'No title');
  } catch (e: any) {
    error('API TEST FAILED:', e.response?.status || e.code, e.message);
    if (e.response?.data) error('API ERROR:', e.response.data);
  }
  log('=== DEBUG END ===');
}

// === Ensure Channel Metadata ===
async function ensureChannelMetadata(env: Env): Promise<{ name: string; logo: string }> {
  const cached = await env.LIVE_STATUS.get('channel');
  if (cached && cached !== '' && cached !== 'null') {
    const data = JSON.parse(cached);
    log('Using cached channel:', data.name);
    return data;
  }

  log('Fetching channel metadata...');
  try {
    const res = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'snippet', id: env.CHANNEL_ID, key: env.YOUTUBE_API_KEY },
      timeout: 8000,
    });

    const channel = res.data.items?.[0];
    if (!channel) throw new Error('No channel found');

    const name = channel.snippet.title;
    const defaultUrl = channel.snippet.thumbnails.default.url;
    const logo = channel.snippet.thumbnails.high?.url 
               || defaultUrl.replace(/=s\d+-c-k-c0x00ffffff-no-rj.*/, '=s88-c-k-c0x00ffffff-no-rj')
               || defaultUrl;

    const data = { name, logo };
    await env.LIVE_STATUS.put('channel', JSON.stringify(data), { expirationTtl: 86400 });
    log('Channel cached:', name, '| Logo:', logo);
    return data;
  } catch (e: any) {
    error('CHANNEL FETCH FAILED:', e.message);
    await env.LIVE_STATUS.put('channel', JSON.stringify(FALLBACK_CHANNEL), { expirationTtl: 3600 });
    log('Using fallback channel:', FALLBACK_CHANNEL.name);
    return FALLBACK_CHANNEL;
  }
}

// === Initial Poll ===
async function ensureInitialStatus(env: Env) {
  const current = await env.LIVE_STATUS.get('current');
  if (current && current !== '' && current !== 'null' && current !== 'undefined') {
    log('KV already has current status');
    return;
  }

  log('KV EMPTY or corrupted → Running initial poll...');

  try {
    const { name, logo } = await ensureChannelMetadata(env);
    log('Fetched channel:', name);

    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        channelId: env.CHANNEL_ID,
        eventType: 'live',
        type: 'video',
        maxResults: 1,
        key: env.YOUTUBE_API_KEY,
      },
      timeout: 8000,
    });

    const liveItem = searchRes.data.items?.[0];
    if (!liveItem) {
      const status: LiveStatus = { isLive: false, channelName: name, channelLogo: logo, updatedAt: Date.now() };
      await env.LIVE_STATUS.put('current', JSON.stringify(status));
      log('Initial poll: OFFLINE → SAVED TO KV');
      return;
    }

    const videoId = liveItem.id.videoId;
    const videoRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: { part: 'snippet,liveStreamingDetails', id: videoId, key: env.YOUTUBE_API_KEY },
      timeout: 8000,
    });

    const video = videoRes.data.items[0];
    const details = video.liveStreamingDetails;

    const status: LiveStatus = {
      isLive: true,
      title: video.snippet.title,
      videoId,
      thumbnail: video.snippet.thumbnails.high.url,
      startedAt: details.actualStartTime,
      viewerCount: details.concurrentViewers ? Number(details.concurrentViewers) : undefined,
      channelName: name,
      channelLogo: logo,
      updatedAt: Date.now(),
    };

    await env.LIVE_STATUS.put('current', JSON.stringify(status));
    log('Initial poll: LIVE → SAVED TO KV');
  } catch (e: any) {
    error('INITIAL POLL FAILED:', e.message);
    const { name, logo } = await ensureChannelMetadata(env);
    const status: LiveStatus = { isLive: false, channelName: name, channelLogo: logo, updatedAt: Date.now() };
    await env.LIVE_STATUS.put('current', JSON.stringify(status));
    log('FALLBACK STATUS SAVED TO KV');
  }
}

// === Webhook Handler ===
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const text = await request.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  let xml: any;
  try {
    xml = parser.parse(text);
  } catch {
    return new Response('Invalid XML', { status: 400 });
  }

  const entry = xml?.feed?.entry;
  if (!entry) return new Response('No entry', { status: 200 });

  const videoId = entry['yt:videoId'];
  const channelId = entry['yt:channelId'];
  if (channelId !== env.CHANNEL_ID) return new Response('Wrong channel', { status: 200 });

  try {
    const { name, logo } = await ensureChannelMetadata(env);
    const videoRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: { part: 'snippet,liveStreamingDetails', id: videoId, key: env.YOUTUBE_API_KEY },
    });

    const video = videoRes.data.items[0];
    if (!video) throw new Error('Video not found');

    const details = video.liveStreamingDetails;
    const isLive = !details.actualEndTime;

    const status: LiveStatus = {
      isLive,
      ...(isLive && {
        title: video.snippet.title,
        videoId,
        thumbnail: video.snippet.thumbnails.high.url,
        startedAt: details.actualStartTime,
        viewerCount: details.concurrentViewers ? Number(details.concurrentViewers) : undefined,
      }),
      channelName: name,
      channelLogo: logo,
      updatedAt: Date.now(),
    };

    await env.LIVE_STATUS.put('current', JSON.stringify(status));
    log('Webhook →', isLive ? 'LIVE' : 'OFFLINE');
  } catch (e) {
    error('Webhook error:', e);
  }

  return new Response('OK', { status: 200 });
}

// === Webhook Verification ===
async function handleVerification(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const challenge = url.searchParams.get('hub.challenge');
  const topic = url.searchParams.get('hub.topic');

  log('Webhook verification:', { mode, topic });

  if (mode === 'subscribe' && challenge) {
    log('Webhook SUBSCRIBED! Challenge:', challenge);
    return new Response(challenge, { status: 200 });
  }

  if (mode === 'unsubscribe') {
    log('Webhook UNSUBSCRIBED');
    return new Response('OK', { status: 200 });
  }

  return new Response('Invalid mode', { status: 400 });
}

// === /api/status ===
async function handleStatus(env: Env): Promise<Response> {
  await testAPIKey(env);
  const json = await env.LIVE_STATUS.get('current');
  if (!json || json === '' || json === 'null') {
    const { name, logo } = await ensureChannelMetadata(env);
    return Response.json({ isLive: false, channelName: name, channelLogo: logo });
  }
  return Response.json(JSON.parse(json));
}

// === HTML Widget ===
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>YouTube Live Status</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
  <div id="widget" class="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden font-sans">
    <div class="text-center py-12">
      <div class="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      <p class="mt-4 text-gray-600">Loading live status...</p>
    </div>
  </div>

  <script>
    async function updateStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const widget = document.getElementById('widget');

        if (!data.isLive) {
          widget.innerHTML = \`
            <a href="https://youtube.com/channel/UCw3BCSojo1NKBw0xvfKa4ZQ" target="_blank" class="flex flex-col items-center gap-3 p-6 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition rounded-t-xl">
              <img src="\${data.channelLogo}" alt="\${data.channelName}" class="w-18 h-18 rounded-full border-4 border-white shadow-lg" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="hidden w-18 h-18 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full items-center justify-center text-white font-bold text-2xl shadow-lg">\${data.channelName.charAt(0)}</div>
              <h2 class="text-xl font-bold text-gray-800">\${data.channelName}</h2>
            </a>
            <div class="p-6 text-center">
              <div class="py-10">
                <div class="flex items-center justify-center gap-2 text-gray-600 mb-2">
                  <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span class="font-semibold">Not Live</span>
                </div>
                <p class="text-sm text-gray-500">\${data.channelName} is currently offline.</p>
              </div>
            </div>
          \`;
          return;
        }

        widget.innerHTML = \`
          <a href="https://youtube.com/channel/UCw3BCSojo1NKBw0xvfKa4ZQ" target="_blank" class="flex flex-col items-center gap-3 p-6 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition rounded-t-xl">
            <img src="\${data.channelLogo}" alt="\${data.channelName}" class="w-18 h-18 rounded-full border-4 border-white shadow-lg" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="hidden w-18 h-18 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full items-center justify-center text-white font-bold text-2xl shadow-lg">\${data.channelName.charAt(0)}</div>
            <h2 class="text-xl font-bold text-gray-800">\${data.channelName}</h2>
          </a>
          <div class="p-6 text-center">
            <div class="flex items-center justify-center gap-2 text-red-600 mb-4">
              <div class="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
              <span class="font-bold text-lg">LIVE NOW</span>
            </div>
            \${data.thumbnail ? \`<a href="https://youtube.com/watch?v=\${data.videoId}" target="_blank" class="block mb-5 rounded-lg overflow-hidden shadow-md hover:opacity-90 transition"><img src="\${data.thumbnail}" alt="\${data.title || 'Live'}" class="w-full object-cover"></a>\` : ''}
            <h3 class="font-semibold text-lg mb-2 line-clamp-2">\${data.title || 'Untitled Stream'}</h3>
            \${data.viewerCount ? \`<p class="text-sm text-gray-600 mb-1">\${data.viewerCount.toLocaleString()} watching</p>\` : ''}
            \${data.startedAt ? \`<p class="text-xs text-gray-500 mb-5">Started at \${new Date(data.startedAt).toLocaleTimeString()}</p>\` : ''}
            <a href="https://youtube.com/watch?v=\${data.videoId}" target="_blank" class="inline-block w-full max-w-xs px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition">Watch Live</a>
          </div>
        \`;
      } catch (e) {
        console.error('Client update error:', e);
      }
    }

    updateStatus();
    setInterval(updateStatus, 30000);
  </script>
</body>
</html>
`;

// === Main Handler ===
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    await ensureInitialStatus(env);

    if (path === '/' || path === '') {
      await testAPIKey(env);
      return new Response(HTML, { headers: { 'Content-Type': 'text/html' } });
    }

    if (path === '/api/webhook') {
      if (request.method === 'POST') return handleWebhook(request, env);
      if (request.method === 'GET') return handleVerification(request);
      return new Response('Method not allowed', { status: 405 });
    }

    if (path === '/api/status' && request.method === 'GET') return handleStatus(env);

    return new Response('Not found', { status: 404 });
  },
};