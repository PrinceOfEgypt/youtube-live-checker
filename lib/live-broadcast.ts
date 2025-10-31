// lib/live-broadcast.ts
let currentStatus: any = null;

export function broadcast(status: any) {
  currentStatus = status;

  const controller = (global as any).__sseController as ReadableStreamDefaultController | undefined;
  if (controller) {
    const payload = `data: ${JSON.stringify(status)}\n\n`;
    const encoded = new TextEncoder().encode(payload);
    try {
      controller.enqueue(encoded);
    } catch {
      // Client disconnected
    }
  }
}

export function getCurrentStatus() {
  return currentStatus;
}