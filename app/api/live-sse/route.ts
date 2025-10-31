// app/api/live-sse/route.ts
import { NextResponse } from 'next/server';
import { getCurrentStatus } from '@/lib/live-broadcast';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // 1. Send current status immediately
      const status = getCurrentStatus();
      if (status) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(status)}\n\n`));
      }

      // 2. Keep-alive ping every 15s
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, 15_000);

      // 3. Store controller globally so webhook can push
      (global as any).__sseController = controller;

      // 4. Cleanup
      return () => {
        clearInterval(keepAlive);
        delete (global as any).__sseController;
      };
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}