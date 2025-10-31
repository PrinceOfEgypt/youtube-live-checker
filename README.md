# YouTube Live Checker

Real-time live status widget using **Cloudflare Workers + Webhook + KV**.

## Setup

```bash
npm install
wrangler login
wrangler kv:namespace create LIVE_STATUS
# → copy id into wrangler.toml
wrangler secret put YOUTUBE_API_KEY