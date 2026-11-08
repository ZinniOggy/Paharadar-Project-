import { assertPublicHost } from "./ssrf";

type Opts = { headers?: Record<string, string>; maxHops?: number; readBody?: boolean };

export async function safeFetch(startUrl: string, opts: Opts = {}) {
  const maxHops = opts.maxHops ?? 4;
  let url = startUrl;
  for (let i = 0; i <= maxHops; i++) {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error("Unsupported redirect");
    if (u.port && !["80", "443"].includes(u.port)) throw new Error("Unsupported port");
    await assertPublicHost(u.hostname);

    const res = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "Paharadar/0.1 (passive header check)", ...opts.headers },
    });

    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      await res.body?.cancel();
      url = new URL(loc, url).toString();
      continue;
    }

    let body = "";
    if (opts.readBody) {
      body = await res.text().catch(() => "");
    } else {
      await res.body?.cancel(); // headers only
    }

    return { res, finalUrl: url, body };
  }
  throw new Error("Too many redirects");
}
