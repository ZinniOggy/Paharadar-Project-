// In-memory limiter. It resets on cold starts, which is fine for a demo.
const hits = new Map<string, number[]>();

export function limited(ip: string, max = 8, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > max;
}