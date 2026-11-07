import { getCrashService } from "@/modules/crash/crash-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const service = getCrashService();
  await service.ensureStarted();
  let unsubscribe: () => void = () => {};
  let heartbeat: NodeJS.Timeout | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      send(service.snapshot());
      unsubscribe = service.subscribe((snapshot) => send(snapshot));
      heartbeat = setInterval(() => {
        send({ type: "heartbeat", at: new Date().toISOString() });
      }, 20_000);
      request.signal.addEventListener("abort", () => {
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          return;
        }
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
