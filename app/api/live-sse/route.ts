// app/api/live-sse/route.ts
import { NextResponse } from 'next/server';
import { getCurrentStatus, pollInitialStatus } from '@/lib/live-broadcast';

export async function GET() {
  let controller!: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    async start(ctrl) {
      controller = ctrl;
      const encoder = new TextEncoder();

      // === 1. Store controller for webhook broadcast ===
      (global as any).__sseController = ctrl;

      // === 2. Send current status if exists ===
      const status = getCurrentStatus();
      if (status) {
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(status)}\n\n`));
      } else {
        // === 3. No status? Poll once for this client ===
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ loading: true })}\n\n`));
        try {
          await pollInitialStatus(); // This updates status + broadcasts
        } catch (err) {
          console.error('Per-client poll failed:', err);
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to load' })}\n\n`));
        }
      }

      // === 4. Keep-alive ping ===
      const keepAlive = setInterval(() => {
        ctrl.enqueue(encoder.encode(': ping\n\n'));
      }, 15_000);

      // === 5. Cleanup ===
      return () => {
        clearInterval(keepAlive);
        if ((global as any).__sseController === ctrl) {
          delete (global as any).__sseController;
        }
      };
    },
    cancel() {
      // Client closed tab
      if ((global as any).__sseController === controller) {
        delete (global as any).__sseController;
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}