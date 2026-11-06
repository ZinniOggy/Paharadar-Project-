import { assertPublicHost } from "./ssrf";

type Opts = { headers?: Record<string, string>; maxHops?: number };

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
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "Paharadar/0.1 (passive header check)", ...opts.headers },
    });
    await res.body?.cancel();   // headers only

    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).toString();
      continue;
    }
    return { res, finalUrl: url };
  }
  throw new Error("Too many redirects");
}