import { NextRequest } from "next/server";
import { assertPublicHost, normalizeHost } from "@/lib/ssrf";
import { safeFetch } from "@/lib/fetcher";
import { buildChecks } from "@/lib/checks";
import { limited } from "@/lib/rate";

// Node.js is the default runtime, which the `tls` module needs, so no `runtime` export.
// POST handlers are always dynamic, so no `dynamic` export either (cacheComponents rejects it).
export const maxDuration = 30;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) {
    return Response.json({ error: "Too many scans. Wait a minute and try again." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { url?: string; consent?: boolean };
  if (!body.consent) {
    return Response.json(
      { error: "Confirm you own this site or have permission to test it." },
      { status: 400 }
    );
  }

  let host: string;
  try {
    host = normalizeHost(String(body.url ?? ""));
    await assertPublicHost(host);
  } catch (e) {
    return Response.json({ error: (e as Error).message || "Invalid domain." }, { status: 400 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: object) => {
        try { ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { /* client left */ }
      };
      try {
        const main = await safeFetch(`https://${host}`).catch(() => null);
        for (const run of buildChecks(host, main)) {
          if (req.signal.aborted) break;
          const findings = await run().catch(() => []);
          for (const finding of findings) {
            send({ type: "finding", finding });
            await sleep(220);            // pacing so the UI reads as a live checklist
          }
        }
        send({ type: "done" });
      } finally {
        try { ctrl.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
  });
}